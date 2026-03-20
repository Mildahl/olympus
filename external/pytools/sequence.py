import ifcopenshell.util.sequence
import ifcopenshell.util.date
import json
import ifcopenshell.api.sequence
from datetime import datetime
from dateutil import parser as date_parser

sequence_type_map = {
    None: "FS",
    "START_START": "SS",
    "START_FINISH": "SF",
    "FINISH_START": "FS",
    "FINISH_FINISH": "FF",
    "USERDEFINED": "FS",
    "NOTDEFINED": "FS",
}


def has_work_schedules(model):
    return bool(model.by_type("IfcWorkSchedule"))


def _serialize_work_schedule_creators(creators):
    """Creators is IfcActorSelect: IfcOrganization, IfcPerson, IfcPersonAndOrganization, etc. — not all have GlobalId."""
    if not creators:
        return []
    out = []
    for p in creators:
        if p is None:
            continue
        if getattr(p, "GlobalId", None):
            out.append({"type": p.is_a(), "GlobalId": p.GlobalId})
        else:
            out.append({"type": p.is_a(), "id": p.id()})
    return out


def load_work_schedules(model):
    schedule_data = {}
    schedule_data["work_schedules"] = {}
    schedule_data["work_schedules_enum"] = []
    for work_schedule in model.by_type("IfcWorkSchedule"):
        data = work_schedule.get_info()
        if not data["Name"]:
            data["Name"] = "Unnamed"
        del data["OwnerHistory"]
        data["Creators"] = _serialize_work_schedule_creators(data.get("Creators"))
        data["CreationDate"] = data["CreationDate"] if data["CreationDate"] else ""
        data["StartTime"] = data["StartTime"] if data["StartTime"] else ""
        data["FinishTime"] = data["FinishTime"] if data["FinishTime"] else ""
        data["RelatedObjects"] = []
        for rel in work_schedule.Controls:
            for obj in rel.RelatedObjects:
                if obj.is_a("IfcTask"):
                    data["RelatedObjects"].append(obj.GlobalId)
        schedule_data["work_schedules"][work_schedule.GlobalId] = data
        schedule_data["work_schedules_enum"].append((work_schedule.GlobalId, data["Name"]))
    # default=str: get_info() may include datetime or other non-JSON-native values
    return json.dumps(schedule_data, default=str)
    # schedule_data["number_of_work_schedules_loaded"] = number_of_work_schedules_loaded()


def get_task_outputs(task):
    outputs = ifcopenshell.util.sequence.get_task_outputs(task, is_deep=True) or []
    
    if not outputs:
        outputs = get_task_related_products(task, "output")
    
    return [
        {"GlobalId": output.GlobalId, "Name": output.Name or "Unnamed"}
        for output in outputs or []
    ]


def get_task_inputs(task):
    inputs = ifcopenshell.util.sequence.get_task_inputs(task, is_deep=True) or []
    
    if not inputs:
        inputs = get_task_related_products(task, "input")
    
    return [
        {"GlobalId": inp.GlobalId, "Name": inp.Name or "Unnamed"}
        for inp in inputs or []
    ]


def get_task_related_products(task, relation_type="output"):
    products = []
    
    for rel in getattr(task, "HasAssignments", []) or []:
        if rel.is_a("IfcRelAssignsToProduct"):
            product = rel.RelatingProduct
            if product and hasattr(product, "GlobalId"):
                products.append(product)
    
    for rel in getattr(task, "OperatesOn", []) or []:
        for obj in rel.RelatedObjects:
            if hasattr(obj, "GlobalId") and obj.is_a("IfcProduct"):
                products.append(obj)
    
    if hasattr(task, "Nests") and task.Nests:
        for nested_rel in task.Nests:
            parent_task = nested_rel.RelatingObject
            if parent_task and parent_task.is_a("IfcTask"):
                parent_products = get_task_related_products(parent_task, relation_type)
                products.extend(parent_products)
    
    return products

def get_task_resources(task):
    resources = ifcopenshell.util.sequence.get_task_resources(task, is_deep=True)
    return [
        {"GlobalId": resource.GlobalId, "Name": resource.Name or "Unnamed"}
        for resource in resources or []
    ]

def get_tasks(works_schedule):
    tasks_for_schedule = ifcopenshell.util.sequence.get_work_schedule_tasks(works_schedule)
    return list(tasks_for_schedule) or []

def total_tasks(works_schedule):
    tasks = get_tasks(works_schedule)
    return len(tasks)

def create_tasks_json(work_schedule):
    is_baseline = False
    if work_schedule.PredefinedType == "BASELINE":
        is_baseline = True
        relating_work_schedule = work_schedule.IsDeclaredBy[0].RelatingObject
        work_schedule = relating_work_schedule
    tasks_json = []
    for task in ifcopenshell.util.sequence.get_root_tasks(work_schedule):
        if is_baseline:
            create_new_task_json(task, tasks_json, baseline_schedule=work_schedule)
        else:
            create_new_task_json(task, tasks_json)
    return json.dumps(tasks_json)


