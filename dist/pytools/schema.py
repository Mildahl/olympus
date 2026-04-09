def get_inheritance_hierarchy(schema, entity_type):
    if not schema:
        return [entity_type]

    hierarchy = [entity_type]

    try:
        declaration = schema.declaration_by_name(entity_type)
        if declaration and declaration.as_entity():
            entity = declaration.as_entity()
            current = entity.supertype()

            while current:
                hierarchy.append(current.name())
                current = current.supertype()

    except Exception as e:
        print(f"Error getting inheritance hierarchy for {entity_type}: {e}")

    return hierarchy

def is_subtype_of( entity_type: str, supertype: str) -> bool:
    hierarchy = get_inheritance_hierarchy(entity_type)
    return supertype in hierarchy
