# import ifcopenshell.api.feature
import ifcopenshell.geom
from ifcopenshell.util.placement import get_local_placement
import numpy as np
# import ifcopenshell.util.placement as placement
# import ifcopenshell.api.geometry as geometry
# import math
# import ifcopenshell.api
# from ifcopenshell.util.unit import calculate_unit_scale
# from ifcopenshell.util.element import get_type, get_types, get_parts, get_decomposition, get_pset, get_container, get_psets
# import ifcopenshell.util.placement
# import ifcopenshell.util.classification as classification
# try:
#     import ifcopenshell.util.sequence
#     import ifcopenshell.util.date
# except ImportError as e:
#     print(f"4D is not available yet: {e}")

# import numpy as np

# import propertygroups

# O = 0.0, 0.0, 0.0
# X = 1.0, 0.0, 0.0
# Y = 0.0, 1.0, 0.0
# Z = 0.0, 0.0, 1.0

def get_faces(geometry):
    """Get all the faces as a numpy array

    Faces are always triangulated. If the shape is a BRep and you want to get
    the original untriangulated output, refer to :func:`get_edges`.

    Results are a nested numpy array e.g. [[f1v1, f1v2, f1v3], [f2v1, f2v2, f2v3], ...]

    :param geometry: Geometry output calculated by IfcOpenShell
    :return: A numpy array listing all the faces.
        Array shape: (n, 3), where n - number of faces.
    """
    return np.frombuffer(geometry.faces_buffer, dtype="i").reshape(-1, 3)


def create_shape(element):
    settings = ifcopenshell.geom.settings(
        USE_WORLD_COORDS=True,
        WELD_VERTICES=False,
    )
    shape = ifcopenshell.geom.create_shape(
        settings=settings,
        inst=element,
        geometry_library="hybrid-cgal-simple-opencascade",
    )
    return shape

def get_element_local_placement(element):
    product = element
    matrix = get_local_placement(product.ObjectPlacement)
    return matrix

