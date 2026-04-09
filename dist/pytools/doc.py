import ifcopenshell.util.doc
import json

def get_attributes(schema_version,ifc_entity):
    entity_doc = ifcopenshell.util.doc.get_entity_doc(schema_version, ifc_entity)
    try:
        attributes_doc = entity_doc.get("attributes", {})
        return attributes_doc
    except Exception as e:
        print(f"Error retrieving attributes for {ifc_entity} in schema {schema_version}: {e}")
        return {}

def get_entity_description(schema_version:str, ifc_entity: str) -> str:

    print(f"Getting description for entity '{ifc_entity}' in schema '{schema_version}'")
    try:
        entity_doc = ifcopenshell.util.doc.get_entity_doc(schema_version, ifc_entity)
        return json.dumps(entity_doc)
    except Exception as e:
        print(f"Error retrieving entity doc for {ifc_entity} in schema {schema_version}: {e}")
        return "No description available."

def get_attribute_description(schema_version, entity_type: str, attribute_name: str) -> str:
    attribute_doc =  ifcopenshell.util.doc.get_attribute_doc(schema_version, entity_type, attribute_name) or  {}
    return attribute_doc.get("description", "No description available.")
    
def get_inverse_attributes(schema_version, ifc_entity):
    return ifcopenshell.util.doc.get_inverse_attributes(schema_version, ifc_entity)

def get_entity_relationships(schema_version, ifc_class, recursive=True):
    entity_doc = ifcopenshell.util.doc.get_entity_doc(schema_version, ifc_class, recursive)
    if not entity_doc:
        return {
            'success': False,
            'error': f'Entity {ifc_class} not found in {schema_version}',
            'relationships': {}
        }
    relationships = {}
    if 'attributes' in entity_doc:
        for attr_name, attr_desc in entity_doc['attributes'].items():
            is_inverse = _is_inverse_attribute(attr_desc)
            relationships[attr_name] = {
                'name': attr_name,
                'description': attr_desc,
                'is_inverse': is_inverse,
                'schema_defined': True,
                'assigned': False,
                'values': []
            }
    
    return {
        'success': True,
        'ifc_class': ifc_class,
        'schema_version': schema_version,
        'relationships': relationships,
        'description': entity_doc.get('description', ''),
        'predefined_types': entity_doc.get('predefined_types', {})
    }

def _is_inverse_attribute(description):
    inverse_keywords = [
        'reference to', 'references to', 'relationship', 'relates to',
        'connected', 'contained', 'fills', 'has', 'provides', 'referenced',
        'is defined by', 'is typed by', 'decomposes', 'has assignments',
        'is decomposed by', 'is nested by', 'nests'
    ]
    
    desc_lower = description.lower()
    return any(keyword in desc_lower for keyword in inverse_keywords)

def get_relationship_details(schema_version, ifc_class, attribute_name):
    attr_doc = ifcopenshell.util.doc.get_attribute_doc(schema_version, ifc_class, attribute_name)
    if attr_doc:
        return {
            'success': True,
            'ifc_class': ifc_class,
            'attribute_name': attribute_name,
            'description': attr_doc,
            'is_inverse': _is_inverse_attribute(attr_doc)
        }
    else:
        return {
            'success': False,
            'error': f'Attribute {attribute_name} not found for {ifc_class}',
            'description': ''
        }