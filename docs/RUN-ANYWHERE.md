# AECOToolkit — Run Anywhere Strategy

AECOToolkit is a vanilla JavaScript library. Its core API (`new AECO(container)` + `simulation.createUI(...)`) takes a DOM element and builds everything inside it. This makes it inherently portable — any environment that provides a DOM (or a DOM-like surface) can host AECO.

This document lays out what professional developers expect when they clone the repo, how the vanilla JS core can be consumed by any framework, and every runtime target we can support.

---

## 1. What Professional Developers Expect

A developer cloning a GitHub repo expects to go from zero to running app in under 60 seconds with three commands:

```
git clone https://github.com/AECOToolkit/AECOToolkit.git
npm run setup
npm run start
```

### Current friction points

| Issue | Impact | Fix |
|-------|--------|-----|
| `package.json` entry points reference `src/index.js` (does not exist) | `import { AECO } from 'aeco'` fails in any bundler | Change to `olympus/index.js` |
| No `npm start` script | Breaks the universal convention — devs type `npm start` first | Add `"start": "npm run serve"` |
| No root `index.html` | `localhost:3000` shows a directory listing instead of the app | Add a landing page or redirect to `/examples/HelloWorld/` |
| No `simulation.destroy()` method | Memory leaks when unmounting in SPAs or framework components | Add cleanup method to `AECO` class |
| `context` is a module-level singleton | Cannot create two independent AECO instances (blocks framework use) | Make context instance-scoped |
| Missing `"sideEffects": false` in package.json | Bundlers cannot tree-shake unused modules | Add the field |

### Expected developer experience after fixes

```
npm run setup          # install + build (already works)
npm start              # serves at localhost:3000
                       # browser opens → example picker or HelloWorld
```

For library consumers in their own projects:

```
npm install aeco
```

```js
import { AECO } from 'aeco';
const sim = new AECO(document.getElementById('viewer'));
sim.createUI({ config: myConfig, container: sim.context.dom, addons: myAddons });
```

---

## 2. Framework Integration — Vanilla JS as the Universal Base

The `AECO` class takes a DOM container and exposes `context`, `tools`, `ops`, `data`. This is already framework-agnostic. To let developers use AECO inside React, Vue, Svelte, Angular, or Web Components, we provide **thin adapter layers** — not rewrites.

### 2.1 Architectural prerequisites (core changes)

| Change | Why |
|--------|-----|
| Add `simulation.destroy()` | Frameworks mount/unmount components. Without cleanup, Three.js renderers, event listeners, and animation loops leak. |
| Instance-scoped context | Currently `context` is a singleton export from `olympus/context/index.js`. If a React app renders two `<AECOViewer>` components, they share state and collide. Each `new AECO()` must create its own context. |
| TypeScript declarations | Angular and typed React projects need `.d.ts` files. We already declare `"types": "types/aeco.d.ts"` in package.json — the file must actually exist and be accurate. |

### 2.2 Web Component (framework-agnostic, highest priority)

A `<aeco-viewer>` custom element works in every framework and in plain HTML:

```html
<aeco-viewer config="./configuration/config.js"></aeco-viewer>
```

Implementation sketch:

```js
class AecoViewer extends HTMLElement {
  connectedCallback() {
    this.simulation = new AECO(this);
    this.simulation.createUI({
      config: this._config,
      container: this,
      addons: this._addons
    });
  }

  disconnectedCallback() {
    this.simulation.destroy();
  }
}
customElements.define('aeco-viewer', AecoViewer);
```

This is the single highest-leverage wrapper because it works everywhere: React, Vue, Svelte, Angular, plain HTML, Electron, Tauri.

### 2.3 React wrapper

```jsx
import { useRef, useEffect } from 'react';
import { AECO } from 'aeco';

export function AECOViewer({ config, addons }) {
  const ref = useRef();

  useEffect(() => {
    const sim = new AECO(ref.current);
    sim.createUI({ config, container: ref.current, addons });
    return () => sim.destroy();
  }, []);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
```

### 2.4 Vue composable

```js
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { AECO } from 'aeco';

export function useAeco(config, addons) {
  const container = ref(null);
  let simulation = null;

  onMounted(() => {
    simulation = new AECO(container.value);
    simulation.createUI({ config, container: container.value, addons });
  });

  onBeforeUnmount(() => simulation?.destroy());

  return { container, simulation };
}
```

### 2.5 Svelte action

```svelte
<script>
  import { AECO } from 'aeco';

  function aeco(node, { config, addons }) {
    const sim = new AECO(node);
    sim.createUI({ config, container: node, addons });
    return { destroy: () => sim.destroy() };
  }
</script>

<div use:aeco={{ config, addons }} style="width:100%;height:100%"></div>
```

### 2.6 Angular directive

```ts
@Directive({ selector: '[aecoViewer]' })
export class AecoViewerDirective implements OnInit, OnDestroy {
  @Input() config: any;
  @Input() addons: any;
  private simulation: any;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.simulation = new AECO(this.el.nativeElement);
    this.simulation.createUI({
      config: this.config,
      container: this.el.nativeElement,
      addons: this.addons
    });
  }

  ngOnDestroy() {
    this.simulation?.destroy();
  }
}
```

### 2.7 Wrapper priority

| Priority | Wrapper | Reason |
|----------|---------|--------|
| 1 | Web Component `<aeco-viewer>` | Works in every framework and plain HTML |
| 2 | React hook + component | Largest frontend ecosystem |
| 3 | Vue composable | Second largest, strong in enterprise |
| 4 | Svelte action | Growing fast, trivial to implement |
| 5 | Angular directive | Enterprise demand |

---

## 3. Desktop Targets

### 3.1 PWA (Progressive Web App) — zero install

