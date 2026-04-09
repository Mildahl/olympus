import ifcopenshell
import ifcopenshell.util.cost
import ifcopenshell.util.unit
import ifcopenshell.util.date
import ifcopenshell.util.element
import json


def has_cost_schedules(model):
    return bool(model.by_type("IfcCostSchedule"))


def _get_parent_schedule_id(cost_item):
    """Walk up the nesting hierarchy to find the owning IfcCostSchedule entity id."""
    current = cost_item
    while current is not None:
        for rel in getattr(current, "HasAssignments", []) or []:
            if rel.is_a("IfcRelAssignsToControl"):
                control = rel.RelatingControl
                if control is not None and control.is_a("IfcCostSchedule"):
                    return control.id()
        parent = None
        for rel in getattr(current, "Nests", []) or []:
            obj = rel.RelatingObject
            if obj is not None and obj.is_a("IfcCostItem"):
                parent = obj
            break
        current = parent
    return None


def _load_cost_value_data(root_element, cost_value, cost_values_cache):
    """Serialize a single IfcCostValue into cost_values_cache and recurse into components."""
    if cost_value.id() in cost_values_cache:
        return
    value_data = cost_value.get_info()
    del value_data["AppliedValue"]
    if value_data.get("UnitBasis") and cost_value.UnitBasis:
        ub = cost_value.UnitBasis.get_info()
        ub_vc = ub.get("ValueComponent")
        ub["ValueComponent"] = ub_vc.wrappedValue if hasattr(ub_vc, "wrappedValue") else ub_vc
        ub_uc = ub.get("UnitComponent")
        ub["UnitComponent"] = ub_uc.id() if ub_uc is not None and hasattr(ub_uc, "id") else None
        try:
            ub["UnitSymbol"] = ifcopenshell.util.unit.get_unit_symbol(cost_value.UnitBasis.UnitComponent)
        except Exception:
            ub["UnitSymbol"] = "-"
        value_data["UnitBasis"] = ub
    if value_data.get("ApplicableDate"):
        try:
            value_data["ApplicableDate"] = str(ifcopenshell.util.date.ifc2datetime(value_data["ApplicableDate"]))
        except Exception:
            pass
    if value_data.get("FixedUntilDate"):
        try:
            value_data["FixedUntilDate"] = str(ifcopenshell.util.date.ifc2datetime(value_data["FixedUntilDate"]))
        except Exception:
            pass
    value_data["Components"] = [c.id() for c in value_data.get("Components") or []]
    try:
        value_data["AppliedValue"] = ifcopenshell.util.cost.calculate_applied_value(root_element, cost_value)
    except Exception:
        value_data["AppliedValue"] = 0.0
    try:
        value_data["Formula"] = ifcopenshell.util.cost.serialise_cost_value(cost_value)
    except Exception:
        value_data["Formula"] = ""
    cost_values_cache[cost_value.id()] = value_data
    for component in cost_value.Components or []:
        _load_cost_value_data(root_element, component, cost_values_cache)


