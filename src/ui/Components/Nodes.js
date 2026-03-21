import { Components as UIComponents } from "./Components.js";

import { HierarchyToggleUtil } from "../../utils/HierarchyToggleUtil.js";

import { FloatingPanel } from "./../../../drawUI/FloatingPanel.js";

import { UIDiv } from "./../../../drawUI/ui.js";

class Nodes extends FloatingPanel {

    constructor( nodeData ) {
        super();

        this.embedded = nodeData.embedded || false;

        this.hierarchyToggleUtil = new HierarchyToggleUtil();

        this.hierarchyToggleUtil.expandAll(nodeData.nodes);

        this.moveInPack = false;

        this.highlightByGroup = false;

        this.noOverlapDisplay = false;

        this.onEdit = nodeData.onEdit || null;

        this.onDelete = nodeData.onDelete || null;

        this.onNodeClick = nodeData.onNodeClick || null;

        if (this.embedded) {
            return this._renderEmbeddedNodeView(nodeData);
        }

        return this._renderNodeView( nodeData );
    }

    addNode (nodeData) {
        const canvasInner = this.dom.querySelector('.ws-node-canvas-inner');

        const rect = canvasInner.getBoundingClientRect();

        const mouseX = rect.left + (rect.width / 2);

        const mouseY = rect.top + (rect.height / 2);

        const nodeElement = this._createNodeElement(nodeData, { x: mouseX, y: mouseY });

        this.currentNodeData.canvasInner.add(nodeElement);
    }

    removeNode (nodeId) {
        const nodeElement = this.dom.querySelector(`.ws-node[data-node-id="${nodeId}"]`);

        if (nodeElement) {
            nodeElement.remove();
        }
    }

    updateNode (nodeId, newData) {
        const nodeElement = this.dom.querySelector(`.ws-node[data-node-id="${nodeId}"]`);

        if (nodeElement) {
            Object.entries(newData).forEach(([key, value]) => {
                nodeElement.setAttribute(`data-${key}`, value);
            });
        }
    }

    toggleNodeChildren(nodeId) {
        const wasExpanded = this.hierarchyToggleUtil.isExpanded(nodeId);

        this.hierarchyToggleUtil.toggleNode(nodeId);

        const isNowExpanded = this.hierarchyToggleUtil.isExpanded(nodeId);

        const nodeElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${nodeId}"]`);

        if (nodeElement) {
            const rollBtn = nodeElement.querySelector('.ws-node-roll-btn');

            if (rollBtn) {
                rollBtn.textContent = isNowExpanded ? '🔽' : '▶';

                rollBtn.title = isNowExpanded ? 'Roll up' : 'Roll down';
            }
        }

        if (isNowExpanded && !wasExpanded) {
            this._repositionChildrenRelativeToParent(nodeId);
        }

        this._updateNodeVisibility();

        this._updateConnectionsVisibility();

        this._updateMiniMap();

        setTimeout(() => {
            this._recalculateAllConnections();

            if (this.highlightByGroup) {
                this._createGroupBackgrounds(this.currentNodeData.nodeData.nodes, this.currentNodeData.canvasInner);
            }
        }, 50);
    }

    highlightNode(nodeId, color) {
        const nodeElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${nodeId}"]`);

        nodeElement.classList.add('critical');
    }

    highlightConnection(sourceId, targetId, color) {
        const connectionsLayer = this.currentNodeData.connectionsLayer;

        const connectionElement = connectionsLayer.querySelector(`[data-connection-id="${sourceId}-${targetId}"]`);

        if (connectionElement) {
            const path = connectionElement.querySelector('.ws-connection-path');

            if (path) {
                path.setAttribute('stroke', color);

                path.setAttribute('stroke-width', '3');
            }
        }
    }

    clearHighlights() {
        const canvasInner = this.currentNodeData.canvasInner;

        const connectionsLayer = this.currentNodeData.connectionsLayer;

        const nodes = canvasInner.dom.querySelectorAll('.ws-node');

        nodes.forEach(node => {
            node.style.borderColor = '';

            node.style.boxShadow = '';
        });

        const connections = connectionsLayer.querySelectorAll('.ws-connection-path');

        connections.forEach(path => {
            path.setAttribute('stroke', '#0a84ff');

            path.setAttribute('stroke-width', '2');
        });
    }

    addConnection(sourceId, sourceHandle, targetId, targetHandle) {
        const existingConnection = this.currentNodeData.connections.find(
            conn => conn.source === sourceId &&
                   conn.sourceHandle === sourceHandle &&
                   conn.target === targetId &&
                   conn.targetHandle === targetHandle
        );

        if (existingConnection) {
            return false;
        }

        const connection = {
            source: sourceId,
            sourceHandle: sourceHandle,
            target: targetId,
            targetHandle: targetHandle,
            type: `${sourceHandle}-${targetHandle}`
        };

        this.currentNodeData.connections.push(connection);

        const positions = this.currentNodeData.positions;

        const connectionElement = this._createConnectionElement(connection, positions);

        if (connectionElement) {
            this.currentNodeData.connectionsLayer.appendChild(connectionElement);
        }

        return true;
    }

    removeConnection(sourceId, targetId) {
        this.currentNodeData.connections = this.currentNodeData.connections.filter(
            conn => !(conn.source === sourceId && conn.target === targetId)
        );

        const connectionsLayer = this.currentNodeData.connectionsLayer;

        const connectionElement = connectionsLayer.querySelector(`[data-connection-id="${sourceId}-${targetId}"]`);

        if (connectionElement) {
            connectionElement.remove();
        }
    }

    _renderNodeView( nodeData ) {

        const canvas = UIComponents.div();

        canvas.setClass('ws-node-canvas');

        const canvasInner = UIComponents.div();

        canvasInner.setClass('ws-node-canvas-inner');

        const positions = this._calculateNodePositions(nodeData.nodes);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        positions.forEach(pos => {
            minX = Math.min(minX, pos.x);

            minY = Math.min(minY, pos.y);

            maxX = Math.max(maxX, pos.x + 250);

            maxY = Math.max(maxY, pos.y + 120);
        });

        const sidePadding = 200;

        const canvasWidth = Math.max(maxX - minX + sidePadding * 2, this.contentWrapper.dom.clientWidth );

        const canvasHeight = Math.max(maxY - minY + sidePadding * 2, this.contentWrapper.dom.clientHeight );

        const offsetX = -minX + sidePadding;

        const offsetY = -minY + sidePadding;

        const adjustedPositions = new Map();

        positions.forEach((p, id) => {
            adjustedPositions.set(id, { x: p.x + offsetX, y: p.y + offsetY });
        });

        positions.clear();

        adjustedPositions.forEach((p, id) => positions.set(id, p));
        
        const miniMap = this._createMiniMap(nodeData.nodes, positions, canvas);

        canvas.add(miniMap);

        canvasInner.setStyle('width', [`${canvasWidth}px`]);

        canvasInner.setStyle('height', [`${canvasHeight}px`]);

        const connectionsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        connectionsLayer.setAttribute('class', 'ws-connections');

        connectionsLayer.setAttribute('width', canvasWidth);

        connectionsLayer.setAttribute('height', canvasHeight);

        connectionsLayer.style.width = `${canvasWidth}px`;

        connectionsLayer.style.height = `${canvasHeight}px`;

        canvasInner.dom.appendChild(connectionsLayer);

        nodeData.connections.forEach(connection => {
            const connectionElement = this._createConnectionElement(connection, positions);

            if (connectionElement) {
                connectionsLayer.appendChild(connectionElement);
            }
        });

        nodeData.nodes.forEach(node => {
            const nodeElement = this._createNodeElement(node, positions.get(node.id));

            canvasInner.add(nodeElement);
        });

        if (this.highlightByGroup) {
            this._createGroupBackgrounds(nodeData.nodes, canvasInner);
        }

        canvas.add(canvasInner);

        this._makeNodesDraggable(canvasInner, connectionsLayer);

        this.addContent(canvas);

        const controlsDiv = UIComponents.div().setClass('NodesControls');

        this.addContent(controlsDiv);

        const zoomControls = this._createZoomControls(canvas, canvasInner);

        controlsDiv.add(zoomControls);

        const movePackControl = this._createMovePackControl();

        controlsDiv.add(movePackControl);

        const highlightControl = this._createHighlightControl();

        controlsDiv.add(highlightControl);

        const noOverlapControl = this._createNoOverlapControl();

        controlsDiv.add(noOverlapControl);

        this.currentNodeData = {
            nodeData: nodeData,
            connections: nodeData.connections,
            positions,
            connectionsLayer,
            canvasInner,
            canvas
        };

        this._updateNodeVisibility();

        this._updateConnectionsVisibility();

        this.updateConnections = () => this._updateConnectionPaths(connectionsLayer, nodeData.connections, positions);

        window.addEventListener('resize', this.updateConnections);

        setTimeout(() => {
            this._recalculateAllConnections();

            canvas.scrollLeft = (canvasWidth - canvas.clientWidth) / 2;

            canvas.scrollTop = 50;
        }, 100);

        return this;

    }

