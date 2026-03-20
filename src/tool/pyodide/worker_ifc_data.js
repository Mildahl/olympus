import { getPyodide } from './worker_state.js';

class AttributesDataV1 {
    data = {}

    is_loaded = false
    
    static load(element) {

        AttributesData.data = AttributesData.attributes(element) 

        AttributesData.is_loaded = true
    }

    static attributes(element) {
        const pyodide = getPyodide();
        const results = [];

        if (! element ) {
            return results;
        }

        const entity_instance = pyodide.pyimport("ifcopenshell.entity_instance");

        let excludedKeys = [];

        const data = element.get_info();

        if ("GlobalId" in data) {
            const attributeItems = data["attributes"];

            excludedKeys = ["id", "type"];
    
        } else {
            excludedKeys = ["type"];
        }

        const excludeValueTypes = [Array, entity_instance];

        for (const [key, value] of Object.entries(data)) {
            if (value === null || excludeValueTypes.includes(value?.constructor) || excludedKeys.includes(key)) {
                continue;
            }

            let displayKey = key;

            if (key === "id") {
                displayKey = "STEP ID";
            }

            results.push({ name: displayKey, value: String(value) });
        }

        return results;
    }
}
export class AttributesData {
    data = {}

    is_loaded = false
    
    static load(element) {

        AttributesData.data = AttributesData.attributes(element) 

        AttributesData.is_loaded = true
    }

