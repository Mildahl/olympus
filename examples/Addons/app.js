import { AECO } from "aeco";

import { AECOConfiguration } from "./../../configuration/config.js";

import { ADDONS } from "./addons/index.js";

import { AECO_SuperPower } from "../../configuration/modes.js";

const listeners = [
    "weatherChanged",
    "hardHatEnabled",
    "hardHatStoreChanged",
    "hardHatLiftAdded",
    "hardHatLiftRemoved",
    "hardHatLiftSelected",
    "hardHatScheduleViewToggled",
];

const load5DModel = async () => {

    const fileName = "5D.ifc"; 

    const path = "/data/ifc/" + fileName;

    await simulation.ops.execute("bim.load_model_from_path", context, path, null, fileName)

    await simulation.ops.execute("bim.load_geometry_data", context,
        fileName,
        "Buildings",
    );
}

const simulation = new AECO();

const context = simulation.context;

AECOConfiguration.app.CoreModules = AECO_SuperPower;

await simulation.initWorld({config: AECOConfiguration, container: document.body, addons: {ADDONS, Listeners: listeners} });

await load5DModel()

// ADDON SPECIFIC
simulation.addConstructionEquipment("digger", {
    position: { x: 20, y: 20, z: 0 },
    rotation: { axis: 'z', angle: 0 },
    scale: 1,
});

simulation.ops.execute("hardhat.enable", context);

export default simulation;