    _renderEmbeddedNodeView(nodeData) {
        const wrapper = new UIDiv();

        wrapper.setClass('ws-node-view-embedded');

        wrapper.dom.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;position:relative;';

        const canvas = UIComponents.div();

        canvas.setClass('ws-node-canvas');

        canvas.setStyle('flex', ['1']);

        canvas.setStyle('min-height', ['0']);

        canvas.setStyle('overflow', ['auto']);

        const canvasInner = UIComponents.div();

        canvasInner.setClass('ws-node-canvas-inner');

        const positions = this._calculateNodePositions(nodeData.nodes);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        positions.forEach(pos => {
            minX = Math.min(minX, pos.x);

            minY = Math.min(minY, pos.y);

            maxX = Math.max(maxX, pos.x + 250);

            maxY = Math.max(maxY, pos.y + 120);
        });

        const sidePadding = 200;

        const canvasWidth = Math.max(maxX - minX + sidePadding * 2, 800);

        const canvasHeight = Math.max(maxY - minY + sidePadding * 2, 600);

        const offsetX = -minX + sidePadding;

        const offsetY = -minY + sidePadding;

        const adjustedPositions = new Map();

        positions.forEach((p, id) => {
            adjustedPositions.set(id, { x: p.x + offsetX, y: p.y + offsetY });
        });

        positions.clear();

        adjustedPositions.forEach((p, id) => positions.set(id, p));

        const miniMap = this._createMiniMap(nodeData.nodes, positions, canvas);

        canvas.add(miniMap);

        canvasInner.setStyle('width', [`${canvasWidth}px`]);

        canvasInner.setStyle('height', [`${canvasHeight}px`]);

        const connectionsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        connectionsLayer.setAttribute('class', 'ws-connections');

        connectionsLayer.setAttribute('width', canvasWidth);

        connectionsLayer.setAttribute('height', canvasHeight);

        connectionsLayer.style.width = `${canvasWidth}px`;

        connectionsLayer.style.height = `${canvasHeight}px`;

        canvasInner.dom.appendChild(connectionsLayer);

        nodeData.connections.forEach(connection => {
            const connectionElement = this._createConnectionElement(connection, positions);

            if (connectionElement) {
                connectionsLayer.appendChild(connectionElement);
            }
        });

        nodeData.nodes.forEach(node => {
            const nodeElement = this._createNodeElement(node, positions.get(node.id));

            canvasInner.add(nodeElement);
        });

        if (this.highlightByGroup) {
            this._createGroupBackgrounds(nodeData.nodes, canvasInner);
        }

        canvas.add(canvasInner);

        this._makeNodesDraggable(canvasInner, connectionsLayer);

        wrapper.add(canvas);

        const controlsDiv = UIComponents.row().gap('var(--phi-0-5)');

        controlsDiv.setClass('NodesControls');

        controlsDiv.setStyle('position', ['absolute']);

        controlsDiv.setStyle('top', ['var(--phi-0-5)']);

        controlsDiv.setStyle('left', ['var(--phi-0-5)']);

        controlsDiv.setStyle('z-index', ['10']);

        controlsDiv.setStyle('background', ['var(--theme-background-0810)']);

        controlsDiv.setStyle('padding', ['var(--phi-0-5)']);

        controlsDiv.setStyle('border-radius', ['var(--phi-0-5)']);

        const zoomControls = this._createZoomControls(canvas, canvasInner);

        controlsDiv.add(zoomControls);

        const movePackControl = this._createMovePackControl();

        controlsDiv.add(movePackControl);

        const highlightControl = this._createHighlightControl();

        controlsDiv.add(highlightControl);

        const noOverlapControl = this._createNoOverlapControl();

        controlsDiv.add(noOverlapControl);

        wrapper.add(controlsDiv);

        this.currentNodeData = {
            nodeData: nodeData,
            connections: nodeData.connections,
            positions,
            connectionsLayer,
            canvasInner,
            canvas
        };

        this._updateNodeVisibility();

        this._updateConnectionsVisibility();

        this.updateConnections = () => this._updateConnectionPaths(connectionsLayer, nodeData.connections, positions);

        window.addEventListener('resize', this.updateConnections);

        setTimeout(() => {
            this._recalculateAllConnections();

            canvas.dom.scrollLeft = (canvasWidth - canvas.dom.clientWidth) / 2;

            canvas.dom.scrollTop = 50;
        }, 100);

        wrapper.currentNodeData = this.currentNodeData;

        wrapper.toggleNodeChildren = (nodeId) => this.toggleNodeChildren(nodeId);

        wrapper.highlightNode = (nodeId, color) => this.highlightNode(nodeId, color);

        wrapper.highlightConnection = (sourceId, targetId, color) => this.highlightConnection(sourceId, targetId, color);

        wrapper.clearHighlights = () => this.clearHighlights();

        return wrapper;
    }

    _calculateNodePositions(nodes) {
        if (this.noOverlapDisplay) {
            return this._calculateNodePositions_NoOverlap(nodes);
        } else {
            return this._calculateNodePositions_Centered(nodes);
        }
    }

    _calculateNodePositions_Centered(nodes) {
        const positions = new Map();

        const horizontalSpacing = 350;

        const verticalSpacing = 120;

        const nodeHeight = 100;

        const verticalPadding = 20;

        const nodeMap = new Map();

        nodes.forEach(node => nodeMap.set(node.id, node));

        const rootNodes = nodes.filter(node => !node.parent || node.parent === 0);

        const occupiedSpace = new Map();

        const wouldOverlap = (x, y) => {
            const ranges = occupiedSpace.get(x) || [];

            const nodeMinY = y;

            const nodeMaxY = y + nodeHeight + verticalPadding;

            for (const range of ranges) {
                if (!(nodeMaxY <= range.minY || nodeMinY >= range.maxY)) {
                    return true;
                }
            }

            return false;
        };

        const markOccupied = (x, y) => {
            if (!occupiedSpace.has(x)) {
                occupiedSpace.set(x, []);
            }

            occupiedSpace.get(x).push({
                minY: y,
                maxY: y + nodeHeight + verticalPadding
            });
        };

        const findNextAvailableY = (x, preferredY) => {
            let candidateY = preferredY;

            while (wouldOverlap(x, candidateY)) {
                candidateY += verticalSpacing;
            }

            return candidateY;
        };

        const positionNodeAndChildren = (node, x, y) => {
            positions.set(node.id, { x, y });

            markOccupied(x, y);

            const children = nodes.filter(n => node.children && node.children.includes(n.id));

            if (children.length > 0) {
                const childX = x + horizontalSpacing;

                const totalChildrenHeight = (children.length - 1) * verticalSpacing;

                let idealStartY = y - (totalChildrenHeight / 2);

                children.forEach((child, index) => {
                    const idealY = idealStartY + (index * verticalSpacing);

                    const actualY = findNextAvailableY(childX, idealY);

                    positionNodeAndChildren(child, childX, actualY);
                });
            }
        };

        let currentY = 100;

        rootNodes.forEach((rootNode) => {
            positionNodeAndChildren(rootNode, 100, currentY);

            const descendantCount = this._countDescendants(rootNode, nodeMap);

            currentY += Math.max(verticalSpacing * 2, descendantCount * 80);
        });

        return positions;
    }

