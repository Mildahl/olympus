/**
 * Olympus documentation generator.
 * Introspects Core API, Modules, and Operators; writes Markdown to docs/olympus/.
 * Run from project root: node scripts/docs-olympus.js
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_DIR = join(ROOT, 'docs', 'olympus');

function toFileUrl(p) {
  return pathToFileURL(p).href;
}

// Minimal browser globals so Olympus modules can load in Node (many only need these to parse)
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({}),
    body: {},
    documentElement: {},
    head: {},
    addEventListener: () => {},
  };
}

async function loadCore() {
  const Core = (await import(toFileUrl(join(ROOT, 'src', 'core', 'index.js')))).default;
  const api = {};
  for (const [namespace, mod] of Object.entries(Core)) {
    if (mod && typeof mod === 'object') {
      api[namespace] = Object.keys(mod).filter((k) => typeof mod[k] === 'function');
    }
  }
  return api;
}

/** Fallback: extract Core API from source when dynamic import fails (e.g. missing "three"). */
function loadCoreFromFiles() {
  const coreDir = join(ROOT, 'src', 'core');
  const indexPath = join(coreDir, 'index.js');
  const indexSrc = readFileSync(indexPath, 'utf8');
  const api = {};
  // Match: import * as Name from "./file.js"
  const importRe = /import\s+\*\s+as\s+(\w+)\s+from\s+["']\.\/([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(indexSrc)) !== null) {
    const namespace = m[1];
    const file = m[2].replace(/\.js$/, '') + '.js';
    const filePath = join(coreDir, file);
    try {
      const src = readFileSync(filePath, 'utf8');
      const fns = [];
      const fnRe = /function\s+(\w+)\s*\(/g;
      let fm;
      while ((fm = fnRe.exec(src)) !== null) fns.push(fm[1]);
      api[namespace] = [...new Set(fns)];
    } catch (_) {
      api[namespace] = [];
    }
  }
  return api;
}

/** Fallback: extract modules and operators from source when dynamic import fails. */
function loadModulesAndOperatorsFromFiles() {
  const modulesIndexPath = join(ROOT, 'src', 'modules', 'index.js');
  const indexSrc = readFileSync(modulesIndexPath, 'utf8');
  const moduleDirs = [];
  const importRe = /import\s+\w+\s+from\s+['"]\.\/([^'"]+\/)module\.js['"]/g;
  let m;
  while ((m = importRe.exec(indexSrc)) !== null) moduleDirs.push(m[1].replace(/\/$/, ''));
  const modules = [];
  const operators = [];
  const modulesBase = join(ROOT, 'src', 'modules');
  for (const dir of moduleDirs) {
    const modPath = join(modulesBase, dir, 'module.js');
    const opsPath = join(modulesBase, dir, 'operators.js');
    let id = dir.replace(/\//g, '.');
    let name = id;
    let description = '';
    let version = '1.0.0';
    let dependsOn = [];
    try {
      const modSrc = readFileSync(modPath, 'utf8');
      const idM = modSrc.match(/id:\s*['"]([^'"]+)['"]/);
      const nameM = modSrc.match(/name:\s*['"]([^'"]+)['"]/);
      const descM = modSrc.match(/description:\s*['"]([^'"]*)['"]/);
      const verM = modSrc.match(/version:\s*['"]([^'"]*)['"]/);
      const depM = modSrc.match(/dependsOn:\s*\[([^\]]*)\]/);
      if (idM) id = idM[1];
      if (nameM) name = nameM[1];
      if (descM) description = descM[1];
      if (verM) version = verM[1];
      if (depM) {
        const depStr = depM[1];
        const ids = depStr.match(/['"]([^'"]+)['"]/g);
        dependsOn = ids ? ids.map((s) => s.slice(1, -1)) : [];
      }
    } catch (_) {}
    const operatorNames = [];
    const operatorLabels = [];
    const operatorOptionsList = [];
    try {
      const opsSrc = readFileSync(opsPath, 'utf8');
      const nameRe = /static\s+operatorName\s*=\s*["']([^"']+)["']/g;
      const labelRe = /static\s+operatorLabel\s*=\s*["']([^"']*)["']/g;
      const optionsRe = /static\s+operatorOptions\s*=\s*\[([^\]]*)\]/g;
      let nm;
      const names = [];
      while ((nm = nameRe.exec(opsSrc)) !== null) names.push(nm[1]);
      const labels = [];
      while ((nm = labelRe.exec(opsSrc)) !== null) labels.push(nm[1]);
      const optionsList = [];
      while ((nm = optionsRe.exec(opsSrc)) !== null) {
        const opts = nm[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        optionsList.push(opts);
      }
      for (let i = 0; i < names.length; i++) {
        operatorNames.push(names[i]);
        operatorLabels.push(labels[i] || names[i]);
        operatorOptionsList.push(optionsList[i] || []);
        operators.push({
          operatorName: names[i],
          operatorLabel: labels[i] || names[i],
          operatorOptions: optionsList[i] || [],
          moduleId: id,
        });
      }
    } catch (_) {}
    modules.push({
      id,
      name,
      description,
      version,
      dependsOn,
      operatorNames,
      operatorLabels,
      operatorOptionsList,
    });
  }
  return { modules, operators };
}

/** Extract tools registry from src/tool/index.js (file-based). */
function loadToolsFromFiles() {
  const toolIndexPath = join(ROOT, 'src', 'tool', 'index.js');
  const src = readFileSync(toolIndexPath, 'utf8');
  const tools = { world: [], code: [], bim: [], ifc: null };
  const importRe = /import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/g;
  const map = new Map();
  let m;
  while ((m = importRe.exec(src)) !== null) map.set(m[1], m[2]);
  const worldRe = /this\.world\s*=\s*\{([^}]+)\}/s;
  const codeRe = /this\.code\s*=\s*\{([^}]+)\}/s;
  const bimRe = /this\.bim\s*=\s*\{([^}]+)\}/s;
  const ifcRe = /this\.ifc\s*=\s*(\w+)/;
  const parseAssignments = (block) => {
    const items = [];
    const lineRe = /(\w+):\s*(\w+)/g;
    let lm;
    while ((lm = lineRe.exec(block)) !== null) {
      const key = lm[1];
      const className = lm[2];
      const path = map.get(className);
      items.push({ key, className, path: path ? `src/tool/${path}` : null });
    }
    return items;
  };
  const worldBlock = worldRe.exec(src);
  if (worldBlock) tools.world = parseAssignments(worldBlock[1]);
  const codeBlock = codeRe.exec(src);
  if (codeBlock) tools.code = parseAssignments(codeBlock[1]);
  const bimBlock = bimRe.exec(src);
  if (bimBlock) tools.bim = parseAssignments(bimBlock[1]);
  const ifcMatch = ifcRe.exec(src);
  if (ifcMatch) tools.ifc = { key: 'ifc', className: ifcMatch[1], path: map.get(ifcMatch[1]) ? `src/tool/${map.get(ifcMatch[1])}` : null };
  return tools;
}

