/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { PropertyValueType } from './types.js';
export class PropertyTableBuilder {
    strings;
    rows = [];
    constructor(strings) {
        this.strings = strings;
    }
    add(row) {
        this.rows.push(row);
    }
    build() {
        const count = this.rows.length;
        // Allocate columnar arrays
        const entityId = new Uint32Array(count);
        const psetName = new Uint32Array(count);
        const psetGlobalId = new Uint32Array(count);
        const propName = new Uint32Array(count);
        const propType = new Uint8Array(count);
        const valueString = new Uint32Array(count);
        const valueReal = new Float64Array(count);
        const valueInt = new Int32Array(count);
        const valueBool = new Uint8Array(count).fill(255); // 255 = null
        const unitId = new Int32Array(count).fill(-1);
        // Build indices
        const entityIndex = new Map();
        const psetIndex = new Map();
        const propIndex = new Map();
        // Fill arrays
        for (let i = 0; i < count; i++) {
            const row = this.rows[i];
            entityId[i] = row.entityId;
            const psetNameIdx = this.strings.intern(row.psetName);
            const psetGlobalIdIdx = this.strings.intern(row.psetGlobalId);
            const propNameIdx = this.strings.intern(row.propName);
            psetName[i] = psetNameIdx;
            psetGlobalId[i] = psetGlobalIdIdx;
            propName[i] = propNameIdx;
            propType[i] = row.propType;
            // Store value based on type
            switch (row.propType) {
                case PropertyValueType.String:
                case PropertyValueType.Label:
                case PropertyValueType.Identifier:
                case PropertyValueType.Text:
                case PropertyValueType.Enum:
                    valueString[i] = this.strings.intern(row.value);
                    break;
                case PropertyValueType.Real:
                    valueReal[i] = row.value;
                    break;
                case PropertyValueType.Integer:
                    valueInt[i] = row.value;
                    break;
                case PropertyValueType.Boolean:
                case PropertyValueType.Logical:
                    valueBool[i] = row.value === true ? 1 : row.value === false ? 0 : 255;
                    break;
                case PropertyValueType.List:
                    valueString[i] = this.strings.intern(JSON.stringify(row.value));
                    break;
            }
            if (row.unitId !== undefined) {
                unitId[i] = row.unitId;
            }
            // Build indices
            addToIndex(entityIndex, row.entityId, i);
            addToIndex(psetIndex, psetNameIdx, i);
            addToIndex(propIndex, propNameIdx, i);
        }
        const strings = this.strings;
        const table = {
            count,
            entityId,
            psetName,
            psetGlobalId,
            propName,
            propType,
            valueString,
            valueReal,
            valueInt,
            valueBool,
            unitId,
            entityIndex,
            psetIndex,
            propIndex,
            getForEntity: (id) => {
                const rowIndices = entityIndex.get(id) || [];
                const psets = new Map();
                for (const idx of rowIndices) {
                    const psetNameStr = strings.get(psetName[idx]);
                    const psetGlobalIdStr = strings.get(psetGlobalId[idx]);
                    if (!psets.has(psetNameStr)) {
                        psets.set(psetNameStr, {
                            name: psetNameStr,
                            globalId: psetGlobalIdStr,
                            properties: [],
                        });
                    }
                    const pset = psets.get(psetNameStr);
                    const propNameStr = strings.get(propName[idx]);
                    const propValue = getPropertyValue(table, idx, strings);
                    pset.properties.push({
                        name: propNameStr,
                        type: propType[idx],
                        value: propValue,
                    });
                }
                return Array.from(psets.values());
            },
            getPropertyValue: (id, pset, prop) => {
                const rowIndices = entityIndex.get(id) || [];
                const psetIdx = strings.indexOf(pset);
                const propIdx = strings.indexOf(prop);
                for (const idx of rowIndices) {
                    if (psetName[idx] === psetIdx && propName[idx] === propIdx) {
                        return getPropertyValue(table, idx, strings);
                    }
                }
                return null;
            },
            findByProperty: (prop, operator, value) => {
                const propIdx = strings.indexOf(prop);
                if (propIdx < 0)
                    return [];
                const rowIndices = propIndex.get(propIdx) || [];
                const results = [];
                for (const idx of rowIndices) {
                    const propValue = getPropertyValue(table, idx, strings);
                    if (compareValues(propValue, operator, value)) {
                        results.push(entityId[idx]);
                    }
                }
                return results;
            },
        };
        return table;
    }
}
function addToIndex(index, key, value) {
    let list = index.get(key);
    if (!list) {
        list = [];
        index.set(key, list);
    }
    list.push(value);
}
function getPropertyValue(table, idx, strings) {
    const type = table.propType[idx];
    switch (type) {
        case PropertyValueType.String:
        case PropertyValueType.Label:
        case PropertyValueType.Identifier:
        case PropertyValueType.Text:
        case PropertyValueType.Enum:
            return table.valueString[idx] >= 0 ? strings.get(table.valueString[idx]) : null;
        case PropertyValueType.Real:
            return table.valueReal[idx];
        case PropertyValueType.Integer:
            return table.valueInt[idx];
        case PropertyValueType.Boolean:
        case PropertyValueType.Logical:
            const boolVal = table.valueBool[idx];
            return boolVal === 255 ? null : boolVal === 1;
        case PropertyValueType.List:
            const listStr = strings.get(table.valueString[idx]);
            try {
                return JSON.parse(listStr);
            }
            catch {
                return [];
            }
        default:
            return null;
    }
}
function compareValues(propValue, operator, value) {
    if (propValue === null || value === null)
        return false;
    if (typeof propValue === 'number' && typeof value === 'number') {
        switch (operator) {
            case '>=':
                return propValue >= value;
            case '>':
                return propValue > value;
            case '<=':
                return propValue <= value;
            case '<':
                return propValue < value;
            case '=':
            case '==':
                return propValue === value;
            case '!=':
                return propValue !== value;
        }
    }
    if (typeof propValue === 'string' && typeof value === 'string') {
        switch (operator) {
            case '=':
            case '==':
                return propValue === value;
            case '!=':
                return propValue !== value;
            case 'contains':
                return propValue.includes(value);
            case 'startsWith':
                return propValue.startsWith(value);
        }
    }
    return false;
}
//# sourceMappingURL=property-table.js.map