    _calculateNodePositions_NoOverlap(nodes) {
        const positions = new Map();

        const horizontalSpacing = 350;

        const verticalSpacing = 120;

        const minNodeHeight = 100;

        const nodeMap = new Map();

        nodes.forEach(node => nodeMap.set(node.id, node));

        const rootNodes = nodes.filter(node => !node.parent || node.parent === 0);

        const calculateSubtreeHeight = (nodeId) => {
            const node = nodeMap.get(nodeId);

            if (!node || !node.children || node.children.length === 0) {
                return minNodeHeight;
            }

            let totalChildrenHeight = 0;

            node.children.forEach(childId => {
                totalChildrenHeight += calculateSubtreeHeight(childId);
            });

            const spacingHeight = (node.children.length - 1) * verticalSpacing;

            return Math.max(minNodeHeight, totalChildrenHeight + spacingHeight);
        };

        const positionSubtree = (nodeId, x, startY) => {
            const node = nodeMap.get(nodeId);

            if (!node) return minNodeHeight;

            const children = nodes.filter(n => node.children && node.children.includes(n.id));

            if (children.length === 0) {
                positions.set(nodeId, { x, y: startY });

                return minNodeHeight;
            }

            const childHeights = children.map(child => calculateSubtreeHeight(child.id));

            const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0);

            const totalSpacing = (children.length - 1) * verticalSpacing;

            const subtreeHeight = totalChildrenHeight + totalSpacing;

            const parentY = startY + (subtreeHeight / 2) - (minNodeHeight / 2);

            positions.set(nodeId, { x, y: parentY });

            const childX = x + horizontalSpacing;

            let currentChildY = startY;

            children.forEach((child, index) => {
                const childHeight = positionSubtree(child.id, childX, currentChildY);

                currentChildY += childHeight + verticalSpacing;
            });

            return subtreeHeight;
        };

        let currentY = 100;

        rootNodes.forEach(rootNode => {
            const treeHeight = positionSubtree(rootNode.id, 100, currentY);

            currentY += treeHeight + verticalSpacing * 2;
        });

