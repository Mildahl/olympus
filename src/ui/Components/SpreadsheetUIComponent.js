import { UIPanel, UIDatePicker } from "./../../../drawUI/ui.js";

import Paths from "../../utils/paths.js";

import { formatSchedulingDate } from "../../utils/formatSchedulingDate.js";

/**
 * SpreadsheetUIComponent - A comprehensive ag-Grid wrapper for displaying tabular data
 * 
 * Features:
 * - Automatic column detection from JSON objects
 * - Data type detection (number, boolean, date, string)
 * - Column mapping/renaming support
 * - Native JSON object support (no need to convert to arrays)
 * - Cell editing, sorting, filtering, resizing
 * - Multiple selection modes
 * - Event callbacks for cell changes and selection changes
 * 
 * Usage Examples:
 * 
 * 1. Basic usage with JSON objects:
 *    const data = [
 *        { id: 1, name: 'Task 1', status: 'COMPLETED', duration: 4.5 },
 *        { id: 2, name: 'Task 2', status: 'IN_PROGRESS', duration: 2.3 }
 *    ];
 *    const spreadsheet = new SpreadsheetUIComponent({ data });
 * 
 * 2. With column mapping:
 *    const spreadsheet = new SpreadsheetUIComponent({
 *        data,
 *        columnConfig: {
 *            id: { headerName: 'Task ID', width: 80 },
 *            name: { headerName: 'Task Name', width: 200 },
 *            status: { headerName: 'Status' },
 *            duration: { headerName: 'Duration (days)', type: 'number' }
 *        }
 *    });
 * 
 * 3. With custom column ordering:
 *    const spreadsheet = new SpreadsheetUIComponent({
 *        data,
 *        columnOrder: ['id', 'name', 'status', 'duration']
 *    });
 */
class SpreadsheetUIComponent extends UIPanel {
    constructor(options = {}) {
        super();

        this.vendorLoaded = false;

        this.dependencies = {
            jsLinks: [
                Paths.vendor('ag-grid/ag-grid-community.min.js')
            ],
            cssLinks: [
                Paths.vendor('ag-grid/ag-grid.min.css'),
                Paths.vendor('ag-grid/ag-theme-quartz.min.css')
            ]
        };

        this.setClass('spreadsheet-component');

        this.dom.className = 'ag-theme-quartz ag-grid-container spreadsheet-component';

        this.dom.style.width = options.width || '100%';

        this.dom.style.height = options.height || '400px';

        if (options.minHeight) {
            this.dom.style.minHeight = options.minHeight;
        }

        this.dom.style.boxSizing = 'border-box';

        this.rawData = options.data || [];

        this.columnConfig = options.columnConfig || {};

        this.columnOrder = options.columnOrder || null;

        this.columnNameMapper = options.columnNameMapper || {};

        this.gridApi = null;

        this.gridColumnApi = null;

        this.columnTypes = {};

        this.lastSelection = null;

        this.registerCustomCellEditors();

        const columnDefs = this.deriveColumnDefs(this.rawData);

        this.gridOptions = {
            rowData: this.rawData,
            columnDefs: columnDefs,
            components: {
                dateTimePicker: this.getDateTimeCellEditor()
            },
            defaultColDef: {
                editable: true,
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 120,
            },
            domLayout: options.gridOptions?.domLayout || 'normal', 
            enableCellTextSelection: true,
            suppressMenuHide: false,
            suppressColumnVirtualisation: false,
            animateRows: true,
            rowSelection: 'single', 
            onSelectionChanged: () => this.handleSelectionChanged(),
            onCellValueChanged: (event) => this.handleCellValueChanged(event),
            ...options.gridOptions
        };
    }

    loadDependencies(){ 
        if ( !this.vendorLoaded ) {
            
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
                    eval(xhr.responseText);
                } else {
                    console.error('Failed to load script:', jsLink);
                }
            }