function writeToolsMd(tools) {
  let md = '# Tools\n\nTools are low-level capabilities (scene, model, scripting, BIM, etc.) exposed on `simulation.tools`. They are used by Core, operators, and UI. The registry is defined in `src/tool/index.js`.\n\n';
  md += '## World / viewer\n\n';
  md += '| Key | Class | Path |\n|-----|-------|------|\n';
  for (const t of tools.world) {
    const path = t.path ? `\`${t.path}\`` : '—';
    md += `| \`${t.key}\` | ${t.className} | ${path} |\n`;
  }
  md += '\n## Code\n\n';
  md += '| Key | Class | Path |\n|-----|-------|------|\n';
  for (const t of tools.code) {
    const path = t.path ? `\`${t.path}\`` : '—';
    md += `| \`${t.key}\` | ${t.className} | ${path} |\n`;
  }
  md += '\n## BIM\n\n';
  md += '| Key | Class | Path |\n|-----|-------|------|\n';
  for (const t of tools.bim) {
    const path = t.path ? `\`${t.path}\`` : '—';
    md += `| \`${t.key}\` | ${t.className} | ${path} |\n`;
  }
  md += '\n## IFC\n\n';
  if (tools.ifc) {
    md += '| Key | Class | Path |\n|-----|-------|------|\n';
    const path = tools.ifc.path ? `\`${tools.ifc.path}\`` : '—';
    md += `| \`${tools.ifc.key}\` | ${tools.ifc.className} | ${path} |\n`;
  } else {
    md += '*Not documented.*\n';
  }
  return md;
}

