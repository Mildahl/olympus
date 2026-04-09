from typing import Dict, List, Union, Optional, Any, Set
import json

import ifcopenshell

import ifcopenshell.api.pset
import ifc5d.qto

from ifcopenshell.util.attribute import get_primitive_type
from ifcopenshell.util.pset import PsetQto
from ifcopenshell.util.doc import get_property_doc
from ifcopenshell.util.element import get_psets, get_pset
from ifcopenshell.util.unit import get_property_unit, get_unit_symbol, get_full_unit_name


def calculate_all(model):

    is_ifc4x3 = model.schema == "IFC4X3"

    qto_rules = ifc5d.qto.rules
    rules = next(rule for rule_id, rule in qto_rules.items() if rule_id.startswith("IFC4X3") == is_ifc4x3 and not rule_id.endswith('Blender'))

    # Quantity Take Off
    elements = model.by_type('IfcElement')
    results = ifc5d.qto.quantify(model, elements, rules)
    ifc5d.qto.edit_qtos(model, results)

def calculate_element_quantities(model, element_guids):

    print(model.schema)
    print(element_guids)

    elements = set()
    for guid in element_guids:
        element = model.by_guid(guid)
        if element:
            elements.add(element)

    if not elements:
        return {}

    is_ifc4x3 = model.schema == "IFC4X3"
    
    qto_rules = ifc5d.qto.rules

    rules = next(rule for rule_id, rule in qto_rules.items() if rule_id.startswith("IFC4X3") == is_ifc4x3 and not rule_id.endswith('Blender'))

    if not rules:
        return {}

    results = ifc5d.qto.quantify(model, elements, rules)
    ifc5d.qto.edit_qtos(model, results)

def get_available_calculators() -> List[str]:
    """
    Get list of available calculators in ifc5d.

    Returns:
        List of calculator names
    """
    return list(ifc5d.qto.calculators.keys())

def get_available_rules() -> List[str]:
    """
    Get list of available quantity rule sets in ifc5d.

    Returns:
        List of rule set names
    """
    return list(ifc5d.qto.rules.keys())

def get_supported_quantities(model: ifcopenshell.file,
                           element_type: str) -> List[str]:
    """
    Get supported quantities for an element type using IfcOpenShell calculator.

    Args:
        model: IFC file instance
        element_type: IFC class name (e.g., "IfcWall")

    Returns:
        List of supported quantity names
    """
    rules = ifc5d.qto.rules.get(f"{model.schema_identifier}QtoBaseQuantities", {})
    if not rules:
        rules = ifc5d.qto.rules.get("IFC4QtoBaseQuantities", {})

    calculator_rules = rules.get("calculators", {}).get("IfcOpenShell", {})
    element_rules = calculator_rules.get(element_type, {})

    quantities = []
    for qto_name, qty_dict in element_rules.items():
        quantities.extend(qty_dict.keys())

    return list(set(quantities))

def calculate_single_quantity(model: ifcopenshell.file,
                          quantity_entity: ifcopenshell.entity_instance) -> bool:
    """
    Calculate and update the value of a single quantity entity.

    Args:
        model: IFC file instance
        quantity_entity: The IFC quantity entity (e.g., IfcPhysicalSimpleQuantity)

    Returns:
        True if successful, False otherwise
    """
    try:
        if not quantity_entity:
            return False

        # Get the parent element that owns this quantity
        element = None
        for rel in model.get_inverse(quantity_entity):
            if rel.is_a("IfcElementQuantity"):
                for rel2 in model.get_inverse(rel):
                    if rel2.is_a("IfcRelDefinesByProperties"):
                        element = rel2.RelatedObjects[0]
                        break
                if element:
                    break

        if not element:
            print("Could not find parent element for quantity")
            return False

        # Get quantity name
        quantity_name = quantity_entity.Name if hasattr(quantity_entity, 'Name') else quantity_entity[0]

        # Calculate the quantity using ifc5d
        results = calculate_element_quantities(model, element.id())

        if not results or element.id() not in results:
            print(f"No calculation results found for element {element.id()}")
            return False

        # Find the calculated value
        calculated_value = None
        for qto_name, quantities in results[element.id()].items():
            if quantity_name in quantities:
                calculated_value = quantities[quantity_name]
                break

        if calculated_value is None:
            print(f"Quantity {quantity_name} not found in calculation results")
            return False

        # Update the quantity entity
        if quantity_entity.is_a("IfcPhysicalSimpleQuantity"):
            quantity_entity[3] = calculated_value
            return True
        else:
            print(f"Unsupported quantity type for calculation: {quantity_entity.is_a()}")
            return False

    except Exception as e:
        print(f"Error calculating quantity: {e}")
        return False