            this.vendorLoaded = true;
        }
    }
    
    /**
     * Get the custom DateTime cell editor class
     */
    getDateTimeCellEditor() {
        
        function DateTimeCellEditor() {}

        DateTimeCellEditor.prototype.init = function(params) {
            this.params = params;

            this.value = params.value;

            this.container = document.createElement('div');

            this.container.style.width = '100%';

            this.container.style.height = '100%';

            this.input = document.createElement('input');

            this.input.type = 'text';

            this.input.style.width = '100%';

            this.input.style.height = '100%';

            this.input.style.border = 'none';

            this.input.style.outline = 'none';

            this.input.style.padding = '0 4px';

            this.input.style.boxSizing = 'border-box';

            if (this.value) {
                const date = new Date(this.value);

                this.input.value = date.toLocaleString();
            }
            
            this.container.appendChild(this.input);

            this.datePicker = new UIDatePicker(this.value);

            this.datePicker.setIncludeTime(true);

            this.datePicker.hideCalendar();
 
            this.datePicker.dom.style.position = 'absolute';

            this.datePicker.dom.style.zIndex = '9999';

            this.datePicker.dom.style.display = 'none';
            
            document.body.appendChild(this.datePicker.dom);

            this.input.addEventListener('focus', () => {
                this.showDatePicker();
            });
            
            this.input.addEventListener('click', () => {
                this.showDatePicker();
            });

            this.datePicker.dom.addEventListener('change', () => {
                const date = this.datePicker.getValue();

                this.input.value = date.toLocaleString();

                this.value = date.toISOString();
            });
        };

        DateTimeCellEditor.prototype.showDatePicker = function() {
            const rect = this.input.getBoundingClientRect();

            this.datePicker.dom.style.left = rect.left + 'px';

            this.datePicker.dom.style.top = (rect.bottom + 2) + 'px';

            this.datePicker.dom.style.display = 'block';

            this.datePicker.showCalendar();
        };

        DateTimeCellEditor.prototype.getGui = function() {
            return this.container;
        };

        DateTimeCellEditor.prototype.afterGuiAttached = function() {
            this.input.focus();
        };

        DateTimeCellEditor.prototype.getValue = function() {
            return this.value;
        };

        DateTimeCellEditor.prototype.destroy = function() {
            if (this.datePicker && this.datePicker.dom.parentNode) {
                this.datePicker.dom.parentNode.removeChild(this.datePicker.dom);
            }
        };

        DateTimeCellEditor.prototype.isPopup = function() {
            return true;
        };

        return DateTimeCellEditor;
    }

    /**
     * Register custom cell editors for enhanced editing experience
     * @deprecated - Using components property in gridOptions instead
     */
    registerCustomCellEditors() {
    }

    /**
     * Automatically derive column definitions from JSON data
     * Detects data types and creates appropriate column configs
     */
    deriveColumnDefs(data) {
        if (!data || data.length === 0) {
            return [{ field: 'empty', headerName: 'No Data', editable: false }];
        }

        const allKeys = new Set();

        data.forEach(row => {
            if (typeof row === 'object' && row !== null) {
                Object.keys(row).forEach(key => allKeys.add(key));
            }
        });

        let keys = Array.from(allKeys);

        if (this.columnOrder) {
            keys = this.columnOrder.filter(k => allKeys.has(k));

            allKeys.forEach(k => {
                if (!this.columnOrder.includes(k)) {
                    keys.push(k);
                }
            });
        }

        const columnDefs = keys.map(field => {
            const dataType = this.detectDataType(data, field);

            this.columnTypes[field] = dataType;

            const customConfig = this.columnConfig[field] || {};

            const { type: _omitType, ...safeConfig } = customConfig;

            const headerName = this.columnNameMapper[field] ||
                              customConfig.headerName ||
                              this.formatColumnName(field);

            const colDef = {
                field: field,
                headerName: headerName,
                editable: customConfig.editable !== false,
                sortable: true,
                filter: customConfig.filter !== false,
                resizable: true,
                ...safeConfig
            };

            switch (dataType) {
                case 'integer':
                    colDef.filter = 'agNumberColumnFilter';

                    colDef.valueFormatter = (params) => {
                        if (params.value === null || params.value === undefined) return '';

                        return typeof params.value === 'number' 
                            ? params.value.toString() 
                            : params.value;
                    };

                    break;

                case 'float':
                    colDef.filter = 'agNumberColumnFilter';

                    colDef.valueFormatter = (params) => {
                        if (params.value === null || params.value === undefined) return '';

                        return typeof params.value === 'number' 
                            ? params.value.toFixed(2) 
                            : params.value;
                    };

                    break;

                case 'boolean':
                    colDef.filter = 'agSetColumnFilter';

                    colDef.cellEditor = 'agCheckboxCellEditor';

                    break;

                case 'date':
                    colDef.filter = 'agDateColumnFilter';

                    colDef.cellEditor = 'dateTimePicker'; 

                    colDef.cellEditorParams = {
                        useFormatter: true
                    };

                    colDef.valueFormatter = (params) => {
                        if (!params.value) return '';

                        return formatSchedulingDate(params.value) || String(params.value);
                    };

                    colDef.valueParser = (params) => {
                        if (!params.newValue) return null;

                        const date = new Date(params.newValue);

                        return isNaN(date.getTime()) ? null : date.toISOString();
                    };

                    break;

                case 'object':
                    colDef.filter = 'agTextColumnFilter';

                    colDef.valueFormatter = (params) => {
                        if (params.value == null) return '';

                        if (typeof params.value === 'object') return JSON.stringify(params.value);

                        return String(params.value);
                    };

                    colDef.valueParser = (params) => {
                        if (params.newValue == null || params.newValue === '') return null;

                        try {
                            const parsed = JSON.parse(params.newValue);

                            return typeof parsed === 'object' ? parsed : params.newValue;
                        } catch {
                            return params.newValue;
                        }
                    };

                    break;

                case 'string':

                default:
                    colDef.filter = 'agTextColumnFilter';

                    break;
            }

            return colDef;
        });

        return columnDefs;
    }

    /**
     * Detect the data type of a column based on sample values
     */
    detectDataType(data, field) {
        for (let i = 0; i < Math.min(data.length, 5); i++) {
            const value = data[i][field];

            if (value === null || value === undefined) continue;

            if (typeof value === 'boolean') return 'boolean';

            if (typeof value === 'number') {
                return Number.isInteger(value) ? 'integer' : 'float';
            }

            if (value instanceof Date) return 'date';

            if (typeof value === 'object') return 'object';

            if (typeof value === 'string') {
                if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
            }
        }

        return 'string';
    }

    /**
     * Format a field name into a readable header name
     * Converts camelCase and snake_case to Title Case
     */
    formatColumnName(field) {
        return field
            .replace(/([A-Z])/g, ' $1') 
            .replace(/_/g, ' ') 
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim();
    }

    init() {
        this.initializeAgGrid();
    }

    initializeAgGrid() {
        if (typeof agGrid === 'undefined') this.loadDependencies();

        const gridDiv = this.dom;

        const gridApi = agGrid.createGrid(gridDiv, this.gridOptions);

        this.gridApi = gridApi;

        this.gridColumnApi = gridApi.columnApi;

        this.autoSizeColumns();

    }

    /**
     * Auto-fit all columns to their content width
     */
    autoSizeColumns() {
        if (this.gridColumnApi) {
            const allColumnIds = [];

            this.gridColumnApi.getColumns()?.forEach(column => {
                allColumnIds.push(column.colId);
            });

            this.gridColumnApi.autoSizeColumns(allColumnIds, false);
        }
    }

    showErrorMessage(message) {
        this.dom.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; font-style: italic; font-size: 14px; padding: 20px; text-align: center;">
                ${message}
            </div>
        `;
    }

    /**
     * Load new data into the spreadsheet
     * Automatically derives columns from JSON objects
     */
    loadData(data, config = {}) {

        if (!this.gridApi) {
            console.warn("Grid API not initialized, cannot load data");

            return;
        }

        if (!data) {
            data = [];
        }

        this.rawData = data;

        if (config.columnConfig) {
            this.columnConfig = { ...this.columnConfig, ...config.columnConfig };
        }

        if (config.columnNameMapper) {
            this.columnNameMapper = { ...this.columnNameMapper, ...config.columnNameMapper };
        }

        if (config.columnOrder) {
            this.columnOrder = config.columnOrder;
        }

        const newColumnDefs = this.deriveColumnDefs(data);

        if (this.gridApi.setGridOption) {
            this.gridApi.setGridOption('columnDefs', newColumnDefs);

            this.gridApi.setGridOption('rowData', data);
        } else {
            this.gridApi.updateGridOptions({ columnDefs: newColumnDefs, rowData: data });
        }

        this.autoSizeColumns();
    }

    /**
     * Get all data as JSON objects
     */
    getData() {
        if (!this.gridApi) return [];

        const rowData = [];

        this.gridApi.forEachNode((node) => {
            rowData.push(node.data);
        });

        return rowData;
    }

    /**
     * Get data filtered by current grid filters
     */
    getFilteredData() {
        if (!this.gridApi) return [];
        
        const rowData = [];

        this.gridApi.forEachNodeAfterFilter((node) => {
            rowData.push(node.data);
        });

        return rowData;
    }

    /**
     * Get currently selected row(s)
     */
    getSelected() {
        if (!this.gridApi) return null;

        const selectedNodes = this.gridApi.getSelectedNodes();

        if (selectedNodes.length === 0) return null;

        return {
            nodes: selectedNodes,
            data: selectedNodes.map(node => node.data)
        };
    }

    /**
     * Get multiple selected rows as array
     */
    getSelectedRows() {
        if (!this.gridApi) return [];

        const selectedNodes = this.gridApi.getSelectedNodes();

        return selectedNodes.map(node => node.data);
    }

    /**
     * Get single selected row
     */
    getSelectedRow() {
        if (!this.gridApi) return null;

        const selectedNodes = this.gridApi.getSelectedNodes();

        return selectedNodes.length > 0 ? selectedNodes[0].data : null;
    }

    /**
     * Select a specific row by index
     */
    selectRow(rowIndex) {
        if (this.gridApi) {
            this.gridApi.ensureIndexVisible(rowIndex);

            const node = this.gridApi.getDisplayedRowAtIndex(rowIndex);

            if (node) {
                node.setSelected(true);

                this.gridApi.ensureNodeVisible(node);
            }
        }
    }

    /**
     * Select multiple rows
     */
    selectRows(rowIndices) {
        if (this.gridApi) {
            this.gridApi.deselectAll();

            rowIndices.forEach(index => {
                const node = this.gridApi.getDisplayedRowAtIndex(index);

                if (node) node.setSelected(true);
            });
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        if (this.gridApi) {
            this.gridApi.deselectAll();
        }
    }

    /**
     * Handle selection changed events
     */
    handleSelectionChanged() {
        const selected = this.getSelected();

        this.lastSelection = selected;

        const event = new CustomEvent('selectionChanged', {
            detail: { selected: selected }
        });

        this.dom.dispatchEvent(event);
    }

    /**
     * Handle cell value changed events
     */
    handleCellValueChanged(event) {
        console.log('Cell changed:', event.data, event.colDef.field, event.newValue);

        const cellEvent = new CustomEvent('cellChanged', {
            detail: {
                rowData: event.data,
                field: event.colDef.field,
                newValue: event.newValue,
                oldValue: event.oldValue
            }
        });

        this.dom.dispatchEvent(cellEvent);
    }

    /**
     * Enable/disable cell editing
     */
    setEditable(editable) {
        if (this.gridApi) {
            const columnDefs = this.gridApi.getColumnDefs();

            columnDefs.forEach(colDef => {
                colDef.editable = editable;
            });

            this.gridApi.setColumnDefs(columnDefs);
        }
    }

    /**
     * Apply row filter
     */
    applyFilter(field, value, operator = 'equals') {
        if (!this.gridApi) return;
        
        const filterModel = {};

        filterModel[field] = { type: operator, filter: value };

        this.gridApi.setFilterModel(filterModel);
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        if (this.gridApi) {
            this.gridApi.setFilterModel(null);
        }
    }

    /**
     * Export data as JSON
     */
    exportAsJson() {
        return JSON.stringify(this.getData(), null, 2);
    }

    /**
     * Export data as CSV
     */
    exportAsCsv() {
        if (!this.gridApi) return '';
        
        const data = this.getData();

        if (data.length === 0) return '';

        const keys = Object.keys(data[0]);

        const csv = [
            keys.join(','),
            ...data.map(row =>
                keys.map(key => {
                    const val = row[key];

                    if (val === null || val === undefined) return '';

                    return typeof val === 'string' && val.includes(',')
                        ? `"${val.replace(/"/g, '""')}"` 
                        : val;
                }).join(',')
            )
        ].join('\n');

        return csv;
    }

    /**
     * Refresh the grid layout
     */
    refresh() {
        if (this.gridApi) {
            this.gridApi.redrawRows();
        }
    }

    /**
     * Update grid options
     */
    updateSettings(settings) {
        if (this.gridApi) {
            this.gridApi.updateGridOptions(settings);
        }
    }

    /**
     * Destroy the grid and clean up
     */
    destroy() {
        if (this.gridApi) {
            this.gridApi.destroy();

            this.gridApi = null;

            this.gridColumnApi = null;
        }
    }

    /**
     * Set grid dimensions
     */
    setSize(width, height) {
        if (width) this.dom.style.width = width;

        if (height) this.dom.style.height = height;

        if (this.gridApi) {
            this.gridApi.sizeColumnsToFit();
        }
    }

    /**
     * Call after the grid becomes visible (e.g. tab shown) or when reparented
     * so ag-Grid recomputes column widths and body size.
     */
    notifyLayout() {
        if (!this.gridApi) return;

        try {
            if (typeof this.gridApi.sizeColumnsToFit === 'function') {
                this.gridApi.sizeColumnsToFit();
            }
        } catch (_) {
            /* ag-Grid API varies by version */
        }

        this.autoSizeColumns();
    }

    /**
     * Register event callback - alternative to addEventListener
     */
    on(eventType, callback) {
        this.dom.addEventListener(eventType, (e) => callback(e.detail));
    }
}

export { SpreadsheetUIComponent };