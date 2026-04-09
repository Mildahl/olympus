import json
from collections import Counter
from typing import Any, Dict, List, Optional, Set

import ifcopenshell
import ifcopenshell.util.element

_SPATIAL_WALK_TYPES = frozenset(
    {
        "IfcSite",
        "IfcBuilding",
        "IfcBuildingStorey",
        "IfcSpace",
        "IfcSpatialZone",
        "IfcBridge",
        "IfcFacility",
        "IfcFacilityPart",
    }
)

try:
    import sequence as sequence_module
except ImportError:
    sequence_module = None


TOP_N_CLASSES = 20
TOP_N_NAMES = 15
MAX_GLOBAL_IDS_DEFAULT = 500


def _entity_summary(entity) -> Dict[str, Any]:
    gid = getattr(entity, "GlobalId", None)
    return {
        "GlobalId": gid if gid else str(entity.id()),
        "Name": getattr(entity, "Name", None) or "",
        "type": entity.is_a(),
    }


def _spatial_ancestor_global_ids(element) -> List[str]:
    ids: List[str] = []
    try:
        current = ifcopenshell.util.element.get_container(element)
    except Exception:
        return ids
    seen: Set[int] = set()
    while current is not None and current.id() not in seen:
        seen.add(current.id())
        cls = current.is_a()
        if cls in _SPATIAL_WALK_TYPES or cls.endswith("Storey") or "Spatial" in cls:
            gid = getattr(current, "GlobalId", None)
            if gid:
                ids.append(gid)
        try:
            nxt = ifcopenshell.util.element.get_container(current)
        except Exception:
            nxt = None
        if nxt is not None and nxt.id() == current.id():
            break
        current = nxt
    return ids


def _element_has_any_material(element) -> bool:
    for rel in getattr(element, "HasAssociations", []) or []:
        if rel.is_a("IfcRelAssociatesMaterial"):
            return True
    return False


def _element_type_display_label(element) -> str:
    for rel in getattr(element, "IsTypedBy", []) or []:
        if rel.is_a("IfcRelDefinesByType"):
            rt = rel.RelatingType
            if rt:
                nm = getattr(rt, "Name", None)
                if nm:
                    return str(nm)
                return rt.is_a()
    return "(no type)"


def _element_under_spatial_global_id(element, target_gid: str) -> bool:
    if not target_gid:
        return True
    for gid in _spatial_ancestor_global_ids(element):
        if gid == target_gid:
            return True
    return False


def _task_has_schedule_dates(task) -> bool:
    tt = getattr(task, "TaskTime", None)
    if tt is None:
        return False
    if getattr(tt, "ScheduleStart", None) or getattr(tt, "ScheduleFinish", None):
        return True
    return False


def _cost_item_counts_by_schedule(model) -> Counter:
    counts: Counter = Counter()
    for rel in model.by_type("IfcRelAssignsToControl"):
        rc = rel.RelatingControl
        if rc is None or not rc.is_a("IfcCostSchedule"):
            continue
        gid = getattr(rc, "GlobalId", None)
        if not gid:
            continue
        for obj in rel.RelatedObjects or []:
            if obj.is_a("IfcCostItem"):
                counts[gid] += 1
    return counts


def _top_n_counter(counter: Counter, top_n: int) -> List[Dict[str, Any]]:
    items = counter.most_common(top_n)
    out = [{"name": name, "count": count} for name, count in items]
    rest = sum(counter.values()) - sum(c for _, c in items)
    if rest > 0 and len(counter) > top_n:
        out.append({"name": "Other", "count": rest})
    return out


