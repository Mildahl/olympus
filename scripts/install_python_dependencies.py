import argparse
import json
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
REPOSITORY_ROOT = SCRIPT_DIRECTORY.parent
DEFAULT_REQUIREMENTS_PATH = SCRIPT_DIRECTORY / "ifcopenshell-wheels-requirements.txt"
DEFAULT_IFCOPENSHELL_WASM_WHEEL_URL = (
    "https://s3.amazonaws.com/ifcopenshell-builds/ifcopenshell-0.8.5%2Ba51b2c5-cp313-cp313-pyodide_2025_0_wasm32.whl"
)
WHEELS_MANIFEST_FILE_NAME = "wheels-manifest.json"


def wasm_wheel_file_name_from_url(wheel_url):
    path_segment = urlparse(wheel_url).path.rstrip("/").rsplit("/", maxsplit=1)[-1]
    return unquote(path_segment)


def download_url_to_file(source_url, destination_path):
    request = urllib.request.Request(source_url, headers={"User-Agent": "Olympus-ifcopenshell-wheel-sync"})
    with urllib.request.urlopen(request, timeout=300) as response:
        data = response.read()
    destination_path.write_bytes(data)


def download_first_working_url(urls, destination_path, label):
    last_error = None
    for index, candidate_url in enumerate(urls):
        try:
            download_url_to_file(candidate_url, destination_path)
            return candidate_url
        except (urllib.error.URLError, OSError) as error:
            last_error = error
            if index + 1 < len(urls):
                print(
                    f"[install_python_dependencies] retry {label}: {candidate_url!r} failed ({error}); trying next URL",
                    file=sys.stderr,
                )
    raise RuntimeError(f"All URLs failed for {label}: {last_error}") from last_error


def parse_requirements_directives(requirements_path):
    pip_lines = []
    pyodide_root_names = []
    pyodide_dependency_closure = False
    text = requirements_path.read_text(encoding="utf-8")
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped:
            continue
        lower_stripped = stripped.lower()
        if lower_stripped.startswith("# pyodide-wheels:"):
            remainder = stripped.split(":", 1)[1].strip()
            pyodide_root_names = [part for part in remainder.split() if part]
            continue
        if lower_stripped.startswith("# pyodide-wheel-dependency-closure:"):
            remainder = stripped.split(":", 1)[1].strip().lower()
            pyodide_dependency_closure = remainder in ("true", "yes", "1", "full", "closure")
            continue
        if stripped.startswith("#"):
            continue
        pip_lines.append(raw_line)
    return pip_lines, pyodide_root_names, pyodide_dependency_closure


def read_pyodide_npm_version_folder_name(repository_root):
    package_json_path = repository_root / "node_modules" / "pyodide" / "package.json"
    if not package_json_path.is_file():
        return "v0.29.0"
    data = json.loads(package_json_path.read_text(encoding="utf-8"))
    version = str(data.get("version", "0.29.0")).strip()
    return version if version.startswith("v") else f"v{version}"


def collect_pyodide_lock_closure(packages, root_names):
    visited = set()

    def visit(package_name):
        if package_name in visited:
            return
        entry = packages.get(package_name)
        if entry is None:
            return
        visited.add(package_name)
        for dependency in entry.get("depends") or []:
            visit(dependency)

    for root_name in root_names:
        visit(root_name)
    return visited


def collect_pyodide_lock_roots_only(packages, root_names):
    roots = set()
    for root_name in root_names:
        if root_name not in packages:
            print(
                f"[install_python_dependencies] pyodide-lock.json has no package {root_name!r}; skip",
                file=sys.stderr,
            )
            continue
        roots.add(root_name)
    return roots


def topological_sort_pyodide_package_names(packages, package_names):
    names = set(package_names)
    if not names:
        return []
    adjacency = {name: [] for name in names}
    indegree = {name: 0 for name in names}
    for name in names:
        entry = packages.get(name) or {}
        for dependency in entry.get("depends") or []:
            if dependency not in names:
                continue
            adjacency[dependency].append(name)
            indegree[name] += 1
    ready = sorted([name for name in names if indegree[name] == 0])
    ordered = []
    while ready:
        current = ready.pop(0)
        ordered.append(current)
        for successor in sorted(adjacency[current]):
            indegree[successor] -= 1
            if indegree[successor] == 0:
                ready.append(successor)
                ready.sort()
    if len(ordered) != len(names):
        return sorted(names)
    return ordered


def compute_pyodide_load_order_before_pytest(packages, pyodide_package_files):
    if not pyodide_package_files:
        return []
    all_names = set(pyodide_package_files.keys())
    before_pytest = all_names - {"pytest"}
    return topological_sort_pyodide_package_names(packages, before_pytest)


