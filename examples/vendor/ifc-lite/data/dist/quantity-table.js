/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export class QuantityTableBuilder {
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
        const entityId = new Uint32Array(count);
        const qsetName = new Uint32Array(count);
        const quantityName = new Uint32Array(count);
        const quantityType = new Uint8Array(count);
        const value = new Float64Array(count);
        const unitId = new Int32Array(count).fill(-1);
        const formula = new Uint32Array(count).fill(0);
        const entityIndex = new Map();
        const qsetIndex = new Map();
        const quantityIndex = new Map();
        for (let i = 0; i < count; i++) {
            const row = this.rows[i];
            entityId[i] = row.entityId;
            qsetName[i] = this.strings.intern(row.qsetName);
            quantityName[i] = this.strings.intern(row.quantityName);
            quantityType[i] = row.quantityType;
            value[i] = row.value;
            if (row.unitId !== undefined) {
                unitId[i] = row.unitId;
            }
            if (row.formula) {
                formula[i] = this.strings.intern(row.formula);
            }
            addToIndex(entityIndex, row.entityId, i);
            addToIndex(qsetIndex, qsetName[i], i);
            addToIndex(quantityIndex, quantityName[i], i);
        }
        return {
            count,
            entityId,
            qsetName,
            quantityName,
            quantityType,
            value,
            unitId,
            formula,
            entityIndex,
            qsetIndex,
            quantityIndex,
            getForEntity: (id) => {
                const rowIndices = entityIndex.get(id) || [];
                const qsets = new Map();
                for (const idx of rowIndices) {
                    const qsetNameStr = this.strings.get(qsetName[idx]);
                    if (!qsets.has(qsetNameStr)) {
                        qsets.set(qsetNameStr, {
                            name: qsetNameStr,
                            quantities: [],
                        });
                    }
                    const qset = qsets.get(qsetNameStr);
                    const quantNameStr = this.strings.get(quantityName[idx]);
                    qset.quantities.push({
                        name: quantNameStr,
                        type: quantityType[idx],
                        value: value[idx],
                        formula: formula[idx] > 0 ? this.strings.get(formula[idx]) : undefined,
                    });
                }
                return Array.from(qsets.values());
            },
            getQuantityValue: (id, qset, quant) => {
                const rowIndices = entityIndex.get(id) || [];
                const qsetIdx = this.strings.indexOf(qset);
                const quantIdx = this.strings.indexOf(quant);
                for (const idx of rowIndices) {
                    if (qsetName[idx] === qsetIdx && quantityName[idx] === quantIdx) {
                        return value[idx];
                    }
                }
                return null;
            },
            sumByType: (quantName) => {
                const quantIdx = this.strings.indexOf(quantName);
                if (quantIdx < 0)
                    return 0;
                const rowIndices = quantityIndex.get(quantIdx) || [];
                let sum = 0;
                for (const idx of rowIndices) {
                    sum += value[idx];
                }
                return sum;
            },
        };
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
//# sourceMappingURL=quantity-table.js.map