    static attributes(element) {
        const pyodide = getPyodide();
        const results = [];

        if (!element) {
            return results;
        }

        const entity_instance = pyodide.pyimport("ifcopenshell.entity_instance");

        const attribute_util = pyodide.pyimport("ifcopenshell.util.attribute");

        const doc_util = pyodide.pyimport("ifcopenshell.util.doc");

        const entity = element.wrapped_data.declaration().as_entity();

        const data = element.get_info();

        const entity_attributes = entity.all_attributes();

        for (let attribute of entity_attributes) {
            let data_type = attribute_util.get_primitive_type(attribute);

            data_type = AttributesData._handle_data_type(data_type);
            if (data_type !== 'list[entity]') {
                const typeStr = String(attribute.type_of_attribute());
                if (typeStr.includes('set') && typeStr.includes('entity')) {
                    data_type = 'list[entity]';
                }
            }

            const attr_name = attribute.name();

            const value = data[attr_name];
            const typeUnrecognized = !data_type || typeof data_type !== 'string' || data_type === '';
            if (typeUnrecognized && value != null && typeof value !== 'string') {
                try {
                    const first = value[0] ?? (value[Symbol.iterator] ? value[Symbol.iterator]().next().value : undefined);
                    if (first && first.__class__ === entity_instance) {
                        data_type = "list[entity]";
                    }
                } catch (e) {
                    
                }
            }

            const pointers = [];

            if (data_type === 'entity') {
                if (value && value.id) {
                    
                    try {
                        const entityGlobalId = value.GlobalId || null;

                        const entityStepId = value.id();

                        const entityType = value.is_a();

                        const entityRepr = String(value);
                        
                        pointers.push({
                            "stepId": entityStepId,
                            "globalId": entityGlobalId,
                            "type": entityType,
                            "repr": entityRepr,
                            "isNavigable": entityGlobalId !== null 
                        });
                        
                    } catch (e) {
                        console.warn("Error processing entity attribute pointer:", e);
                    }
                }
            } else if (data_type === 'list[entity]') {
                if (value) {
                    for (let item of value) {
                        if (item && item.id) {
                            try {
                                const entityGlobalId = item.GlobalId || null;

                                const entityStepId = item.id();

                                const entityType = item.is_a();

                                const entityRepr = String(item);
                                
                                pointers.push({
                                    "stepId": entityStepId,
                                    "globalId": entityGlobalId,
                                    "type": entityType,
                                    "repr": entityRepr,
                                    "isNavigable": entityGlobalId !== null
                                });
                            } catch (e) {
                                console.warn("Error processing entity list attribute pointer:", e);
                            }
                        }
                    }
                    
                }
            }

            let result = {
                "name": attr_name,
                "dataType": typeof data_type === 'string' ? data_type : "",
                "pointers": pointers,
                "isNull": value == null,
                "isOptional": attribute.optional(),
                "ifcClass": data["type"],
                "ifcType": String(attribute.type_of_attribute()),
                "value": AttributesData._toSerializable(value, entity_instance),
            };
            if (data_type === "entity") {
                if (value && value.__class__ === entity_instance) {
                    const info = value.get_info();

                    result["entity_value"] = {
                        "id": value.id(),
                        "type": value.is_a(),
                        "info": AttributesData._serializeInfo(info, entity_instance)
                    };

                    result["string_value"] = String(value);
                } else if (value !== null) {
                    result["string_value"] = String(value);
                }

            } else if (data_type === "list[entity]") {
                if (value) {
                    result["entity_list_value"] = [];

                    for (let item of value) {
                        if (item && item.__class__ === entity_instance) {
                            const info = item.get_info();

                            result["entity_list_value"].push({
                                "id": item.id(),
                                "type": item.is_a(),
                                "info": AttributesData._serializeInfo(info, entity_instance)
                            });
                        }
                    }

                    result["string_value"] = String(value);
                }

            }

            if (data_type === "string") {
                result["string_value"] = result.isNull ? "" : String(data[attribute.name()]).replace(/\n/g, "\\n");

                const attribute_type = attribute.type_of_attribute();

                if (attribute_type._is("IfcURIReference")) {
                    result["special_type"] = "URI";
                } else if (attribute_type._is("IfcDate")) {
                    result["special_type"] = "DATE";
                } else if (attribute_type._is("IfcDateTime")) {
                    result["special_type"] = "DATETIME";
                }
            } else if (data_type === "boolean") {
                result["bool_value"] = result.isNull ? false : Boolean(data[attribute.name()]);
            } else if (data_type === "integer") {
                result["int_value"] = result.isNull ? 0 : parseInt(data[attribute.name()]);
            } else if (data_type === "float") {
                const attribute_type = attribute.type_of_attribute();

                if (attribute_type._is("IfcLengthMeasure")) {
                    result["special_type"] = "LENGTH";
                } else if (attribute_type._is("IfcForceMeasure")) {
                    result["special_type"] = "FORCE";
                }

                result["float_value"] = result.isNull ? 0.0 : parseFloat(data[attribute.name()]);
            } else if (data_type === "enum") {
                const attribute_type = attribute.type_of_attribute();

                const is_logical = String(attribute_type) === "<type IfcLogical: <logical>>";

                let enum_value = data[attribute.name()];

                if (is_logical) {
                    result["special_type"] = "LOGICAL";

                    const enum_items = ["TRUE", "FALSE", "UNKNOWN"];

                    result["enum_items"] = JSON.stringify(enum_items);

                    if (enum_value !== null && enum_value !== "UNKNOWN") {
                        enum_value = enum_value ? "TRUE" : "FALSE";
                    }
                } else {
                    const enum_items = attribute_util.get_enum_items(attribute);
                    const jsEnumItems = Array.from(enum_items).map(item => String(item));

                    result["enum_items"] = JSON.stringify(jsEnumItems);
                }

                if (enum_value !== null) {
                    result["enum_value"] = enum_value;
                }
            } else if (data_type === "list[string]") {
                const val = data[attribute.name()];

                if (val) {
                    result["subitems_values"] = [];

                    for (let item of val) {
                        result["subitems_values"].push({"name": String(item).replace(/\n/g, "\\n")});
                    }
                }
            } else if (data_type === "list[float]") {
                const val = data[attribute.name()];

                if (val) {
                    result["float_list_value"] = AttributesData._toSerializable(val, entity_instance);

                    result["string_value"] = String(result["float_list_value"]);
                }
            } else if (data_type === "list[integer]") {
                const val = data[attribute.name()];

                if (val) {
                    result["int_list_value"] = AttributesData._toSerializable(val, entity_instance);

                    result["string_value"] = String(result["int_list_value"]);
                }
            }

            result["description"] = AttributesData._get_attribute_description(data["type"], attribute, doc_util);

            const constraints = AttributesData._get_attribute_min_max(attribute, data["type"]);

            result = { ...result, ...constraints };

            results.push(result);

        }
        try {
            const testSerialize = JSON.stringify(results);

        } catch (e) {
            results.forEach((r, i) => {
                try {
                    JSON.stringify(r);
                } catch (err) {
                    for (const [key, val] of Object.entries(r)) {
                        try {
                            JSON.stringify(val);
                        } catch (keyErr) {
                            console.warn(`Error serializing attribute ${key} in result index ${i}:`, keyErr);
                        }
                    }
                }
            });
        }

        return results;
    }

