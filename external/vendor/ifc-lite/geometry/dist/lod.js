/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export class LODGenerator {
    config;
    constructor(config = {}) {
        this.config = {
            minScreenSize: config.minScreenSize ?? 2.0, // 2 pixels minimum
            distanceThresholds: config.distanceThresholds ?? [50, 200, 1000], // near, mid, far
        };
    }
    /**
     * Calculate screen-space size of a mesh from camera position
     */
    calculateScreenSize(meshBounds, cameraPosition, _viewProjMatrix, _viewportWidth, viewportHeight) {
        // Calculate center of bounds
        const center = {
            x: (meshBounds.min.x + meshBounds.max.x) / 2,
            y: (meshBounds.min.y + meshBounds.max.y) / 2,
            z: (meshBounds.min.z + meshBounds.max.z) / 2,
        };
        // Calculate size of bounds
        const size = {
            x: meshBounds.max.x - meshBounds.min.x,
            y: meshBounds.max.y - meshBounds.min.y,
            z: meshBounds.max.z - meshBounds.min.z,
        };
        // Approximate radius (half diagonal)
        const radius = Math.sqrt(size.x ** 2 + size.y ** 2 + size.z ** 2) / 2;
        // Distance from camera to center
        const dx = center.x - cameraPosition.x;
        const dy = center.y - cameraPosition.y;
        const dz = center.z - cameraPosition.z;
        const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
        if (distance === 0)
            return Infinity;
        // Project radius to screen space
        // Simplified: assume FOV of 45 degrees (tan(22.5) ≈ 0.414)
        const fovFactor = 0.414;
        const screenSize = (radius / distance) * viewportHeight * fovFactor;
        return screenSize;
    }
    /**
     * Determine if mesh should be rendered based on screen size
     */
    shouldRender(meshBounds, cameraPosition, viewProjMatrix, viewportWidth, viewportHeight) {
        const screenSize = this.calculateScreenSize(meshBounds, cameraPosition, viewProjMatrix, viewportWidth, viewportHeight);
        return screenSize >= this.config.minScreenSize;
    }
    /**
     * Get LOD level based on distance (0 = full detail, 1 = medium, 2 = low, -1 = cull)
     */
    getLODLevel(meshBounds, cameraPosition) {
        // Calculate center of bounds
        const center = {
            x: (meshBounds.min.x + meshBounds.max.x) / 2,
            y: (meshBounds.min.y + meshBounds.max.y) / 2,
            z: (meshBounds.min.z + meshBounds.max.z) / 2,
        };
        // Distance from camera to center
        const dx = center.x - cameraPosition.x;
        const dy = center.y - cameraPosition.y;
        const dz = center.z - cameraPosition.z;
        const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
        const [near, mid, far] = this.config.distanceThresholds;
        if (distance < near) {
            return 0; // Full detail
        }
        else if (distance < mid) {
            return 1; // Medium detail
        }
        else if (distance < far) {
            return 2; // Low detail
        }
        else {
            return -1; // Cull
        }
    }
    /**
     * Compute bounds from mesh data
     */
    static computeBounds(mesh) {
        const positions = mesh.positions;
        if (positions.length === 0) {
            return {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 0, y: 0, z: 0 },
            };
        }
        let minX = positions[0];
        let minY = positions[1];
        let minZ = positions[2];
        let maxX = positions[0];
        let maxY = positions[1];
        let maxZ = positions[2];
        for (let i = 3; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
        };
    }
}
//# sourceMappingURL=lod.js.map