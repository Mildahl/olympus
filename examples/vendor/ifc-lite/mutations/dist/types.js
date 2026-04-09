/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/**
 * Generate a unique ID for mutations
 */
export function generateMutationId() {
    return `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Generate a unique ID for change sets
 */
export function generateChangeSetId() {
    return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Create a mutation key for property lookup
 */
export function propertyKey(entityId, psetName, propName) {
    return `${entityId}:${psetName}:${propName}`;
}
/**
 * Create a mutation key for quantity lookup
 */
export function quantityKey(entityId, qsetName, quantName) {
    return `${entityId}:${qsetName}:${quantName}`;
}
/**
 * Create a mutation key for attribute lookup
 */
export function attributeKey(entityId, attributeName) {
    return `${entityId}:attr:${attributeName}`;
}
//# sourceMappingURL=types.js.map