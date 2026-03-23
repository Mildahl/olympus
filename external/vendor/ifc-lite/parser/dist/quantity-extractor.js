/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Map IFC type names to our quantity types
const QUANTITY_TYPE_MAP = {
    'IFCQUANTITYLENGTH': 'length',
    'IFCQUANTITYAREA': 'area',
    'IFCQUANTITYVOLUME': 'volume',
    'IFCQUANTITYCOUNT': 'count',
    'IFCQUANTITYWEIGHT': 'weight',
    'IFCQUANTITYTIME': 'time',
};
export class QuantityExtractor {
    entities;
    debug;
    constructor(entities, debug = false) {
        this.entities = entities;
        this.debug = debug;
    }
    /**
     * Extract all IfcElementQuantity sets from entities (async version with yields)
     */
    async extractQuantitySetsAsync() {
        const quantitySets = new Map();
        let elementQuantityCount = 0;
        let quantityValueCount = 0;
        let processed = 0;
        for (const [id, entity] of this.entities) {
            const typeUpper = entity.type.toUpperCase();
            if (typeUpper === 'IFCELEMENTQUANTITY') {
                elementQuantityCount++;
                const qset = this.extractQuantitySet(entity);
                if (qset) {
                    quantitySets.set(id, qset);
                    quantityValueCount += qset.quantities.length;
                }
            }
            processed++;
            // Yield to event loop every 2000 entities to prevent blocking
            if (processed % 2000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        console.log(`[QuantityExtractor] Found ${elementQuantityCount} IfcElementQuantity entities`);
        console.log(`[QuantityExtractor] Extracted ${quantitySets.size} quantity sets with ${quantityValueCount} total quantities`);
        return quantitySets;
    }
    /**
     * Extract all IfcElementQuantity sets from entities (sync version for backward compatibility)
     */
    extractQuantitySets() {
        const quantitySets = new Map();
        let elementQuantityCount = 0;
        let quantityValueCount = 0;
        for (const [id, entity] of this.entities) {
            const typeUpper = entity.type.toUpperCase();
            if (typeUpper === 'IFCELEMENTQUANTITY') {
                elementQuantityCount++;
                const qset = this.extractQuantitySet(entity);
                if (qset) {
                    quantitySets.set(id, qset);
                    quantityValueCount += qset.quantities.length;
                    if (this.debug && quantitySets.size <= 3) {
                        console.log(`[QuantityExtractor] Extracted QuantitySet #${id}:`, {
                            name: qset.name,
                            quantities: qset.quantities.length,
                            first: qset.quantities[0],
                        });
                    }
                }
            }
        }
        console.log(`[QuantityExtractor] Found ${elementQuantityCount} IfcElementQuantity entities`);
        console.log(`[QuantityExtractor] Extracted ${quantitySets.size} quantity sets with ${quantityValueCount} total quantities`);
        return quantitySets;
    }
    /**
     * Extract QuantitySet from IfcElementQuantity entity
     *
     * IFC Schema for IfcElementQuantity:
     * - GlobalId (IfcGloballyUniqueId) [0]
     * - OwnerHistory (IfcOwnerHistory) [1]
     * - Name (IfcLabel) [2]
     * - Description (IfcText) [3]
     * - MethodOfMeasurement (IfcLabel) [4]
     * - Quantities (SET [1:?] OF IfcPhysicalQuantity) [5]
     */
    extractQuantitySet(entity) {
        try {
            const attrs = entity.attributes;
            if (attrs.length < 6) {
                if (this.debug) {
                    console.warn(`[QuantityExtractor] IfcElementQuantity #${entity.expressId} has insufficient attributes: ${attrs.length}`);
                }
                return null;
            }
            const globalId = this.toString(attrs[0]);
            const name = this.toString(attrs[2]);
            if (!name) {
                if (this.debug) {
                    console.warn(`[QuantityExtractor] IfcElementQuantity #${entity.expressId} has no name`);
                }
                return null;
            }
            const methodOfMeasurement = this.toString(attrs[4]) || undefined;
            const quantitiesRefs = attrs[5];
            const quantities = [];
            // Quantities is a list of references to IfcPhysicalQuantity subtypes
            if (Array.isArray(quantitiesRefs)) {
                for (const quantRef of quantitiesRefs) {
                    if (typeof quantRef === 'number') {
                        const quantEntity = this.entities.get(quantRef);
                        if (quantEntity) {
                            const quantity = this.extractQuantity(quantEntity);
                            if (quantity) {
                                quantities.push(quantity);
                            }
                        }
                        else if (this.debug) {
                            console.warn(`[QuantityExtractor] Referenced quantity #${quantRef} not found`);
                        }
                    }
                }
            }
            return {
                expressId: entity.expressId,
                name,
                globalId: globalId || undefined,
                methodOfMeasurement,
                quantities,
            };
        }
        catch (error) {
            console.warn(`[QuantityExtractor] Failed to extract QuantitySet #${entity.expressId}:`, error);
            return null;
        }
    }
    /**
     * Extract quantity from IfcPhysicalQuantity entity
     *
     * All IFC quantity types (IfcQuantityLength, IfcQuantityArea, etc.) have:
     * - Name (IfcLabel) [0]
     * - Description (IfcText) [1]
     * - Unit (IfcNamedUnit) [2] - optional reference
     * - *Value (IfcLengthMeasure/etc.) [3]
     * - Formula (IfcLabel) [4] - optional (IFC4 only)
     */
    extractQuantity(entity) {
        try {
            const typeUpper = entity.type.toUpperCase();
            const quantityType = QUANTITY_TYPE_MAP[typeUpper];
            if (!quantityType) {
                // Not a recognized quantity type
                return null;
            }
            const attrs = entity.attributes;
            if (attrs.length < 4) {
                if (this.debug) {
                    console.warn(`[QuantityExtractor] ${entity.type} #${entity.expressId} has insufficient attributes: ${attrs.length}`);
                }
                return null;
            }
            const name = this.toString(attrs[0]);
            if (!name) {
                if (this.debug) {
                    console.warn(`[QuantityExtractor] ${entity.type} #${entity.expressId} has no name`);
                }
                return null;
            }
            // Value is at index 3 for all quantity types
            const value = attrs[3];
            if (typeof value !== 'number') {
                if (this.debug) {
                    console.warn(`[QuantityExtractor] ${entity.type} #${entity.expressId} has non-numeric value:`, value);
                }
                return null;
            }
            // Formula is optional (index 4, IFC4 only)
            const formula = attrs.length > 4 ? this.toString(attrs[4]) || undefined : undefined;
            return {
                name,
                type: quantityType,
                value,
                formula,
            };
        }
        catch (error) {
            console.warn(`[QuantityExtractor] Failed to extract quantity #${entity.expressId}:`, error);
            return null;
        }
    }
    /**
     * Safely convert a value to string
     */
    toString(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'string') {
            return value;
        }
        return null;
    }
    /**
     * Get count of IfcElementQuantity entities in the model
     */
    getElementQuantityCount() {
        let count = 0;
        for (const entity of this.entities.values()) {
            if (entity.type.toUpperCase() === 'IFCELEMENTQUANTITY') {
                count++;
            }
        }
        return count;
    }
    /**
     * Get count of individual quantity values (IfcQuantityLength, etc.)
     */
    getQuantityValueCount() {
        let count = 0;
        for (const entity of this.entities.values()) {
            const typeUpper = entity.type.toUpperCase();
            if (QUANTITY_TYPE_MAP[typeUpper]) {
                count++;
            }
        }
        return count;
    }
}
//# sourceMappingURL=quantity-extractor.js.map