def create_new_task_json(task, json, baseline_schedule=None):
    data = task_data(task, baseline_schedule)
    json.append(data)
    for nested_task in ifcopenshell.util.sequence.get_nested_tasks(task):
        create_new_task_json(nested_task, json, baseline_schedule)


def task_data(task, baseline_schedule=None):
    task_time = task.TaskTime
    resources = ifcopenshell.util.sequence.get_task_resources(task, is_deep=False)

    string_resources = ""
    resources_usage = ""
    for resource in resources:
        string_resources += resource.Name + ", "
        resources_usage += str(resource.Usage.ScheduleUsage) + ", " if resource.Usage else "-, "

    schedule_start = task_time.ScheduleStart if task_time else ""
    schedule_finish = task_time.ScheduleFinish if task_time else ""

    baseline_task = None
    if baseline_schedule:
        for rel in task.Declares:
            for baseline_task in rel.RelatedObjects:
                if baseline_schedule.id() == ifcopenshell.util.sequence.get_task_work_schedule(baseline_task).id():
                    baseline_task = task
                    break

    if baseline_task and baseline_task.TaskTime:
        compare_start = baseline_task.TaskTime.ScheduleStart
        compare_finish = baseline_task.TaskTime.ScheduleFinish
    else:
        compare_start = schedule_start
        compare_finish = schedule_finish
    task_name = task.Name or "Unnamed"
    task_name = task_name.replace("\n", "")
    data = {
        "GlobalId": task.GlobalId,
        "pID": task.id(),
        "pName": task_name,
        "pCaption": task_name,
        "pStart": schedule_start,
        "pEnd": schedule_finish,
        "pPlanStart": compare_start,
        "pPlanEnd": compare_finish,
        "pMile": 1 if task.IsMilestone else 0,
        "pRes": string_resources,
        "pComp": 0,
        "pGroup": 1 if task.IsNestedBy else 0,
        "pParent": task.Nests[0].RelatingObject.id() if task.Nests else 0,
        "pOpen": 1,
        "pCost": 1,
        "ifcduration": (
            str(ifcopenshell.util.date.ifc2datetime(task_time.ScheduleDuration))
            if (task_time and task_time.ScheduleDuration)
            else ""
        ),
        "resourceUsage": resources_usage,
        "status": task.Status or "",
        "priority": task.Priority or "",
        "inputs": get_task_inputs(task),
        "outputs": get_task_outputs(task),
        "predecessors": [
            {
                "taskId": rel.RelatingProcess.id(),
                "type": sequence_type_map[rel.SequenceType],
            }
            for rel in task.IsSuccessorFrom or []
        ],
        "successors": [
            {
                "taskId": rel.RelatedProcess.id(),
                "type": sequence_type_map[rel.SequenceType],
            }
            for rel in task.IsPredecessorTo or []
        ],
        "dependencies": [
            {
                "toTaskId": rel.RelatingProcess.id(),
                "type": sequence_type_map[rel.SequenceType],
            }
            for rel in task.IsSuccessorFrom or []
        ],
    }
    if task_time and task_time.IsCritical:
        data["pClass"] = "gtaskred"
    elif data["pGroup"]:
        data["pClass"] = "ggroupblack"
    elif data["pMile"]:
        data["pClass"] = "gmilestone"
    else:
        data["pClass"] = "gtaskblue"

    data["pDepend"] = ",".join(
        [f"{rel.RelatingProcess.id()}{sequence_type_map[rel.SequenceType]}" for rel in task.IsSuccessorFrom or []]
    )

    return data

def add(model, name):
    return ifcopenshell.api.sequence.add_work_schedule(model, name=name or "Olympus Schedule")


def get_critical_path_tasks(work_schedule):
    tasks = get_tasks(work_schedule)
    return [task.id() for task in tasks if task.TaskTime and task.TaskTime.IsCritical]

def run_add_task(model, work_schedule_id, parent_task_id=None, name=None, start_date=None, duration=None):
    
    work_schedule = model.by_guid(work_schedule_id)

    if (parent_task_id):
        parent_task = model.by_guid(parent_task_id)

    task = ifcopenshell.api.sequence.add_task(
        model, 
        work_schedule=work_schedule,
        parent_task=parent_task if parent_task_id else None,
        name=name or "New Task"
    )

    return task


