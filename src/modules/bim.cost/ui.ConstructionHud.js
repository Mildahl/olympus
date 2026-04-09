import { Components as UIComponents } from "../../ui/Components/Components.js";

import { CostingData } from "./data.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(v) {
  return v != null && v !== "" ? String(v) : "—";
}

function formatCurrency(v) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Single label-value row inside the HUD */
function createCostRow(labelText, valueText, { isTotal = false, modifier = "" } = {}) {
  const row = UIComponents.div().setClass("ConstructionHud-cost-row");
  if (modifier) row.addClass(modifier);

  const label = UIComponents.span(labelText).setClass("hud-label ConstructionHud-cost-label");

  const value = UIComponents.span(fmt(valueText));
  if (isTotal) {
    value.setClass("ConstructionHud-cost-value ConstructionHud-cost-total");
  } else {
    value.setClass("ConstructionHud-cost-value");
  }

  row.add(label, value);
  return row;
}

function createEquationRow({ quantity, costValue, totalCost }) {
  const row = UIComponents.div().setClass("ConstructionHud-cost-row ConstructionHud-cost-equation-row");

  const label = UIComponents.span("EQUATION").setClass("hud-label ConstructionHud-cost-label");

  const equation = UIComponents.div().setClass("ConstructionHud-cost-equation");

  const qty = UIComponents.span(formatCurrency(quantity)).setClass("ConstructionHud-cost-equation-part");
  const mul = UIComponents.span("*").setClass("ConstructionHud-cost-equation-op");
  const cv = UIComponents.span(formatCurrency(costValue)).setClass("ConstructionHud-cost-equation-part");
  const eq = UIComponents.span("=").setClass("ConstructionHud-cost-equation-op");
  const total = UIComponents.span(formatCurrency(totalCost)).setClass("ConstructionHud-cost-equation-total");

  equation.add(qty, mul, cv, eq, total);
  row.add(label, equation);
  return row;
}

/** One IfcCostValue block: Name / Formula / AppliedValue */
function createCostValueItem(cvData) {
  const item = UIComponents.div().setClass("ConstructionHud-cost-value-card");

  const head = UIComponents.div().setClass("ConstructionHud-cost-value-head");
  const name = UIComponents.span(fmt(cvData.Name)).setClass("ConstructionHud-cost-value-name");
  const applied = UIComponents.span(formatCurrency(cvData.AppliedValue)).setClass("ConstructionHud-cost-applied");
  head.add(name, applied);

  const formula = UIComponents.span(cvData.Formula ? cvData.Formula : "—").setClass("ConstructionHud-cost-formula");

  const footer = UIComponents.div().setClass("ConstructionHud-cost-value-footer");
  const description = UIComponents.span(fmt(cvData.Description)).setClass("ConstructionHud-cost-value-description");
  footer.add(description);

  item.add(head, formula, footer);
  return item;
}

function buildCostItemContent(item, costValuesMap) {
  const container = UIComponents.div().setClass("ConstructionHud-cost-item-content");

  const valueIds = item.CostValues || [];
  const resolvedValues = valueIds.map((vid) => costValuesMap[vid]).filter(Boolean);
  const qtyNumber = toNumber(item.TotalCostQuantity);
  const totalCostNumber = toNumber(item.TotalCost);
  const valuesSum = resolvedValues.reduce((sum, cv) => {
    const value = toNumber(cv.AppliedValue);
    return value != null ? sum + value : sum;
  }, 0);
  const hasResolvedValues = resolvedValues.length > 0;
  const unitCostNumber = hasResolvedValues && valuesSum > 0
    ? valuesSum
    : toNumber(item.TotalAppliedValue);

  // ── Quantities section (always visible) ────────────────────────────────
  const quantitiesSection = UIComponents.div().setClass("ConstructionHud-cost-section");

  const quantitiesTitle = UIComponents.div().setClass("ConstructionHud-cost-section-title").setTextContent("QUANTITIES");

  const qtyBody = UIComponents.div().setClass("ConstructionHud-cost-table");

  const qty = item.TotalCostQuantity != null
    ? `${formatCurrency(item.TotalCostQuantity)} ${fmt(item.UnitSymbol)}`
    : "—";
  qtyBody.add(createCostRow("QTY", qty));

  if (item.UnitBasisValueComponent && item.UnitBasisValueComponent !== 1) {
    const unitRate = `${formatCurrency(item.TotalAppliedValue)} / ${fmt(item.UnitBasisUnitSymbol)}`;
    qtyBody.add(createCostRow("UNIT RATE", unitRate));
  }

  if (qtyNumber != null && unitCostNumber != null && totalCostNumber != null) {
    qtyBody.add(createEquationRow({
      quantity: qtyNumber,
      costValue: unitCostNumber,
      totalCost: totalCostNumber,
    }));
  }

  qtyBody.add(createCostRow("TOTAL COST", formatCurrency(item.TotalCost), { isTotal: true, modifier: "is-total" }));
  quantitiesSection.add(quantitiesTitle, qtyBody);

  // ── Cost values section (always visible) ───────────────────────────────
  const valuesSection = UIComponents.div().setClass("ConstructionHud-cost-section");

  const valuesTitle = UIComponents.div().setClass("ConstructionHud-cost-section-title").setTextContent("COST VALUES");

  const valuesBody = UIComponents.div().setClass("OlympusGrid").setStyles({ gap: "6px" });
  if (valueIds.length === 0) {
    const empty = UIComponents.span("No cost values").setClass("ConstructionHud-cost-formula");
    valuesBody.add(empty);
  } else {
    resolvedValues.forEach((cvData) => {
      valuesBody.add(createCostValueItem(cvData));
    });
  }
  valuesSection.add(valuesTitle, valuesBody);

  container.add(quantitiesSection, valuesSection);
  return container;
}

