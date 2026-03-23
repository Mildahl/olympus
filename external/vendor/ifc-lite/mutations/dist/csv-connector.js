/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { PropertyValueType } from '@ifc-lite/data';
/**
 * CSV Data Connector
 */
export class CsvConnector {
    entities;
    mutationView;
    strings;
    constructor(entities, mutationView, strings) {
        this.entities = entities;
        this.mutationView = mutationView;
        this.strings = strings || null;
    }
    /**
     * Parse CSV content into rows
     */
    parse(content, options = {}) {
        const delimiter = options.delimiter || ',';
        const hasHeader = options.hasHeader !== false;
        const skipEmpty = options.skipEmpty !== false;
        const lines = content.split(/\r?\n/);
        if (lines.length === 0)
            return [];
        // Parse header
        let headers;
        let dataStartIndex;
        if (hasHeader) {
            headers = this.parseCsvLine(lines[0], delimiter);
            dataStartIndex = 1;
        }
        else {
            // Generate column names: col1, col2, etc.
            const firstLine = this.parseCsvLine(lines[0], delimiter);
            headers = firstLine.map((_, i) => `col${i + 1}`);
            dataStartIndex = 0;
        }
        // Parse data rows
        const rows = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (skipEmpty && !line)
                continue;
            const values = this.parseCsvLine(line, delimiter);
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j] || '';
            }
            rows.push(row);
        }
        return rows;
    }
    /**
     * Match CSV rows to IFC entities
     */
    match(rows, mapping) {
        return rows.map((row, rowIndex) => this.matchRow(row, rowIndex, mapping.matchStrategy));
    }
    /**
     * Match a single row to entities
     */
    matchRow(row, rowIndex, strategy) {
        const matchValue = row[strategy.column];
        const matchedEntityIds = [];
        const warnings = [];
        if (!matchValue || matchValue.trim() === '') {
            warnings.push(`Empty match value in column "${strategy.column}"`);
            return { row, rowIndex, matchedEntityIds, confidence: 0, warnings };
        }
        switch (strategy.type) {
            case 'globalId':
                // Match by GlobalId
                for (let i = 0; i < this.entities.count; i++) {
                    const globalIdIdx = this.entities.globalId[i];
                    const globalId = this.strings?.get(globalIdIdx) || '';
                    if (globalId === matchValue) {
                        matchedEntityIds.push(this.entities.expressId[i]);
                    }
                }
                break;
            case 'expressId':
                // Match by Express ID
                const expressId = parseInt(matchValue, 10);
                if (!isNaN(expressId)) {
                    for (let i = 0; i < this.entities.count; i++) {
                        if (this.entities.expressId[i] === expressId) {
                            matchedEntityIds.push(expressId);
                            break;
                        }
                    }
                }
                else {
                    warnings.push(`Invalid Express ID: ${matchValue}`);
                }
                break;
            case 'name':
                // Match by name (case-insensitive)
                const searchName = matchValue.toLowerCase();
                for (let i = 0; i < this.entities.count; i++) {
                    const nameIdx = this.entities.name[i];
                    const name = (this.strings?.get(nameIdx) || '').toLowerCase();
                    if (name === searchName) {
                        matchedEntityIds.push(this.entities.expressId[i]);
                    }
                }
                break;
            case 'property':
                // Match by existing property value
                // This would require access to the property table
                warnings.push('Property matching not yet implemented');
                break;
        }
        const confidence = matchedEntityIds.length === 1 ? 1 : matchedEntityIds.length > 1 ? 0.5 : 0;
        if (matchedEntityIds.length > 1) {
            warnings.push(`Multiple entities (${matchedEntityIds.length}) matched for value "${matchValue}"`);
        }
        return { row, rowIndex, matchedEntityIds, confidence, warnings };
    }
    /**
     * Generate mutations from matched data
     */
    generateMutations(matches, mapping) {
        const mutations = [];
        for (const match of matches) {
            if (match.matchedEntityIds.length === 0)
                continue;
            for (const entityId of match.matchedEntityIds) {
                for (const propMapping of mapping.propertyMappings) {
                    const rawValue = match.row[propMapping.sourceColumn];
                    if (rawValue === undefined || rawValue === '')
                        continue;
                    const value = propMapping.transform
                        ? propMapping.transform(rawValue)
                        : this.parseValue(rawValue, propMapping.valueType);
                    const mutation = this.mutationView.setProperty(entityId, propMapping.targetPset, propMapping.targetProperty, value, propMapping.valueType);
                    mutations.push(mutation);
                }
            }
        }
        return mutations;
    }
    /**
     * Import CSV data and apply to entities
     */
    import(content, mapping, options = {}) {
        const stats = {
            totalRows: 0,
            matchedRows: 0,
            unmatchedRows: 0,
            mutationsCreated: 0,
            errors: [],
            warnings: [],
        };
        try {
            // Parse CSV
            const rows = this.parse(content, options);
            stats.totalRows = rows.length;
            // Match rows to entities
            const matches = this.match(rows, mapping);
            for (const match of matches) {
                if (match.matchedEntityIds.length > 0) {
                    stats.matchedRows++;
                }
                else {
                    stats.unmatchedRows++;
                }
                if (match.warnings) {
                    stats.warnings.push(...match.warnings);
                }
            }
            // Generate and apply mutations
            const mutations = this.generateMutations(matches, mapping);
            stats.mutationsCreated = mutations.length;
        }
        catch (error) {
            stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
        return stats;
    }
    /**
     * Preview import without applying changes
     */
    preview(content, mapping, options = {}) {
        const rows = this.parse(content, options);
        const matches = this.match(rows, mapping);
        let estimatedMutations = 0;
        for (const match of matches) {
            estimatedMutations += match.matchedEntityIds.length * mapping.propertyMappings.length;
        }
        return { rows, matches, estimatedMutations };
    }
    /**
     * Parse a single CSV line respecting quoted values
     */
    parseCsvLine(line, delimiter) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === delimiter && !inQuotes) {
                values.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }
    /**
     * Parse a string value to the appropriate type
     */
    parseValue(value, type) {
        switch (type) {
            case PropertyValueType.Real:
                return parseFloat(value) || 0;
            case PropertyValueType.Integer:
                return parseInt(value, 10) || 0;
            case PropertyValueType.Boolean:
            case PropertyValueType.Logical:
                const lower = value.toLowerCase();
                return lower === 'true' || lower === 'yes' || lower === '1';
            case PropertyValueType.List:
                try {
                    return JSON.parse(value);
                }
                catch {
                    return value.split(';').map((s) => s.trim());
                }
            default:
                return value;
        }
    }
    /**
     * Auto-detect column mappings based on column names
     */
    autoDetectMappings(headers) {
        const mappings = [];
        // Common property patterns
        const patterns = [
            { pattern: /^fire\s*rating$/i, pset: 'Pset_WallCommon', prop: 'FireRating', type: PropertyValueType.String },
            { pattern: /^load\s*bearing$/i, pset: 'Pset_WallCommon', prop: 'LoadBearing', type: PropertyValueType.Boolean },
            { pattern: /^is\s*external$/i, pset: 'Pset_WallCommon', prop: 'IsExternal', type: PropertyValueType.Boolean },
            { pattern: /^acoustic\s*rating$/i, pset: 'Pset_WallCommon', prop: 'AcousticRating', type: PropertyValueType.String },
            { pattern: /^thermal\s*transmittance$/i, pset: 'Pset_WallCommon', prop: 'ThermalTransmittance', type: PropertyValueType.Real },
            { pattern: /^manufacturer$/i, pset: 'Pset_ManufacturerTypeInformation', prop: 'Manufacturer', type: PropertyValueType.String },
            { pattern: /^model\s*reference$/i, pset: 'Pset_ManufacturerTypeInformation', prop: 'ModelReference', type: PropertyValueType.String },
            { pattern: /^article\s*number$/i, pset: 'Pset_ManufacturerTypeInformation', prop: 'ArticleNumber', type: PropertyValueType.String },
        ];
        for (const header of headers) {
            // Skip common ID columns
            if (/^(global\s*id|express\s*id|id|guid)$/i.test(header)) {
                continue;
            }
            // Check against known patterns
            let matched = false;
            for (const { pattern, pset, prop, type } of patterns) {
                if (pattern.test(header)) {
                    mappings.push({
                        sourceColumn: header,
                        targetPset: pset,
                        targetProperty: prop,
                        valueType: type,
                    });
                    matched = true;
                    break;
                }
            }
            // Default: use as custom property
            if (!matched) {
                mappings.push({
                    sourceColumn: header,
                    targetPset: 'Pset_Custom',
                    targetProperty: this.cleanPropertyName(header),
                    valueType: PropertyValueType.String,
                });
            }
        }
        return mappings;
    }
    /**
     * Clean a string to be a valid property name
     */
    cleanPropertyName(name) {
        return name
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
}
//# sourceMappingURL=csv-connector.js.map