def get_director_overview(model: ifcopenshell.file) -> Dict[str, Any]:
    schema = model.schema
    project_name = ""
    projects = model.by_type("IfcProject")
    if projects:
        project_name = projects[0].Name or ""

    class_counter: Counter = Counter()
    product_count = 0
    for entity in model.by_type("IfcProduct"):
        product_count += 1
        class_counter[entity.is_a()] += 1

    element_count = len(list(model.by_type("IfcElement")))

    spatial_counts = {
        "sites": len(list(model.by_type("IfcSite"))),
        "buildings": len(list(model.by_type("IfcBuilding"))),
        "storeys": len(list(model.by_type("IfcBuildingStorey"))),
    }

    material_counter: Counter = Counter()
    for mat in model.by_type("IfcMaterial"):
        key = mat.Name or "Unnamed"
        material_counter[key] += 1
    materials_total = sum(material_counter.values())

    pset_name_counter: Counter = Counter()
    qset_name_counter: Counter = Counter()
    element_ids_with_qto: Set[int] = set()
    element_ids_with_pset: Set[int] = set()

    for rel in model.by_type("IfcRelDefinesByProperties"):
        rpd = rel.RelatingPropertyDefinition
        if rpd is None:
            continue
        related = rel.RelatedObjects or []
        if rpd.is_a("IfcPropertySet") and rpd.Name:
            pset_name_counter[rpd.Name] += 1
            for obj in related:
                if obj.is_a("IfcElement"):
                    element_ids_with_pset.add(obj.id())
        elif rpd.is_a("IfcElementQuantity") and rpd.Name:
            qset_name_counter[rpd.Name] += 1
            for obj in related:
                if obj.is_a("IfcElement"):
                    element_ids_with_qto.add(obj.id())

    all_elements = list(model.by_type("IfcElement"))
    all_element_ids = {e.id() for e in all_elements}
    with_qto_count = len(element_ids_with_qto & all_element_ids)
    without_qto_count = max(0, len(all_elements) - with_qto_count)

    classification_ref_count = len(list(model.by_type("IfcClassificationReference")))
    classification_count = len(list(model.by_type("IfcClassification")))

    work_schedules = [_entity_summary(ws) for ws in model.by_type("IfcWorkSchedule")]
    work_plans = [_entity_summary(wp) for wp in model.by_type("IfcWorkPlan")]
    cost_schedules = [_entity_summary(cs) for cs in model.by_type("IfcCostSchedule")]

    schedule_kpis: List[Dict[str, Any]] = []
    if sequence_module is not None:
        for ws in model.by_type("IfcWorkSchedule"):
            try:
                task_count = sequence_module.total_tasks(ws)
                range_raw = sequence_module.get_schedule_date_range(ws)
                dr = json.loads(range_raw) if isinstance(range_raw, str) else range_raw
            except Exception:
                task_count = 0
                dr = {"startDate": None, "endDate": None}
            schedule_kpis.append(
                {
                    "GlobalId": ws.GlobalId,
                    "Name": ws.Name or "Unnamed",
                    "taskCount": task_count,
                    "startDate": dr.get("startDate") if dr else None,
                    "endDate": dr.get("endDate") if dr else None,
                }
            )

    element_type_count = len(list(model.by_type("IfcElementType")))

    histogram = _top_n_counter(class_counter, TOP_N_CLASSES)

    spatial_container_counts: Counter = Counter()
    type_label_counter: Counter = Counter()
    missing_material = 0
    missing_pset = 0
    missing_qto = 0
    missing_type = 0
    placed_in_spatial = 0

    for el in all_elements:
        if not _element_has_any_material(el):
            missing_material += 1
        try:
            pset_map = ifcopenshell.util.element.get_psets(el, psets_only=True)
        except Exception:
            pset_map = {}
        if not pset_map:
            missing_pset += 1
        try:
            qto_map = ifcopenshell.util.element.get_psets(el, qtos_only=True)
        except Exception:
            qto_map = {}
        if not qto_map:
            missing_qto += 1
        tlab = _element_type_display_label(el)
        type_label_counter[tlab] += 1
        if tlab == "(no type)":
            missing_type += 1
        anc = _spatial_ancestor_global_ids(el)
        if len(anc) > 0:
            placed_in_spatial += 1
        for g in anc:
            spatial_container_counts[g] += 1

    spatial_containers: List[Dict[str, Any]] = []
    for gid, cnt in spatial_container_counts.most_common(120):
        ent = model.by_guid(gid)
        if not ent:
            continue
        spatial_containers.append(
            {
                "globalId": gid,
                "name": getattr(ent, "Name", None) or "Unnamed",
                "type": ent.is_a(),
                "elementCount": cnt,
            }
        )

    total_el = len(all_elements) if all_elements else 1

    def _pct(part: int) -> float:
        return round(100.0 * float(part) / float(total_el), 1)

    all_tasks = list(model.by_type("IfcTask"))
    tasks_missing_dates = sum(1 for t in all_tasks if not _task_has_schedule_dates(t))

    cost_item_total = len(list(model.by_type("IfcCostItem")))
    cost_counts = _cost_item_counts_by_schedule(model)
    cost_schedule_analytics: List[Dict[str, Any]] = []
    for cs in model.by_type("IfcCostSchedule"):
        cgid = cs.GlobalId
        cost_schedule_analytics.append(
            {
                "GlobalId": cgid,
                "Name": cs.Name or "Unnamed",
                "type": cs.is_a(),
                "costItemCount": int(cost_counts.get(cgid, 0)),
            }
        )

    schedule_kpis_sum_tasks = sum(int(row.get("taskCount") or 0) for row in schedule_kpis)

    return {
        "schema": schema,
        "projectName": project_name,
        "totals": {
            "products": product_count,
            "elements": element_count,
            "elementTypes": element_type_count,
        },
        "classHistogram": histogram,
        "spatial": spatial_counts,
        "materials": {
            "totalDefinitions": materials_total,
            "topMaterialNames": _top_n_counter(material_counter, TOP_N_NAMES),
        },
        "propertySets": {
            "topNames": _top_n_counter(pset_name_counter, TOP_N_NAMES),
        },
        "quantitySets": {
            "topNames": _top_n_counter(qset_name_counter, TOP_N_NAMES),
            "elementsWithQuantitySets": with_qto_count,
            "elementsWithoutQuantitySets": without_qto_count,
        },
        "classifications": {
            "classificationEntities": classification_count,
            "classificationReferences": classification_ref_count,
        },
        "workSchedules": work_schedules,
        "workPlan": work_plans,
        "costSchedules": cost_schedules,
        "scheduleKpis": schedule_kpis,
        "spatialContainers": spatial_containers,
        "elementTypeLabels": _top_n_counter(type_label_counter, 12),
        "insights": {
            "elementsMissingMaterial": missing_material,
            "elementsMissingAnyPset": missing_pset,
            "elementsMissingQuantitySets": missing_qto,
            "elementsMissingType": missing_type,
            "elementsPlacedInSpatial": placed_in_spatial,
            "elementsOrphanSpatial": max(0, len(all_elements) - placed_in_spatial),
            "materialCoveragePercent": _pct(total_el - missing_material),
            "psetCoveragePercent": _pct(total_el - missing_pset),
            "quantityCoveragePercent": _pct(total_el - missing_qto),
            "typeCoveragePercent": _pct(total_el - missing_type),
            "spatialPlacementPercent": _pct(placed_in_spatial),
        },
        "scheduleAnalytics": {
            "totalIfcTasks": len(all_tasks),
            "tasksMissingScheduleDates": tasks_missing_dates,
            "tasksWithScheduleDates": max(0, len(all_tasks) - tasks_missing_dates),
            "namedScheduleTaskRollup": schedule_kpis_sum_tasks,
            "workScheduleCount": len(work_schedules),
            "workPlanCount": len(work_plans),
        },
        "costAnalytics": {
            "totalCostItems": cost_item_total,
            "schedules": cost_schedule_analytics,
        },
    }