class Context:
    model = None
    body = None
    storey = None
    pset_manager = None
    classification_model = None  # Separate model for classification IFC files


    
    # def create_2pt_wall(
    #     self, p1, p2, elevation, height, thickness, container, wall_type=None, alignment='center'
    # ):
    #     p1 = np.array([p1[0], p1[1]])
    #     p2 = np.array([p2[0], p2[1]])

    #     wall = ifcopenshell.api.run("root.create_entity", self.model, ifc_class="IfcWall")
    #     length = float(np.linalg.norm(p2 - p1))
    #     representation = ifcopenshell.api.run(
    #         "geometry.add_wall_representation",
    #         self.model,
    #         context=self.body,
    #         length=length,
    #         height=height,
    #         thickness=thickness,
    #     )
    #     ifcopenshell.api.run(
    #         "geometry.assign_representation",
    #         self.model,
    #         product=wall,
    #         representation=representation,
    #     )
    #     representation = ifcopenshell.api.run(
    #         "geometry.add_axis_representation",
    #         self.model,
    #         context=self.axis,
    #         axis=[(0.0, 0.0), (length, 0.0)],
    #     )
    #     ifcopenshell.api.run(
    #         "geometry.assign_representation",
    #         self.model,
    #         product=wall,
    #         representation=representation,
    #     )
    #     v = p2 - p1
    #     v = np.divide(v, float(np.linalg.norm(v)), casting="unsafe")
    #     # Compute perpendicular
    #     perp = np.array([-v[1], v[0]])
    #     offset = -thickness / 2
    #     if alignment == 'exterior':
    #         offset = - thickness
    #     elif alignment == 'interior':
    #         offset = 0
        
    #     offset_vec = perp * offset
    #     p1_offset = p1 + offset_vec
    #     matrix = np.array(
    #         [
    #             [v[0], -v[1], 0, p1_offset[0]],
    #             [v[1],  v[0], 0, p1_offset[1]],
    #             [0,     0,    1, elevation],
    #             [0,     0,    0, 1],
    #         ]
    #     )
    #     ifcopenshell.api.run("geometry.edit_object_placement", self.model, product=wall, matrix=matrix)
    #     ifcopenshell.api.run(
    #         "spatial.assign_container",
    #         self.model,
    #         relating_structure=container,
    #         products=[wall],
    #     )
    #     if wall_type:
    #         ifcopenshell.api.run(
    #             "type.assign_type",
    #             self.model,
    #             related_object=wall,
    #             relating_type=wall_type,
    #         )

    #     return wall




    # def create_fill(self, ty, pt, wall, width=None, height=None, depth=None, **kwargs):
    #     if isinstance(wall, str):
    #         wall = self.model[wall]
    #     if not wall.is_a('IfcWall'):
    #         raise ValueError("Only 'wall' hosts are supported")
    #     if ty == 'door':
    #         props = propertygroups.BIMDoorProperties()
    #         # Override with provided dimensions if specified
    #         if width is not None:
    #             props.overall_width = width
    #         if height is not None:
    #             props.overall_height = height
    #         if depth is not None:
    #             props.lining_depth = depth
                
    #         # Process additional parameters from frontend if provided
    #         if 'operation_type' in kwargs:
    #             props.door_type = kwargs['operation_type']
    #         if 'frameThickness' in kwargs:
    #             props.frame_thickness = kwargs['frameThickness']
    #     elif ty == 'window':
    #         props = propertygroups.BIMWindowProperties()
    #         # Override with provided dimensions and properties if specified
    #         if width is not None:
    #             props.overall_width = width
    #         if height is not None:
    #             props.overall_height = height
    #         if depth is not None:
    #             props.lining_depth = depth
            
    #         # Process additional parameters from frontend if provided
    #         if 'partition_type' in kwargs:
    #             props.window_type = kwargs['partition_type']
    #         if 'sillHeight' in kwargs:
    #             # sillHeight would need to be converted to the appropriate property if it exists
    #             pass
    #         if 'frameThickness' in kwargs:
    #             # Set the frame thickness for all panels
    #             for i in range(len(props.frame_thickness)):
    #                 props.frame_thickness[i] = kwargs['frameThickness']
    #         if 'glassThickness' in kwargs:
    #             # Glass thickness might need special handling
    #             pass
    #     else:
    #         raise ValueError("Only 'door' or 'window' fills are supported")
    #     si_conversion = calculate_unit_scale(self.model)
    #     body = ifcopenshell.util.representation.get_context(
    #         self.model, "Model", "Body", "MODEL_VIEW"
    #     )
    #     representation_data = props.to_dict(si_conversion=si_conversion)
    #     representation_data["context"] = body
    #     door_representation = ifcopenshell.api.run(
    #         f"geometry.add_{ty}_representation", self.model, **representation_data
    #     )
    #     door = ifcopenshell.api.run(
    #         "root.create_entity", self.model, ifc_class=f"ifc{ty}"
    #     )
    #     door.OverallWidth = props.overall_width / si_conversion
    #     door.OverallHeight = props.overall_height / si_conversion
    #     ifcopenshell.api.run(
    #         "geometry.assign_representation",
    #         self.model,
    #         product=door,
    #         representation=door_representation,
    #     )
    #     ifcopenshell.api.run(
    #         "spatial.assign_container",
    #         self.model,
    #         relating_structure=self.storey,
    #         products=[door],
    #     )

    #     r = [
    #         r
    #         for r in wall.Representation.Representations
    #         if r.RepresentationIdentifier == "Axis"
    #     ]
    #     if not r:
    #         raise ValueError("Axis representation is needed")
    #     r = r[0]
    #     axis_geometry = ifcopenshell.geom.create_shape(
    #         ifcopenshell.geom.settings(
    #             DIMENSIONALITY=ifcopenshell.ifcopenshell_wrapper.CURVES_SURFACES_AND_SOLIDS,
    #             USE_WORLD_COORDS=True,
    #         ),
    #         wall,
    #         r,
    #     )
    #     vs = np.array(axis_geometry.geometry.verts).reshape((-1, 3))
    #     es = np.array(axis_geometry.geometry.edges).reshape((-1, 2))
    #     A, B = vs[es[0]]
    #     v = B - A
    #     P = np.zeros(3)
    #     P[0 : len(pt)] = pt
    #     AP = P - A
    #     AP_dot_v = np.dot(AP, v)
    #     v_dot_v = np.dot(v, v)
    #     t = AP_dot_v / v_dot_v * np.linalg.norm(v) / si_conversion

    #     opening = ifcopenshell.api.run(
    #         "root.create_entity",
    #         self.model,
    #         ifc_class="IfcOpeningElement",
    #         predefined_type="OPENING",
    #         name="Opening",
    #     )

    #     position_3d = None
    #     if self.model.schema == "IFC2X3":
    #         position_3d = self.model.createIfcAxis2Placement2D(
    #             self.model.createIfcCartesianPoint([0.0, 0.0, 0.0])
    #         )
    #     position_2d = self.model.createIfcAxis2Placement2D(
    #         self.model.createIfcCartesianPoint([door.OverallWidth / 2.0, 0.0])
    #     )

    #     opening.Representation = self.model.createIfcProductDefinitionShape(
    #         Representations=[
    #             self.model.createIfcShapeRepresentation(
    #                 body,
    #                 "Body",
    #                 "SweptSolid",
    #                 Items=[
    #                     self.model.createIfcExtrudedAreaSolid(
    #                         self.model.createIfcRectangleProfileDef(
    #                             "AREA",
    #                             None,
    #                             position_2d,
    #                             door.OverallWidth,
    #                             1.2 / si_conversion,
    #                         ),
    #                         position_3d,
    #                         self.model.createIfcDirection((0.0, 0.0, 1.0)),
    #                         door.OverallHeight,
    #                     )
    #                 ],
    #             )
    #         ]
    #     )

    #     ifcopenshell.api.feature.add_feature(self.model, feature=opening, element=wall)
    #     ifcopenshell.api.feature.add_filling(self.model, opening=opening, element=door)

    #     z_offsets = {
    #         'door': 0,
    #         'window': 1
    #     }
    #     opening.ObjectPlacement = self.model.createIfcLocalPlacement(
    #         wall.ObjectPlacement,
    #         self.model.createIfcAxis2Placement3D(
    #             self.model.createIfcCartesianPoint((float(t), 0.0, z_offsets[ty] / si_conversion))
    #         ),
    #     )

    #     door.ObjectPlacement = self.model.createIfcLocalPlacement(
    #         opening.ObjectPlacement,
    #         self.model.createIfcAxis2Placement3D(
    #             self.model.createIfcCartesianPoint((0.0, 0.0, 0.0))
    #         ),
    #     )

    #     return door

    # def to_obj_file(self, fn):
    #     st = ifcopenshell.geom.settings(USE_WORLD_COORDS=True, WELD_VERTICES=False)
    #     it = ifcopenshell.geom.iterator(st, self.model, exclude=("IfcOpeningElement",))
    #     sr = ifcopenshell.geom.serializers.obj(
    #         fn, fn + ".mtl", st, ifcopenshell.geom.serializer_settings()
    #     )
    #     if it.initialize():
    #         for el in ifcopenshell.geom.consume_iterator(it):
    #             sr.write(el)
    #         sr.finalize()

    # def get_current_placement(self, element):
    #     product = element
    #     matrix = ifcopenshell.util.placement.get_local_placement(product.ObjectPlacement)
    #     return matrix

    # def edit_placement(self, element, matrix_elements=None):
    #     if matrix_elements:
    #         matrix = np.array(matrix_elements).reshape(4, 4)
    #         return ifcopenshell.api.run(
    #             "geometry.edit_object_placement", self.model, product=element, matrix=matrix, is_si= False
    #         )
    #     return None

    # def update_object_rotation(self, product, rotation_matrix):
    #     """
    #     Updates only the rotation of the object's placement, preserving translation.
    #     rotation_matrix: 3x3 numpy array (rotation part)
    #     """

    #     local_matrix = placement.get_local_placement(product.ObjectPlacement)
    #     # Preserve translation
    #     translation = local_matrix[:3, 3]
    #     # Build new 4x4 matrix
    #     new_matrix = np.eye(4)
    #     new_matrix[:3, :3] = rotation_matrix
    #     new_matrix[:3, 3] = translation
    #     geometry.edit_object_placement(self.model, product=product, matrix=new_matrix, should_transform_children=True)

    # def update_object_rotation_z(self, object, rotation):
    #     angle = math.radians(rotation)
    #     rot_z = np.array([
    #         [math.cos(angle), -math.sin(angle), 0],
    #         [math.sin(angle),  math.cos(angle), 0],
    #         [0,               0,               1]
    #     ])
    #     self.update_object_rotation(object, rot_z)

    # def get_matrix_from_translation(self, translation):
    #     orient_matrix = np.array(((1, 0, 0), (0, 1, 0), (0, 0, 1)))
    #     translation = np.array(translation).reshape(3, 1)
    #     matrix = np.concatenate((orient_matrix, translation), axis=1)
    #     matrix = np.concatenate((matrix, np.array([[0, 0, 0, 1]])), axis=0)
    #     return matrix