    static _get_attribute_description(ifc_class, attribute, doc_util) {
        if (!ifc_class || !attribute.name()) return '';

        let description = '';

        try {
            const result = doc_util.get_attribute_doc('IFC4', ifc_class, attribute.name());

            description = result ? String(result) : '';
        } catch (e) {
            try {
                const doc = doc_util.get_property_doc('IFC4', ifc_class, attribute.name());

                if (doc) {
                    description = doc.description ? String(doc.description) : '';
                } else {
                    description = attribute.Description ? String(attribute.Description) : '';
                }
            } catch (e2) {
                description = attribute.Description ? String(attribute.Description) : '';
            }
        }

        return description;
    }

    static _get_attribute_min_max(attribute, ifc_class) {
        const ATTRIBUTE_MIN_MAX_CONSTRAINTS = {
            "IfcMaterialLayer": {"Priority": {"value_min": 0, "value_max": 100}}
        };

        const attribute_constraints = {};

        if (ATTRIBUTE_MIN_MAX_CONSTRAINTS[ifc_class]) {
            const constraints = ATTRIBUTE_MIN_MAX_CONSTRAINTS[ifc_class][attribute.name()] || {};

            for (let [constraint, value] of Object.entries(constraints)) {
                attribute_constraints[constraint] = value;

                attribute_constraints[constraint + "_constraint"] = true;
            }
        }

        const attribute_type = attribute.type_of_attribute();

        if (attribute_type._is("IfcPositiveLengthMeasure") || attribute_type._is("IfcNonNegativeLengthMeasure")) {
            attribute_constraints.value_min = 0.0;

            attribute_constraints.value_min_constraint = true;
        }

        return attribute_constraints;
    }

    static _handle_data_type(data_type) {
        
        if (data_type != null && typeof data_type === 'object' && !Array.isArray(data_type)) {
            try {
                if (typeof data_type.toJs === 'function') {
                    data_type = data_type.toJs();
                } else if (data_type[Symbol.iterator]) {
                    data_type = Array.from(data_type);
                }
            } catch (e) {
                
            }
        }

        if (Array.isArray(data_type) && data_type.length >= 2) {
            const kind = data_type[0];
            const inner = data_type[1];
            if (kind === "list") {
                if (inner === "string") {
                    data_type = "list[string]";
                } else if (inner === "entity") {
                    data_type = "list[entity]";
                } else if (inner === "float") {
                    data_type = "list[float]";
                } else if (inner === "integer") {
                    data_type = "list[integer]";
                } else {
                    data_type = `list[${inner}]`;
                }
            } else if (kind === "aggregate" && inner === "entity") {
                data_type = "list[entity]";
            } else if (kind === "set") {
                if (inner === "entity" || (typeof inner === "string" && inner.startsWith("Ifc"))) {
                    data_type = "list[entity]";
                }
            }
        } else if (Array.isArray(data_type) && data_type[0] === "select") {
            if (data_type.length > 1 && Array.isArray(data_type[1]) && data_type[1].includes("entity")) {
                data_type = "entity";
            }
        }
        if (typeof data_type === 'string' && data_type.length > 0 && data_type.includes('set') && data_type.includes('entity')) {
            data_type = "list[entity]";
        }

        return typeof data_type === 'string' ? data_type : data_type;
    }

    /**
     * Serialize the result of get_info() to a plain JS object
     */
    static _serializeInfo(info, entity_instance) {
        if (!info) return null;

        const result = {};

        for (const [key, value] of Object.entries(info)) {
            result[key] = AttributesData._toSerializable(value, entity_instance);
        }

        return result;
    }

    /**
     * Convert a Python proxy value to a serializable JavaScript value
     */
    static _toSerializable(value, entity_instance) {
        if (value === null || value === undefined) {
            return null;
        }
        if (value.__class__ === entity_instance) {

            return { _type: "entity", id: value.id(), repr: String(value) };
        }
        if (typeof value.toJs === "function") {

            try {
                return value.toJs({ create_proxies: false });
            } catch (e) {

                return String(value);
            }
        }
        if (value[Symbol.iterator] && typeof value !== "string") {

            const arr = [];

            for (let item of value) {
                arr.push(AttributesData._toSerializable(item, entity_instance));
            }

            return arr;
        }
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return value;
        }
        if (value.__class__ || value.$$ || typeof value.destroy === "function") {

            return String(value);
        }
        return String(value);
    }
}