def get_animation_data(work_schedule):
    tasks = get_tasks(work_schedule)
    animation_data = {
        "scheduleId": work_schedule.GlobalId,
        "scheduleName": work_schedule.Name or "Unnamed",
        "startDate": work_schedule.StartTime or None,
        "endDate": work_schedule.FinishTime or None,
        "tasks": [],
        "totalOutputs": 0,
        "totalInputs": 0
    }
    
    for task in tasks:
        task_time = task.TaskTime
        if not task_time:
            continue
            
        schedule_start = task_time.ScheduleStart if task_time else None
        schedule_finish = task_time.ScheduleFinish if task_time else None
        
        if not schedule_start or not schedule_finish:
            continue
        
        outputs = get_task_outputs(task)
        inputs = get_task_inputs(task)
        
        animation_data["totalOutputs"] += len(outputs)
        animation_data["totalInputs"] += len(inputs)
        
        predefined_type = "NOTDEFINED"
        if hasattr(task, "PredefinedType") and task.PredefinedType:
            predefined_type = task.PredefinedType
        elif hasattr(task, "ObjectType") and task.ObjectType:
            predefined_type = task.ObjectType.upper()
        
        task_data = {
            "taskId": task.GlobalId,
            "taskName": task.Name or "Unnamed",
            "startDate": schedule_start,
            "endDate": schedule_finish,
            "predefinedType": predefined_type,
            "status": task.Status or "NOTSTARTED",
            "isMilestone": bool(task.IsMilestone),
            "outputs": outputs,
            "inputs": inputs
        }
        animation_data["tasks"].append(task_data)
    
    return json.dumps(animation_data)


def get_elements_at_date(work_schedule, target_date):
    if isinstance(target_date, str):
        target_date = date_parser.parse(target_date)
    
    tasks = get_tasks(work_schedule)
    result = {
        "date": target_date.isoformat(),
        "activeElements": [],
        "completedElements": [],
        "upcomingElements": []
    }
    
    for task in tasks:
        task_time = task.TaskTime
        if not task_time or not task_time.ScheduleStart or not task_time.ScheduleFinish:
            continue
        
        task_start = date_parser.parse(task_time.ScheduleStart) if isinstance(task_time.ScheduleStart, str) else task_time.ScheduleStart
        task_end = date_parser.parse(task_time.ScheduleFinish) if isinstance(task_time.ScheduleFinish, str) else task_time.ScheduleFinish
        
        outputs = get_task_outputs(task)
        inputs = get_task_inputs(task)
        
        predefined_type = "NOTDEFINED"
        if hasattr(task, "PredefinedType") and task.PredefinedType:
            predefined_type = task.PredefinedType
        elif hasattr(task, "ObjectType") and task.ObjectType:
            predefined_type = task.ObjectType.upper()
        
        element_info = {
            "taskId": task.GlobalId,
            "taskName": task.Name or "Unnamed",
            "predefinedType": predefined_type,
            "status": task.Status or "NOTSTARTED",
            "startDate": task_time.ScheduleStart,
            "endDate": task_time.ScheduleFinish
        }
        
        is_active = task_start <= target_date <= task_end
        is_completed = target_date > task_end
        is_upcoming = target_date < task_start
        
        for output in outputs:
            elem_data = {
                **element_info,
                "GlobalId": output["GlobalId"],
                "Name": output["Name"],
                "relationType": "output"
            }
            if is_active:
                result["activeElements"].append(elem_data)
            elif is_completed:
                result["completedElements"].append(elem_data)
        
        for inp in inputs:
            elem_data = {
                **element_info,
                "GlobalId": inp["GlobalId"],
                "Name": inp["Name"],
                "relationType": "input"
            }
            if is_active:
                result["activeElements"].append(elem_data)
            elif is_completed:
                result["completedElements"].append(elem_data)
    
    return json.dumps(result)


def get_schedule_date_range(work_schedule):
    start_date = work_schedule.StartTime
    end_date = work_schedule.FinishTime
    
    if not start_date or not end_date:
        tasks = get_tasks(work_schedule)
        min_date = None
        max_date = None
        
        for task in tasks:
            task_time = task.TaskTime
            if not task_time:
                continue
            
            if task_time.ScheduleStart:
                task_start = date_parser.parse(task_time.ScheduleStart) if isinstance(task_time.ScheduleStart, str) else task_time.ScheduleStart
                if min_date is None or task_start < min_date:
                    min_date = task_start
            
            if task_time.ScheduleFinish:
                task_end = date_parser.parse(task_time.ScheduleFinish) if isinstance(task_time.ScheduleFinish, str) else task_time.ScheduleFinish
                if max_date is None or task_end > max_date:
                    max_date = task_end
        
        if min_date:
            start_date = min_date.isoformat() if isinstance(min_date, datetime) else str(min_date)
        if max_date:
            end_date = max_date.isoformat() if isinstance(max_date, datetime) else str(max_date)
    
    return json.dumps({
        "startDate": start_date,
        "endDate": end_date
    })


def get_task_predefined_type(task):
    if hasattr(task, "PredefinedType") and task.PredefinedType:
        return task.PredefinedType
    if hasattr(task, "ObjectType") and task.ObjectType:
        return task.ObjectType.upper()
    return "NOTDEFINED"