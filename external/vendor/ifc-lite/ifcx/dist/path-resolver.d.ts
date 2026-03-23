/**
 * Path Resolver for Federated IFCX
 *
 * Handles resolution of IFCX paths including:
 * - Direct UUID references: "93791d5d-5beb-437b-b8ec-2f1f0ba4bf3b"
 * - Hierarchical paths: "uuid/ChildName/GrandchildName"
 */
import type { ComposedNode } from './types.js';
import type { IfcxLayer } from './layer-stack.js';
/**
 * Parsed path components.
 */
export interface ParsedPath {
    /** Root UUID or path segment */
    root: string;
    /** Child path segments (empty for direct UUID) */
    segments: string[];
    /** Whether root looks like a UUID */
    isUuid: boolean;
}
/**
 * Entry in the path index.
 */
export interface PathEntry {
    /** Canonical UUID for this path */
    uuid: string;
    /** All known hierarchical paths to this node */
    hierarchicalPaths: string[];
    /** Layer IDs where this path is defined */
    definedInLayers: string[];
    /** Strongest (lowest index) layer ID */
    primaryLayer: string;
}
/**
 * Index for fast path lookups across layers.
 */
export declare class PathIndex {
    /** Direct UUID lookup */
    private byUuid;
    /** Hierarchical path string lookup */
    private byHierarchy;
    /** Parent UUID -> (child name -> child UUID) */
    private childNameIndex;
    /**
     * Build index from layers.
     */
    buildIndex(layers: IfcxLayer[]): void;
    /**
     * Build hierarchical path index by walking children relationships.
     */
    private buildHierarchicalIndex;
    /**
     * Recursively index hierarchical paths for a node.
     */
    private indexHierarchicalPaths;
    /**
     * Resolve a path to its canonical UUID.
     * Accepts both direct UUIDs and hierarchical paths.
     */
    resolvePath(path: string): string | null;
    /**
     * Walk a path through children relationships.
     */
    private walkPath;
    /**
     * Get entry for a UUID.
     */
    getEntry(uuid: string): PathEntry | undefined;
    /**
     * Get all UUIDs in the index.
     */
    getAllUuids(): string[];
    /**
     * Get children of a node.
     */
    getChildren(uuid: string): Map<string, string> | undefined;
    /**
     * Check if a path exists.
     */
    hasPath(path: string): boolean;
    /**
     * Clear the index.
     */
    clear(): void;
    /**
     * Get index statistics.
     */
    getStats(): {
        uuidCount: number;
        hierarchicalCount: number;
        childRelationships: number;
    };
}
/**
 * Parse an IFCX path into components.
 *
 * Examples:
 *   "93791d5d-5beb-437b-b8ec-2f1f0ba4bf3b"
 *     -> { root: "93791d5d-...", segments: [], isUuid: true }
 *
 *   "93791d5d-5beb-437b-b8ec-2f1f0ba4bf3b/My_Wall/Window"
 *     -> { root: "93791d5d-...", segments: ["My_Wall", "Window"], isUuid: true }
 */
export declare function parsePath(path: string): ParsedPath;
/**
 * Walk a path through composed nodes.
 */
export declare function walkComposedPath(root: ComposedNode, segments: string[]): ComposedNode | null;
/**
 * Create a new path index.
 */
export declare function createPathIndex(): PathIndex;
//# sourceMappingURL=path-resolver.d.ts.map