        return positions;
    }

    _countDescendants(node, nodeMap) {
        if (!node.children || node.children.length === 0) return 1;

        let count = 1;

        node.children.forEach(childId => {
            const child = nodeMap.get(childId);

            if (child) {
                count += this._countDescendants(child, nodeMap);
            }
        });

        return count;
    }

    _createGroupBackgrounds(nodes, canvasInner) {
        const existingBackgrounds = canvasInner.dom.querySelectorAll('.ws-node-group-background');

        existingBackgrounds.forEach(bg => bg.remove());

        const nodeMap = new Map();

        nodes.forEach(node => nodeMap.set(node.id, node));

        const getGroupBounds = (nodeId, level = 0) => {
            const node = nodeMap.get(nodeId);

            if (!node) return null;

            const nodeElement = canvasInner.dom.querySelector(`[data-node-id="${nodeId}"]`);

            if (!nodeElement || nodeElement.style.display === 'none') return null;

            const nodeRect = {
                left: parseFloat(nodeElement.style.left) || 0,
                top: parseFloat(nodeElement.style.top) || 0,
                width: nodeElement.offsetWidth,
                height: nodeElement.offsetHeight
            };

            const padding = 20 + (level * 10);

            let bounds = {
                minX: nodeRect.left - padding,
                maxX: nodeRect.left + nodeRect.width + padding,
                minY: nodeRect.top - padding,
                maxY: nodeRect.top + nodeRect.height + padding,
                level: level,
                hasVisibleChildren: false
            };

            if (node.children && node.children.length > 0 && this.hierarchyToggleUtil.isExpanded(nodeId)) {
                node.children.forEach(childId => {
                    const childElement = canvasInner.dom.querySelector(`[data-node-id="${childId}"]`);

                    if (childElement && childElement.style.display !== 'none') {
                        bounds.hasVisibleChildren = true;

                        const childBounds = getGroupBounds(childId, level + 1);

                        if (childBounds) {
                            bounds.minX = Math.min(bounds.minX, childBounds.minX);

                            bounds.maxX = Math.max(bounds.maxX, childBounds.maxX);

                            bounds.minY = Math.min(bounds.minY, childBounds.minY);

                            bounds.maxY = Math.max(bounds.maxY, childBounds.maxY);
                        }
                    }
                });
            }

            return bounds;
        };

        const createGroupBackground = (nodeId, level = 0) => {
            const node = nodeMap.get(nodeId);

            if (!node || !node.children || node.children.length === 0) return;

            if (!this.hierarchyToggleUtil.isExpanded(nodeId)) return;

            const bounds = getGroupBounds(nodeId, level);

            if (!bounds || !bounds.hasVisibleChildren) return;

            const groupBg = document.createElement('div');

            groupBg.className = 'ws-node-group-background';

            groupBg.setAttribute('data-parent-id', nodeId);

            groupBg.setAttribute('data-level', level);

            groupBg.style.position = 'absolute';

            groupBg.style.left = `${bounds.minX}px`;

            groupBg.style.top = `${bounds.minY}px`;

            groupBg.style.width = `${bounds.maxX - bounds.minX}px`;

            groupBg.style.height = `${bounds.maxY - bounds.minY}px`;

            groupBg.style.borderRadius = '12px';

            const opacity = Math.max(0.03, 0.08 - (level * 0.015));

            const hue = (level * 30) % 360;

            groupBg.style.background = `hsla(${hue}, 70%, 50%, ${opacity})`;

            groupBg.style.border = `1px solid hsla(${hue}, 70%, 50%, ${opacity * 2})`;

            groupBg.style.pointerEvents = 'none';

            groupBg.style.zIndex = '0';

            canvasInner.dom.appendChild(groupBg);

            node.children.forEach(childId => {
                createGroupBackground(childId, level + 1);
            });
        };

        nodes.filter(node => !node.parent || node.parent === 0).forEach(rootNode => {
            createGroupBackground(rootNode.id, 0);
        });
    }

    _createNodeElement(node, position) {
        const nodeElement = UIComponents.div();

        nodeElement.addClass('ws-node').addClass(`ws-node-status-${node.status.toLowerCase()}`);

        nodeElement.dom.setAttribute('data-node-id', node.id);

        nodeElement.setStyle('left', [`${position.x}px`]);

        nodeElement.setStyle('top', [`${position.y}px`]);

        if (node.color) {
            nodeElement.setStyle('borderColor', [node.color]);

            nodeElement.setStyle('boxShadow', [`0 0 10px ${node.color}40`]);
        }

        const hasChildren = node.children && node.children.length > 0;

        const isExpanded = this.hierarchyToggleUtil.isExpanded(node.id);

        const handles = UIComponents.div().addClass('ws-node-handles');

        const handleInput = UIComponents.div().addClass('ws-node-handle').addClass('input');

        handleInput.dom.setAttribute('data-handle', 'input');

        handles.add(handleInput);

        const handleOutput = UIComponents.div().addClass('ws-node-handle').addClass('output');

        handleOutput.dom.setAttribute('data-handle', 'output');

        handles.add(handleOutput);

        nodeElement.add(handles);

        const header = UIComponents.div().addClass('ws-node-header');

        if (hasChildren) {
            const rollBtn = UIComponents.button(isExpanded ? '▼' : '▶');

            rollBtn.addClass('ws-node-roll-btn');

            rollBtn.setTooltip(isExpanded ? 'Expand' : 'Collapse');

            rollBtn.onClick((e) => {
                e.stopPropagation();

                this.toggleNodeChildren(node.id);
            });

            header.add(rollBtn);
        }

        const iconDiv = UIComponents.div().addClass('ws-node-icon');

        iconDiv.add(UIComponents.span('T'));

        header.add(iconDiv);

        const titleDiv = UIComponents.div().addClass('ws-node-title');

        titleDiv.add(UIComponents.span(node.name));

        header.add(titleDiv);

        const statusDiv = UIComponents.div().addClass('ws-node-status').addClass(node.status.toLowerCase());

        statusDiv.add(UIComponents.span(node.status));

        header.add(statusDiv);

        nodeElement.add(header);

        const content = UIComponents.div().addClass('ws-node-content');

        const meta = UIComponents.div().addClass('ws-node-meta');

        const levelItem = UIComponents.div().setStyles({
            position: 'absolute',
            bottom: '0',
            right: '0',
            margin: 'var(--phi-0-5)'
        });

        const levelLabel = UIComponents.span('Level ').addClass('hud-label')

        const levelValue = UIComponents.span(String(node.level))

        levelItem.add(levelLabel, levelValue);

        meta.add(levelItem);

        const childrenItem = UIComponents.div().addClass('ws-node-meta-item');

        childrenItem.add(UIComponents.span('Children ').addClass('hud-label'));

        childrenItem.add(UIComponents.span(String((node.children || []).length)));

        meta.add(childrenItem);

        content.add(meta);

        nodeElement.add(content);

        const toolbar = UIComponents.div().addClass('ws-node-toolbar');

        const editBtn = UIComponents.operator('edit');

        editBtn.setTooltip('Edit');

        editBtn.dom.setAttribute('data-action', 'edit');

        editBtn.onClick((e) => {
            e.stopPropagation();

            if (typeof this.onEdit === 'function') {
                this.onEdit(node);
            }
        });

        toolbar.add(editBtn);

        if (typeof this.onDelete === 'function') {
            const deleteBtn = UIComponents.operator('delete');

            deleteBtn.setTooltip('Delete');

            deleteBtn.dom.setAttribute('data-action', 'delete');

            deleteBtn.onClick((e) => {
                e.stopPropagation();

                this.onDelete(node);
            });

            toolbar.add(deleteBtn);
        }

        nodeElement.add(toolbar);

        if (typeof this.onNodeClick === 'function') {
            nodeElement.onClick((e) => {
                const target = e.target;

                const isButton = target instanceof Element && (
                    target.closest('[data-action="edit"]') ||
                    target.closest('[data-action="delete"]') ||
                    target.closest('.ws-node-roll-btn')
                );

                if (!isButton) {
                    this.onNodeClick(node);
                }
            });
        }

        return nodeElement;
    }

    _updateNodeVisibility() {
        const canvasInner = this.currentNodeData.canvasInner;

        const nodeMap = new Map();

        this.currentNodeData.nodeData.nodes.forEach(node => {
            nodeMap.set(node.id, node);
        });

        const shouldBeVisible = (nodeId) => {
            let currentId = nodeId;

            while (currentId) {
                const node = nodeMap.get(currentId);

                if (!node) break;

                let parentId = null;

                for (const [id, n] of nodeMap) {
                    if (!n.children || n.children.length === 0) {
                        continue;
                    }

                    const hasChild = n.children.some((childId) => childId == currentId);

                    if (hasChild) {
                        parentId = id;

                        break;
                    }
                }

                if (parentId && !this.hierarchyToggleUtil.isExpanded(parentId)) {
                    return false;
                }

                currentId = parentId;
            }

            return true;
        };

        this.currentNodeData.nodeData.nodes.forEach(node => {
            const nodeElement = canvasInner.dom.querySelector(`[data-node-id="${node.id}"]`);

            if (nodeElement) {
                if (shouldBeVisible(node.id)) {
                    nodeElement.style.display = 'block';
                } else {
                    nodeElement.style.display = 'none';
                }
            }
        });
    }

    _updateConnectionsVisibility() {
        const connectionsLayer = this.currentNodeData.connectionsLayer;

        const connections = this.currentNodeData.nodeData.connections;

        const visibleNodeIds = new Set();

        this.currentNodeData.nodeData.nodes.forEach(node => {
            const nodeElement = connectionsLayer.parentElement.querySelector(`[data-node-id="${node.id}"]`);

            if (nodeElement && nodeElement.style.display !== 'none') {
                visibleNodeIds.add(node.id);
            }
        });

        connections.forEach(connection => {
            const connectionElement = connectionsLayer.querySelector(`[data-connection-id="${connection.source}-${connection.target}"]`);

            if (connectionElement) {
                if (visibleNodeIds.has(connection.source) && visibleNodeIds.has(connection.target)) {
                    connectionElement.style.display = 'block';
                } else {
                    connectionElement.style.display = 'none';
                }
            }
        });
    }

    _updateMiniMap() {
        const miniMap = this.dom.querySelector('.ws-node-minimap');

        if (miniMap) {
            const canvas = this.currentNodeData.canvas;

            const newMiniMap = this._createMiniMap(
                this.currentNodeData.nodeData.nodes,
                this.currentNodeData.positions,
                canvas
            );

            miniMap.replaceWith(newMiniMap.dom);
        }
    }

    _recalculateCanvasBounds() {
        if (!this.currentNodeData) return;

        const canvasInner = this.currentNodeData.canvasInner;

        const connectionsLayer = this.currentNodeData.connectionsLayer;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const allNodes = canvasInner.dom.querySelectorAll('.ws-node');

        allNodes.forEach(nodeElement => {
            const x = parseFloat(nodeElement.style.left) || 0;

            const y = parseFloat(nodeElement.style.top) || 0;

            const width = nodeElement.offsetWidth || 250;

            const height = nodeElement.offsetHeight || 120;

            minX = Math.min(minX, x);

            minY = Math.min(minY, y);

            maxX = Math.max(maxX, x + width);

            maxY = Math.max(maxY, y + height);
        });

        const sidePadding = 200;

        const canvasWidth = Math.max(maxX - minX + sidePadding * 2, this.dom.clientWidth || 1200);

        const canvasHeight = Math.max(maxY - minY + sidePadding * 2, this.dom.clientHeight || 800);

        canvasInner.setStyle('width', [`${canvasWidth}px`]);

        canvasInner.setStyle('height', [`${canvasHeight}px`]);

        connectionsLayer.setAttribute('width', canvasWidth);

        connectionsLayer.setAttribute('height', canvasHeight);

        connectionsLayer.style.width = `${canvasWidth}px`;

        connectionsLayer.style.height = `${canvasHeight}px`;

        const canvas = canvasInner.dom.parentElement;

        this._clampCanvasScroll(canvas, canvasInner);
    }

    _clampCanvasScroll(canvas, canvasInner) {
        if (!canvas || !canvasInner || !canvasInner.dom) return;

        const maxScrollLeft = Math.max(0, canvasInner.dom.offsetWidth - canvas.clientWidth);

        const maxScrollTop = Math.max(0, canvasInner.dom.offsetHeight - canvas.clientHeight);

        if (isNaN(canvas.scrollLeft)) canvas.scrollLeft = 0;

        if (isNaN(canvas.scrollTop)) canvas.scrollTop = 0;

        canvas.scrollLeft = Math.min(Math.max(0, canvas.scrollLeft), maxScrollLeft);

        canvas.scrollTop = Math.min(Math.max(0, canvas.scrollTop), maxScrollTop);
    }

    _repositionChildrenRelativeToParent(parentId) {
        if (this.noOverlapDisplay) {
            this._repositionChildrenRelativeToParent_NoOverlap(parentId);
        } else {
            this._repositionChildrenRelativeToParent_Centered(parentId);
        }
    }

    _repositionChildrenRelativeToParent_Centered(parentId) {
        const parentElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${parentId}"]`);

        if (!parentElement) return;

        const parentX = parseFloat(parentElement.style.left) || 0;

        const parentY = parseFloat(parentElement.style.top) || 0;

        const parentHeight = parentElement.offsetHeight;

        const parentNode = this.currentNodeData.nodeData.nodes.find(n => n.id === parentId);

        if (!parentNode || !parentNode.children || parentNode.children.length === 0) return;

        const children = this.currentNodeData.nodeData.nodes.filter(n =>
            parentNode.children.includes(n.id)
        );

        const horizontalOffset = 350;

        const verticalSpacing = 120;

        const nodeHeight = 100;

        const verticalPadding = 20;

        const totalChildrenHeight = (children.length - 1) * verticalSpacing;

        const parentCenterY = parentY + (parentHeight / 2);

        const idealStartY = parentCenterY - (totalChildrenHeight / 2);

        const wouldOverlap = (x, y, excludeIds = []) => {
            const targetX = Math.round(x);

            const allNodes = this.currentNodeData.canvasInner.dom.querySelectorAll('.ws-node');

            for (const node of allNodes) {
                const nodeId = parseInt(node.getAttribute('data-node-id'));

                if (excludeIds.includes(nodeId)) continue;

                if (node.style.display === 'none') continue;

                const nodeX = Math.round(parseFloat(node.style.left) || 0);

                const nodeY = parseFloat(node.style.top) || 0;

                if (Math.abs(nodeX - targetX) < 10) {
                    const nodeMinY = nodeY;

                    const nodeMaxY = nodeY + nodeHeight + verticalPadding;

                    const candidateMinY = y;

                    const candidateMaxY = y + nodeHeight + verticalPadding;

                    if (!(candidateMaxY <= nodeMinY || candidateMinY >= nodeMaxY)) {
                        return true;
                    }
                }
            }

            return false;
        };

        const findNextAvailableY = (x, preferredY, excludeIds = []) => {
            let candidateY = preferredY;

            while (wouldOverlap(x, candidateY, excludeIds)) {
                candidateY += verticalSpacing;
            }

            return candidateY;
        };

        const childX = parentX + horizontalOffset;

        const childIds = children.map(c => c.id);

        children.forEach((child, index) => {
            const childElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${child.id}"]`);

            if (childElement) {
                const idealY = idealStartY + (index * verticalSpacing);

                const newY = findNextAvailableY(childX, idealY, childIds);

                childElement.style.left = `${childX}px`;

                childElement.style.top = `${newY}px`;

                this.currentNodeData.positions.set(child.id, { x: childX, y: newY });

                if (this.hierarchyToggleUtil.isExpanded(child.id)) {
                    this._repositionChildrenRelativeToParent(child.id);
                }
            }
        });

        this._updateConnectionPaths(
            this.currentNodeData.connectionsLayer,
            this.currentNodeData.connections,
            this.currentNodeData.positions
        );

        this._recalculateCanvasBounds();
    }

    _repositionChildrenRelativeToParent_NoOverlap(parentId) {
        const parentElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${parentId}"]`);

        if (!parentElement) return;

        const parentX = parseFloat(parentElement.style.left) || 0;

        const parentY = parseFloat(parentElement.style.top) || 0;

        const parentNode = this.currentNodeData.nodeData.nodes.find(n => n.id === parentId);

        if (!parentNode || !parentNode.children || parentNode.children.length === 0) return;

        const children = this.currentNodeData.nodeData.nodes.filter(n =>
            parentNode.children.includes(n.id)
        );

        const horizontalOffset = 350;

        const verticalSpacing = 120;

        const minNodeHeight = 100;

        const nodeMap = new Map();

        this.currentNodeData.nodeData.nodes.forEach(node => nodeMap.set(node.id, node));

        const calculateSubtreeHeight = (nodeId) => {
            const node = nodeMap.get(nodeId);

            if (!node || !node.children || node.children.length === 0) {
                return minNodeHeight;
            }

            if (!this.hierarchyToggleUtil.isExpanded(nodeId)) {
                return minNodeHeight;
            }

            let totalChildrenHeight = 0;

            node.children.forEach(childId => {
                totalChildrenHeight += calculateSubtreeHeight(childId);
            });

            const spacingHeight = (node.children.length - 1) * verticalSpacing;

            return Math.max(minNodeHeight, totalChildrenHeight + spacingHeight);
        };

        const positionSubtree = (nodeId, x, startY) => {
            const node = nodeMap.get(nodeId);

            if (!node) return minNodeHeight;

            const nodeElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${nodeId}"]`);

            if (!nodeElement) return minNodeHeight;

            const visibleChildren = this.currentNodeData.nodeData.nodes.filter(n =>
                node.children &&
                node.children.includes(n.id) &&
                this.hierarchyToggleUtil.isExpanded(nodeId)
            );

            if (visibleChildren.length === 0) {
                nodeElement.style.left = `${x}px`;

                nodeElement.style.top = `${startY}px`;

                this.currentNodeData.positions.set(nodeId, { x, y: startY });

                return minNodeHeight;
            }

            const childHeights = visibleChildren.map(child => calculateSubtreeHeight(child.id));

            const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0);

            const totalSpacing = (visibleChildren.length - 1) * verticalSpacing;

            const subtreeHeight = totalChildrenHeight + totalSpacing;

            const nodeY = startY + (subtreeHeight / 2) - (minNodeHeight / 2);

            nodeElement.style.left = `${x}px`;

            nodeElement.style.top = `${nodeY}px`;

            this.currentNodeData.positions.set(nodeId, { x, y: nodeY });

            const childX = x + horizontalOffset;

            let currentChildY = startY;

            visibleChildren.forEach((child, index) => {
                const childHeight = positionSubtree(child.id, childX, currentChildY);

                currentChildY += childHeight + verticalSpacing;
            });

            return subtreeHeight;
        };

        const childX = parentX + horizontalOffset;

        let currentY = parentY;

        const childHeights = children.map(child => calculateSubtreeHeight(child.id));

        const totalHeight = childHeights.reduce((sum, h) => sum + h, 0);

        const totalSpacing = (children.length - 1) * verticalSpacing;

        const subtreeHeight = totalHeight + totalSpacing;

        const startY = parentY + (parentElement.offsetHeight / 2) - (subtreeHeight / 2);

        currentY = startY;

        children.forEach((child) => {
            const childHeight = positionSubtree(child.id, childX, currentY);

            currentY += childHeight + verticalSpacing;
        });

        this._updateConnectionPaths(
            this.currentNodeData.connectionsLayer,
            this.currentNodeData.connections,
            this.currentNodeData.positions
        );

        this._recalculateCanvasBounds();
    }

    _createConnectionElement(connection, positions) {
        const sourcePos = positions.get(connection.source);

        const targetPos = positions.get(connection.target);

        if (!sourcePos || !targetPos) return null;

        const connectionGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        connectionGroup.setAttribute('class', 'ws-connection');

        connectionGroup.setAttribute('data-connection-id', `${connection.source}-${connection.target}`);

        const sourceNode = document.querySelector(`[data-node-id="${connection.source}"]`);

        const targetNode = document.querySelector(`[data-node-id="${connection.target}"]`);

        const sourceWidth = sourceNode ? sourceNode.offsetWidth : 200;

        const sourceHeight = sourceNode ? sourceNode.offsetHeight : 90;

        const targetWidth = targetNode ? targetNode.offsetWidth : 200;

        const targetHeight = targetNode ? targetNode.offsetHeight : 90;

        let sourceX, sourceY, targetX, targetY;

        if (connection.sourceHandle === 'output') {
            sourceX = sourcePos.x + sourceWidth;

            sourceY = sourcePos.y + (sourceHeight / 2);
        } else {
            sourceX = sourcePos.x;

            sourceY = sourcePos.y + (sourceHeight / 2);
        }

        if (connection.targetHandle === 'input') {
            targetX = targetPos.x;

            targetY = targetPos.y + (targetHeight / 2);
        } else {
            targetX = targetPos.x + targetWidth;

            targetY = targetPos.y + (targetHeight / 2);
        }

        const dx = targetX - sourceX;

        const dy = targetY - sourceY;

        const cp1x = sourceX + Math.max(Math.abs(dx) * 0.5, 50);

        const cp1y = sourceY;

        const cp2x = targetX - Math.max(Math.abs(dx) * 0.5, 50);

        const cp2y = targetY;

        const pathData = `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${targetX} ${targetY}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        path.setAttribute('class', 'ws-connection-path');

        path.setAttribute('d', pathData);

        path.setAttribute('stroke', connection.color || '#0a84ff');

        path.setAttribute('stroke-width', '2');

        path.setAttribute('fill', 'none');

        connectionGroup.appendChild(path);

        return connectionGroup;
    }

    _createZoomControls(canvas, canvasInner) {
        const controls = UIComponents.div().addClass('ws-node-zoom-controls');

        let scale = 1;

        const zoomIn = UIComponents.button('+').addClass('ws-zoom-btn');

        zoomIn.dom.setAttribute('data-action', 'zoom-in');

        controls.add(zoomIn);

        const zoomOut = UIComponents.button('−').addClass('ws-zoom-btn');

        zoomOut.dom.setAttribute('data-action', 'zoom-out');

        controls.add(zoomOut);

        const fit = UIComponents.button('⤢').addClass('ws-zoom-btn');

        fit.dom.setAttribute('data-action', 'fit');

        controls.add(fit);

        const applyZoom = (newScale) => {
            scale = newScale;

            canvasInner.dom.style.transform = `scale(${scale})`;

            const svg = canvasInner.dom.querySelector('.ws-connections');

            if (svg) {
                const baseWidth = parseInt(svg.getAttribute('width'));

                const baseHeight = parseInt(svg.getAttribute('height'));

                svg.style.width = `${baseWidth}px`;

                svg.style.height = `${baseHeight}px`;
            }
        };

        zoomIn.onClick(() => {
            applyZoom(Math.min(scale * 1.2, 2));
        });

        zoomOut.onClick(() => {
            applyZoom(Math.max(scale / 1.2, 0.3));
        });

        fit.onClick(() => {
            applyZoom(1);

            canvas.dom.scrollLeft = (canvasInner.dom.offsetWidth - canvas.dom.clientWidth) / 2;

            canvas.dom.scrollTop = 50;
        });

        return controls;
    }

    _createMovePackControl() {
        const control = UIComponents.div().addClass('ws-node-move-pack-control');

        const label = UIComponents.div()
            .setStyle('display', ['flex'])
            .setStyle('align-items', ['center'])
            .setStyle('gap', ['8px'])
            .setStyle('padding', ['8px 12px'])
            .setStyle('background', ['rgba(255,255,255,0.05)'])
            .setStyle('border-radius', ['6px'])
            .setStyle('cursor', ['pointer']);

        const checkbox = UIComponents.checkbox(this.moveInPack);

        checkbox.dom.style.cursor = 'pointer';

        checkbox.dom.addEventListener('change', () => {
            this.moveInPack = checkbox.getValue();
        });

        const labelText = UIComponents.span('Move in Pack')
            .setStyle('font-size', ['12px'])
            .setStyle('color', ['#fff']);

        label.add(checkbox);

        label.add(labelText);

        label.onClick((e) => {
            if (e.target !== checkbox.dom) {
                checkbox.dom.click();
            }
        });

        control.add(label);

        return control;
    }

    _createHighlightControl() {
        const control = UIComponents.div().addClass('ws-node-highlight-control');

        const label = UIComponents.div()
            .setStyle('display', ['flex'])
            .setStyle('align-items', ['center'])
            .setStyle('gap', ['8px'])
            .setStyle('padding', ['8px 12px'])
            .setStyle('background', ['rgba(255,255,255,0.05)'])
            .setStyle('border-radius', ['6px'])
            .setStyle('cursor', ['pointer']);

        const checkbox = UIComponents.checkbox(this.highlightByGroup);

        checkbox.dom.style.cursor = 'pointer';

        checkbox.dom.addEventListener('change', () => {
            this.highlightByGroup = checkbox.getValue();

            if (this.currentNodeData) {
                this._createGroupBackgrounds(this.currentNodeData.nodeData.nodes, this.currentNodeData.canvasInner);
            }
        });

        const labelText = UIComponents.span('Highlight by Group')
            .setStyle('font-size', ['12px'])
            .setStyle('color', ['#fff']);

        label.add(checkbox);

        label.add(labelText);

        label.onClick((e) => {
            if (e.target !== checkbox.dom) {
                checkbox.dom.click();
            }
        });

        control.add(label);

        return control;
    }

    _createNoOverlapControl() {
        const control = UIComponents.div().addClass('ws-node-no-overlap-control');

        const label = UIComponents.div()
            .setStyle('display', ['flex'])
            .setStyle('align-items', ['center'])
            .setStyle('gap', ['8px'])
            .setStyle('padding', ['8px 12px'])
            .setStyle('background', ['rgba(255,255,255,0.05)'])
            .setStyle('border-radius', ['6px'])
            .setStyle('cursor', ['pointer']);

        const checkbox = UIComponents.checkbox(this.noOverlapDisplay);

        checkbox.dom.style.cursor = 'pointer';

        checkbox.dom.addEventListener('change', () => {
            this.noOverlapDisplay = checkbox.getValue();

            if (this.currentNodeData) {
                const newPositions = this._calculateNodePositions(this.currentNodeData.nodeData.nodes);

                this.currentNodeData.nodeData.nodes.forEach(node => {
                    const nodeElement = this.currentNodeData.canvasInner.dom.querySelector(`[data-node-id="${node.id}"]`);

                    const newPos = newPositions.get(node.id);

                    if (nodeElement && newPos) {
                        nodeElement.style.left = `${newPos.x}px`;

                        nodeElement.style.top = `${newPos.y}px`;
                    }
                });

                this.currentNodeData.positions = newPositions;

                this._recalculateCanvasBounds();

                this._recalculateAllConnections();

                if (this.highlightByGroup) {
                    this._createGroupBackgrounds(this.currentNodeData.nodeData.nodes, this.currentNodeData.canvasInner);
                }
            }
        });

        const labelText = UIComponents.span('No Overlap Display')
            .setStyle('font-size', ['12px'])
            .setStyle('color', ['#fff']);

        label.add(checkbox);

        label.add(labelText);

        label.onClick((e) => {
            if (e.target !== checkbox.dom) {
                checkbox.dom.click();
            }
        });

        control.add(label);

        return control;
    }

    _createMiniMap(nodes, positions, canvas) {
        const miniMap = UIComponents.div();

        miniMap.setClass('ws-node-minimap');

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        positions.forEach(pos => {
            minX = Math.min(minX, pos.x);

            minY = Math.min(minY, pos.y);

            maxX = Math.max(maxX, pos.x + 200);

            maxY = Math.max(maxY, pos.y + 80);
        });

        const mapWidth = maxX - minX;

        const mapHeight = maxY - minY;

        const scaleX = 150 / mapWidth;

        const scaleY = 100 / mapHeight;

        nodes.forEach(node => {
            const nodeElement = canvas.dom.querySelector(`[data-node-id="${node.id}"]`);

            const isVisible = !nodeElement || nodeElement.style.display !== 'none';

            if (isVisible) {
                const pos = positions.get(node.id);

                if (pos) {
                    const nodeDot = UIComponents.div();

                    nodeDot.setClass('ws-minimap-node');

                    const left = (pos.x - minX) * scaleX;

                    const top = (pos.y - minY) * scaleY;

                    nodeDot.setStyle('left', [`${left}px`]);

                    nodeDot.setStyle('top', [`${top}px`]);

                    miniMap.add(nodeDot);
                }
            }
        });

        return miniMap;
    }

    _makeNodesDraggable(canvasInner, connectionsLayer) {
        let draggedElement = null;

        let draggedHandle = null;

        let tempConnection = null;

        let isPanning = false;

        let offsetX = 0;

        let offsetY = 0;

        let panStartX = 0;

        let panStartY = 0;

        const canvas = canvasInner.dom.parentElement;

        canvas.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.ws-node-handle');

            const node = e.target.closest('.ws-node');

            if (handle && !e.target.closest('button')) {
                draggedHandle = {
                    element: handle,
                    nodeId: parseInt(node.getAttribute('data-node-id')),
                    handleType: handle.getAttribute('data-handle')
                };

                tempConnection = this._createTempConnection(connectionsLayer);

                e.preventDefault();
            } else if (node && !e.target.closest('button') && !handle) {
                draggedElement = node;

                draggedElement.classList.add('dragging');

                const transform = window.getComputedStyle(canvasInner.dom).transform;

                let scale = 1;

                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform);

                    scale = matrix.a;
                }

                const rect = draggedElement.getBoundingClientRect();

                const canvasRect = canvasInner.dom.getBoundingClientRect();

                offsetX = (e.clientX - rect.left) / scale;

                offsetY = (e.clientY - rect.top) / scale;

                e.preventDefault();
            } else if (!node && !handle) {
                isPanning = true;

                panStartX = e.clientX + canvas.scrollLeft;

                panStartY = e.clientY + canvas.scrollTop;

                canvas.style.cursor = 'grabbing';

                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (draggedHandle) {
                this._updateTempConnection(tempConnection, draggedHandle, e, canvasInner);
            } else if (draggedElement) {
                const transform = window.getComputedStyle(canvasInner.dom).transform;

                let scale = 1;

                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform);

                    scale = matrix.a;
                }

                const canvasRect = canvasInner.dom.getBoundingClientRect();

                const x = (e.clientX - canvasRect.left) / scale - offsetX;

                const y = (e.clientY - canvasRect.top) / scale - offsetY;

                draggedElement.style.left = `${x}px`;

                draggedElement.style.top = `${y}px`;

                this._updateConnectionsForNode(draggedElement, connectionsLayer);
            } else if (isPanning) {
                const newLeft = panStartX - e.clientX;

                const newTop = panStartY - e.clientY;

                const maxLeft = Math.max(0, canvasInner.dom.offsetWidth - canvas.clientWidth);

                const maxTop = Math.max(0, canvasInner.dom.offsetHeight - canvas.clientHeight);

                canvas.scrollLeft = Math.min(Math.max(0, newLeft), maxLeft);

                canvas.scrollTop = Math.min(Math.max(0, newTop), maxTop);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (draggedHandle) {
                const targetHandle = e.target.closest('.ws-node-handle');

                if (targetHandle) {
                    const targetNode = targetHandle.closest('.ws-node');

                    const targetNodeId = parseInt(targetNode.getAttribute('data-node-id'));

                    const targetHandleType = targetHandle.getAttribute('data-handle');

                    if (targetNodeId !== draggedHandle.nodeId) {
                        this.addConnection(
                            draggedHandle.nodeId,
                            draggedHandle.handleType,
                            targetNodeId,
                            targetHandleType
                        );
                    }
                }

                if (tempConnection) {
                    tempConnection.remove();

                    tempConnection = null;
                }

                draggedHandle = null;
            } else if (draggedElement) {
                draggedElement.classList.remove('dragging');

                const nodeId = parseInt(draggedElement.getAttribute('data-node-id'));

                const x = parseFloat(draggedElement.style.left) || 0;

                const y = parseFloat(draggedElement.style.top) || 0;

                this.currentNodeData.positions.set(nodeId, { x, y });

                if (this.moveInPack && this.hierarchyToggleUtil.isExpanded(nodeId)) {
                    this._repositionChildrenRelativeToParent(nodeId);
                }

                if (this.highlightByGroup) {
                    this._createGroupBackgrounds(this.currentNodeData.nodeData.nodes, this.currentNodeData.canvasInner);
                }

                draggedElement = null;
            } else if (isPanning) {
                this._clampCanvasScroll(canvas, canvasInner);

                isPanning = false;

                canvas.style.cursor = '';
            }
        });
    }

    _createTempConnection(connectionsLayer) {
        const tempGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        tempGroup.setAttribute('class', 'ws-connection-temp');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        path.setAttribute('class', 'ws-connection-path');

        path.setAttribute('stroke', '#0a84ff');

        path.setAttribute('stroke-width', '2');

        path.setAttribute('stroke-dasharray', '5,5');

        path.setAttribute('fill', 'none');

        tempGroup.appendChild(path);

        connectionsLayer.appendChild(tempGroup);

        return tempGroup;
    }

    _updateTempConnection(tempConnection, draggedHandle, mouseEvent, canvasInner) {
        const path = tempConnection.querySelector('.ws-connection-path');

        if (!path) return;

        const handleRect = draggedHandle.element.getBoundingClientRect();

        const canvasRect = canvasInner.dom.getBoundingClientRect();

        const startX = handleRect.left + handleRect.width / 2 - canvasRect.left;

        const startY = handleRect.top + handleRect.height / 2 - canvasRect.top;

        const endX = mouseEvent.clientX - canvasRect.left;

        const endY = mouseEvent.clientY - canvasRect.top;

        const pathData = `M ${startX} ${startY} L ${endX} ${endY}`;

        path.setAttribute('d', pathData);
    }

    _updateConnectionsForNode(nodeElement, connectionsLayer) {
        const nodeId = parseInt(nodeElement.getAttribute('data-node-id'));

        const nodeRect = nodeElement.getBoundingClientRect();

        const canvasRect = connectionsLayer.getBoundingClientRect();

        const transform = window.getComputedStyle(nodeElement.parentElement).transform;

        let scale = 1;

        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);

            scale = matrix.a;
        }

        const nodeX = parseFloat(nodeElement.style.left) || 0;

        const nodeY = parseFloat(nodeElement.style.top) || 0;

        const connections = connectionsLayer.querySelectorAll('.ws-connection');

        connections.forEach(conn => {
            const path = conn.querySelector('.ws-connection-path');

            if (!path) return;

            const connectionId = conn.getAttribute('data-connection-id');

            const [sourceId, targetId] = connectionId.split('-').map(id => parseInt(id));

            if (sourceId === nodeId || targetId === nodeId) {
                const connection = this.currentNodeData.connections.find(
                    c => c.source === sourceId && c.target === targetId
                );

                if (connection) {
                    const sourceNode = connectionsLayer.parentElement.querySelector(`[data-node-id="${sourceId}"]`);

                    const targetNode = connectionsLayer.parentElement.querySelector(`[data-node-id="${targetId}"]`);

                    if (sourceNode && targetNode) {
                        const sourceX = parseFloat(sourceNode.style.left) || 0;

                        const sourceY = parseFloat(sourceNode.style.top) || 0;

                        const targetX = parseFloat(targetNode.style.left) || 0;

                        const targetY = parseFloat(targetNode.style.top) || 0;

                        const sourceWidth = sourceNode.offsetWidth;

                        const sourceHeight = sourceNode.offsetHeight;

                        const targetWidth = targetNode.offsetWidth;

                        const targetHeight = targetNode.offsetHeight;

                        let startX, startY, endX, endY;

                        if (connection.sourceHandle === 'output') {
                            startX = sourceX + sourceWidth;

                            startY = sourceY + (sourceHeight / 2);
                        } else {
                            startX = sourceX;

                            startY = sourceY + (sourceHeight / 2);
                        }

                        if (connection.targetHandle === 'input') {
                            endX = targetX;

                            endY = targetY + (targetHeight / 2);
                        } else {
                            endX = targetX + targetWidth;

                            endY = targetY + (targetHeight / 2);
                        }

                        const dx = endX - startX;

                        const cp1x = startX + Math.max(Math.abs(dx) * 0.5, 50);

                        const cp1y = startY;

                        const cp2x = endX - Math.max(Math.abs(dx) * 0.5, 50);

                        const cp2y = endY;

                        const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${endY}`;

                        path.setAttribute('d', pathData);
                    }
                }
            }
        });
    }

    _updateConnectionPaths(connectionsLayer, connections, positions) {
        const allNodes = connectionsLayer.parentElement.querySelectorAll('.ws-node');

        allNodes.forEach(node => {
            this._updateConnectionsForNode(node, connectionsLayer);
        });
    }

    _recalculateAllConnections() {
        if (!this.currentNodeData) return;

        const { connectionsLayer, connections, positions } = this.currentNodeData;

        connections.forEach(connection => {
            const existingElement = connectionsLayer.querySelector(
                `[data-connection-id="${connection.source}-${connection.target}"]`
            );

            if (existingElement) {
                existingElement.remove();
            }

            const newElement = this._createConnectionElement(connection, positions);

            if (newElement) {
                connectionsLayer.appendChild(newElement);
            }
        });

        this._updateConnectionsVisibility();
    }

}

