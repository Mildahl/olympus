import  IfcTool from '../tool/bim/ifc.js';

import CostTool from "../tool/bim/cost.js";

import { refreshData } from "../modules/bim.cost/data.js";

import AttributeTool from "../tool/bim/attribute.js";
import PsetTool from "../tool/bim/pset.js";
import SceneTool from "../tool/viewer/SceneTool.js";



/** * Load attributes and properties for a selected entity and dispatch a signal to update the UI.
 * @param {Object} params
 * @param {Object} params.costTool - The tool for fetching and storing BIM cost data.
 * @param {string} params.entityGlobalId - Selected IFC element GlobalId.
 * @param {Object} params.context - The application context containing signals and state.
 */

async function enableEditingElementCosts(modelName, entityGlobalId, { costTool, context }) {
    if (!entityGlobalId || !modelName) return false;

    const costItems = await costTool.getCostItemsForProduct(modelName, entityGlobalId);

    const firstCostItem = costItems.length > 0 ? costItems[0].entityId : null;

    firstCostItem ? context.signals.costItemClicked.dispatch({ costItemId: firstCostItem }) : null;

    context.signals.displayConstructionHudCost.dispatch({
        GlobalId: entityGlobalId,
        model: modelName,
        costItems
    });

    return true;
}



export {
    enableEditingElementCosts
};

