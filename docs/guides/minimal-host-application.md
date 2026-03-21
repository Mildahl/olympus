# Minimal host application

Smallest pattern for bootstrapping an `AECO` instance with configuration and addons. Paths match an example-style app that lives under `examples/<YourApp>/` with local `configuration/` and `addons/` folders.

```javascript
import { AECO } from "./../../src/index.js";
import { AECOConfiguration } from "./configuration/config.js";
import { ADDONS } from "./addons/index.js";

const aecoApplication = new AECO(document.body);

aecoApplication.createUI({
  config: AECOConfiguration,
  container: document.body,
  addons: { ADDONS },
});
```

For project layout and build steps, see [Repository setup](repository-setup.md). For architecture, see [How the app works](../olympus/guides/how-the-app-works.md) (generated doc site) or [Project structure](../getting-started/project-structure.md).