def add_property_set(model: ifcopenshell.file,
                    element_id: int,
                    pset_name: str) -> Optional[ifcopenshell.entity_instance]:
    """
    Add a new property set to an element.

    Args:
        model: IFC file instance
        element_id: Element ID
        pset_name: Name of the property set

    Returns:
        The created property set entity or None if failed
    """
    try:
        element = model.by_id(element_id)
        if not element:
            return None

        return ifcopenshell.api.pset.add_pset(model, product=element, name=pset_name)
    except Exception as e:
        print(f"Error adding property set: {e}")
        return None

def edit_property_set(model: ifcopenshell.file,
                     pset_id: int,
                     properties: Dict[str, Any]) -> bool:
    """
    Edit properties in a property set or quantities in a quantity set for an element.

    Args:
        model: IFC file instance
        pset_id: ID of the property set or quantity set
        properties: Dictionary of property/quantity names to new values

    Returns:
        True if successful, False otherwise
    """

    pset = model.by_guid(pset_id) if isinstance(pset_id, int) else pset
    if not pset:
        return False

    if hasattr(properties, 'to_py'):
        properties = properties.to_py()
    elif hasattr(properties, '__iter__') and not isinstance(properties, dict):
        properties = dict(properties)

    if pset.is_a("IfcPropertySet"):
        ifcopenshell.api.pset.edit_pset(model, pset=pset, properties=properties)
    elif pset.is_a("IfcElementQuantity"):
        ifcopenshell.api.pset.edit_qto(model, qto=pset, properties=properties)
    else:
        return False
    return True


def remove_property_set(model: ifcopenshell.file,
                       element_id: int,
                       pset_name: str) -> bool:
    """
    Remove a property set from an element.

    Args:
        model: IFC file instance
        element_id: Element ID
        pset_name: Name of the property set

    Returns:
        True if successful, False otherwise
    """
    try:
        element = model.by_id(element_id)
        if not element:
            return False

        # Find the property set
        existing_pset = get_pset(element, pset_name)
        if not existing_pset:
            return False

        pset = model.by_id(existing_pset['id'])
        ifcopenshell.api.pset.remove_pset(model, product=element, pset=pset)
        return True

    except Exception as e:
        print(f"Error removing property set: {e}")
        return False


def get_element_psets(model: ifcopenshell.file, element_id: int) -> Dict[str, Dict[str, Any]]:
    """
    Get all property sets for an element.

    Args:
        model: IFC file instance
        element_id: Element ID

    Returns:
        Dictionary of property sets with their properties
    """
    element = model.by_id(element_id)
    if not element:
        return {}

    return ifcopenshell.util.element.get_psets(element, psets_only=True)


def get_property_value(model: ifcopenshell.file,
                      element_id: int,
                      pset_name: str,
                      property_name: str) -> Optional[Any]:
    """
    Get a specific property value from an element's property set.

    Args:
        model: IFC file instance
        element_id: Element ID
        pset_name: Name of the property set
        property_name: Name of the property

    Returns:
        Property value or None if not found
    """
    element = model.by_id(element_id)
    if not element:
        return None

    pset_data = get_pset(element, pset_name)
    if not pset_data:
        return None

    return pset_data.get(property_name)