function getTasksForNodeView(context, workscheduleId, tasks ) {

    if (!tasks) return { nodes: [], connections: [] };

    tasks = updateRecursiveCompletionStatuses(context, workscheduleId, tasks);

    const nodes = [];

    const connections = [];

    const taskMap = new Map();

    tasks.forEach((taskInfo, idx) => {
        const id = taskInfo && (taskInfo.pID || taskInfo.id) != null ? (taskInfo.pID || taskInfo.id) : idx;

        taskMap.set(id, {
            id,
            task: taskInfo,
            children: [],
            parent: taskInfo && (taskInfo.pParent || taskInfo.parent) != null ? (taskInfo.pParent || taskInfo.parent) : 0,
            level: 0
        });
    });

    const roots = [];

    taskMap.forEach((entry, id) => {
        const parentId = entry.parent;

        if (parentId && taskMap.has(parentId)) {
            taskMap.get(parentId).children.push(id);
        } else {
            roots.push(id);
        }
    });

    const assignLevels = (id, level) => {
        const e = taskMap.get(id);

        if (!e) return;

        e.level = level;

        e.children.forEach(childId => assignLevels(childId, level + 1));
    };

    roots.forEach(rootId => assignLevels(rootId, 0));

    taskMap.forEach((entry, id) => {
        const taskInfo = entry.task || {};

        const status = getTaskStatus(taskInfo);

        const color = getStatusColor(status);

        nodes.push({
            id: id,
            name: taskInfo.pName || taskInfo.Name || 'Unnamed Task',
            status,
            color,
            level: entry.level,
            children: entry.children || [],
            parent: entry.parent || 0,
            data: entry.task
        });

        if (entry.parent && entry.parent !== 0) {
            const connectionColor = getStatusColor(status);

            connections.push({
                id: `conn-${entry.parent}-${id}`,
                source: entry.parent,
                sourceHandle: 'output',
                target: id,
                targetHandle: 'input',
                type: 'output-input',
                color: connectionColor
            });
        }
    });

    return { nodes, connections };
}

