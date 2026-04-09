/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function findTraversalRoots(composed) {
    const childPaths = new Set();
    for (const node of composed.values()) {
        for (const child of node.children.values()) {
            childPaths.add(child.path);
        }
    }
    return [...composed.values()].filter((node) => !childPaths.has(node.path));
}
export function findTraversalSeeds(composed) {
    const seeds = [];
    const reachable = new Set();
    const roots = findTraversalRoots(composed);
    for (const root of roots) {
        seeds.push(root);
        markReachable(root, reachable, new Set([root.path]));
    }
    for (const node of composed.values()) {
        if (reachable.has(node.path))
            continue;
        seeds.push(node);
        markReachable(node, reachable, new Set([node.path]));
    }
    return seeds;
}
export function walkComposedFrames(composed, visit) {
    for (const seed of findTraversalSeeds(composed)) {
        traverse(seed, null, null, new Set([seed.path]), visit);
    }
}
export function getFrameLineage(frame) {
    const lineage = [];
    let current = frame;
    while (current) {
        lineage.unshift(current);
        current = current.parent;
    }
    return lineage;
}
export function getNodeLineage(frame) {
    return getFrameLineage(frame).map((entry) => entry.node);
}
export function collectIncomingEdgeNames(composed) {
    const incomingNames = new Map();
    for (const node of composed.values()) {
        for (const [edgeName, child] of node.children) {
            const names = incomingNames.get(child.path) ?? [];
            if (!names.includes(edgeName)) {
                names.push(edgeName);
            }
            incomingNames.set(child.path, names);
        }
    }
    return incomingNames;
}
export function buildReachableAttributeIndex(composed, attributeKey) {
    const memo = new Map();
    const visiting = new Set();
    const hasAttributeInReachableSubtree = (node) => {
        const cached = memo.get(node.path);
        if (cached !== undefined)
            return cached;
        if (visiting.has(node.path))
            return false;
        visiting.add(node.path);
        let result = node.attributes.has(attributeKey);
        if (!result) {
            for (const child of node.children.values()) {
                if (hasAttributeInReachableSubtree(child)) {
                    result = true;
                    break;
                }
            }
        }
        visiting.delete(node.path);
        memo.set(node.path, result);
        return result;
    };
    for (const node of composed.values()) {
        hasAttributeInReachableSubtree(node);
    }
    return memo;
}
function markReachable(node, reachable, path) {
    if (reachable.has(node.path))
        return;
    reachable.add(node.path);
    for (const child of node.children.values()) {
        if (path.has(child.path))
            continue;
        const childPath = new Set(path);
        childPath.add(child.path);
        markReachable(child, reachable, childPath);
    }
}
function traverse(node, parent, edgeName, path, visit) {
    const frame = {
        node,
        parent,
        edgeName,
        depth: parent ? parent.depth + 1 : 0,
    };
    visit(frame);
    for (const [childEdgeName, child] of node.children) {
        if (path.has(child.path))
            continue;
        const childPath = new Set(path);
        childPath.add(child.path);
        traverse(child, frame, childEdgeName, childPath, visit);
    }
}
//# sourceMappingURL=traversal.js.map