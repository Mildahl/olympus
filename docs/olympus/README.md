# Olympus Documentation

Complete documentation for the Olympus/AECO library — a powerful BIM development framework built on Three.js.

**Authoritative sources in the repo:** Hand-written guides and API notes live under `docs/getting-started/`, `docs/guides/`, and `docs/api/`. Edit those first. The `docs/olympus/` tree is used for the static doc site (`npm run docs:olympus`); some pages mirror guides from `docs/guides/`—keep them in sync when you change the canonical files.

## Getting Started

New to Olympus? Start here:

- [Installation](../getting-started/installation.md) — Set up your development environment
- [HelloWorld Tutorial](../getting-started/helloworld-tutorial.md) — Build your first application
- [Project Structure](../getting-started/project-structure.md) — Understand the codebase
- [First Addon](../getting-started/first-addon.md) — Create a custom module

## Guides

In-depth guides for common tasks:

- [How the App Works](guides/how-the-app-works.md) — Architecture overview
- [Configuration](guides/configuration.md) — Config files and options
- [Writing Operators](../guides/writing-operators.md) — Command pattern and undo/redo
- [Building UI](../guides/building-ui.md) — UI components and patterns
- [Using LayoutManager](../guides/using-layoutmanager.md) — Workspaces, `TabPanel`, tab-strip float, persistence
- [Creating Addons](guides/creating-addons.md) — Module development

## API Reference

Complete API documentation:

- [API Overview](../api/README.md) — Import patterns and conventions
- [UIComponents](../api/ui/components.md) — 100+ UI factory methods
- [LayoutManager](../api/ui/layoutmanager.md) — Panel layout system
- [Operators](../api/operators/index.md) — Operator base class and registry

## Examples

Working example walkthroughs:

- [HelloWorld Example](../examples/helloworld/overview.md) — Minimal starter application
- [Addons Example](../examples/addons/overview.md) — Full-featured demo with multiple addons

## Reference (Generated)

Auto-generated API reference:

- [Core API](core-api.md) — Core namespaces and exported functions
- [Modules](modules.md) — Registered modules, dependencies, and operators
- [Operators](operators.md) — Full operator reference (name, label, options)
- [Tools](tools.md) — Available tools (world, code, BIM, IFC)
- [Editors](editors.md) — Editor components and sidebar panels

## Quick Links

| Task | Documentation |
|------|---------------|
| Set up a project | [Installation](../getting-started/installation.md) |
| Create an addon | [First Addon](../getting-started/first-addon.md) |
| Build UI panels | [Building UI](../guides/building-ui.md) |
| Implement commands | [Writing Operators](../guides/writing-operators.md) |
| Manage side panels | [Using LayoutManager](../guides/using-layoutmanager.md) |
| Configure the app | [Configuration](guides/configuration.md) |

## Regenerating Reference Docs

From project root:

```bash
npm run docs:olympus
```
