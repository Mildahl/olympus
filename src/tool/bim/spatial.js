import tools from "../index.js";

function Spatial( pyTool, version) {
    this.version = version || 'IFC4';

    this.pyTool = pyTool;
}

Spatial.prototype = {

    selectByContainer: function(elementguid, nodeData) {
        console.log('Selecting elements in container', elementguid, nodeData);

        const element = tools.ifc.get_element(elementguid);

        if (!element) {
            console.warn('Element not found for GUID:', elementguid);

            return;
        }

        if (element.is_a('IfcSpatialStructureElement')) {
            let containedGuids = this.pyTool.get_contained_recursive(element)
            console.log('Select GUIDs:', containedGuids);

            const success = tools.three.selectObjectsByGuid(containedGuids);

            return success;
        }
        let foundObject = tools.three.get_object(element)
        if (!foundObject || !foundObject.isMesh) return false;
        console.log('Select object:', foundObject);

        return true;
    },

    getSpatialStructure: async function(model) {
        console.log("Fetching spatial structure from Python tool...");

        const structure = await this.pyTool.get_project_tree(model);

        console.log("Spatial structure received:", structure);

        return structure;
    }
}

export default Spatial;