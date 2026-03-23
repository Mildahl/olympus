/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Bulk Query Engine for mass property updates
 */
export class BulkQueryEngine {
    entities;
    spatialHierarchy;
    properties;
    mutationView;
    strings;
    constructor(entities, mutationView, spatialHierarchy, properties, strings) {
        this.entities = entities;
        this.mutationView = mutationView;
        this.spatialHierarchy = spatialHierarchy || null;
        this.properties = properties || null;
        this.strings = strings || null;
    }
    /**
     * Select entities matching criteria
     */
    select(criteria) {
        let candidates = this.getAllEntityIds();
        // Filter by entity types
        if (criteria.entityTypes && criteria.entityTypes.length > 0) {
            const typeSet = new Set(criteria.entityTypes);
            candidates = candidates.filter((id) => {
                const idx = this.findEntityIndex(id);
                return idx !== -1 && typeSet.has(this.entities.typeEnum[idx]);
            });
        }
        // Filter by storeys
        if (criteria.storeys && criteria.storeys.length > 0 && this.spatialHierarchy) {
            const storeySet = new Set(criteria.storeys);
            const storeyElements = new Set();
            for (const storeyId of storeySet) {
                const elements = this.spatialHierarchy.byStorey.get(storeyId);
                if (elements) {
                    for (const el of elements) {
                        storeyElements.add(el);
                    }
                }
            }
            candidates = candidates.filter((id) => storeyElements.has(id));
        }
        // Filter by buildings
        if (criteria.buildings && criteria.buildings.length > 0 && this.spatialHierarchy) {
            const buildingSet = new Set(criteria.buildings);
            const buildingElements = new Set();
            for (const buildingId of buildingSet) {
                const elements = this.spatialHierarchy.byBuilding.get(buildingId);
                if (elements) {
                    for (const el of elements) {
                        buildingElements.add(el);
                    }
                }
            }
            candidates = candidates.filter((id) => buildingElements.has(id));
        }
        // Filter by spaces
        if (criteria.spaces && criteria.spaces.length > 0 && this.spatialHierarchy) {
            const spaceSet = new Set(criteria.spaces);
            const spaceElements = new Set();
            for (const spaceId of spaceSet) {
                const elements = this.spatialHierarchy.bySpace.get(spaceId);
                if (elements) {
                    for (const el of elements) {
                        spaceElements.add(el);
                    }
                }
            }
            candidates = candidates.filter((id) => spaceElements.has(id));
        }
        // Filter by express IDs (direct selection)
        if (criteria.expressIds && criteria.expressIds.length > 0) {
            const idSet = new Set(criteria.expressIds);
            candidates = candidates.filter((id) => idSet.has(id));
        }
        // Filter by global IDs
        if (criteria.globalIds && criteria.globalIds.length > 0 && this.strings) {
            const globalIdSet = new Set(criteria.globalIds);
            candidates = candidates.filter((id) => {
                const idx = this.findEntityIndex(id);
                if (idx === -1)
                    return false;
                const globalIdIdx = this.entities.globalId[idx];
                const globalId = this.strings.get(globalIdIdx);
                return globalIdSet.has(globalId);
            });
        }
        // Filter by name pattern
        if (criteria.namePattern && this.strings) {
            const regex = new RegExp(criteria.namePattern, 'i');
            candidates = candidates.filter((id) => {
                const idx = this.findEntityIndex(id);
                if (idx === -1)
                    return false;
                const nameIdx = this.entities.name[idx];
                const name = this.strings.get(nameIdx);
                return regex.test(name);
            });
        }
        // Filter by property conditions
        if (criteria.propertyFilters && criteria.propertyFilters.length > 0) {
            for (const filter of criteria.propertyFilters) {
                candidates = this.filterByProperty(candidates, filter);
            }
        }
        return candidates;
    }
    /**
     * Preview a bulk query without executing
     */
    preview(query) {
        const matchedEntityIds = this.select(query.select);
        return {
            matchedEntityIds,
            matchedCount: matchedEntityIds.length,
            estimatedMutations: matchedEntityIds.length,
        };
    }
    /**
     * Execute a bulk query
     */
    execute(query) {
        const entityIds = this.select(query.select);
        const mutations = [];
        const errors = [];
        for (const entityId of entityIds) {
            try {
                const mutation = this.applyAction(entityId, query.action);
                if (mutation) {
                    mutations.push(mutation);
                }
            }
            catch (error) {
                errors.push(`Entity ${entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return {
            mutations,
            affectedEntityCount: mutations.length,
            success: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Apply an action to a single entity
     */
    applyAction(entityId, action) {
        switch (action.type) {
            case 'SET_PROPERTY':
                return this.mutationView.setProperty(entityId, action.psetName, action.propName, action.value, action.valueType);
            case 'DELETE_PROPERTY':
                return this.mutationView.deleteProperty(entityId, action.psetName, action.propName);
            case 'SET_ATTRIBUTE':
                // Attribute mutations would need to be implemented
                // For now, we'll skip these
                return null;
            default:
                return null;
        }
    }
    /**
     * Filter candidates by property condition
     */
    filterByProperty(candidates, filter) {
        return candidates.filter((entityId) => {
            // Get property value from mutation view (includes mutations)
            const value = filter.psetName
                ? this.mutationView.getPropertyValue(entityId, filter.psetName, filter.propName)
                : this.findPropertyByName(entityId, filter.propName);
            return this.matchesFilter(value, filter);
        });
    }
    /**
     * Find a property by name across all property sets
     */
    findPropertyByName(entityId, propName) {
        if (!this.properties)
            return null;
        const psets = this.properties.getForEntity(entityId);
        for (const pset of psets) {
            for (const prop of pset.properties) {
                if (prop.name === propName) {
                    return prop.value;
                }
            }
        }
        return null;
    }
    /**
     * Check if a value matches a filter condition
     */
    matchesFilter(value, filter) {
        // Handle null checks
        if (filter.operator === 'IS_NULL') {
            return value === null || value === undefined;
        }
        if (filter.operator === 'IS_NOT_NULL') {
            return value !== null && value !== undefined;
        }
        // For other operators, null values don't match
        if (value === null || value === undefined) {
            return false;
        }
        const filterValue = filter.value;
        // String operations
        if (typeof value === 'string' && typeof filterValue === 'string') {
            switch (filter.operator) {
                case '=':
                    return value === filterValue;
                case '!=':
                    return value !== filterValue;
                case 'CONTAINS':
                    return value.toLowerCase().includes(filterValue.toLowerCase());
                case 'STARTS_WITH':
                    return value.toLowerCase().startsWith(filterValue.toLowerCase());
                case 'ENDS_WITH':
                    return value.toLowerCase().endsWith(filterValue.toLowerCase());
                default:
                    return false;
            }
        }
        // Numeric operations
        if (typeof value === 'number' && typeof filterValue === 'number') {
            switch (filter.operator) {
                case '=':
                    return value === filterValue;
                case '!=':
                    return value !== filterValue;
                case '>':
                    return value > filterValue;
                case '<':
                    return value < filterValue;
                case '>=':
                    return value >= filterValue;
                case '<=':
                    return value <= filterValue;
                default:
                    return false;
            }
        }
        // Boolean operations
        if (typeof value === 'boolean') {
            const boolFilterValue = filterValue === true || filterValue === 'true';
            switch (filter.operator) {
                case '=':
                    return value === boolFilterValue;
                case '!=':
                    return value !== boolFilterValue;
                default:
                    return false;
            }
        }
        return false;
    }
    /**
     * Get all entity IDs
     */
    getAllEntityIds() {
        const ids = [];
        for (let i = 0; i < this.entities.count; i++) {
            ids.push(this.entities.expressId[i]);
        }
        return ids;
    }
    /**
     * Find the index of an entity by ID
     */
    findEntityIndex(expressId) {
        for (let i = 0; i < this.entities.count; i++) {
            if (this.entities.expressId[i] === expressId) {
                return i;
            }
        }
        return -1;
    }
}
//# sourceMappingURL=bulk-query-engine.js.map