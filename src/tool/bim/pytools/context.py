import ifcopenshell
class Context:
    models = {}
    model_settings = {
        "ifcopenshell_instance": None,
        "file_path": None,
        "unit_scale": 1.0,
    }
    def __init__(self):
        pass


    def get(self, model_name):

        model_name = model_name if model_name.endswith(".ifc") else f"{model_name}.ifc"
        if model_name in self.models:
            return self.models[model_name]["ifcopenshell_instance"]
        return None
    
    def list_models(self):
        return list(self.models.keys())

    def schema(self):
        if not self.model:
            return None
        schema = ifcopenshell.ifcopenshell_wrapper.schema_by_name(self.model.schema)
        return schema

    def schema_by_name(self, name):
        if not self.model:
            return None
        try:
            return ifcopenshell.ifcopenshell_wrapper.schema_by_name(name)
        except Exception as e:
            print(f"Error getting schema by name {name}: {e}")
            return "SchemaNotFound"

    def get_unit_scale(self, model_name):
        if model_name in self.models:
            return self.models[model_name]["unit_scale"]
        return 1.0

    def get_element(self, guid, model_name=None):
        if model_name:
            model = self.models[model_name]["ifcopenshell_instance"]
            return model[guid] or model.by_id(guid)
        else:
            for model in self.models.values():
                ifcopenshell_instance = model["ifcopenshell_instance"]
                element = ifcopenshell_instance[guid] or ifcopenshell_instance.by_id(guid)
                if element:
                    return element

    def dispose(self):
        self.models = None

    def clearModel(self, modelName):
        if self.models and modelName in self.models:
            del self.models[modelName]

    def _load_model(self, file_name, file_path, file_content):
        try:
            model = ifcopenshell.file.from_string(file_content)
            settings = self.model_settings.copy()
            settings["ifcopenshell_instance"] = model
            settings["file_path"] = file_path
            
            project = model.by_type("IfcProject")[0]
            
            file_name_without_ifc = file_name.replace(".ifc", "")
    
            if not project.Name:
                project.Name = file_name_without_ifc

            self.models[file_name] = settings
            
            self._initialize_model_contexts(file_name)
            return model
        except Exception as e:
            import traceback
            traceback.print_exc()

    def load_model_from_path(self, path, file_content):
        file_name = path.split("/")[-1]
        return self._load_model(file_name, path, file_content)

    def load_model_from_blob(self, file_name, file_content):
        return self._load_model(file_name, "Memory/" + file_name, file_content)

    def open_from_path(self, file_name, file_path_in_pyodide_fs):
        try:
            self.model = ifcopenshell.open(file_path_in_pyodide_fs)
            self._initialize_model_contexts(file_name)
        except Exception as e:
            import traceback

            traceback.print_exc()

    def _initialize_model_contexts(self, modelName):
        from ifcopenshell.api.context import add_context

        """Helper to initialize contexts after a model is loaded."""
        if not self.models.get(modelName):
            return
        

        model_settings = self.models[modelName]

        model = model_settings["ifcopenshell_instance"]

        model_settings["unit_scale"] = self.calculate_unit_scale(model)

        body_contexts = [
            ctx
            for ctx in model.by_type("IfcGeometricRepresentationContext")
            if ctx.ContextIdentifier == "Body"
        ]
        if not body_contexts:
            
            model_context = add_context(model, context_type="Model")
            
            add_context(
                model,
                context_type="Model",
                context_identifier="Body",
                target_view="MODEL_VIEW",
                parent=model_context,
            )

        axis_contexts = [
            ctx
            for ctx in model.by_type("IfcGeometricRepresentationContext")
            if ctx.ContextIdentifier == "Axis"
        ]

        if not axis_contexts:
            
            model_contexts_for_axis = model.by_type(
                "IfcGeometricRepresentationContext", include_subtypes=False
            )

            parent_context_for_axis = next(
                (
                    mc
                    for mc in model_contexts_for_axis
                    if mc.ContextType == "Model" and mc.ContextIdentifier is None
                ),
                None,
            )
            if not parent_context_for_axis:
                parent_context_for_axis = add_context(model, context_type="Model")

            axis_context = add_context(
                model,
                context_type="Model",
                context_identifier="Axis",
                target_view="GRAPH_VIEW",  # Or MODEL_VIEW depending on use
                parent=parent_context_for_axis,
            )


    def new_model(self, model_name="default"):
        from ifcopenshell.api.unit import assign_unit
        from ifcopenshell.api.aggregate import assign_object
        from ifcopenshell.api.root import create_entity

        if not '.ifc' in model_name:
            model_name += ".ifc"

        self.models[model_name] = self.model_settings.copy()
        
        model = ifcopenshell.file()
        self.models[model_name]["ifcopenshell_instance"] = model

        print(f"PYTHON: Created new IFC model: {model_name}")
        
        project = create_entity(model, ifc_class="IfcProject", name="My Project")
        assign_unit(model)

        self._initialize_model_contexts(model_name)

        site = create_entity(model, ifc_class="IfcSite", name="My Site")

        building = create_entity(model, ifc_class="IfcBuilding", name="Building A")

        storey = create_entity(
            model, ifc_class="IfcBuildingStorey", name="Ground Floor"
        )

        assign_object(model, relating_object=project, products=[site])
        assign_object(model, relating_object=site, products=[building])
        assign_object(model, relating_object=building, products=[storey])

        self.models[model_name]["active_container"] = storey
        return self.models[model_name]['ifcopenshell_instance']

    def calculate_unit_scale(self, file):
        import ifcopenshell.util.unit
        return ifcopenshell.util.unit.calculate_unit_scale(file)
