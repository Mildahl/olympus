class AttributesData {
    data = {}

    is_loaded = false
    
    static load(entity) {

        AttributesData.data = AttributesData.attributes(entity) 

        AttributesData.is_loaded = true
    }

    static attributes(element) {
        const results = [];

        if (! element ) {
            return results;
        }

        let excludedKeys = [];

        const data = element.get_info();

        if ("GlobalId" in data) {
            const attributeItems = data["attributes"];

            excludedKeys = ["id", "type"];
    
        } else {
            excludedKeys = ["type"];
        }

        const excludeValueTypes = [Array, ifcopenshell.entity_instance];

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
    