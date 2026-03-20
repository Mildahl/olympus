import { DrawUI } from "./../../drawUI/index.js";

const splash = DrawUI.splash({ imageUrl: '/external/ifc/splash.png', text: 'Initializing...' });
splash.show(document.body);
splash.setText('Creating UI...');

import { AECO } from "aeco";

import { AECOConfiguration } from "./configuration/config.js";

const simulation = new AECO();

const context = simulation.context;

simulation.createUI({ config: AECOConfiguration, container: document.body });

simulation.moduleRegistry.logActiveModulesAndUI();

splash.hide();

simulation.tools.world.scene.addCube(context, 1, "grey");      

const load5DModel = async () => {

    const path = "/external/ifc/5D.ifc";

    await simulation.ops.execute("bim.load_model_from_path", context, path, null, "5D.ifc")

}

const loadGeometryData = async () => {
    await simulation.ops.execute("bim.load_geometry_data", context, "5D.ifc", "Buildings", "ifcopenshell");
}

simulation.enablePython().then(() => {
    simulation.enableBIM().then(() => {
        load5DModel().then(() => {
            loadGeometryData();
        });
    });
  });


// simulation.ops.execute("world.create_world_layers", context);

export default simulation;