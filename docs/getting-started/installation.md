# Installation

This guide walks you through setting up a development environment for Olympus/AECO.

For **example vendor assets** under **`examples/vendor/`**, full folder layout, and npm scripts, use the canonical guide: **[Repository setup](../guides/repository-setup.md)**.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- A modern web browser (Chrome, Firefox, Edge)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd Olympus

# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run serve
```

The app will be available at `http://localhost:3000`.

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run serve` | Start local development server on port 3000 |
| `npm run serve:5502` | Start server on port 5502 (Live Server compatible) |
| `npm run build` | Production build with webpack |
| `npm run dev` | Development build with watch mode |
| `npm run dev:worker` | Build Pyodide worker with watch mode |
| `npm run setup` | Install, refresh `examples/vendor/`, and build |
| `npm run vendor:sync` | Refresh `examples/vendor/` from `node_modules` |
| `npm test` | Run test suite |

## Running Examples

You can run the examples:

### HelloWorld Example
Navigate to: `http://localhost:3000/examples/HelloWorld/`

### Addons Example
Navigate to: `http://localhost:3000/examples/Addons/`

## Development Workflow

1. **Start the server**: `npm run serve`
2. **Watch for changes**: In a separate terminal, run `npm run dev`
3. **Open your example** in the browser
4. **Edit source files** — the browser will pick up changes on refresh

## Build Outputs

After running `npm run build`:

```
dist/
├── index.js          # Main AECO bundle
├── pyodide.worker.js # Python execution worker
```

## Troubleshooting

### "Module not found" errors
Make sure you've run `npm run build` at least once so `dist/` exists, and that **`npm install`** has run so **`postinstall`** populated **`examples/vendor/`** (or run **`npm run vendor:sync`**). See [Repository setup](../guides/repository-setup.md) and [Build and runtime troubleshooting](../guides/build-and-runtime-troubleshooting.md).

### Port already in use
Use `npm run serve:5502` or run `npx serve@14 . -l <port>` from the repository root.

### Python features not working
Ensure the Pyodide worker is built: `npm run dev:worker`

## Next Steps

- [Repository setup](../guides/repository-setup.md) — Vendor folders and full setup
- [HelloWorld Tutorial](helloworld-tutorial.md) — Build your first app
- [Project Structure](project-structure.md) — Understand the codebase
- [First Addon](first-addon.md) — Create a custom module
