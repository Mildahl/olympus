export const coreModuleManifest = [
  { id: "configurator", dependsOn: [], bundle: "shell" },
  { id: "world.information", dependsOn: ["world"], bundle: "world" },
  { id: "theme", dependsOn: [], bundle: "shell" },
  { id: "world", dependsOn: [], bundle: "world" },
  { id: "world.notification", dependsOn: ["world"], bundle: "world" },
  { id: "world.layer", dependsOn: ["world"], bundle: "world" },
  { id: "world.spatial", dependsOn: ["world", "world.layer"], bundle: "world" },
  { id: "world.viewpoints", dependsOn: ["world"], bundle: "world" },
  { id: "world.animationPath", dependsOn: ["world", "world.viewpoints"], bundle: "world" },
  { id: "world.measure", dependsOn: ["world"], bundle: "world" },
  { id: "world.sectionbox", dependsOn: ["world"], bundle: "world" },
  { id: "world.snap", dependsOn: [], bundle: "world" },
  { id: "world.history", dependsOn: ["world"], bundle: "world" },
  { id: "world.navigation", dependsOn: ["world"], bundle: "shell" },
  { id: "settings", dependsOn: ["theme", "world.navigation"], bundle: "shell" },
  { id: "tiles", dependsOn: ["world"], bundle: "shell" },
  { id: "code.scripting", dependsOn: ["world"], bundle: "code" },
  { id: "code.terminal", dependsOn: ["world", "code.scripting"], bundle: "code" },
  { id: "bim.project", dependsOn: ["world", "code.scripting"], bundle: "bim" },
  { id: "bim.analytics", dependsOn: ["bim.project"], bundle: "bim" },
  { id: "bim.attribute", dependsOn: ["bim.project"], bundle: "bim" },
  { id: "bim.pset", dependsOn: ["bim.project"], bundle: "bim" },
  { id: "bim.model", dependsOn: ["bim.project"], bundle: "bim" },
  { id: "bim.sequence", dependsOn: ["bim.project"], bundle: "bim" },
];

const coreModuleManifestById = new Map();

for (let i = 0; i < coreModuleManifest.length; i++) {
  const entry = coreModuleManifest[i];

  coreModuleManifestById.set(entry.id, entry);
}

export { coreModuleManifestById };
