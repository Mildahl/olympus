import {Components} from "./Components.js";

import Paths from "../../utils/paths.js";

const injectedJsganttStyleHrefs = new Set();

let jsganttScriptLoadPromise = null;

function resolveBrowserGlobalObject() {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }

    if (typeof window !== "undefined") {
        return window;
    }

    return null;
}

function getJsganttNamespace() {
    const browserGlobalObject = resolveBrowserGlobalObject();

    if (!browserGlobalObject) {
        return null;
    }

    const jsganttNamespace = browserGlobalObject.JSGantt;

    if (!jsganttNamespace || typeof jsganttNamespace.GanttChart !== "function") {
        return null;
    }

    return jsganttNamespace;
}

function injectJsganttStylesOnce(cssHrefList) {
    if (typeof document === "undefined" || !document.head) {
        return;
    }

    for (let index = 0; index < cssHrefList.length; index++) {
        const href = cssHrefList[index];

        if (injectedJsganttStyleHrefs.has(href)) {
            continue;
        }

        injectedJsganttStyleHrefs.add(href);

        const link = document.createElement("link");

        link.rel = "stylesheet";

        link.href = href;

        document.head.appendChild(link);
    }
}

function loadJsganttScriptOnce(scriptSrc) {
    if (getJsganttNamespace()) {
        return Promise.resolve();
    }

    if (jsganttScriptLoadPromise) {
        return jsganttScriptLoadPromise;
    }

    const browserGlobalObject = resolveBrowserGlobalObject();

    if (!browserGlobalObject || typeof document === "undefined" || !document.head) {
        return Promise.reject(new Error("Gantt chart requires a browser DOM"));
    }

    jsganttScriptLoadPromise = new Promise(function (resolve, reject) {
        const script = document.createElement("script");

        script.src = scriptSrc;

        script.async = true;

        script.onload = function () {
            if (getJsganttNamespace()) {
                resolve();

                return;
            }

            jsganttScriptLoadPromise = null;

            reject(new Error("JSGantt was not exposed after script load"));
        };

        script.onerror = function () {
            jsganttScriptLoadPromise = null;

            reject(new Error("Failed to load jsgantt script"));
        };

        document.head.appendChild(script);
    });

    return jsganttScriptLoadPromise;
}

function ensureJsganttReady(cssHrefList, scriptSrc) {
    injectJsganttStylesOnce(cssHrefList);

    return loadJsganttScriptOnce(scriptSrc);
}

class GanttComponent {
    constructor(context, options) {
        this.context = context;

        const ganttOptions =
            options && typeof options === "object" && !Array.isArray(options) ? options : {};

        this.operators = ganttOptions.operators || null;

        this.shouldRunSelectTaskOnRowClick = ganttOptions.shouldRunSelectTaskOnRowClick;

        this.onTaskRowClick = ganttOptions.onTaskRowClick;

        this.ganttChart = null;

        this.dependencies = {
            jsLinks: [
                Paths.vendor('jsgantt/jsgantt.js')
            ],
            cssLinks: [
                Paths.vendor('jsgantt/jsgantt.css')
            ]
        };

        this.tasksData = null;
    }

    render(taskData, container) {
        container.clear();

        this.displayTasks(taskData, container.dom);
    }

    displayTasks(taskData, dom) {
        const self = this;

        const dependencyList = this.dependencies;

        const scriptSourceUrl = dependencyList.jsLinks[0];

        ensureJsganttReady(dependencyList.cssLinks, scriptSourceUrl).then(function () {
            self.createGanttChart(dom, taskData);
        }).catch(function (loadError) {
            if (typeof console !== "undefined" && typeof console.error === "function") {
                console.error(loadError);
            }
        });
    }

    createGanttChart(dom, jsonData) {

        const jsganttNamespace = getJsganttNamespace();

        if (!jsganttNamespace) {
            return;
        }

        this.ganttChart = new jsganttNamespace.GanttChart(dom, 'week');

        this.ganttChart.setOptions({
            vCaptionType: 'Caption',
            vQuarterColWidth: 36,
            vDateTaskDisplayFormat: 'day dd month yyyy',
            vDayMajorDateDisplayFormat: 'mon yyyy - Week ww',
            vWeekMinorDateDisplayFormat: 'dd mon',
            vLang: "en",
            vShowTaskInfoLink: 1,
            vShowEndWeekDate: 0,
            vUseSingleCell: 10000,
            vFormatArr: ['Hour', 'Day', 'Week', 'Month', 'Quarter'],
            vShowRes: true,
            vShowComp: false,
            vShowDur: false,
            vAdditionalHeaders: {
                ifcduration: { title: 'Duration' },
                "resourceUsage": { title: 'Resource Usage' }
            },
            vUseToolTip: true,
            vTooltipTemplate: this.generateTooltip.bind(this),
        });

        const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);