async function loadModulesAndOperators() {
  const { CoreModuleDefinitions } = await import(toFileUrl(join(ROOT, 'src', 'modules', 'index.js')));
  const modules = [];
  const operators = [];
  for (const def of CoreModuleDefinitions) {
    const mod = {
      id: def.id,
      name: def.name,
      description: def.description || '',
      version: def.version || '1.0.0',
      dependsOn: def.dependsOn || [],
      operatorNames: [],
      operatorLabels: [],
      operatorOptionsList: [],
    };
    const ops = def.operators || [];
    if (!Array.isArray(ops)) continue;
    for (const Op of ops) {
      const name = Op.operatorName;
      const label = Op.operatorLabel;
      const options = Op.operatorOptions || [];
      if (name) {
        mod.operatorNames.push(name);
        mod.operatorLabels.push(label || name);
        mod.operatorOptionsList.push(options);
        operators.push({
          operatorName: name,
          operatorLabel: label || name,
          operatorOptions: options,
          moduleId: def.id,
        });
      }
    }
    modules.push(mod);
  }
  return { modules, operators };
}

const EDITOR_MANIFEST = [
  { name: 'Editor', path: 'src/context/world/Editor.js', description: 'Main editor class: scene, camera, signals, history, loader, storage.' },
  { name: 'EditorControls', path: 'src/context/world/EditorControls.js', description: 'Viewport controls used by the editor.' },
  { name: 'Sidebar', path: 'src/context/world/editor/Sidebar.js', description: 'Main sidebar container and panel registration.' },
  { name: 'Sidebar (Scene)', path: 'src/context/world/editor/Sidebar.Scene.js', description: 'Scene hierarchy panel.' },
  { name: 'Sidebar (Properties)', path: 'src/context/world/editor/Sidebar.Properties.js', description: 'Object properties panel.' },
  { name: 'Sidebar (Project)', path: 'src/context/world/editor/Sidebar.Project.js', description: 'Project / assets panel.' },
  { name: 'Sidebar (Material)', path: 'src/context/world/editor/Sidebar.Material.js', description: 'Material editing panel.' },
  { name: 'Sidebar (Geometry)', path: 'src/context/world/editor/Sidebar.Geometry.js', description: 'Geometry editing panel.' },
  { name: 'Sidebar (Settings)', path: 'src/context/world/editor/Sidebar.Settings.js', description: 'Editor settings panel.' },
  { name: 'Sidebar (Script)', path: 'src/context/world/editor/Sidebar.Script.js', description: 'Script attachment panel.' },
  { name: 'Config', path: 'src/context/world/editor/Config.js', description: 'Editor configuration.' },
  { name: 'Loader', path: 'src/context/world/editor/Loader.js', description: 'Asset loading.' },
  { name: 'History', path: 'src/context/world/editor/History.js', description: 'Undo/redo history.' },
  { name: 'Storage', path: 'src/context/world/editor/Storage.js', description: 'Editor storage/persistence.' },
  { name: 'NavigationController', path: 'src/context/world/editor/NavigationController.js', description: 'Fly/drive navigation.' },
  { name: 'ScriptEditorWindow', path: 'src/modules/code.scripting/ScriptEditorWindow.js', description: 'Script editor window (module).' },
  { name: 'MonacoEditor', path: 'src/tool/code/MonacoEditor/MonacoEditor.js', description: 'Monaco-based code editor tool.' },
  { name: 'CodeEditorTool', path: 'src/tool/code/CodeEditorTool.js', description: 'Code editor tool.' },
  { name: 'NodeEditorTool', path: 'src/tool/code/NodeEditorTool.js', description: 'Node editor tool.' },
];