function updateRecursiveCompletionStatuses(context, workscheduleId, tasks) {
    if (!Array.isArray(tasks)) return tasks;

    tasks.forEach((taskEntry) => {
        const taskId = taskEntry && (taskEntry.pID || (taskEntry.task && (taskEntry.task.pID || taskEntry.task.id)) || taskEntry.id);

        if (!taskId) return;

        const recursiveStatus = calculateRecursiveCompletionStatus(workscheduleId, tasks, taskId);

        if (taskEntry && taskEntry.task && taskEntry.task.info && taskEntry.task.info.Status !== recursiveStatus) {
            taskEntry.task.info.Status = recursiveStatus;

            context.signals.taskStatusChanged.dispatch({
                workscheduleId,
                taskId,
                newStatus: recursiveStatus,
                source: 'recursive_calculation'
            });
        }
    });

    return tasks;
}

function getTaskStatus(info) {
    return info.status || 'NOTSTARTED'
}

function getStatusColor(status) {
    const colorMap = {
        'COMPLETED': '#28a745',
        'STARTED': '#ffc107',
        'NOTSTARTED': '#6c757d',
        'PAUSED': '#fd7e14',
        'CANCELLED': '#dc3545'
    };

    return colorMap[status] || colorMap['NOTSTARTED'];
}