def download_pyodide_wheels_from_lock(
    repository_root,
    destination_directory,
    lock_file_path,
    pyodide_version_folder_name,
    root_names,
    use_dependency_closure,
):
    if not root_names:
        return None, []
    if not lock_file_path.is_file():
        print(
            f"[install_python_dependencies] skip Pyodide wheels: missing {lock_file_path}",
            file=sys.stderr,
        )
        return None, []
    lock_payload = json.loads(lock_file_path.read_text(encoding="utf-8"))
    packages = lock_payload.get("packages") or {}
    if use_dependency_closure:
        name_set = collect_pyodide_lock_closure(packages, root_names)
    else:
        name_set = collect_pyodide_lock_roots_only(packages, root_names)
    sorted_names = sorted(name_set)
    base_url = f"https://cdn.jsdelivr.net/pyodide/{pyodide_version_folder_name}/full/"
    pyodide_package_files = {}
    for package_name in sorted_names:
        entry = packages.get(package_name)
        if entry is None:
            continue
        file_name = entry.get("file_name")
        if not file_name or not str(file_name).endswith(".whl"):
            continue
        destination_file = destination_directory / file_name
        source_url = urljoin(base_url, file_name)
        print(f"[install_python_dependencies] pyodide CDN -> {file_name}")
        download_url_to_file(source_url, destination_file)
        pyodide_package_files[package_name] = file_name
    load_order_before_pytest = compute_pyodide_load_order_before_pytest(packages, pyodide_package_files)
    return pyodide_package_files, load_order_before_pytest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--destination",
        required=True,
        help="Directory where .whl files and wheels-manifest.json are written.",
    )
    parser.add_argument(
        "--requirements",
        default=str(DEFAULT_REQUIREMENTS_PATH),
        help="Requirements file: pip lines plus optional # pyodide-wheels: ... directives.",
    )
    parser.add_argument(
        "--repo-root",
        default=str(REPOSITORY_ROOT),
        help="Repository root (for node_modules/pyodide lockfile).",
    )
    parser.add_argument(
        "--wasm-url",
        default=DEFAULT_IFCOPENSHELL_WASM_WHEEL_URL,
        help="Direct URL for the Pyodide ifcopenshell .whl.",
    )
    parser.add_argument(
        "--extra-wasm-url",
        action="append",
        default=[],
        dest="extra_wasm_urls",
        help="Additional wasm wheel URL if --wasm-url fails (repeatable).",
    )
    arguments = parser.parse_args()
    destination_directory = Path(arguments.destination).resolve()
    requirements_path = Path(arguments.requirements).resolve()
    repository_root = Path(arguments.repo_root).resolve()
    destination_directory.mkdir(parents=True, exist_ok=True)

    if not requirements_path.is_file():
        raise FileNotFoundError(f"requirements file not found: {requirements_path}")

    pip_lines, pyodide_root_names, pyodide_dependency_closure = parse_requirements_directives(
        requirements_path
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix="-pip-requirements.txt",
        delete=False,
        encoding="utf-8",
    ) as temporary_file:
        temporary_file.write("\n".join(pip_lines))
        if pip_lines:
            temporary_file.write("\n")
        temporary_requirements_path = Path(temporary_file.name)

    try:
        pip_command = [
            sys.executable,
            "-m",
            "pip",
            "download",
            "--only-binary=:all:",
            "--no-deps",
            "-r",
            str(temporary_requirements_path),
            "-d",
            str(destination_directory),
        ]
        print(f"[install_python_dependencies] pip download ({len(pip_lines)} packages)")
        subprocess.run(pip_command, check=True)
    finally:
        temporary_requirements_path.unlink(missing_ok=True)

    wasm_urls = [arguments.wasm_url, *arguments.extra_wasm_urls]
    wasm_file_name = wasm_wheel_file_name_from_url(wasm_urls[0])
    wasm_path = destination_directory / wasm_file_name
    print(f"[install_python_dependencies] wasm: {wasm_file_name}")
    download_first_working_url(wasm_urls, wasm_path, wasm_file_name)

    pyodide_version_folder = read_pyodide_npm_version_folder_name(repository_root)
    lock_path = repository_root / "node_modules" / "pyodide" / "pyodide-lock.json"
    pyodide_package_files, pyodide_load_order_before_pytest = download_pyodide_wheels_from_lock(
        repository_root,
        destination_directory,
        lock_path,
        pyodide_version_folder,
        pyodide_root_names,
        pyodide_dependency_closure,
    )
    pyodide_package_files = pyodide_package_files or {}
    manifest_payload = {
        "pyodideVersion": pyodide_version_folder,
        "pyodidePackageFiles": pyodide_package_files,
        "pyodidePackageLoadOrder": pyodide_load_order_before_pytest,
        "pyodidePytestInManifest": "pytest" in pyodide_package_files,
    }
    manifest_path = destination_directory / WHEELS_MANIFEST_FILE_NAME
    manifest_path.write_text(json.dumps(manifest_payload, indent=2) + "\n", encoding="utf-8")
    print(f"[install_python_dependencies] wrote {manifest_path.name}")

    print(f"[install_python_dependencies] done -> {destination_directory}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[install_python_dependencies] error: {error}", file=sys.stderr)
        sys.exit(1)