        jsganttNamespace.parseJSONString(jsonString, this.ganttChart);

        this.ganttChart.vEventClickRow = (task) => {
            const taskId = task.getOriginalID();

            if (typeof this.onTaskRowClick === "function") {
                this.onTaskRowClick(taskId);

                return;
            }

            const shouldRun =
                typeof this.shouldRunSelectTaskOnRowClick === "function"
                    ? this.shouldRunSelectTaskOnRowClick()
                    : true;

            if (!shouldRun) {
                return;
            }

            if (!this.operators || typeof this.operators.execute !== "function") {
                return;
            }

            this.operators.execute("bim.select_task", this.context, taskId);
        };

        this.ganttChart.Draw();

        this.enableContextMenu();

        if (this.context && this.context.signals && this.context.signals.chartRendered) {
            this.context.signals.chartRendered.dispatch({
                taskCount: jsonData.length || 0
            });
        }

    }

    generateTooltip(task) {
        const dataObject = task.getDataObject();

        const numberResources = dataObject.resourceUsage || "NULL";

        return `
            <dl>
                <dt>Name:</dt><dd>${task.getName()}</dd>
                <dt>Start:</dt><dd>${task.getStart()}</dd>
                <dt>End:</dt><dd>${task.getEnd()}</dd>
                <dt>Duration:</dt><dd>${task.getDuration() || 'N/A'}</dd>
                <dt>Number of Resources:</dt><dd>${numberResources}</dd>
                <dt>Resources:</dt><dd>${task.getResource()}</dd>
            </dl>
        `;
    }

    /**
     * Show dependency management dialog for a task
     * @param {Object} task - JSGantt task object
     */
    showDependencyDialog(task) {
        this.removeDependencyDialog();

        const taskdata = {
            Name : task?.getName(),
            id : task?.getID(),
            Dependencies: task?.getDepend ? task.getDepend() : [],
            DepType: task?.getDepType ? task.getDepType() : []

        }

        const content = Components.panel();

        content.setClass("ws-dependency-dialog-content");

        const title = Components.title(`Manage Dependencies for "${taskdata.Name}"`);

        content.add(title);

        const currentSection = Components.panel();

        currentSection.setClass("ws-dependency-section");

        const currentTitle = Components.title("Current Dependencies");

        currentSection.add(currentTitle);

        const dependencies = taskdata.Dependencies || [];

        const depTypes = taskdata.DepType || [];

        if (dependencies.length === 0) {
            const noDeps = Components.text("No dependencies");

            noDeps.dom.style.color = "#999";

            noDeps.dom.style.fontStyle = "italic";

            currentSection.add(noDeps);
        } else {
            const depList = Components.list();

            depList.setClass("ws-dependency-items");

            for (let i = 0; i < dependencies.length; i++) {
                const depItem = Components.panel();

                const predTask = this.ganttChart.vTaskList.find(t => t.getID() == dependencies[i]);

                const predName = predTask ? predTask.getName() : `Task ${dependencies[i]}`;

                const depText = Components.text(`${predName} (ID: ${dependencies[i]}) - ${this.getDependencyTypeLabel(depTypes[i])}`);

                depItem.add(depText);

                const removeBtn = Components.button("Remove");

                removeBtn.dom.style.backgroundColor = "#dc3545";

                removeBtn.dom.style.color = "white";

                removeBtn.onClick(() => {
                    const predId = dependencies[i];

                    //TODO REVIEW THIS AI CRAP
                    this.context.signals.dependencyRemoved.dispatch({ workscheduleId, taskId: taskdata.id, predecessorId: predId });
                });

                depItem.add(removeBtn);

                depList.add(depItem);
            }

            currentSection.add(depList);
        }
        
        content.add(currentSection);

        const addSection = Components.panel();

        const addTitle = Components.title("Add New Dependency");

        addSection.add(addTitle);

        const addForm = Components.panel();

        const predLabel = Components.text("Predecessor Task:");

        const predSelect = Components.select();

        const currentId = taskdata.id;

        const predOptions = { "": "-- Select Predecessor Task --" };

        this.ganttChart.vTaskList.forEach(t => {
            try {
                const id = t.getID();

                if (id == currentId) return;

                predOptions[id] = `${t.getName()} (ID: ${id})`;
            } catch (e) {
                
            }
        });

        predSelect.setOptions(predOptions);

        const typeLabel = Components.text("Type:");

        const typeSelect = Components.select();

        const dependencyOptions = {
            'FS': 'Finish to Start (FS)',
            'FF': 'Finish to Finish (FF)',
            'SS': 'Start to Start (SS)',
            'SF': 'Start to Finish (SF)'
        };

        typeSelect.setOptions(dependencyOptions);

        const addButton = Components.button("Add Dependency");

        addForm.add(predLabel);

        addForm.add(predSelect);

        addForm.add(typeLabel);

        addForm.add(typeSelect);

        addForm.add(addButton);

        addSection.add(addForm);

        content.add(addSection);

        const panel = Components.floatingPanel({
            title: `Manage Dependencies for "${taskdata.Name}"`,
            content: content,
            confirm: null,
        });

        addButton.onClick(() => {
            const predId = predSelect.getValue();

            const depType = typeSelect.getValue();

            if (!predId) {
                alert('Please select a predecessor task');

                return;
            }

            if (dependencies.includes(predId)) {
                alert('This dependency already exists');

                return;
            }

            this.context.signals.dependencyAdded.dispatch({ taskId: taskdata.id, predecessorId: predId, type: depType });
            
        });

        document.body.appendChild(panel.dom);

        this.dependencyDialog = panel.dom;
    }

    /**
    /**
     * Get human-readable label for dependency type
     */
    getDependencyTypeLabel(type) {
        const labels = {
            'FS': 'Finish to Start',
            'FF': 'Finish to Finish',
            'SS': 'Start to Start',
            'SF': 'Start to Finish'
        };

        return labels[type] || type;
    }

    /**
     * Helper: find a JSGantt task object by ID
     */
    getTaskById(id) {
        if (!this.ganttChart || !this.ganttChart.vTaskList) return null;

        return this.ganttChart.vTaskList.find(t => String(t.getID()) == String(id));
    }

    /**
     * Add a dependency (predecessor) to a task
     * @param {string|number} taskId
     * @param {string|number} predecessorId
     * @param {string} type - 'FS'|'SS'|'FF'|'SF'
     */
    addDependency(taskId, predecessorId, type = 'FS') {
        const task = this.getTaskById(taskId);

        if (!task) return false;

        try {
            if (typeof task.getDepend === 'function' && typeof task.setDepend === 'function') {
                const deps = task.getDepend() || [];

                const depTypes = task.getDepType ? (task.getDepType() || []) : [];

                if (deps.map(String).includes(String(predecessorId))) return false;

                deps.push(predecessorId);

                depTypes.push(type);

                task.setDepend(deps);

                if (typeof task.setDepType === 'function') task.setDepType(depTypes);
            } else {
                
                const data = task.getDataObject ? task.getDataObject() : (task.vData || {});

                let current = [];

                if (data.pDepend) {
                    current = String(data.pDepend).split(',').filter(Boolean);
                }

                const token = `${predecessorId}${type}`;

                if (current.includes(String(predecessorId)) || current.some(d => d.startsWith(String(predecessorId)))) {
                    return false;
                }

                current.push(token);

                data.pDepend = current.join(',');
            }
        } catch (e) {
            return false;
        }

        if (this.ganttChart && typeof this.ganttChart.Draw === 'function') this.ganttChart.Draw();

        if (this.context && this.context.signals && typeof this.context.signals.dependencyModified !== 'undefined') {
            try {
                this.context.signals.dependencyModified.dispatch({ taskId, predecessorId, type, action: 'add' });
            } catch (e) {  }
        }

        return true;
    }

    /**
     * Remove a predecessor dependency from a task
     */
    removeDependency(taskId, predecessorId) {
        const task = this.getTaskById(taskId);

        if (!task) return false;

        try {
            if (typeof task.getDepend === 'function' && typeof task.setDepend === 'function') {
                const deps = task.getDepend() || [];

                const depTypes = task.getDepType ? (task.getDepType() || []) : [];

                const idx = deps.findIndex(d => String(d) == String(predecessorId));

                if (idx === -1) return false;

                deps.splice(idx, 1);

                if (depTypes.length > idx) depTypes.splice(idx, 1);

                task.setDepend(deps);

                if (typeof task.setDepType === 'function') task.setDepType(depTypes);
            } else {
                const data = task.getDataObject ? task.getDataObject() : (task.vData || {});

                if (!data.pDepend) return false;

                const pieces = String(data.pDepend).split(',').filter(Boolean);

                const filtered = pieces.filter(p => !p.startsWith(String(predecessorId)));

                data.pDepend = filtered.join(',');
            }
        } catch (e) {
            return false;
        }

        if (this.ganttChart && typeof this.ganttChart.Draw === 'function') this.ganttChart.Draw();

        if (this.context && this.context.signals && typeof this.context.signals.dependencyModified !== 'undefined') {
            try {
                this.context.signals.dependencyModified.dispatch({ taskId, predecessorId, action: 'remove' });
            } catch (e) {  }
        }

        return true;
    }

    /**
     * Set dependency type for an existing predecessor
     */
    setDependencyType(taskId, predecessorId, newType) {
        const task = this.getTaskById(taskId);

        if (!task) return false;

        try {
            if (typeof task.getDepend === 'function' && typeof task.setDepType === 'function') {
                const deps = task.getDepend() || [];

                const depTypes = task.getDepType() || [];

                const idx = deps.findIndex(d => String(d) == String(predecessorId));

                if (idx === -1) return false;

                depTypes[idx] = newType;

                task.setDepType(depTypes);
            } else {
                const data = task.getDataObject ? task.getDataObject() : (task.vData || {});

                if (!data.pDepend) return false;

                const pieces = String(data.pDepend).split(',').filter(Boolean);

                for (let i = 0; i < pieces.length; i++) {
                    if (pieces[i].startsWith(String(predecessorId))) {
                        pieces[i] = `${predecessorId}${newType}`;

                        break;
                    }
                }

                data.pDepend = pieces.join(',');
            }
        } catch (e) {
            return false;
        }

        if (this.ganttChart && typeof this.ganttChart.Draw === 'function') this.ganttChart.Draw();

        if (this.context && this.context.signals && typeof this.context.signals.dependencyModified !== 'undefined') {
            try {
                this.context.signals.dependencyModified.dispatch({ taskId, predecessorId, type: newType, action: 'update' });
            } catch (e) {  }
        }

    }

    /**
     * Update dependencies for a task using an array of dependency tokens (e.g. ['12FS','13SS']) or objects
     * @param {string|number} taskId
     * @param {Array} dependencies
     */
    updateDependencies(taskId, dependencies) {
        const task = this.getTaskById(taskId);

        if (!task) return false;

        try {
            
            const tokens = dependencies.map(d => {
                if (typeof d === 'string') return d;

                if (d && d.id && d.type) return `${d.id}${d.type}`;

                return String(d);
            });

            if (typeof task.setDepend === 'function') {
                const ids = tokens.map(t => t.replace(/[^0-9]/g, ''));

                task.setDepend(ids);

                if (typeof task.setDepType === 'function') {
                    const types = tokens.map(t => t.replace(/^[0-9]+/, '') || 'FS');

                    task.setDepType(types);
                }
            } else {
                const data = task.getDataObject ? task.getDataObject() : (task.vData || {});

                data.pDepend = tokens.join(',');
            }
        } catch (e) {
            return false;
        }

        if (this.ganttChart && typeof this.ganttChart.Draw === 'function') this.ganttChart.Draw();

        return true;
    }

    /**
     * Get dependencies for a task as a single string (matching prior helpers)
     */
    getDependenciesAsString(taskId) {
        const task = this.getTaskById(taskId);

        if (!task) return '';

        try {
            if (typeof task.getDepend === 'function') {
                const deps = task.getDepend() || [];

                const types = task.getDepType ? (task.getDepType() || []) : [];

                return deps.map((d, i) => `${d}${types[i] || 'FS'}`).join(',');
            }

            const data = task.getDataObject ? task.getDataObject() : (task.vData || {});

            return data.pDepend || '';
        } catch (e) {
            return '';
        }

        return true;
    }

    /**
     * Get current workschedule ID (this might need to be implemented based on your app structure)
     */
    getCurrentWorkscheduleId() {
        return window.currentWorkscheduleId || 'default';
    }

    /**
     * Enable right-click context menu for dependency management
     */
    enableContextMenu() {
        this.ganttChart.vDiv.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }

    /**
     * Handle context menu event to show dependency dialog
     */
    handleContextMenu(event) {
        event.preventDefault();

        const task = this.getTaskFromEvent(event);

        this.showDependencyDialog(task);
        
    }

    /**
     * Find the JSGantt task object from a DOM event
     */
    getTaskFromEvent(event) {
        
        const row = event.target.closest('[id^="childrow_"]');

        if (row) {
            const taskId = row.id.replace('childrow_', '');

            return this.getTaskById(taskId);
        }

        return null;
    }

    dispose() {
        this.removeDependencyDialog();

        if (this.ganttChart) {
            
            const chartDiv = document.getElementById('GanttChartDIV');

            if (chartDiv) chartDiv.innerHTML = '';

            this.ganttChart = null;
        }

        this.container = null;

        this.tasksData = null;
    }
}

export { GanttComponent };