import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repositoryRoot = path.resolve(__dirname, "..");
const pytoolsSource = path.join(repositoryRoot, "src", "tool", "bim", "pytools");
const pytoolsDest = path.join(repositoryRoot, "dist", "pytools");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyPytools() {
  ensureDir(pytoolsDest);
  const files = fs.readdirSync(pytoolsSource).filter(f => f.endsWith(".py"));
  for (const file of files) {
    const src = path.join(pytoolsSource, file);
    const dest = path.join(pytoolsDest, file);
    fs.copyFileSync(src, dest);
    console.log(`[copy-pytools] Copied ${file} to dist/pytools/`);
  }
}

copyPytools();
