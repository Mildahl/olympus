import {Components} from "./Components.js";

import Paths from "../../utils/paths.js";

class GanttComponent {
    constructor(context, operators) {
        this.context = context;

        this.operators = operators;

        this.ganttChart = null;

        this.vendorLoaded = false;

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

    loadDependencies() {
        
        if (!this.vendorLoaded) {
            for (const cssLink of this.dependencies.cssLinks) {
                const link = document.createElement('link');

                link.rel = 'stylesheet';

                link.href = cssLink;

                document.head.appendChild(link);
            }

            for (const jsLink of this.dependencies.jsLinks) {
                const xhr = new XMLHttpRequest();

                xhr.open('GET', jsLink, false);

                xhr.send();

                if (xhr.status === 200) {
                    (0, eval)(xhr.responseText);
                } else {
                    console.error('Failed to load script:', jsLink);
                }
            }

            this.vendorLoaded = true;
        }
    }

    render(taskData, container) {
        container.clear();

        this.displayTasks(taskData, container.dom);
    }

    displayTasks(taskData, dom) {
        this.createGanttChart(dom, taskData);
    }

    createGanttChart(dom, jsonData) {

        console.log("Creating Gantt chart with data:", jsonData, dom);

        this.loadDependencies();

        this.ganttChart = new JSGantt.GanttChart(dom, 'week');

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

        JSGantt.parseJSONString(jsonString, this.ganttChart);

        this.ganttChart.vEventClickRow = (task) => {
            this.operators.execute("bim.select_task", this.context, task.getOriginalID()
            );
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
        console.log("Showing dependency dialog for task:", task);

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
            console.warn('addDependency fallback mutation failed', e);

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
            console.warn('removeDependency fallback mutation failed', e);

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
            console.warn('setDependencyType fallback mutation failed', e);

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
            console.warn('updateDependencies failed', e);

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

        console.log("Context menu event:", event);

        const task = this.getTaskFromEvent(event);

        console.log("Task from event:", task);

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