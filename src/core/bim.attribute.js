import * as PsetCore from "./bim.pset.js";
import AttributeTool from "../tool/bim/attribute.js";
import PsetTool from "../tool/bim/pset.js";
import SceneTool from "../tool/viewer/SceneTool.js";

/**
 * Create and register operators related to BIM attributes and properties, such as loading attributes on selection and enabling editing of attributes and properties.
 * This module serves as the core logic for handling BIM attributes and properties, while the actual data fetching and storage are handled by the respective tools.
 * The operators defined here will be used in the BIM module to enable interaction with BIM data in the 3D scene.
 * @module bim.attribute
 * 
 * Functions:
 * - displayOnSelection: Sets up an event listener for object selection in the 3D scene. When an IFC object is selected, it loads the attributes and properties for that object and dispatches a signal to update the UI.
 * - enableEditingAttributes: Loads attributes and properties for a given entity and dispatches a signal to enable editing of those attributes in the UI.
 * The actual fetching of attributes and properties is done through the AttributeTool and PsetTool, which interact with the backend API to retrieve the necessary data. The data is then stored in a centralized data store for easy access across the application.
 */



async function enableEditingAttributes(modelName, GlobalId, {context, attributeTool, psetTool}) {

    const { attributes, ifcClass } = await attributeTool.loadAttributes(modelName, GlobalId);

    attributeTool.storeAttributes(GlobalId, attributes, ifcClass); // probably unnecessary , unless used for caching and save/reloading state session ui persistance --> change to one attribute stored only!
    
    PsetCore.loadProperties(modelName, GlobalId, {context, psetTool});

    context.signals.enableEditingAttributes.dispatch({
      GlobalId: GlobalId,
      Attributes: attributeTool.getStoredAttributes(GlobalId),
      PropertiesData: psetTool.getStoredProperties(GlobalId),
    });
    
}

export {
    enableEditingAttributes
}