def edit_single_property(model: ifcopenshell.file,
                        element_id: int,
                        pset_name: str,
                        property_name: str,
                        new_value: Any) -> bool:
    """
    Edit a single property in a property set.

    Args:
        model: IFC file instance
        element_id: Element ID
        pset_name: Name of the property set
        property_name: Name of the property
        new_value: New value for the property

    Returns:
        True if successful, False otherwise
    """
    return edit_property_set(model, element_id, pset_name, {property_name: new_value})


def get_pset_templates(model: ifcopenshell.file, element_type: str) -> List[str]:
    """
    Get available property set templates for an element type.

    Args:
        model: IFC file instance
        element_type: IFC class name (e.g., "IfcWall")

    Returns:
        List of available property set template names
    """
    try:
        # Use PsetQto instance like in attribute.py
        pset_qto = PsetQto(model.schema_identifier)

        # Get applicable property set names
        applicable_psets = pset_qto.get_applicable_names(
            ifc_class=element_type,
            pset_only=True,
            schema=model.schema
        )

        return list(applicable_psets) if applicable_psets else []

    except Exception as e:
        print(f"Error getting pset templates: {e}")
        return []


def get_qto_templates(model: ifcopenshell.file, element_type: str) -> List[str]:
    """
    Get available quantity set templates for an element type.

    Args:
        model: IFC file instance
        element_type: IFC class name (e.g., "IfcWall")

    Returns:
        List of available quantity set template names
    """
    try:
        # Use PsetQto instance like in attribute.py
        pset_qto =PsetQto(model.schema_identifier)

        # Get applicable quantity set names
        applicable_qtos = pset_qto.get_applicable_names(
            ifc_class=element_type,
            qto_only=True,
            schema=model.schema
        )

        return list(applicable_qtos) if applicable_qtos else []

    except Exception as e:
        print(f"Error getting qto templates: {e}")
        return []


def load_template_quantities(model: ifcopenshell.file, qto_template_name: str) -> Optional[Dict[str, Any]]:
    """
    Load template quantities from a quantity set template name.

    Args:
        model: IFC file instance
        qto_template_name: Name of the quantity set template (e.g., "Qto_WallBaseQuantities")

    Returns:
        Dictionary containing template information and quantities, or None if not found
    """
    try:
        # Get the PsetQto instance
        pset_qto = PsetQto(model.schema_identifier)

        # Get the template by name
        template = pset_qto.get_by_name(qto_template_name)
        if not template:
            print(f"Template {qto_template_name} not found")
            return None

        # Extract quantity information from the template
        quantities = {}
        if hasattr(template, 'HasPropertyTemplates') and template.HasPropertyTemplates:
            for qty_template in template.HasPropertyTemplates:
                qty_name = qty_template.Name if hasattr(qty_template, 'Name') else 'Unnamed'
                qty_info = {
                    'name': qty_name,
                    'description': qty_template.Description if hasattr(qty_template, 'Description') else '',
                    'template_type': qty_template.TemplateType if hasattr(qty_template, 'TemplateType') else 'Q_LENGTH',
                    'primary_measure_type': getattr(qty_template, 'PrimaryMeasureType', 'IfcLengthMeasure'),
                    'measure_class': str(getattr(qty_template, 'PrimaryMeasureType', 'IfcLabel')) if hasattr(qty_template, 'PrimaryMeasureType') else 'IfcLabel',
                    'class': qty_template.is_a() if hasattr(qty_template, 'is_a') else 'IfcQuantityTemplate'
                }
                quantities[qty_name] = qty_info

        return {
            'template_name': qto_template_name,
            'template_type': getattr(template, 'TemplateType', 'QTO_OCCURRENCEDRIVEN'),
            'applicable_entity': getattr(template, 'ApplicableEntity', ''),
            'quantities': quantities
        }

    except Exception as e:
        print(f"Error loading template quantities: {e}")
        return None


