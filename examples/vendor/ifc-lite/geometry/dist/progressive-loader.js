/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export var GeometryQuality;
(function (GeometryQuality) {
    GeometryQuality["Fast"] = "fast";
    GeometryQuality["Balanced"] = "balanced";
    GeometryQuality["High"] = "high"; // Full quality + mesh repair
})(GeometryQuality || (GeometryQuality = {}));
/**
 * Calculate priority score for a mesh
 * Higher score = load sooner
 */
export function calculateMeshPriority(flatMesh, expressId, entityIndex) {
    let priority = 0;
    // Priority based on geometry count (more geometry = more important)
    const geomCount = flatMesh.geometries ? flatMesh.geometries.size() : 0;
    priority += geomCount * 10;
    // Priority based on entity type (structural elements first)
    if (entityIndex) {
        const entity = entityIndex.get(expressId);
        if (entity) {
            const type = entity.type?.toUpperCase() || '';
            if (type.includes('WALL'))
                priority += 100;
            if (type.includes('SLAB'))
                priority += 90;
            if (type.includes('BEAM'))
                priority += 80;
            if (type.includes('COLUMN'))
                priority += 85;
            if (type.includes('DOOR'))
                priority += 40;
            if (type.includes('WINDOW'))
                priority += 40;
            if (type.includes('FURNITURE'))
                priority += 20;
            if (type.includes('FASTENER'))
                priority += 5;
        }
    }
    return priority;
}
/**
 * Progressive mesh loader - processes meshes in priority batches
 */
export class ProgressiveMeshLoader {
    quality;
    batchSize;
    yieldInterval; // ms between yields
    constructor(quality = GeometryQuality.Balanced, batchSize = 50, yieldInterval = 16 // ~60fps
    ) {
        this.quality = quality;
        this.batchSize = batchSize;
        this.yieldInterval = yieldInterval;
    }
    /**
     * Sort meshes by priority and return sorted array
     */
    prioritizeMeshes(geometries, entityIndex) {
        const geomCount = geometries.size();
        const priorityMeshes = [];
        for (let i = 0; i < geomCount; i++) {
            const flatMesh = geometries.get(i);
            const expressId = flatMesh.expressID;
            const priority = calculateMeshPriority(flatMesh, expressId, entityIndex);
            priorityMeshes.push({
                index: i,
                expressId,
                priority,
                flatMesh,
            });
        }
        // Sort by priority (highest first)
        priorityMeshes.sort((a, b) => b.priority - a.priority);
        return priorityMeshes;
    }
    /**
     * Check if mesh should be skipped based on quality mode
     */
    shouldSkipMesh(priorityMesh, flatMesh) {
        if (this.quality === GeometryQuality.Balanced || this.quality === GeometryQuality.High) {
            return false; // Don't skip anything
        }
        // Fast mode: skip low-priority meshes
        if (priorityMesh.priority < 10) {
            return true;
        }
        // Fast mode: skip meshes with very few geometries
        const geomCount = flatMesh.geometries ? flatMesh.geometries.size() : 0;
        if (geomCount === 0) {
            return true;
        }
        return false;
    }
    /**
     * Yield control to main thread
     */
    async yieldToMainThread() {
        return new Promise((resolve) => {
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => resolve(), { timeout: this.yieldInterval });
            }
            else {
                setTimeout(() => resolve(), this.yieldInterval);
            }
        });
    }
    /**
     * Process meshes in batches with yielding
     */
    async *processBatches(priorityMeshes, processMesh) {
        let batch = [];
        let lastYieldTime = performance.now();
        for (const priorityMesh of priorityMeshes) {
            // Skip mesh if quality mode requires it
            if (this.shouldSkipMesh(priorityMesh, priorityMesh.flatMesh)) {
                continue;
            }
            const mesh = processMesh(priorityMesh);
            if (mesh) {
                batch.push(mesh);
            }
            // Yield batch if full or time elapsed
            const now = performance.now();
            if (batch.length >= this.batchSize ||
                (now - lastYieldTime) >= this.yieldInterval) {
                if (batch.length > 0) {
                    yield batch;
                    batch = [];
                }
                lastYieldTime = now;
                await this.yieldToMainThread();
            }
        }
        // Yield remaining batch
        if (batch.length > 0) {
            yield batch;
        }
    }
}
//# sourceMappingURL=progressive-loader.js.map