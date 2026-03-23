import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repositoryRoot = path.resolve(__dirname, "..");
const sourceScope = path.join(repositoryRoot, "node_modules", "@ifc-lite");
const destinationRoot = path.join(repositoryRoot, "external", "vendor", "ifc-lite");

const packageNames = [
  "geometry",
  "parser",
  "wasm",
  "data",
  "encoding",
  "ifcx",
  "mutations",
];

if (!fs.existsSync(sourceScope)) {
  console.warn(
    "[sync-ifc-lite-vendor] node_modules/@ifc-lite not found; run npm install first."
  );
  process.exit(0);
}

fs.mkdirSync(destinationRoot, { recursive: true });

for (let index = 0; index < packageNames.length; index++) {
  const packageName = packageNames[index];
  const sourcePath = path.join(sourceScope, packageName);
  const destinationPath = path.join(destinationRoot, packageName);

  if (!fs.existsSync(sourcePath)) {
    console.warn(
      `[sync-ifc-lite-vendor] skip missing package: @ifc-lite/${packageName}`
    );
    continue;
  }

  fs.rmSync(destinationPath, { recursive: true, force: true });
  fs.cpSync(sourcePath, destinationPath, { recursive: true });
}

console.log(
  `[sync-ifc-lite-vendor] copied @ifc-lite/* into ${path.relative(repositoryRoot, destinationRoot)}`
);