function ensureDir(dir) {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (_) {}
}

function writeCoreApiMd(api) {
  let md = '# Core API\\n\\nOlympus Core is a single object exported from `src/core/index.js`. Each namespace provides functions used by operators and the app.\\n\\n';
  for (const [namespace, fns] of Object.entries(api)) {
    md += `## ${namespace}\n\n`;
    if (fns.length) {
      md += '| Function |\n|----------|\n';
      for (const fn of fns) md += `| \`${fn}\` |\n`;
    } else {
      md += '*No exported functions listed.*\n';
    }
    md += '\n';
  }
  return md;
}

/** Build a URL-safe anchor for a module id (e.g. world.viewpoints -> module-world-viewpoints). */
function moduleAnchor(id) {
  return 'module-' + (id || '').replace(/\./g, '-');
}

function writeModulesMd(modules) {
  let md = '# Modules\\n\\nCore modules are registered in `src/modules/index.js` and activated via `moduleRegistry`. Each module can expose operators and UI. The table below is a **table of contents** — use it to jump to each module.\\n\\n';
  md += '## Table of contents\n\n';
  md += '| Id | Name | Description | Version | Depends on | Operators |\n';
  md += '|----|------|-------------|---------|------------|----------|\n';
  for (const m of modules) {
    const deps = (m.dependsOn || []).join(', ') || '—';
    const opsCount = (m.operatorNames || []).length;
    const anchor = moduleAnchor(m.id);
    const nameLink = `[${m.name}](#${anchor})`;
    md += `| \`${m.id}\` | ${nameLink} | ${(m.description || '').replace(/\|/g, '\\|')} | ${m.version} | ${deps} | ${opsCount} |\n`;
  }
  md += '\n---\n\n';
  for (const m of modules) {
    const anchor = moduleAnchor(m.id);
    md += `## ${m.name} {#${anchor}}\n\n`;
    md += `**Id:** \`${m.id}\`  \n`;
    md += `**Version:** ${m.version}  \n`;
    if ((m.dependsOn || []).length) {
      md += `**Depends on:** ${m.dependsOn.map((d) => `\`${d}\``).join(', ')}  \n`;
    }
    md += '\n';
    if (m.description) md += m.description + '\n\n';
    const names = m.operatorNames || [];
    const labels = m.operatorLabels || [];
    if (names.length) {
      md += '### Operators\n\n';
      md += '| Operator | Label | Options |\n';
      md += '|----------|-------|--------|\n';
      for (let i = 0; i < names.length; i++) {
        const opts = (m.operatorOptionsList && m.operatorOptionsList[i]) ? m.operatorOptionsList[i].join(', ') : '';
        md += `| \`${names[i]}\` | ${(labels[i] || '').replace(/\|/g, '\\|')} | ${opts || '—'} |\n`;
      }
      md += '\n';
    } else {
      md += '*No operators.*\n\n';
    }
  }
  return md;
}