def add_template_quantities(model: ifcopenshell.file,
                          element_id: int,
                          qto_template_name: str) -> Optional[ifcopenshell.entity_instance]:
    """
    Add a quantity set to an element using a template.

    Args:
        model: IFC file instance
        element_id: Element ID to add quantities to
        qto_template_name: Name of the quantity set template

    Returns:
        The created quantity set entity or None if failed
    """
    try:
        element = model.by_id(element_id)
        if not element:
            return None

        # Load the template to verify it exists
        template_info = load_template_quantities(model, qto_template_name)
        if not template_info:
            return None

        # Add the quantity set
        qto = ifcopenshell.api.pset.add_qto(model, product=element, name=qto_template_name)

        # Add empty quantities based on the template
        quantities = {}
        for qty_name, qty_info in template_info['quantities'].items():
            # Initialize with None - will be calculated later
            quantities[qty_name] = None

        if quantities:
            ifcopenshell.api.pset.edit_qto(model, qto=qto, properties=quantities)

        return qto

    except Exception as e:
        print(f"Error adding template quantities: {e}")
        return None


def calculate_and_set_quantities(model: ifcopenshell.file,
                               element_id: int,
                               qto_name: str) -> bool:
    """
    Calculate quantities for an element and set them in the specified quantity set.

    Args:
        model: IFC file instance
        element_id: Element ID
        qto_name: Name of the quantity set to update

    Returns:
        True if successful, False otherwise
    """
    try:
        element = model.by_id(element_id)
        if not element:
            return False

        # Calculate quantities
        results = calculate_element_quantities(model, element_id)
        if not results or element_id not in results:
            print(f"No calculation results for element {element_id}")
            return False

        # Find the quantity set
        qto = None
        for rel in model.get_inverse(element):
            if rel.is_a("IfcRelDefinesByProperties"):
                for prop_def in rel.RelatingPropertyDefinition:
                    if prop_def.is_a("IfcElementQuantity") and hasattr(prop_def, 'Name') and prop_def.Name == qto_name:
                        qto = prop_def
                        break
                if qto:
                    break

        if not qto:
            print(f"Quantity set {qto_name} not found for element {element_id}")
            return False

        # Update quantities with calculated values
        quantities_to_update = {}
        calculated_qtos = results[element_id]

        for qto_set_name, qty_dict in calculated_qtos.items():
            if qto_set_name in qto_name:  # Match the QTO set name
                for qty_name, qty_value in qty_dict.items():
                    quantities_to_update[qty_name] = qty_value

        if quantities_to_update:
            ifcopenshell.api.pset.edit_qto(model, qto=qto, properties=quantities_to_update)
            return True
        else:
            print(f"No quantities to update in {qto_name}")
            return False

    except Exception as e:
        print(f"Error calculating and setting quantities: {e}")
        return False


def get_element_qtos(model: ifcopenshell.file, element_id: int) -> Dict[str, Dict[str, Any]]:
    """
    Get all quantity sets for an element.

    Args:
        model: IFC file instance
        element_id: Element ID

    Returns:
        Dictionary of quantity sets with their quantities
    """
    element = model.by_id(element_id)
    if not element:
        return {}

    return ifcopenshell.util.element.get_psets(element, qtos_only=True)


def get_qto_value(model: ifcopenshell.file,
                 element_id: int,
                 qto_name: str,
                 quantity_name: str) -> Optional[Any]:
    """
    Get a specific quantity value from an element's quantity set.

    Args:
        model: IFC file instance
        element_id: Element ID
        qto_name: Name of the quantity set
        quantity_name: Name of the quantity

    Returns:
        Quantity value or None if not found
    """
    element = model.by_id(element_id)
    if not element:
        return None

    qto_data = get_pset(element, qto_name)
    if not qto_data:
        return None

    return qto_data.get(quantity_name)


