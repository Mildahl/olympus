import { AECO } from "aeco";

import { AECOConfiguration } from "./configuration/config.js";

const simulation = new AECO();

const context = simulation.context;

const load5DModel = async () => {

    const ROOT = window.__OLYMPUS_ROOT__ || '';
    
    const path = ROOT + "/external/ifc/5D.ifc";

    await simulation.ops.execute("bim.load_model_from_path", context, path, null, "5D.ifc")

}

const loadGeometryData = async () => {
    await simulation.ops.execute(
        "bim.load_geometry_data",
        context,
        "5D.ifc",
        "Buildings",
        "ifcopenshell",
    );
};

(async function bootstrapHelloWorld() {
  await simulation.createUI({ config: AECOConfiguration, container: document.body });

  simulation.moduleRegistry.logActiveModulesAndUI();

  simulation.tools.world.scene.addCube(context, 1, "grey");

  simulation.enablePython().then(() => {
    simulation.enableBIM().then(() => {
        load5DModel().then(() => {
            loadGeometryData();
        });
    });
  });
})();

export default simulation;