function writeOperatorsMd(operators, modules) {
  let md = '# Operators\n\nOperators are invoked with `operators.execute(operatorName, context, ...args)`. Only operators from active modules are registered.\n\n';
  md += 'This page is a **table of contents** by module. Use the links below to jump to the operator list for each module in [Modules](modules.md).\n\n';
  md += '## By module\n\n';
  md += '| Module | Operators |\n';
  md += '|--------|----------|\n';
  const byModule = new Map();
  for (const op of operators) {
    if (!byModule.has(op.moduleId)) byModule.set(op.moduleId, []);
    byModule.get(op.moduleId).push(op);
  }
  const moduleIds = [...new Set(operators.map((o) => o.moduleId))];
  const moduleNames = new Map((modules || []).map((m) => [m.id, m.name]));
  for (const moduleId of moduleIds) {
    const list = byModule.get(moduleId) || [];
    const anchor = 'module-' + (moduleId || '').replace(/\./g, '-');
    const name = moduleNames.get(moduleId) || moduleId;
    const link = `[${name}](modules.md#${anchor})`;
    md += `| ${link} | ${list.length} |\n`;
  }
  md += '\n---\n\n## Flat reference\n\n';
  md += '| Operator | Label | Module | Options |\n';
  md += '|----------|-------|--------|--------|\n';
  for (const op of operators) {
    const opts = (op.operatorOptions || []).join(', ') || '—';
    const anchor = 'module-' + (op.moduleId || '').replace(/\./g, '-');
    const modLink = `[\`${op.moduleId}\`](modules.md#${anchor})`;
    md += `| \`${op.operatorName}\` | ${(op.operatorLabel || '').replace(/\|/g, '\\|')} | ${modLink} | ${opts} |\n`;
  }
  return md;
}

function writeEditorsMd() {
  let md = '# Editors & editor support\n\nMain editor and related UI/support components. No central registry — structure is fixed.\n\n';
  md += '| Name | Path | Description |\n';
  md += '|------|------|-------------|\n';
  for (const e of EDITOR_MANIFEST) {
    md += `| ${e.name} | \`${e.path}\` | ${e.description} |\n`;
  }
  return md;
}

function writeReadmeMd() {
  return `# Olympus documentation

Generated documentation and guides for the Olympus application: Editors, Core API, Modules, Operators, Tools, and how to configure the app and create addons.

## Reference (generated)

- [Core API](core-api.md) — Core namespaces and their exported functions.
- [Modules](modules.md) — Registered modules, dependencies, and their operators.
- [Operators](operators.md) — Full operator reference (name, label, module, options).
- [Tools](tools.md) — Available tools (world, code, BIM, IFC) and their paths.
- [Editors](editors.md) — Editor class and editor-related components (sidebar, config, loader, etc.).

## Guides

- [How the app works](guides/how-the-app-works.md) — Entrypoint (aeco.js), Core, tools, operators, UI.
- [Creating addons](guides/creating-addons.md) — Module shape, registering addons, operators and UI.
- [Configuration](guides/configuration.md) — Config files (config.js, modules, scene, shortcuts, navigation, UI).
- [Getting started](guides/getting-started.md) — HelloWorld and GameExperience setup and addon demo.

## Regenerating reference docs

From project root:

\`\`\`bash
npm run docs:olympus
\`\`\`
`;
}

async function main() {
  ensureDir(DOCS_DIR);

  let coreApi = {};
  try {
    coreApi = await loadCore();
  } catch (e) {
    console.warn('Could not load Core via import, using file-based extraction:', e.message);
    coreApi = loadCoreFromFiles();
  }

  let modules = [];
  let operators = [];
  try {
    const out = await loadModulesAndOperators();
    modules = out.modules;
    operators = out.operators;
  } catch (e) {
    console.warn('Could not load modules via import, using file-based extraction:', e.message);
    const out = loadModulesAndOperatorsFromFiles();
    modules = out.modules;
    operators = out.operators;
  }

  writeFileSync(join(DOCS_DIR, 'README.md'), writeReadmeMd());
  writeFileSync(join(DOCS_DIR, 'core-api.md'), writeCoreApiMd(coreApi));
  writeFileSync(join(DOCS_DIR, 'modules.md'), writeModulesMd(modules));
  writeFileSync(join(DOCS_DIR, 'operators.md'), writeOperatorsMd(operators, modules));
  writeFileSync(join(DOCS_DIR, 'editors.md'), writeEditorsMd());

  const tools = loadToolsFromFiles();
  writeFileSync(join(DOCS_DIR, 'tools.md'), writeToolsMd(tools));

  writeFileSync(
    join(DOCS_DIR, 'api.json'),
    JSON.stringify({ coreApi, modules, operators, editors: EDITOR_MANIFEST, tools }, null, 2)
  );

  console.log('Olympus docs written to docs/olympus/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