def edit_single_quantity(model: ifcopenshell.file,
                        element_id: int,
                        qto_name: str,
                        quantity_name: str,
                        new_value: Any) -> bool:
    """
    Edit a single quantity in a quantity set.

    Args:
        model: IFC file instance
        element_id: Element ID
        qto_name: Name of the quantity set
        quantity_name: Name of the quantity
        new_value: New value for the quantity

    Returns:
        True if successful, False otherwise
    """
    return edit_qto_set(model, element_id, qto_name, {quantity_name: new_value})


def edit_qto_set(model: ifcopenshell.file,
                element_id: int,
                qto_name: str,
                quantities: Dict[str, Any]) -> bool:
    """
    Edit quantities in a quantity set for an element.

    Args:
        model: IFC file instance
        element_id: Element ID
        qto_name: Name of the quantity set
        quantities: Dictionary of quantity names to new values

    Returns:
        True if successful, False otherwise
    """
    try:
        element = model.by_id(element_id)
        if not element:
            return False

        # Check if quantity set exists
        existing_qto = get_pset(element, qto_name)
        if not existing_qto:
            # Create new quantity set if it doesn't exist
            qto = ifcopenshell.api.pset.add_qto(model, product=element, name=qto_name)
        else:
            qto = model.by_id(existing_qto['id'])

        # Edit the quantities
        ifcopenshell.api.pset.edit_qto(model, qto=qto, properties=quantities)
        return True

    except Exception as e:
        print(f"Error editing quantity set: {e}")
        return False


def remove_qto_set(model: ifcopenshell.file,
                  element_id: int,
                  qto_name: str) -> bool:

    try:
        element = model.by_id(element_id)
        if not element:
            return False

        # Find the quantity set
        existing_qto = get_pset(element, qto_name)
        if not existing_qto:
            return False

        qto = model.by_id(existing_qto['id'])
        ifcopenshell.api.pset.remove_pset(model, product=element, pset=qto)
        return True
    except Exception as e:
        print(f"Error removing quantity set: {e}")
        return False



def get_value_name(schema_declaration, measure_type) -> str:
    ifc_data_type = schema_declaration.declaration_by_name(measure_type)
    data_type = get_primitive_type(ifc_data_type)
    return data_type