We already have `sw.js` service worker files in every example. Adding a `manifest.json` turns the app into an installable desktop-like experience.

| Pros | Cons |
|------|------|
| Zero download — users click "Install" from browser | No full filesystem access (limited to File System Access API on Chromium) |
| Automatic updates | Cannot access native menus, system tray |
| Works offline with cached assets | Performance limited to browser sandbox |
| Smallest footprint (~3 MB cached) | Not available on all browsers equally |

What we need:
- `manifest.json` with app name, icons, `"display": "standalone"`, theme color
- Icon set (192px, 512px minimum)
- Service worker caching strategy for offline support
- Meta tags in `index.html` (`<link rel="manifest">`, theme-color)

### 3.2 Electron — full native access

Electron wraps the web app in Chromium + Node.js. Our `index.html` + import maps work unmodified.

| Pros | Cons |
|------|------|
| Full filesystem access (load local IFC files) | ~150 MB distribution size (bundles Chromium) |
| Native menus, dialogs, system tray | Higher memory usage |
| Mature ecosystem (VS Code, Figma, Slack use it) | Requires packaging pipeline |
| Node.js APIs available (spawn processes, etc.) | Security surface is larger |

What we need:
- `electron/main.js` (~30 lines: create BrowserWindow, load index.html)
- `electron/preload.js` (bridge for IPC if needed)
- `electron-builder` or `electron-forge` config for packaging
- npm scripts: `"desktop": "electron ."`, `"desktop:build": "electron-builder"`

### 3.3 Tauri — lightweight native shell

Tauri uses the OS native webview (WebView2 on Windows, WebKit on macOS/Linux) with a Rust backend.

| Pros | Cons |
|------|------|
| ~5-10 MB distribution (no bundled browser) | Requires Rust toolchain to build |
| Lower memory than Electron | Webview behavior varies across OS |
| Fast startup | Younger ecosystem |
| Rust backend for performance-critical tasks | Less Node.js ecosystem compatibility |

What we need:
- `src-tauri/` folder with `tauri.conf.json` and `main.rs`
- Tauri CLI: `npm install -D @tauri-apps/cli`
- npm scripts: `"desktop:tauri": "tauri dev"`, `"desktop:tauri:build": "tauri build"`

### 3.4 Desktop comparison

| | PWA | Electron | Tauri |
|---|-----|----------|-------|
| Install size | ~3 MB (cached) | ~150 MB | ~10 MB |
| Filesystem access | Limited | Full | Full |
| Native menus | No | Yes | Yes |
| Offline support | Yes | Yes | Yes |
| Build complexity | None | Medium | Medium (Rust) |
| Cross-platform | Browser-dependent | Win/Mac/Linux | Win/Mac/Linux |

---

## 4. Deployment & Hosting Targets

### 4.1 Static hosting (GitHub Pages, Netlify, Vercel)

The built app (`static/dist/aeco.js` + examples) is a static site. Deploy to any static host.

```
npm run build
# Upload contents to any static host
```

### 4.2 Docker container

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app /usr/share/nginx/html
EXPOSE 80
```

Users run: `docker run -p 3000:80 aecotoolkit/aeco`

### 4.3 Embeddable (iframe)

Any website can embed AECO:

```html
<iframe src="https://your-aeco-instance.app/examples/HelloWorld/" 
        style="width:100%;height:600px;border:none;"></iframe>
```

---

## 5. The Full "Run Anywhere" Matrix

| Mode | Command / Action | Install | Offline | Native APIs | Distribution Size |
|------|-----------------|---------|---------|-------------|-------------------|
| **Browser (dev)** | `npm start` → localhost:3000 | `npm run setup` | No | No | 0 (served locally) |
| **Browser (hosted)** | Visit URL on any static host | None | No | No | ~3 MB assets |
| **PWA** | "Install App" from browser | Click install | Yes | Limited | ~3 MB cached |
| **Electron** | `npm run desktop` | Download app | Yes | Full | ~150 MB |
| **Tauri** | `npm run desktop:tauri` | Download app | Yes | Full | ~10 MB |
| **Docker** | `docker run -p 3000:80 aeco` | Docker pull | N/A | Server-side | ~50 MB image |
| **Embedded** | `<iframe src="...">` | None | No | No | 0 |
| **npm library** | `npm install aeco` | npm install | Depends | Depends | ~1 MB (library) |
| **Web Component** | `<aeco-viewer>` in any page | npm install | Depends | Depends | ~1 MB (library) |
| **Framework (React/Vue/etc.)** | Wrapper component | npm install | Depends | Depends | ~1 MB (library) |

---

## 6. Implementation Priority

### Phase A — Core readiness (required for everything)

1. Fix `package.json` entry points (`olympus/index.js`)
2. Add `"start"` script
3. Add `"sideEffects": false`
4. Add `simulation.destroy()` to `AECO` class
5. Validate TypeScript declarations

### Phase B — Immediate distribution (v1.0)

6. Add root `index.html` (example picker / redirect)
7. Add `manifest.json` + icons for PWA
8. Enhance existing `sw.js` with proper caching strategy
9. Add Dockerfile

### Phase C — Framework wrappers (v1.1)

10. Build `<aeco-viewer>` Web Component
11. Publish React wrapper (`@aeco/react`)
12. Publish Vue wrapper (`@aeco/vue`)
13. Svelte and Angular wrappers

### Phase D — Desktop shells (v1.2)

14. Electron scaffold (`electron/main.js`, build config)
15. Tauri scaffold (`src-tauri/`, config)
16. Desktop packaging scripts and CI

### Phase E — Enterprise distribution (v2.0)

17. Docker image on Docker Hub / GHCR
18. Helm chart for Kubernetes deployment
19. Embeddable widget with postMessage API
20. Instance-scoped context (multi-instance support)
