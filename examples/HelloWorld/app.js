import { AECO } from "aeco";
import { AECOConfiguration } from "./../../configuration/config.js";
import { AECO_Vanilla, AECO_Power, AECO_SuperPower } from "../../configuration/modes.js";

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

AECOConfiguration.app.CoreModules = AECO_Vanilla;

await simulation.initWorld({config: AECOConfiguration, container: document.body, addons:{} });

await load5DModel();

export default simulation;