def get_director_overview_json(model: ifcopenshell.file) -> str:
    return json.dumps(get_director_overview(model), default=str)


def _element_has_pset_name(model: ifcopenshell.file, element, pset_name: str) -> bool:
    try:
        data = ifcopenshell.util.element.get_psets(element, psets_only=True)
    except Exception:
        return False
    if not data:
        return False
    return pset_name in data


def _element_has_material_name(element, material_name: str) -> bool:
    for rel in getattr(element, "HasAssociations", []) or []:
        if not rel.is_a("IfcRelAssociatesMaterial"):
            continue
        mat_sel = rel.RelatingMaterial
        if mat_sel is None:
            continue
        if mat_sel.is_a("IfcMaterial"):
            if (mat_sel.Name or "") == material_name:
                return True
        elif mat_sel.is_a("IfcMaterialList"):
            for m in mat_sel.Materials or []:
                if m and (m.Name or "") == material_name:
                    return True
        elif mat_sel.is_a("IfcMaterialLayerSetUsage"):
            layers = mat_sel.ForLayerSet.MaterialLayers if mat_sel.ForLayerSet else []
            for layer in layers or []:
                if layer.Material and (layer.Material.Name or "") == material_name:
                    return True
    return False


def get_filtered_slice(
    model: ifcopenshell.file,
    filter_spec: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    spec = filter_spec or {}
    max_ids = int(spec.get("maxGlobalIds") or MAX_GLOBAL_IDS_DEFAULT)
    if max_ids < 1:
        max_ids = MAX_GLOBAL_IDS_DEFAULT
    if max_ids > 2000:
        max_ids = 2000

    ifc_class = spec.get("ifcClass") or None
    pset_name = spec.get("propertySetName") or None
    material_name = spec.get("materialName") or None
    spatial_gid = spec.get("spatialContainerGlobalId") or None

    candidates: List = []
    for el in model.by_type("IfcElement"):
        if ifc_class and not el.is_a(ifc_class):
            continue
        if pset_name and not _element_has_pset_name(model, el, pset_name):
            continue
        if material_name and not _element_has_material_name(el, material_name):
            continue
        if spatial_gid and not _element_under_spatial_global_id(el, spatial_gid):
            continue
        candidates.append(el)

    sub_counter: Counter = Counter()
    for el in candidates:
        sub_counter[el.is_a()] += 1

    global_ids: List[str] = []
    for el in candidates:
        if len(global_ids) >= max_ids:
            break
        gid = getattr(el, "GlobalId", None)
        if gid:
            global_ids.append(gid)

    return {
        "matchCount": len(candidates),
        "truncated": len(candidates) > len(global_ids),
        "globalIds": global_ids,
        "classHistogram": _top_n_counter(sub_counter, TOP_N_CLASSES),
    }


def get_filtered_slice_json(
    model: ifcopenshell.file,
    filter_spec: Optional[Dict[str, Any]] = None,
) -> str:
    spec = filter_spec if filter_spec is not None else {}
    return json.dumps(get_filtered_slice(model, spec), default=str)
