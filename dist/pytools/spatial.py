import json
from ifcopenshell.util.element import get_parts, get_container, get_decomposition

def get_spatial_hierarchy(model):
    project = model.by_type('IfcProject')[0]
    hierarchy = {}
    hierarchy[project.GlobalId] = {
        'id': project.id(),
        'name': project.Name,
        'type': project.is_a(),
        'children': {},
        'unsorted': [],
    }

    def build_hierarchy(element, hierarchy_node):
        children = get_decomposition(element, is_recursive=False)
        for child in children:
            child_node = {
                'id': child.id(),
                'name': child.Name,
                'type': child.is_a(),
                'children': {}
            }
            hierarchy_node[child.GlobalId] = child_node
            build_hierarchy(child, child_node['children'])

    build_hierarchy(project, hierarchy[project.GlobalId]['children'])
    return hierarchy


def get_spatial_structure(model):
    def find_container(structure, structuralElementGlobalId):
        for globalId, data in structure.items():
            if globalId == structuralElementGlobalId:
                return data
            child_container = find_container(data['children'], structuralElementGlobalId)
            if child_container:
                return child_container
        return None
    
    elements = set(model.by_type('IfcElement'))
    spatial_hierarchy = get_spatial_hierarchy(model)
    for element in elements:
        element_data = {
            'id': element.id(),
            'name': element.Name,
            'type': element.is_a(),
            'container': True,
            'children': {}
        }
        container = get_container(element)
        node = find_container(spatial_hierarchy, container.GlobalId) if container else None
        if node is not None:
            node['children'][element.GlobalId] = element_data
        else:
            projectGlobalId = next(iter(spatial_hierarchy))
            spatial_hierarchy[element.GlobalId] = element_data
            spatial_hierarchy[projectGlobalId]['unsorted'].append(element.GlobalId)

    return spatial_hierarchy


def get_project_tree(model):
    return json.dumps(get_spatial_structure(model))

def get_element_decomposition_GlobalIds(element):
    children = get_decomposition(element)
    globalIds = [child.GlobalId for child in children]
    classes = [child.is_a() for child in children]
    print(f'Decomposition of element {element.is_a()}: {classes}')
    return globalIds

def get_contained_recursive(element):
    children = get_decomposition(element)
    globalIds = [child.GlobalId for child in children]
    return globalIds
