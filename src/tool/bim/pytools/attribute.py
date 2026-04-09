import json
from typing import Any, Union
from pprint import pprint

import ifcopenshell.util.doc as doc_util
import ifcopenshell.util.attribute as attribute_util


from ifcopenshell.api.attribute import edit_attributes
import ifcopenshell

def get_primitive_data_type(schema_declaration, entity_class) -> list[tuple[str, str, str]]:
    taskcolumns_enum = []
    assert (entity := schema_declaration.declaration_by_name(entity_class).as_entity())
    for attribute in entity.all_attributes():
        primitive_type = attribute_util.get_primitive_type(attribute)
        taskcolumns_enum.append(f"{attribute.name()} - {primitive_type}")
    return taskcolumns_enum


class AttributeHelper:
    classification_model = None  
    _pset_qto_cache = None

    def __init__(self, schema_version='IFC4'):
        
        self._pset_qto_cache = None
        self.schema = ifcopenshell.ifcopenshell_wrapper.schema_by_name(schema_version)
        self.schema_version = schema_version  # Default, could be detected from schema

    def reset(self):
        """Reset the helper state"""
        self.schema = None
        self.classification_model = None  
        self._pset_qto_cache = None 


    def get_attributes(self, model, GlobalId):
        assert (element := model.by_guid(GlobalId))
        assert (entity := element.wrapped_data.declaration().as_entity())
        entity_attributes = entity.all_attributes()
        info = element.get_info()
        print(info)
        attributes = []
        for attribute in entity_attributes:
            result = self._get_attribute(attribute, info)
            attributes.append(result)
        # print(attributes)
        return json.dumps({
            'id': element.id(),
            'GlobalId': element.GlobalId if hasattr(element, 'GlobalId') else None,
            'class': element.is_a(),
            'attributes': attributes,
        })


    def run_edit_attributes(self, model, GlobalId, attribute_values):
        if not GlobalId:
            return False

        if not model:
            return False
            
        if not attribute_values:
            return False

        if hasattr(attribute_values, 'to_py'):
            attribute_values = attribute_values.to_py()
        elif not isinstance(attribute_values, dict):
            attribute_values = dict(attribute_values)

        entity = model.by_guid(GlobalId)
        if not entity:
            return False

        edit_attributes(model, product=entity, attributes=attribute_values)
        
        return True


    def _get_attribute(self,
        attribute,
        data: dict[str, Any]
    ) -> None:
        data_type = attribute_util.get_primitive_type(attribute)
        # Complex data types (aggregates and entities) are handled only by callback.
        if data_type == ("list", "string"):
            data_type = "list[string]"
        elif data_type == ("list", "entity"):
            data_type = "list[entity]"
        elif data_type == ("list", "float"):
            data_type = "list[float]"
        elif data_type == ("list", "integer"):
            data_type = "list[integer]"
        elif isinstance(data_type, tuple) and len(data_type) == 2 and data_type[0] == "list":
            # Handle any other list types generically (e.g., list of enums, etc.)
            data_type = f"list[{data_type[1]}]"
        # Handle SELECT types that can be entities (like IfcAxis2Placement)
        elif isinstance(data_type, tuple) and data_type[0] == "select":
            # Check if any of the select options are entities
            if len(data_type) > 1 and isinstance(data_type[1], tuple):
                if "entity" in data_type[1]:
                    data_type = "entity"  # Treat SELECT containing entity as entity

        attr_name = attribute.name()
        
        # Get the actual value from the data dictionary
        value = data.get(attr_name)

        pointers = []
        if data_type == 'entity':
            if type(value) == ifcopenshell.entity_instance:
                pointers.append({
                    "id": value.id(),
                    "name": str(value),
                    "type": value.is_a()
                })
            elif "list" in data_type:
                for item in value or []:
                    if isinstance(item, ifcopenshell.entity_instance):
                        pointers.append({
                            "id": item.id(),
                            "name": str(item),
                            "type": item.is_a()
                        })

        result = {
            "name": attr_name,
            "dataType": data_type if isinstance(data_type, str) else "",
            "pointers": pointers,
            "isNull": value is None,
            "isOptional": attribute.optional(),
            "ifcClass": data["type"],
            "ifcType": str(attribute.type_of_attribute()),  # eg IfcDate, IfcDateTime
            "value": value,
        }

        # Handle entity type attributes (like ObjectPlacement, Representation, etc.)
        if data_type == "entity":
            if value is not None and isinstance(value, ifcopenshell.entity_instance):
                result["entity_value"] = {
                    "id": value.id(),
                    "type": value.is_a(),
                    "info": value.get_info()
                }
                result["string_value"] = str(value)
            elif value is not None:
                result["string_value"] = str(value)
        elif data_type == "list[entity]":
            if value is not None:
                result["entity_list_value"] = []
                for i, item in enumerate(value):
                    if isinstance(item, ifcopenshell.entity_instance):
                        result["entity_list_value"].append({
                            "id": item.id(),
                            "type": item.is_a(),
                            "info": item.get_info()
                        })
                result["string_value"] = str(value)

        if data_type == "string":
            result["string_value"] = str(data[attribute.name()]).replace("\n", "\\n") if not result.get("isNull") else ""
            attribute_type = attribute.type_of_attribute()
            if attribute_type._is("IfcURIReference"):
                result["special_type"] = "URI"
            elif attribute.type_of_attribute()._is("IfcDate"):
                result["special_type"] = "DATE"
            elif attribute.type_of_attribute()._is("IfcDateTime"):
                result["special_type"] = "DATETIME"
        elif data_type == "boolean":
            result["bool_value"] = False if result.get("isNull") else bool(data[attribute.name()])
        elif data_type == "integer":
            result["int_value"] = 0 if result.get("isNull") else int(data[attribute.name()])
        elif data_type == "float":
            attribute_type = attribute.type_of_attribute()
            if attribute_type._is("IfcLengthMeasure"):
                result["special_type"] = "LENGTH"
            elif attribute_type._is("IfcForceMeasure"):
                result["special_type"] = "FORCE"
            result["float_value"] = 0.0 if result.get("isNull") else float(data[attribute.name()])
        elif data_type == "enum":
            attribute_type = attribute.type_of_attribute()
            is_logical = str(attribute_type) == "<type IfcLogical: <logical>>"
            enum_value = data[attribute.name()]
            if is_logical:
                result["special_type"] = "LOGICAL"
                enum_items = ("TRUE", "FALSE", "UNKNOWN")
                result["enum_items"] = json.dumps(enum_items)
                if enum_value is not None and enum_value != "UNKNOWN":
                    # IfcOpenShell returns bool if IfcLogical is True/False.
                    enum_value = "TRUE" if enum_value else "FALSE"
            else:
                enum_items = attribute_util.get_enum_items(attribute)
                result["enum_items"] = json.dumps(enum_items)
                # add_attribute_enum_items_descriptions(data, enum_items)
            if enum_value is not None:
                result["enum_value"] = enum_value
        elif data_type == "list[string]":
            value: Union[list[str], None] = data[attribute.name()]
            if value:
                for item in value:
                    result["subitems_values"].append({"name": str(item).replace("\n", "\\n")})
        elif data_type == "list[float]":
            value: Union[list[float], None] = data[attribute.name()]
            if value:
                result["float_list_value"] = list(value)
                result["string_value"] = str(list(value))
        elif data_type == "list[integer]":
            value: Union[list[int], None] = data[attribute.name()]
            if value:
                result["int_list_value"] = list(value)
                result["string_value"] = str(list(value))

        result["description"] = self._get_attribute_description(data["type"], attribute)
        constraints = self._get_attribute_min_max(attribute, data["type"])
        result = {**result, **constraints}


        return result

    def _get_attribute_description(self, ifc_class, attribute_ifc: Union[ifcopenshell.entity_instance, None]) -> None:
        """
        :param attribute_ifc: IFC Entity to use as a fallback source of description (using "Description" attribute).
        """
        if not ifc_class or not attribute_ifc.name():
            return
        description = ""
        try:
            description = doc_util.get_attribute_doc(self.schema_version, ifc_class, attribute_ifc.name())
        except RuntimeError:  # It's not an Entity Attribute. Let's try a Property Set attribute.
            doc = doc_util.get_property_doc(self.schema_version, ifc_class, attribute_ifc.name())
            if doc:
                description = doc.get("description", "")
            else:
                if attribute_ifc is not None:
                    description = getattr(attribute_ifc, "Description", "")
        return description
    
    def _get_attribute_min_max(self, attribute, ifc_class) -> None:
        ATTRIBUTE_MIN_MAX_CONSTRAINTS = {"IfcMaterialLayer": {"Priority": {"value_min": 0, "value_max": 100}}}

        attribute_constraints = {}

        if ifc_class in ATTRIBUTE_MIN_MAX_CONSTRAINTS:
            constraints = ATTRIBUTE_MIN_MAX_CONSTRAINTS[ifc_class].get(attribute.name(), {})
            for constraint, value in constraints.items():
                attribute_constraints[constraint] = value
                attribute_constraints[constraint + "_constraint"] = True
        attribute_type = attribute.type_of_attribute()

        if attribute_type._is("IfcPositiveLengthMeasure") or attribute_type._is("IfcNonNegativeLengthMeasure"):
            attribute_constraints["value_min"] = 0.0
            attribute_constraints["value_min_constraint"] = True

        return attribute_constraints