function calculateRecursiveCompletionStatus(workscheduleId, tasks, taskId) {
    const taskEntry = Array.isArray(tasks)
        ? tasks.find(e => e && (e.pID == taskId || (e.task && (e.task.pID == taskId || e.task.id == taskId)) || e.id == taskId))
        : null;

    if (!taskEntry) return 'NOTSTARTED';

    const children = Array.isArray(taskEntry.children) ? taskEntry.children : (taskEntry.task && Array.isArray(taskEntry.task.children) ? taskEntry.task.children : []);

    if (!children || children.length === 0) {
        return getTaskStatus(taskEntry);
    }

    const childIds = children.map(c => {
        if (!c) return null;

        if (typeof c === 'object') {
            return c.pID || (c.task && (c.task.pID || c.task.id)) || c.id || null;
        }

        return c;
    }).filter(Boolean);

    const childStatuses = childIds.map(childId => calculateRecursiveCompletionStatus(workscheduleId, tasks, childId));

    if (childStatuses.every(status => status === 'COMPLETED')) {
        return 'COMPLETED';
    }

    if (childStatuses.some(status => status === 'STARTED' || status === 'COMPLETED')) {
        return 'STARTED';
    }

    return 'NOTSTARTED';
}

export { Nodes, getTasksForNodeView };