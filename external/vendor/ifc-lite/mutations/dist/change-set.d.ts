/**
 * Change set management for IFC mutations
 */
import type { ChangeSet, Mutation } from './types.js';
/**
 * Manages collections of mutations as named change sets
 */
export declare class ChangeSetManager {
    private changeSets;
    private activeChangeSetId;
    /**
     * Create a new change set
     */
    createChangeSet(name: string): ChangeSet;
    /**
     * Get the active change set
     */
    getActiveChangeSet(): ChangeSet | null;
    /**
     * Set the active change set
     */
    setActiveChangeSet(id: string | null): void;
    /**
     * Add a mutation to the active change set
     */
    addMutation(mutation: Mutation): void;
    /**
     * Get a change set by ID
     */
    getChangeSet(id: string): ChangeSet | null;
    /**
     * Get all change sets
     */
    getAllChangeSets(): ChangeSet[];
    /**
     * Delete a change set
     */
    deleteChangeSet(id: string): boolean;
    /**
     * Rename a change set
     */
    renameChangeSet(id: string, newName: string): void;
    /**
     * Mark a change set as applied
     */
    markApplied(id: string): void;
    /**
     * Merge multiple change sets into one
     */
    mergeChangeSets(ids: string[], newName: string): ChangeSet;
    /**
     * Export a change set as JSON
     */
    exportChangeSet(id: string): string;
    /**
     * Import a change set from JSON
     */
    importChangeSet(json: string): ChangeSet;
    /**
     * Get statistics about all change sets
     */
    getStatistics(): {
        totalChangeSets: number;
        totalMutations: number;
        affectedEntities: number;
        affectedModels: number;
    };
    /**
     * Clear all change sets
     */
    clear(): void;
}
//# sourceMappingURL=change-set.d.ts.map