class PsetHelper:
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

    def get_properties(self, model, element_id):
        import time
        metrics = {}
        start_time = time.time()
        element = model.by_id(element_id)
        if not element:
            return None
        
        ifc_class = element.is_a()

        properties = get_psets(element, psets_only=True, verbose=True)
        quantities = get_psets(element, qtos_only=True, verbose=True)

        # Only look up applicable templates and enrich for IfcObject entities.
        # IfcProject, IfcOwnerHistory, etc. have no PredefinedType and break template lookup.
        if not element.is_a("IfcObject"):
            result = {
                "type": ifc_class,
                "id": element_id,
                "GlobalId": element.GlobalId if hasattr(element, "GlobalId") else None,
                "psets": json.dumps(properties) if properties else "{}",
                "qtos": json.dumps(quantities) if quantities else "{}",
                "applicable_templates": json.dumps({"property_sets": [], "quantity_sets": []}),
                "metrics": json.dumps(metrics) if metrics else "{}",
            }
            return result

        predefined_type = getattr(element, "PredefinedType", None) or ""

        # Get applicable templates ONCE upfront
        start_time = time.time()
        applicable_templates = self.get_applicable_pset_templates(model, ifc_class, predefined_type)
        metrics["get_applicable_templates"] = time.time() - start_time

        # Enriche properties with quantity units, data type, and description
        start_time = time.time()
        enriched_properties, enriched_quantities = self._enrich_all_in_one_pass(
            model,
            properties,
            quantities,
            applicable_templates,
        )
        metrics["enrich_all"] = time.time() - start_time
        result = {
            "type": ifc_class,
            "id": element_id,
            "GlobalId": element.GlobalId if hasattr(element, "GlobalId") else None,
            "psets": json.dumps(enriched_properties) if enriched_properties else "{}",
            "qtos": json.dumps(enriched_quantities) if enriched_quantities else "{}",
            "applicable_templates": json.dumps(applicable_templates) if applicable_templates else "{}",
            "metrics": json.dumps(metrics) if metrics else "{}",
        }

        return result

    def get_property_description(self, model, pset_name, prop_name):
        """
        Get description for a property from buildingSMART documentation.
        
        :param pset_name: Name of the property set
        :param prop_name: Name of the property
        :return: Description string or empty string
        """
        if not model:
            return ""
        
        try:
            doc = get_property_doc(model.schema, pset_name, prop_name)
            if doc and isinstance(doc, dict):
                return doc.get('description', '')
            return ""
        except Exception as e:
            # Not a standard property or error retrieving
            return ""
   
    def get_applicable_pset_templates(self, model, ifc_class, predefined_type=''):
        """
        Get list of applicable property set and quantity set template NAMES for an IFC class.
        Returns simple list of names for dropdown display in frontend.
        
        OPTIMIZED: Uses cached PsetQto instance and leverages @lru_cache in get_applicable_names.
        
        :param ifc_class: The IFC class name (e.g., "IfcWall", "IfcDoor")
        :param predefined_type: Optional predefined type (e.g., "SOLIDWALL")
        :return: Dictionary with 'property_sets' and 'quantity_sets' lists of names
        """
        if not model:
            return {'property_sets': [], 'quantity_sets': []}
        pset_qto = self._get_pset_qto_instance()
        
        pset_names = pset_qto.get_applicable_names(
            ifc_class=ifc_class,
            predefined_type=predefined_type,
            pset_only=True,
            schema=model.schema
        )
        qto_names = pset_qto.get_applicable_names(
            ifc_class=ifc_class,
            predefined_type=predefined_type,
            qto_only=True,
            schema=model.schema
        )
        return {
            'property_sets': list(pset_names) if pset_names else [],
            'quantity_sets': list(qto_names) if qto_names else []
        }

    def get_measure_class(self, ifc_property):
        """
        Get the measure class of a property (e.g., IfcLengthMeasure, IfcAreaMeasure)
        
        :param ifc_property: The IFC property entity
        :return: Measure class name or None
        """
        if not ifc_property:
            return None
        
        try:
            prop_schema = ifc_property.wrapped_data.declaration().as_entity()
            measure_class = prop_schema.attribute_by_index(3).type_of_attribute().declared_type().name()
            return measure_class
        except Exception as e:
            print(f"Error getting measure class: {e}")
            return None

    def get_property_unit_info(self,model, prop_entity):
        if not prop_entity or not model:
            return None
        try:
            unit = get_property_unit(prop_entity, model)
            if unit:
                return {
                    'symbol': get_unit_symbol(unit),
                    'name': get_full_unit_name(unit),
                    'entity_id': unit.id()
                }
        except Exception as e:
            print(f"Error getting unit for property: {e}")
        
        return None

    def _enrich_all_in_one_pass(self, model, properties, quantities, applicable_templates):
        data_schema = {
            'is_set': False,
            'is_template': True,
            'description': '',
            'template_type': '',
            'primary_measure_type': '',
            'measure_class': '',
            'unit': None,
            'value': None,
        }
        if not model:
            return properties, quantities
    

        import time

        # Process both properties and quantities in the same loop for efficiency
        pset_names = list(properties.keys()) + list(quantities.keys())
        
        # Use cached PsetQto instance (OPTIMIZATION)
        start = time.time()
        pset_qto = self._get_pset_qto_instance()
        
        # Pre-fetch template definitions ONLY for psets/qtos that exist
        # This is the key optimization: don't fetch templates for ALL applicable psets,
        # only for the ones that actually exist on this element
        templates = {}
        for pset_name in set(pset_names):
            # Determine which dict this pset belongs to
            if pset_name in properties:
                current_properties = properties[pset_name]
            elif pset_name in quantities:
                current_properties = quantities[pset_name]
            else:
                continue
            
            template_properties = pset_qto.get_by_name(pset_name)
            if template_properties:
                template_props = self._extract_template_properties(template_properties)
                templates[pset_name] = template_props

                current_property_names = list(current_properties.keys())
                templates_property_names = list(template_props.keys())

                unset_properties = set(templates_property_names) - set(current_property_names)
                for unset_prop in unset_properties:
                    if unset_prop == 'id':
                        continue
                    current_properties[unset_prop] = dict(data_schema)


                for property_name, property_data in list(current_properties.items()):
                    if property_name == 'id':
                        pset = model.by_id(property_data)
                        current_properties['GlobalId'] = pset.GlobalId if hasattr(pset, 'GlobalId') else None
                        continue
                    data_type = ''
                    ifc_property = None
                    if not property_data.get('id'): #TODO # this property is unset, need to get project units based on measure type... 
                        unit = None # TODO
                        measure_class = None
                    else:
                        ifc_property = model.by_id(property_data['id'])
                        if ifc_property:
                            further_data_to_process = self._process(ifc_property)
                            # print(further_data_to_process)
                            measure_class = self.get_measure_class(ifc_property)
                            data_type = get_value_name(self.schema, measure_class)
                            unit = self.get_property_unit_info(model, ifc_property)
                        else:
                            measure_class = None
                            data_type = ''
                            unit = None

                    base_values = {k: v for k, v in data_schema.items() if k != 'value'}
                    property_template = template_props.get(property_name, {})
                    property_data.update(base_values)  # Start with base schema
                    property_data['is_set'] = property_name not in unset_properties
                    property_data['template_type'] = property_template.get('template_type', '')
                    property_data['primary_measure_type'] = data_type or property_template.get('primary_measure_type')
                    property_data['measure_class'] = str(measure_class) if measure_class else property_template.get('measure_class', '')
                    property_data['description'] = property_template.get('description', '')
                    property_data['unit'] = unit
                    property_data['class'] = ifc_property.is_a() if ifc_property else property_template.get('class', '')
                    property_data['is_custom'] = False  # Standard property from template
            elif not template_properties:
                for prop_name, property_data in list(current_properties.items()):
                    if prop_name == 'id':
                        pset = model.by_id(property_data)
                        current_properties['GlobalId'] = pset.GlobalId if hasattr(pset, 'GlobalId') else None
                        continue
                    property_data['is_set'] = True
                    property_data['is_custom'] = True  # Not in standard template
                    # DON'T overwrite the value - it comes from get_psets()
                    
                    ifc_property = model.by_id(property_data['id']) if property_data.get('id') else None
                    
                    if ifc_property:
                        prop_class = ifc_property.is_a()
                        property_data['class'] = prop_class
                        
                        # Handle IfcPropertyEnumeratedValue
                        if prop_class == 'IfcPropertyEnumeratedValue':
                            enum_reference = ifc_property.EnumerationReference
                            selected_enum_items = [v.wrappedValue for v in (ifc_property.EnumerationValues or ())]
                            
                            if enum_reference is not None:
                                enum_items = [v.wrappedValue for v in enum_reference.EnumerationValues]
                                if enum_items:
                                    property_data['enum_items'] = json.dumps(enum_items)
                            # If enum_reference is None, don't set enum_items, treat as string

                            # Get the measure class for data type
                            measure_class = self.get_measure_class(ifc_property)
                            if measure_class:
                                data_type = get_value_name(self.schema, measure_class)
                                property_data['primary_measure_type'] = data_type
                            else:
                                property_data['primary_measure_type'] = 'string'
                            property_data['measure_class'] = str(measure_class) if measure_class else ''

                        # Handle IfcPropertySingleValue
                        elif prop_class == 'IfcPropertySingleValue':
                            # Get value_type and convert to primitive type
                            value_type = property_data.get('value_type')
                            if not value_type and hasattr(ifc_property, 'NominalValue') and ifc_property.NominalValue:
                                value_type = ifc_property.NominalValue.is_a()
                                property_data['value_type'] = value_type
                            
                            if value_type:
                                ifc_data_type = self.schema.declaration_by_name(value_type)
                                data_type = get_primitive_type(ifc_data_type)
                                property_data['primary_measure_type'] = data_type
                                property_data['measure_class'] = str(ifc_data_type)
                            else:
                                property_data['primary_measure_type'] = 'string'
                    else:
                        property_data['class'] = ''
                    
                    unit = self.get_property_unit_info(model, ifc_property) if ifc_property else None
                    property_data['unit'] = unit or None
                    property_data['GlobalId'] = ifc_property.GlobalId if hasattr(ifc_property, 'GlobalId') else None
        return properties, quantities

    def _process(self, ifc_property):
        ifc_class = ifc_property.is_a()
        data = {}
        if ifc_class == "IfcPropertyEnumeratedValue":
            # Process enumerated value property
            data["name"] = ifc_property.Name
            data['property_class'] = ifc_class
            enum_reference = ifc_property.EnumerationReference
            selected_enum_items = [v.wrappedValue for v in (ifc_property.EnumerationValues or ())]
            if enum_reference is None:
                enum_items = selected_enum_items
            else:
                enum_items = [v.wrappedValue for v in enum_reference.EnumerationValues]
            data["enum_items"] = json.dumps(enum_items) if enum_items else None
            measure_class = self.get_measure_class(ifc_property)
            data_type = get_value_name(self.schema, measure_class)
            data['data_type'] = data_type
            # Set the actual selected value
            data['value'] = selected_enum_items[0] if selected_enum_items else None
        return data

    def _extract_template_properties(self, template):
        properties = {}
        data_schema = {
            'name': None,
            'description': None,
            'template_type': None,
            'primary_measure_type': None,
        }
        if not template or not template.HasPropertyTemplates:
            return {}
        for prop_template in template.HasPropertyTemplates:
            data = dict(data_schema)
            prop_name = prop_template.Name if hasattr(prop_template, 'Name') else 'Unnamed'
            data["name"] = prop_name
            data["description"] = prop_template.Description if hasattr(prop_template, 'Description') else ''
            # Get template type (e.g., P_SINGLEVALUE, P_BOUNDEDVALUE, etc.)
            data["template_type"] = prop_template.TemplateType if hasattr(prop_template, 'TemplateType') else 'P_SINGLEVALUE'
            # Get primary measure type if available
            data["primary_measure_type"] = self._get_prop_template_primitive_type(prop_template) or 'what'
            data['class'] = prop_template.is_a()
            data['measure_class'] = str(prop_template.PrimaryMeasureType) if prop_template.PrimaryMeasureType else 'IfcLabel'

            properties[prop_name] = data

        return properties
 
    def _get_prop_template_primitive_type(self, prop_template: ifcopenshell.entity_instance) -> str:
        if prop_template.TemplateType in ["Q_LENGTH", "Q_AREA", "Q_VOLUME", "Q_WEIGHT", "Q_TIME"]:
            return "float"
        elif prop_template.TemplateType == "Q_COUNT":
            return "integer"
        return get_primitive_type(
            self.schema.declaration_by_name(prop_template.PrimaryMeasureType or "IfcLabel")
        )

    def _get_pset_qto_instance(self):
        """
        Get cached PsetQto instance or create a new one.
        This avoids recreating the PsetQto instance on every call.
        """
        if self._pset_qto_cache is None:
            self._pset_qto_cache = PsetQto(self.schema_version)
        return self._pset_qto_cache
    
