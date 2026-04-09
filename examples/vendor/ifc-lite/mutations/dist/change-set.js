/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { generateChangeSetId } from './types.js';
/**
 * Manages collections of mutations as named change sets
 */
export class ChangeSetManager {
    changeSets = new Map();
    activeChangeSetId = null;
    /**
     * Create a new change set
     */
    createChangeSet(name) {
        const changeSet = {
            id: generateChangeSetId(),
            name,
            createdAt: Date.now(),
            mutations: [],
            applied: false,
        };
        this.changeSets.set(changeSet.id, changeSet);
        this.activeChangeSetId = changeSet.id;
        return changeSet;
    }
    /**
     * Get the active change set
     */
    getActiveChangeSet() {
        if (!this.activeChangeSetId)
            return null;
        return this.changeSets.get(this.activeChangeSetId) || null;
    }
    /**
     * Set the active change set
     */
    setActiveChangeSet(id) {
        if (id && !this.changeSets.has(id)) {
            throw new Error(`Change set ${id} not found`);
        }
        this.activeChangeSetId = id;
    }
    /**
     * Add a mutation to the active change set
     */
    addMutation(mutation) {
        const changeSet = this.getActiveChangeSet();
        if (!changeSet) {
            // Auto-create a default change set
            const newChangeSet = this.createChangeSet('Unsaved Changes');
            newChangeSet.mutations.push(mutation);
        }
        else {
            changeSet.mutations.push(mutation);
        }
    }
    /**
     * Get a change set by ID
     */
    getChangeSet(id) {
        return this.changeSets.get(id) || null;
    }
    /**
     * Get all change sets
     */
    getAllChangeSets() {
        return Array.from(this.changeSets.values());
    }
    /**
     * Delete a change set
     */
    deleteChangeSet(id) {
        if (this.activeChangeSetId === id) {
            this.activeChangeSetId = null;
        }
        return this.changeSets.delete(id);
    }
    /**
     * Rename a change set
     */
    renameChangeSet(id, newName) {
        const changeSet = this.changeSets.get(id);
        if (changeSet) {
            changeSet.name = newName;
        }
    }
    /**
     * Mark a change set as applied
     */
    markApplied(id) {
        const changeSet = this.changeSets.get(id);
        if (changeSet) {
            changeSet.applied = true;
        }
    }
    /**
     * Merge multiple change sets into one
     */
    mergeChangeSets(ids, newName) {
        const mutations = [];
        for (const id of ids) {
            const changeSet = this.changeSets.get(id);
            if (changeSet) {
                mutations.push(...changeSet.mutations);
            }
        }
        // Sort by timestamp
        mutations.sort((a, b) => a.timestamp - b.timestamp);
        const merged = {
            id: generateChangeSetId(),
            name: newName,
            createdAt: Date.now(),
            mutations,
            applied: false,
        };
        this.changeSets.set(merged.id, merged);
        return merged;
    }
    /**
     * Export a change set as JSON
     */
    exportChangeSet(id) {
        const changeSet = this.changeSets.get(id);
        if (!changeSet) {
            throw new Error(`Change set ${id} not found`);
        }
        return JSON.stringify({
            version: 1,
            changeSet,
            exportedAt: Date.now(),
        }, null, 2);
    }
    /**
     * Import a change set from JSON
     */
    importChangeSet(json) {
        const data = JSON.parse(json);
        if (!data.changeSet) {
            throw new Error('Invalid change set format');
        }
        const changeSet = {
            ...data.changeSet,
            id: generateChangeSetId(), // Generate new ID to avoid conflicts
            applied: false,
        };
        this.changeSets.set(changeSet.id, changeSet);
        return changeSet;
    }
    /**
     * Get statistics about all change sets
     */
    getStatistics() {
        const entities = new Set();
        const models = new Set();
        let totalMutations = 0;
        for (const changeSet of this.changeSets.values()) {
            totalMutations += changeSet.mutations.length;
            for (const mutation of changeSet.mutations) {
                entities.add(`${mutation.modelId}:${mutation.entityId}`);
                models.add(mutation.modelId);
            }
        }
        return {
            totalChangeSets: this.changeSets.size,
            totalMutations,
            affectedEntities: entities.size,
            affectedModels: models.size,
        };
    }
    /**
     * Clear all change sets
     */
    clear() {
        this.changeSets.clear();
        this.activeChangeSetId = null;
    }
}
//# sourceMappingURL=change-set.js.map