def _serialize_cost_item(model, cost_item, cost_values_cache):
    """Build a serializable dict for an IfcCostItem including computed quantity and value totals."""
    data = {}
    data["id"] = cost_item.id()
    data["GlobalId"] = cost_item.GlobalId
    data["name"] = cost_item.Name or "Unnamed"
    # Nesting index within parent
    data["NestingIndex"] = None
    for rel in cost_item.Nests or []:
        try:
            data["NestingIndex"] = list(rel.RelatedObjects).index(cost_item)
        except ValueError:
            pass
    # Child and parent item ids
    data["IsNestedBy"] = []
    for rel in cost_item.IsNestedBy or []:
        data["IsNestedBy"].extend([o.id() for o in rel.RelatedObjects or [] if o.is_a("IfcCostItem")])
    data["Nests"] = []
    for rel in cost_item.Nests or []:
        if rel.RelatingObject.is_a("IfcCostItem"):
            data["Nests"].append(rel.RelatingObject.id())
    # Quantities
    try:
        data["TotalCostQuantity"] = ifcopenshell.util.cost.get_total_quantity(cost_item)
    except Exception:
        data["TotalCostQuantity"] = None
    data["UnitSymbol"] = "-"
    data["QuantityType"] = None
    quantities = cost_item.CostQuantities
    if quantities:
        quantity = quantities[0]
        data["QuantityType"] = quantity.is_a()
        try:
            unit = ifcopenshell.util.unit.get_property_unit(quantity, model)
            if unit:
                data["UnitSymbol"] = ifcopenshell.util.unit.get_unit_symbol(unit)
        except Exception:
            pass
        if quantity.is_a("IfcPhysicalSimpleQuantity"):
            try:
                measure_class = (
                    quantity.wrapped_data.declaration()
                    .as_entity()
                    .attribute_by_index(3)
                    .type_of_attribute()
                    .declared_type()
                    .name()
                )
                if "Count" in measure_class:
                    data["UnitSymbol"] = "U"
            except Exception:
                pass
    # Cost values and totals
    data["CostValues"] = []
    data["CategoryValues"] = {}
    data["UnitBasisValueComponent"] = 1
    data["UnitBasisUnitSymbol"] = "U"
    data["TotalAppliedValue"] = 0.0
    data["TotalCost"] = 0.0
    has_unit_basis = False
    for cost_value in cost_item.CostValues or []:
        _load_cost_value_data(cost_item, cost_value, cost_values_cache)
        cv_data = cost_values_cache.get(cost_value.id(), {})
        data["CostValues"].append(cost_value.id())
        data["TotalAppliedValue"] += cv_data.get("AppliedValue") or 0.0
        if cost_value.UnitBasis and cv_data.get("UnitBasis"):
            data["UnitBasisValueComponent"] = cv_data["UnitBasis"].get("ValueComponent", 1)
            data["UnitBasisUnitSymbol"] = cv_data["UnitBasis"].get("UnitSymbol", "U")
            has_unit_basis = True
        cat = cost_value.Category
        if cat not in (None, "*"):
            data["CategoryValues"].setdefault(cat, 0)
            data["CategoryValues"][cat] += cv_data.get("AppliedValue") or 0.0
    cost_quantity = 1 if data["TotalCostQuantity"] is None else data["TotalCostQuantity"]
    if has_unit_basis and data["UnitBasisValueComponent"]:
        data["TotalCost"] = data["TotalAppliedValue"] * cost_quantity / data["UnitBasisValueComponent"]
    else:
        data["TotalCost"] = data["TotalAppliedValue"] * cost_quantity
    data["ParentScheduleId"] = _get_parent_schedule_id(cost_item)
    return data


def load_cost_schedules(model):
    """Returns JSON dict keyed by GlobalId with IfcCostSchedule metadata."""
    schedules = {}
    for schedule in model.by_type("IfcCostSchedule"):
        data = schedule.get_info()
        if not data.get("Name"):
            data["Name"] = "Unnamed"
        if "OwnerHistory" in data:
            del data["OwnerHistory"]
        data["predefined_type"] = ifcopenshell.util.element.get_predefined_type(schedule)
        data["RootItems"] = []
        for rel in schedule.Controls or []:
            for obj in rel.RelatedObjects or []:
                if obj.is_a("IfcCostItem"):
                    data["RootItems"].append(obj.id())
        schedules[schedule.GlobalId] = data
    return json.dumps(schedules, default=str)

def load_cost_items(model):
    """Returns JSON dict keyed by entity id with full cost item data including computed totals."""
    cost_values_cache = {}
    items = {}
    for cost_item in model.by_type("IfcCostItem"):
        items[cost_item.id()] = _serialize_cost_item(model, cost_item, cost_values_cache)
    return json.dumps(items, default=str)


def load_cost_values(model):
    """Returns JSON dict keyed by entity id with all IfcCostValue data across the model."""
    cost_values_cache = {}
    for cost_item in model.by_type("IfcCostItem"):
        for cost_value in cost_item.CostValues or []:
            _load_cost_value_data(cost_item, cost_value, cost_values_cache)
    return json.dumps(cost_values_cache, default=str)

def get_cost_items_for_product(product):
    """Returns JSON dict with cost items related to a product via IfcRelAssociates."""
    items = ifcopenshell.util.cost.get_cost_items_for_product(product)
    return json.dumps([
        {
            "entityId": item.id(),
            "GlobalId": item.GlobalId,
            "Name": item.Name or "Unnamed",
        }
        for item in items or []
    ], default=str)