// ─── class ──────────────────────────────────────────────────────────────────

class ConstructionHudCost {
  constructor({ context, operators }) {
    this.context = context;
    this.operators = operators;
    this.panel = null;
    this.isVisible = false;
    this._tabIds = [];
    this._tabbedPanel = null;
    this._headerName = null;
    this._headerSchedule = null;
    this.draw(context);
  }

  draw(context) {

    const panel = UIComponents.column().addClass("ConstructionHud");
    panel.addClass("ConstructionHud--cost");
    this.panel = panel;
    panel.setStyles({ 
      display: "none",
    });

    // ── accent strip ────────────────────────────────────────────────────────
    const accent = UIComponents.div().setClass("ConstructionHud-cost-accent");

    // ── inner header ────────────────────────────────────────────────────────
    const inner = UIComponents.div().setClass("ConstructionHud-inner");

    const itemNameSpan = UIComponents.span("—").setClass("ConstructionHud-task-name");
    this._headerName = itemNameSpan;

    const scheduleNameSpan = UIComponents.span("—").setClass("ConstructionHud-parent-name");
    this._headerSchedule = scheduleNameSpan;

    const headerBlock = UIComponents.div().setClass("ConstructionHud-header");
    headerBlock.add(itemNameSpan, scheduleNameSpan);

    inner.add(headerBlock);

    // ── tabbed panel ────────────────────────────────────────────────────────
    const tabbedPanel = UIComponents.tabbedPanel();
    tabbedPanel.addClass("ConstructionHud-cost-tabs");
    this._tabbedPanel = tabbedPanel;

    panel.add(accent, inner, tabbedPanel);

    // ── signal handler ──────────────────────────────────────────────────────
    context.signals.displayConstructionHudCost.add(async ({ costItems }) => {
      if (!CostingData.is_loaded) {
        await CostingData.load(context.ifc.activeModel);
      }

      const items = (costItems || [])
        .map((c) => CostingData.data.cost_items[c.entityId])
        .filter(Boolean);

      if (items.length === 0) {
        this.hide();
        return;
      }

      this.drawCostItems(items);
      
      this.show();
    });

    context.viewport.add(panel);
  }

  drawCostItems(items) {
    const tp = this._tabbedPanel;
    const costValuesMap = CostingData.data.cost_values || {};
    const costSchedules = CostingData.data.cost_schedules || {};

    // Clear existing tabs
    for (const id of this._tabIds) {
      tp.removeTab(id);
    }
    this._tabIds = [];

    // Update header from first item
    const first = items[0];
    this._headerName.setTextContent(fmt(first.name));

    const schedule = Object.values(costSchedules).find((s) => s.id === first.ParentScheduleId);
    this._headerSchedule.setTextContent(schedule ? fmt(schedule.Name) : "—");

    // Build tabs
    items.forEach((item, idx) => {
      const tabId = `cost-item-${item.id ?? idx}`;
      const tabLabel = item.name || `Item ${idx + 1}`;
      const content = buildCostItemContent(item, costValuesMap);
      tp.addTab(tabId, tabLabel, content);
      this._tabIds.push(tabId);
    });
  }

  show() {
    if (this.panel) {
      this.panel.dom.style.display = "flex";
      this.isVisible = true;
    }
  }

  hide() {
    if (this.panel) {
      this.panel.dom.style.display = "none";
      this.isVisible = false;
    }
  }
}

export default ConstructionHudCost;

