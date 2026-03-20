import { DrawUI } from "../../drawUI/index.js";

const spinner = DrawUI.spinner({ text: 'Initializing AECO...' });

spinner.show(document.body);

spinner.setText('Creating UI...');

import { AECO } from "aeco";

import { AECOConfiguration } from "./configuration/config.js";

import { ADDONS } from "./addons/index.js";

const simulation = new AECO();

const context = simulation.context;

const listeners = [
    "weatherChanged",
    "hardHatEnabled",
    "hardHatStoreChanged",
    "hardHatLiftAdded",
    "hardHatLiftRemoved",
    "hardHatLiftSelected",
    "hardHatScheduleViewToggled",
    "issueTrackerEnabled",
    "issueTrackerStoreChanged",
    "issueTrackerLayerChanged",
    "issueTrackerIssueSelected",
    "issueTrackerToolChanged",
  ];

simulation.createUI({config: AECOConfiguration, container: document.body, addons: {ADDONS, Listeners: listeners} });

spinner.hide();

simulation.tools.world.scene.addCube(context, 1, "grey");   

const createLogisticsEquipment = (avatarName, definition) => {

const AECOFamilies = {
    drone: simulation.tools.world.model.createDrone,
    robot: simulation.tools.world.model.createRobot,
    digger: simulation.tools.world.model.createDigger,
    towerCrane: simulation.tools.world.model.createTowerCrane,
    mobileCrane: simulation.tools.world.model.createMobileCrane,
    forklift: simulation.tools.world.model.createForklift,
    truck: simulation.tools.world.model.createTruck,
};

const avatarElement = AECOFamilies[avatarName](definition);

simulation.tools.world.scene.addToLayer(context, avatarElement.object, "Logistics");

const position = {
    x:  0,
    y:  0,
    z: 0,
};

simulation.tools.world.placement.setPosition(null, avatarElement.object, position);

simulation.tools.world.placement.rotate(null, avatarElement.object, "z", 90);

return avatarElement;
};


const digger = {
    position: { x: 20, y: 20, z: 0 },
    rotation: { axis: 'z', angle: 0 },
    scale: 1,
}

createLogisticsEquipment("digger", digger);

const mobileCrane = simulation.tools.world.model.createMobileCrane({
    position: { x: 10, y: 20, z: 0 },
    rotation: { axis: 'z', angle: 90 },
    scale: 1,
});

simulation.tools.world.scene.addToLayer(context, mobileCrane.object, "Logistics");

const load4DModel = async () => {

    const path = "/external/ifc/Works_Plan.ifc";

    await simulation.ops.execute("bim.load_model_from_path", context, path, null, "Works_Plan.ifc")

}

const loadGeometryData = async () => {
    await simulation.ops.execute(
        "bim.load_geometry_data",
        context,
        "Works_Plan.ifc",
        "Buildings",
        "ifcopenshell",
    );
};

simulation.enablePython().then(() => {
    simulation.enableBIM().then(() => {
        load4DModel().then(() => {
            loadGeometryData();
        });
    });
  });


export default simulation;