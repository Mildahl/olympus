from collections import namedtuple
from ifcopenshell import entity_instance, file
from ifcopenshell.api import geometry
from ifcopenshell.api.aggregate import assign_object
from ifcopenshell.api.attribute import edit_attributes
from ifcopenshell.api.context import add_context
from ifcopenshell.api.feature import add_feature
from ifcopenshell.api.geometry import add_slab_representation, assign_representation, edit_object_placement, map_representation
from ifcopenshell.api.material import assign_material
from ifcopenshell.api.root import create_entity, remove_product
from ifcopenshell.api.spatial import assign_container
from ifcopenshell.api.type import assign_type
from ifcopenshell.util import shape_builder
from ifcopenshell.util.element import get_container, get_material
from ifcopenshell.util.placement import get_local_placement, get_storey_elevation, rotation as rot
from ifcopenshell.util.representation import get_context, get_representation
from ifcopenshell.util.unit import calculate_unit_scale
from math import asin, atan2, degrees, pi
from numpy import allclose, array, cos, eye, linalg, ndarray, radians, round, sin
from shapely.geometry import MultiPoint, MultiPolygon, Polygon
from shapely.ops import unary_union
import numpy as np
import os
import random
import re

Axis = namedtuple('Axis', ['p1', 'p2', 'name'])
Element_Extrusions = namedtuple('Element_Extrusions', ['items'])
Extrusion = namedtuple('Extrusion', ['profile', 'depth', 'direction'])
Position = namedtuple('Position', ['x', 'y', 'z'])
Rotation = namedtuple('Rotation', ['x', 'y', 'z'])


class LayeredTypesTool():
    @staticmethod
    def new_occurence(model, element_type, attributes=None, orientation='horizontal'):
        attributes = attributes or {"Name": f"{element_type.Name}"}
        occurence = TypeTool.new_occurence(model, element_type, attributes)
        TypeTool.set_material_usage(occurence, element_type, orientation)
        return occurence

    @staticmethod
    def occurence_by_perimeter(model, element_type, perimeter, attributes=None, position=None, spatial_container=None):
        occurence = LayeredTypesTool.new_occurence(model, element_type, attributes)
        GeometryTool.polyline_extrusion(occurence, perimeter, element_type=element_type)
        if spatial_container:
            SpatialTool.run_assign_container(occurence, spatial_container)
            if position:
                PlacementTool.place_rel_story(occurence, spatial_container, position)
        elif not spatial_container and position:
            PlacementTool.place(occurence, position)
        return occurence
    
    @staticmethod
    def two_point_occurence(model, element_type, start, end, height, attributes=None, spatial_container=None, elevation_offset=0.0):
        occurence = LayeredTypesTool.new_occurence(model, element_type, attributes, 'vertical')
        if spatial_container:
            SpatialTool.run_assign_container(occurence, spatial_container)
            elevat = PlacementUtils.get_global_z(elevation_offset or 0.0, spatial_container)
            elevation_offset = float(elevat)
        GeometryTool.two_point_extrusion(occurence, start, end, height, elevation_offset=elevation_offset, element_type=element_type)
        return occurence
    

    @staticmethod
    def parallel_occurence(reference_element, element_type, face='internal', offset=0.0, orientation='vertical'):
        model = reference_element.file
        attributes = {"Name": f"{element_type.Name}"}
        # we should derive wether its a horizontal or vertical cover from the layer set direction extrusion.
        occurence = LayeredTypesTool.new_occurence(model, element_type, attributes, orientation)

        if orientation == 'vertical':
            start = PlacementUtils.get_position(reference_element)
            rotation = PlacementUtils.get_rotation(reference_element)
            length = GeometryUtils.get_extrusion_length(reference_element)
            end = PlacementUtils.offset_position_along_axis_horizontal(start, rotation, length)
            height = GeometryUtils.get_extrusion_depth(reference_element)

            cover_height = height - offset
            
            GeometryTool.two_point_extrusion(
                occurence, 
                start, 
                end, 
                cover_height, 
                elevation_offset=offset,
                element_type=element_type
            )

            if face == 'internal':
                wall_thickness = GeometryUtils.get_thickness(reference_element)
                position = PlacementUtils.offset_position_horizontal_plane(
                    reference_element,
                    start,
                    wall_thickness
                )
            elif face == 'external':
                cover_thickness = GeometryUtils.get_thickness(occurence)
                position = PlacementUtils.offset_position_horizontal_plane(
                    reference_element,
                    start,
                    cover_thickness * -1
                )
            else:
                position = start
            occurence_position = Position(
                position.x,
                position.y,
                position.z + offset
            )
        else:  # horizontal cover
            start = PlacementUtils.get_position(reference_element)
            rotation = PlacementUtils.get_rotation(reference_element)
            perimeter = GeometryUtils.get_polyline(reference_element)
            GeometryTool.polyline_extrusion(occurence, perimeter, element_type=element_type)

            if face == 'topside':
                slab_thickness = GeometryUtils.get_thickness(reference_element)
                position = PlacementUtils.offset_position_along_axis_horizontal(
                    start,
                    rotation,
                    slab_thickness
                )
            elif face == 'underside':
                cover_thickness = GeometryUtils.get_thickness(occurence)
                position = PlacementUtils.offset_position_along_axis_horizontal(
                    start,
                    rotation,
                    -cover_thickness
                )
            else:
                position = start
            occurence_position = Position(
                position.x,
                position.y,
                position.z + offset
            )

        storey = get_container(reference_element)
        SpatialTool.run_assign_container(occurence, storey)
        PlacementTool.place_and_rotate(occurence, occurence_position, rotation)
        return occurence

class WallTool():
    @staticmethod
    def new_wall(model, element_type, storey, start, end, height, elevation_offset=0.0):
        attributes={ "Name": f"{element_type.Name}"}
        wall = LayeredTypesTool.two_point_occurence(
            model,
            element_type,
            start,
            end,
            height,
            attributes=attributes,
            elevation_offset=elevation_offset,
            spatial_container=storey
        )
        return wall

class SlabTool():
    @staticmethod
    def new_slab(model, element_type, storey, perimeter, elevation_offset=0.0):
        slab = LayeredTypesTool.occurence_by_perimeter(
            model,
            element_type,
            perimeter,
            attributes = {"Name": f"{element_type.Name}"},
            spatial_container=storey
        )
        return slab
    
    @staticmethod
    def new_slab_with_blocks(model, element_type, spacing, direction, origin=(0,0) , storey=None, elevation_offset=0.0):
        pass

class CoveringTool():
    @staticmethod
    def new_horizontal_cover(model, element_type, storey, perimeter, elevation_offset=0.0):
        covering = LayeredTypesTool.occurence_by_perimeter(
            model,
            element_type,
            perimeter,
            attributes = {"Name": f"{element_type.Name}"},
            spatial_container=storey
        )
        return covering
    
    @staticmethod
    def new_vertical_cover(model, element_type, storey, start, end, height, elevation_offset=0.0):
        attributes = {"Name": f"{element_type.Name}"}
        position = Position(0, 0, elevation_offset)
        covering = LayeredTypesTool.two_point_occurence(
            model,
            element_type,
            start,
            end,
            height,
            attributes=attributes,
            elevation_offset=elevation_offset,
            spatial_container=storey
        )
        return covering        

    @staticmethod
    def cover_wall(wall, element_type, face='internal', elevation_offset=0.0):
        parallel_occurence = LayeredTypesTool.parallel_occurence(
            wall,
            element_type,
            face=face,
            offset=elevation_offset
        )
        return parallel_occurence
    
    @staticmethod
    def cover_floor(slab, element_type, face='topside', elevation_offset=0.0):
        parallel_occurence = LayeredTypesTool.parallel_occurence(
            slab,
            element_type,
            face=face,
            offset=elevation_offset,
            orientation='horizontal'
        )
        return parallel_occurence

class CeilingTool():
    @staticmethod
    def create_ceiling(space, ceiling_type):
        footprint = GeometryUtils.get_polyline(space)
        height = GeometryUtils.get_extrusion_depth(space)
        ceiling_elevation = height - 0.5
        start = footprint[0]
        ceiling = LayeredTypesTool.occurence_by_perimeter(
            space.file,
            ceiling_type,
            footprint,
            attributes={"Name": f"{ceiling_type.Name}"},
            spatial_container=space
        )
        # current_position = PlacementUtils.get_position(ceiling)
        # new_position = Position(
        #     current_position.x,
        #     current_position.y,
        #     current_position.z + ceiling_elevation
        # )
        # PlacementTool.place(ceiling, new_position)
        return ceiling

class ProfiledTypesTool():
    @staticmethod
    def create_occurrence(model, element_type, orientation=None):
        attributes = {"Name": f"{element_type.Name}"}
        occurence = TypeTool.new_occurence(model, element_type, attributes)
        TypeTool.set_material_usage(occurence, element_type, orientation)
        return occurence
    
    @staticmethod
    def create_at_position(model, element_type, depth, orientation, spatial_container=None, position=None, rotation=None):
        element = ProfiledTypesTool.create_occurrence(
            model, 
            element_type,
            orientation,
        )
        _3d_geom = GeometryTool.add_profile_representation(
            element,
            depth,
            cardinal_point=5,
        )
        PlacementTool.place_object(
            element, 
            spatial_container, 
            position=position,
            rotation=rotation
        )
        return element

    @staticmethod
    def create_linear(model, element_type, start_position, end_position, spatial_container=None, offset=0.0):
        if start_position == end_position:
            print("Start and end positions are the same")
            return None

        orientation = 'horizontal'
        element = ProfiledTypesTool.create_occurrence(
            model, 
            element_type, 
            orientation,
        )

        p1_ = (start_position.x, start_position.y)
        p2_ = (end_position.x, end_position.y)
        if spatial_container:
            SpatialTool.run_assign_container(element, spatial_container)
            elevation = PlacementUtils.get_global_z(offset, spatial_container)
        else:
            elevation = offset

        _, linear_distance, rotation = GeometryUtils.placement_information(p1_, p2_, elevation=elevation)
        _3d_geom = GeometryTool.add_profile_representation(
            element,
            depth=linear_distance,
            cardinal_point=5
        )
        placement_matrix = PlacementUtils.placement_as_matrix(
            Position(start_position.x, start_position.y, elevation),
            Rotation(0,90,rotation.z)
        )
        SpatialTool.run_edit_placement(element, placement_matrix)

        return element

    @staticmethod
    def create_at_intersection(model, element_type, depth, orientation, spatial_container=None, interesecting_axes=None, rotation=None):
        if interesecting_axes and len(interesecting_axes) == 2:
            axis1 = get_axis(model, interesecting_axes[0])
            axis2 = get_axis(model, interesecting_axes[1])
            if axis1 and axis2:
                position = PlacementUtils.get_axis_intersection(axis1, axis2)

                element = ProfiledTypesTool.create_at_position(
                    model,
                    element_type,
                    depth,
                    orientation,
                    spatial_container,
                    position,
                    rotation
                )
                return element


    @staticmethod
    def create_linear_by_axes(model, element_type, start_intersection, end_intersection, spatial_container=None):
        start_axis1 = get_axis(model, start_intersection[0])
        start_axis2 = get_axis(model, start_intersection[1])
        end_axis1 = get_axis(model, end_intersection[0])
        end_axis2 = get_axis(model, end_intersection[1])
        if start_axis1 and start_axis2 and end_axis1 and end_axis2:
            start_position = PlacementUtils.get_axis_intersection(start_axis1, start_axis2)
            end_position = PlacementUtils.get_axis_intersection(end_axis1, end_axis2)
            if start_position == end_position:
                print("Could not calculate intersection points")
                return None

            element = ProfiledTypesTool.create_linear(
                model,
                element_type,
                start_position,
                end_position,
                spatial_container,
            )
            return element

class ColumnTool():
    @staticmethod
    def create_at_axes(model, element_type, height=3.0, spatial_container=None, interesecting_axes=None):
        column = ProfiledTypesTool.create_at_intersection(
            model,
            element_type,
            depth=height,
            orientation='vertical',
            spatial_container=spatial_container,
            interesecting_axes=interesecting_axes
        )
        return column

    @staticmethod
    def create_at_position(model, element_type, height=3.0, spatial_container=None, position=None):
        column = ProfiledTypesTool.create_at_position(
            model,
            element_type,
            depth=height,
            orientation='vertical',
            position=position,
            spatial_container=spatial_container
        )
        return column

class PileTool():
    """Tool for creating pile elements (foundation elements that protrude downward)"""
    @staticmethod
    def create_at_position(model, element_type, depth=6.0, spatial_container=None, position=None):
        """
        Create a pile at a given position.
        Unlike columns, piles are positioned at their top, with the pile going down.
        The position.z should already be set to the negative depth for proper placement.
        """
        pile = ProfiledTypesTool.create_at_position(
            model,
            element_type,
            depth=depth,
            orientation='vertical',
            position=position,
            spatial_container=spatial_container
        )
        return pile
   
class BeamTool():
    @staticmethod
    def create_between_axes(model, element_type, start_intersection, end_intersection, spatial_container=None):
        beam = ProfiledTypesTool.create_linear_by_axes(
            model,
            element_type,
            start_intersection,
            end_intersection,
            spatial_container=spatial_container
        )
        return beam
    
    @staticmethod
    def create_between_positions(model, element_type, start_position, end_position, spatial_container=None):
        beam = ProfiledTypesTool.create_linear(
            model,
            element_type,
            start_position,
            end_position,
            spatial_container=spatial_container
        )
        return beam

class FootingTool():
    @staticmethod
    def create_between_axes(model, element_type, start_intersection, end_intersection, spatial_container=None):
        footing = ProfiledTypesTool.create_linear_by_axes(
            model,
            element_type,
            start_intersection,
            end_intersection,
            spatial_container=spatial_container
        )
        return footing
    
    @staticmethod
    def create_between_positions(model, element_type, start_position, end_position, spatial_container=None):
        footing = ProfiledTypesTool.create_linear(
            model,
            element_type,
            start_position,
            end_position,
            spatial_container=spatial_container
        )
        return footing

class PilingTool(ColumnTool):
    pass

class MemberTool(BeamTool, ColumnTool):
    pass





class ContextTool:
    @staticmethod
    def get_body_context(model):
        context = get_context(
            model,
            "Model",
            "Body",
            "MODEL_VIEW"
        )
        if not context:
            model3d = get_context(model, "Model")
            context = add_context(model,
                context_type="Model", context_identifier="Body", target_view="MODEL_VIEW", parent=model3d
            )
        return context

    @staticmethod
    def get_axis_context(model):
        context = get_context(
            model,
            "Model",
            "Axis",
            "MODEL_VIEW"
        )
        if not context:
            model3d = get_context(model, "Model")
            context = add_context(model,
                context_type="Model", context_identifier="Axis", target_view="MODEL_VIEW", parent=model3d
            )
        return context

@staticmethod
def wall_footprint(elements, enclosure_type='internal'):
    """
    Compute the enclosure footprint from elements.
    
    :param elements: List of IFC elements (e.g., walls, slabs).
    :param enclosure_type: 'internal' for the exact closed loop formed by the elements (largest exterior boundary), 'external' for the union including thickness.
    :return: A Polygon object for 'internal' (the closed loop), or a Polygon/MultiPolygon for 'external'.
    """
    polygons = []
    for element in elements:
        polyline = GeometryUtils.get_polyline(element)
        if polyline:
            matrix = get_local_placement(element.ObjectPlacement)
            global_polyline = GeometryUtils.transform_polyline(polyline, matrix)
            coords = [(p.x, p.y) for p in global_polyline]
            if len(coords) > 2:
                poly = Polygon(coords)
                if enclosure_type == 'external':
                    thickness = GeometryUtils.get_thickness(element)
                    poly = poly.buffer(thickness)
                polygons.append(poly)
    
    if not polygons:
        return None
    
    union = unary_union(polygons)
    
    if enclosure_type == 'internal':
        # Return the largest exterior boundary as the closed loop
        if isinstance(union, Polygon):
            return Polygon(union.exterior.coords)
        elif isinstance(union, MultiPolygon):
            largest = max(union.geoms, key=lambda p: p.area)
            return Polygon(largest.exterior.coords)
        else:
            # If union is not a polygon, perhaps LineString, return its convex hull or something
            return union.convex_hull
    else:
        return union


class GeometryTool:
    @staticmethod
    def polyline_extrusion(element, polyline, thickness=None, element_type=None):
        if not polyline:
            print("No polyline points provided for extrusion.")
            return
        if not thickness and element_type:
            thickness = GeometryUtils.get_thickness(element_type)

        model = element.file
        body_context = ContextTool.get_body_context(model)
        polyline = [
            (position.x,position.y) for position in polyline
        ]
        body = geometry.add_slab_representation(
            model,
            context=body_context,
            depth=thickness or 0.25,
            x_angle=0.0,
            polyline=polyline,
        )
        geometry.assign_representation(model, product=element, representation=body)

    @staticmethod
    def two_point_extrusion(element, start, end, height, thickness=None, elevation_offset=0.0, element_type=None):
        if not thickness and element_type:
            thickness = GeometryUtils.get_thickness(element_type)
        elif not thickness:
            thickness = 0.25
        height = height or 3.0
        model = element.file
        print(
            element,
            ContextTool.get_body_context(model),
            (start.x, start.y),
            (end.x, end.y),
            height,
            elevation_offset,
            thickness)
        body = geometry.create_2pt_wall(
            element.file,
            element,
            context=ContextTool.get_body_context(model),
            p1=(start.x, start.y),
            p2=(end.x, end.y),
            height=height,
            elevation=elevation_offset,
            thickness=thickness,
        )
        geometry.assign_representation(model, product=element, representation=body)

    @staticmethod
    def rectangular_opening_representation(model, size):
        body_context = ContextTool.get_body_context(model)

        x = size[0]
        y = size[1]
        z = size[2]
        unit_scale = calculate_unit_scale(model)
        geometry_builder = shape_builder.ShapeBuilder(model)
        
        opening_size = (x / unit_scale, y / unit_scale)

        extrusion = geometry_builder.extrude(
            geometry_builder.rectangle(size=opening_size),
            magnitude= z / unit_scale,
            position=(0,0,0)
        )
        representation = geometry_builder.get_representation(body_context, [extrusion])
        return representation

    # @staticmethod
    # def add_axis_representation(model, context, axis_points):
    #     axis_list = [p.tolist() if hasattr(p, 'tolist') else list(p) for p in axis_points]
    #     return geometry.add_axis_representation(model, context=context, axis=axis_list)
        
    @staticmethod
    def add_axis_representation(element, element_definition):
        axis_context = ContextTool.get_axis_context(element.file)
        axis = geometry.add_axis_representation(
            element.file,
            context=axis_context,
            axis=element_definition.get("axis"),
        )
        geometry.assign_representation(element.file, product=element, representation=axis)

    @staticmethod
    def add_profile_representation(element, depth, cardinal_point, clippings=None):
        profile = GeometryUtils.get_profile(element)
        if not profile:
            return None
        body_context = ContextTool.get_body_context(element.file)
        representation = geometry.add_profile_representation(
            element.file, context=body_context, profile=profile, depth=depth, cardinal_point=cardinal_point, clippings=clippings
        )
        geometry.assign_representation(element.file, product=element, representation=representation)
        return representation


class OpeningTool:
    def __init__(self):
        self.mapped_representations = {}
    
    def cube_representation(self, model, size):
        if size in self.mapped_representations:
            return self.mapped_representations[size]
        representation = GeometryTool.rectangular_opening_representation(model, size)
        mapped_representation = map_representation(
            model, representation=representation
        )
        self.mapped_representations[size] = mapped_representation
        return mapped_representation
    
    def assign_geometry(self, model, opening, representation):
        assign_representation(
            model, product=opening, representation=representation
        )

    def create_opening(self, model:file, voided_element:entity_instance, position: Position, size: tuple):
        opening = create_entity(
            model,
            ifc_class="IfcOpeningElement",
            predefined_type="OPENING",
            name="Opening",
        )
        opening.Name = "Opening voiding:" + (voided_element.Name or voided_element.is_a())
        representation = self.cube_representation(model, size)
        self.assign_geometry(model, opening, representation)
        PlacementTool.place(opening, position)
        add_feature(model, feature=opening, element=voided_element)
        return opening


class PlacementTool:
    @staticmethod
    def place_object(element: entity_instance, spatial_container: entity_instance or None, position:Position or None, rotation:Rotation or None):
        if not position:
            position = Position(0,0,0)
        if spatial_container:
            SpatialTool.run_assign_container(element, spatial_container)
            PlacementTool.place_rel_story(element, spatial_container, position, rotation)
        else:
            matrix = PlacementUtils.placement_as_matrix(position, rotation)
            SpatialTool.run_edit_placement(element, matrix)

    @staticmethod
    def at_origin(element):
        matrix = eye(4)
        SpatialTool.run_edit_placement(element, matrix)

    @staticmethod
    def place(element, position = Position(0,0,0)):
        if isinstance(position, tuple):
            position = Position(*position)
        matrix = eye(4)
        matrix[:, 3][:3] = [position.x, position.y, position.z]
        SpatialTool.run_edit_placement(element, matrix)

    @staticmethod
    def place_rel_story(element, storey, position = Position(0,0,0), rotation: Rotation or None = None):
        SpatialTool.run_assign_container(element, storey)
        elevation = PlacementUtils.get_global_z(position.z, storey)
        new_position = Position(position.x, position.y, elevation)
        matrix = eye(4)
        if rotation:
            if rotation.z:
                matrix = rot(rotation.z, "Z") @ matrix
            if rotation.y:
                matrix = rot(rotation.y, "Y") @ matrix
            if rotation.x:
                matrix = rot(rotation.x, "X") @ matrix
        matrix[:, 3][:3] = [new_position.x, new_position.y, new_position.z]
        SpatialTool.run_edit_placement(element, matrix)


    @staticmethod
    def rotate(element, rotation: Rotation):
        current_placement = PlacementUtils.get_placement(element)
        position = PlacementUtils.get_position(element)
        translation_to_origin = PlacementUtils.get_matrix(Position(-position.x, -position.y, -position.z))
        translation_back = PlacementUtils.get_matrix(position)
        
        rot_x = rot(rotation.x, "X")
        rot_y = rot(rotation.y, "Y")
        rot_z = rot(rotation.z, "Z")
        rotation_matrix = rot_z @ rot_y @ rot_x
        new_matrix = translation_back @ (rotation_matrix @ translation_to_origin) @ current_placement
        SpatialTool.run_edit_placement(element, round(new_matrix, decimals=1))
    
    @staticmethod
    def rotate_relative_to_point(element, point: Position, rotation: Rotation):
        current_placement = PlacementUtils.get_placement(element)
        translation_to_origin = PlacementUtils.get_matrix(Position(-point.x, -point.y, -point.z))
        translation_back = PlacementUtils.get_matrix(Position(point.x, point.y, point.z))
        rot_x = rot(rotation.x, "X")
        rot_y = rot(rotation.y, "Y")
        rot_z = rot(rotation.z, "Z")
        rotation_matrix = rot_z @ rot_y @ rot_x
        new_matrix = round(translation_back @ (rotation_matrix @ translation_to_origin) @ current_placement, decimals=1)
        SpatialTool.run_edit_placement(element, new_matrix)

    # @staticmethod
    # def rotate(element, axis: str, angle_degrees: float):
    #     current_placement = IFCUtils.get_placement(element)
    #     position = (current_placement[0][3], current_placement[1][3], current_placement[2][3])
    #     translation_to_origin = IFCUtils.xyz_as_matrix(-position[0], -position[1], -position[2])
    #     translation_back = IFCUtils.xyz_as_matrix(position[0], position[1], position[2])
    #     rotation_matrix = IFCUtils.create_rotation_matrix(axis, angle_degrees)
    #     new_matrix = translation_back @ (rotation_matrix @ translation_to_origin) @ current_placement
    #     SpatialAPI.edit_placement(element, np.round(new_matrix, decimals=1))
    
    # @staticmethod
    # def rotate_relative_to_point(element, point: tuple, axis: str, angle_degrees: float):
    #     current_placement = IFCUtils.get_placement(element)
    #     translation_to_origin = IFCUtils.xyz_as_matrix(-point[0], -point[1], -point[2])
    #     translation_back = IFCUtils.xyz_as_matrix(point[0], point[1], point[2])
    #     rotation_matrix = IFCUtils.create_rotation_matrix(axis, angle_degrees)
    #     new_matrix = translation_back @ (rotation_matrix @ translation_to_origin) @ current_placement
    #     SpatialAPI.edit_placement(element, np.round(new_matrix, decimals=1))

    @staticmethod
    def place_and_rotate(element, position = Position(0,0,0), rotation: Rotation = Rotation(0,0,0)):
        matrix = eye(4)
        rot_x = rot(rotation.x, "X")
        rot_y = rot(rotation.y, "Y")
        rot_z = rot(rotation.z, "Z")
        rotation_matrix = rot_z @ rot_y @ rot_x
        matrix = rotation_matrix @ matrix
        matrix[:, 3][:3] = [position.x, position.y, position.z]
        SpatialTool.run_edit_placement(element, matrix)
    
    @staticmethod
    def set_relative_placement(model, element, relative_to):
        relative_placement = relative_to.ObjectPlacement
        if not element.ObjectPlacement:
            element.ObjectPlacement = model.create_entity("IfcLocalPlacement") 
            element.ObjectPlacement.PlacementRelTo = relative_placement
            element.ObjectPlacement.RelativePlacement = model.create_entity("IfcAxis2Placement3D")
    
    @staticmethod
    def move_to_intersection(model, element, axis_tag1, axis_tag2):
        axis1 = get_axis(model, axis_tag1)
        axis2 = get_axis(model, axis_tag2)
        if not axis1 or not axis2:
            print(f"Axes with tags {axis_tag1} or {axis_tag2} not found.")
            return None
        position = PlacementUtils.get_axis_intersection(axis1, axis2)
        PlacementTool.place(element, position)
        return position


class SpaceTool:
    @staticmethod
    def new_space_from_polyline(model, polyline, height, storey=None, attributes=None):
        """
        Create a new IfcSpace from a polyline (list of Position), extruded to height.
        """
        attributes = attributes or {"Name": "Space"}
        space = create_entity(model, "IfcSpace")
        edit_attributes(model, product=space, attributes=attributes)

        # Convert polyline to list of tuples
        polyline_coords = [(p.x, p.y) for p in polyline]

        # Get body context
        body_context = ContextTool.get_body_context(model)

        # Add slab representation (extruded polyline)
        body = add_slab_representation(
            model,
            context=body_context,
            depth=height,
            x_angle=0.0,
            polyline=polyline_coords,
        )
        assign_representation(model, product=space, representation=body)

        # Place at storey elevation if provided
        if storey:
            SpatialTool.run_aggregate_space(space, storey)
            elevation = PlacementUtils.get_global_z(0.0, storey)
            position = Position(0, 0, elevation)
        else:
            position = Position(0, 0, 0.0)
        PlacementTool.place(space, position)
        return space

    @staticmethod
    def create_from_enclosure(model, walls, height, storey=None, enclosure_type='internal'):
        """
        Generate a space from the delimitations of the given walls.
        Finds the main enclosed area and creates a space for it.
        """
        enclosure = GeometryUtils.get_enclosure(walls, enclosure_type=enclosure_type)

        if enclosure:
            coords = list(enclosure.exterior.coords)
            polyline = [Position(x, y, 0) for x, y in coords]
            space = SpaceTool.new_space_from_polyline(model, polyline, height, storey)
            for wall in walls:
                SpaceTool.add_space_boundary(model, space, wall)
            return space
        return None

    @staticmethod
    def add_space_boundary(model, space, wall):
        """
        Create an IfcRelSpaceBoundary relating the space to the wall, with connection geometry.
        """
        boundary = create_entity(model, "IfcRelSpaceBoundary")
        boundary.RelatingSpace = space
        boundary.RelatedBuildingElement = wall
        boundary.PhysicalOrVirtualBoundary = "PHYSICAL"
        boundary.InternalOrExternalBoundary = "INTERNAL"  # Assume internal for now
        # boundary.ConnectionGeometry = ...  # TODO: implement proper geometry creation
        
        return boundary


class SpatialTool:
    @staticmethod
    def run_edit_placement(element, placement_matrix=None):
        edit_object_placement(element.file, product=element, matrix=placement_matrix, is_si=True)    

    @staticmethod
    def run_assign_container(element, storey):
        assign_container(
            element.file,
            products=[element],
            relating_structure=storey,
        )

    @staticmethod
    def run_aggregate_space(space, storey):
        assign_object(
            space.file,
            products=[space],
            relating_object=storey,
        )

    @staticmethod
    def ensure_spatial_relationships(model):
        site = model.by_type('IfcSite')[0]
        if not site.ObjectPlacement:
            edit_object_placement(model, product=site)
            assign_object(model, products=[site], relating_object=model.by_type('IfcProject')[0])
            building = model.by_type('IfcBuilding')[0]
            edit_object_placement(model, product=building)
            assign_object(model, products=[building], relating_object=site)

            building_storeys = model.by_type('IfcBuildingStorey')
            for storey in building_storeys:
                elevation = storey.Elevation or 0.0
                position = Position(x=0.0, y=0.0, z=elevation)
                PlacementTool.place(storey, position)
            assign_object(model, products=building_storeys, relating_object=building)


def is_layered_element(element_type):
    layered_classes = [
        "IfcWallType",
        "IfcSlabType",
        "IfcCoveringType",
        "IfcRoofType",
    ]
    return element_type.is_a() in layered_classes

def is_profiled_element(element_type):
    profiled_classes = [
        "IfcBeamType",
        "IfcColumnType",
        "IfcFootingType",
        "IfcPileType",
        "IfcMemberType",
        "IfcRampFlightType",
    ]
    return element_type.is_a() in profiled_classes

class TypeTool():
    @staticmethod
    def new_occurence(model, element_type, attributes={}):
        # Use removesuffix instead of rstrip to avoid stripping matching characters
        # rstrip('Type') would strip any trailing T,y,p,e chars, not the literal "Type"
        occurence_class = element_type.is_a().removesuffix('Type')
        element = create_entity(model, occurence_class)

        assign_type(
            element.file,
            related_objects=[element],
            relating_type=element_type,
        )
        if attributes:
            edit_attributes(model, product=element, attributes=attributes)
        return element

    @staticmethod
    def delete(element):
        remove_product(element.file, element)

    @staticmethod
    def set_material_usage(element, element_type, orientation):
        if is_layered_element(element_type):
            assign_material(
                element.file,
                products=[element], 
                type="IfcMaterialLayerSetUsage"
            )
        elif is_profiled_element(element_type):
            assign_material(
                element.file,
                products=[element], 
                type="IfcMaterialProfileSetUsage"
            )
        material_usage = get_material(element)
        if orientation == 'horizontal':
            if material_usage and material_usage.is_a('IfcMaterialLayerSetUsage') and not material_usage.LayerSetDirection:
                material_usage.LayerSetDirection = "AXIS3"
        elif orientation == 'vertical':
            if material_usage and material_usage.is_a('IfcMaterialLayerSetUsage') and material_usage.LayerSetDirection != "AXIS2":
                material_usage.LayerSetDirection = "AXIS2"


Point = namedtuple('Point', ['x', 'y'])
Polyline = namedtuple('Polyline', ['Points'])

# Assume a plan view with horizontal grids 1 to 5 ( x axis) and vertical grids A to D (running along y).
# A to B: 7m, B to C: 7m, C to D: 7m
# 1 to 2: 8m, 2 to 3: 8m, 3 to 4: 8m, 4 to 5: 8m

# We need a building of 3 storeys, the building is called "Aeco Community House"
# The program of the building is :
# Large Meeting room
# Living room
# Cinema room

# bedrooms as a hotel at higher level 2

footprint = Polyline(Points=[
    Point(x=0.0, y=0.0),
    Point(x=5.0, y=0.0),
    Point(x=5.0, y=4.0),
    Point(x=0.0, y=4.0),
    Point(x=0.0, y=0.0),
])
height = 3.0
position = Position(0.0, 0.0, 0.0)

room_1 = {
        "Name": "LR001",
        "LongName": "Living Room",
        "Description": "Main Living Room",
        "PredefinedType": "INTERNAL",
        "Footprint": footprint,
        "Height": height,
        "Position": position,
        "Storey": "Ground Floor",
    }


class GeometryUtils:
    @staticmethod
    def get_used_material(element):
        return get_material(element, should_skip_usage=True)

    @staticmethod
    def get_profile(element):
        material = GeometryUtils.get_used_material(element)
        if material and material.is_a('IfcMaterialProfileSet'):
            return material.MaterialProfiles[0].Profile if material.MaterialProfiles else None
    
    @staticmethod
    def get_thickness(element_type):
        material_set = GeometryUtils.get_used_material(element_type) if element_type else None
        thickness = 0.25
        if material_set:
            thickness = material_set.TotalThickness if material_set.is_a('IfcMaterialLayerSet') else 0.2
        # check units here 
        unit_scale = calculate_unit_scale(element_type.file)
        return thickness * unit_scale

    @staticmethod
    def get_center(start, end):
        return ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2)
   
    @staticmethod
    def get_extrusion_info(element):
        """Get extrusion depth and direction."""
        body_rep = get_representation(element, "Model", "Body", "MODEL_VIEW")
        extrusions = Element_Extrusions(items=[])
        if body_rep and body_rep.Items:
            for item in body_rep.Items:
                if item.is_a("IfcExtrudedAreaSolid"):
                    extrusion = Extrusion(profile=item.SweptArea, depth=item.Depth, direction=array(item.ExtrudedDirection.DirectionRatios))
                    extrusions.items.append(extrusion)
        return Element_Extrusions(items=extrusions.items) if extrusions.items else None

    @staticmethod
    def get_polyline(element):
        """Get polyline points from element's body representation."""
        body_rep = get_representation(element, "Model", "Body", "MODEL_VIEW")
        if body_rep and body_rep.Items:
            for item in body_rep.Items:
                if item.is_a("IfcFacetedBrep"):
                    # Assuming the first face and its outer boundary
                    face = item.Outer.CfsFaces[0]
                    loop = face.Bounds[0].Bound
                    if loop.is_a("IfcPolyLoop"):
                        points = [array(vertex.Coordinates) for vertex in loop.Polygon]
                        points = [Position(p[0], p[1], 0) for p in points]
                        return points
                elif item.is_a("IfcExtrudedAreaSolid"):
                    profile = item.SweptArea
                    if profile.is_a("IfcArbitraryClosedProfileDef"):
                        curve = profile.OuterCurve
                        if curve.is_a("IfcPolyline"):
                            points = [Position(p.Coordinates[0], p.Coordinates[1], 0) for p in curve.Points]
                            return points
                        elif curve.is_a("IfcIndexedPolyCurve"):
                            points = [Position(p[0], p[1], 0) for p in curve.Points.CoordList]
                            return points
                    elif profile.is_a("IfcRectangleProfileDef"):
                        x_dim = profile.XDim
                        y_dim = profile.YDim
                        points = [
                            Position(0, 0, 0),
                            Position(x_dim, 0, 0),
                            Position(x_dim, y_dim, 0),
                            Position(0, y_dim, 0),
                            Position(0, 0, 0),
                        ]
                        return points
                    
        return None
    
    @staticmethod
    def get_polyline_coords(polyline: entity_instance) -> ndarray:
        """polyline should be either `IfcIndexedPolyCurve` or `IfcPolyline`"""
        coords = None
        if polyline.is_a("IfcIndexedPolyCurve"):
            coords = array(polyline.Points.CoordList)
        elif polyline.is_a("IfcPolyline"):
            coords = array(tuple(p.Coordinates for p in polyline.Points))
        else:
            raise Exception(f"Unsupported polyline type: {polyline.is_a()}")
        return coords
    
    @staticmethod
    def get_extrusion_depth(element):
        info = GeometryUtils.get_extrusion_info(element)
        if not info:
            return 0.0
        max_depth = 0.0
        if info:
            for extrusion in info.items:
                if extrusion.depth > max_depth:
                    max_depth = extrusion.depth
        return max_depth

    @staticmethod
    def get_extrusion_length(element):
        info = GeometryUtils.get_extrusion_info(element)
        if not info:
            return 0.0
        max_length = 0.0
        if info:
            for extrusion in info.items:
                if extrusion.profile and extrusion.profile.is_a("IfcRectangleProfileDef"):
                    profile_length = extrusion.profile.XDim
                    if profile_length > max_length:
                        max_length = profile_length
                elif extrusion.profile and extrusion.profile.is_a("IfcArbitraryClosedProfileDef"):
                    curve = extrusion.profile.OuterCurve
                    if curve.is_a("IfcPolyline"):
                        points = [p.Coordinates for p in curve.Points]
                    elif curve.is_a("IfcIndexedPolyCurve"):
                        points = curve.Points.CoordList
                    else:
                        continue
                    xs = [p[0] for p in points]
                    profile_length = max(xs) - min(xs)
                    if profile_length > max_length:
                        max_length = profile_length
        return max_length

    @staticmethod
    def get_extrusion_thickness(element):
        info = GeometryUtils.get_extrusion_info(element)
        if not info:
            return 0.0
        min_thickness = None
        if info:
            for extrusion in info.items:
                if extrusion.profile and extrusion.profile.is_a("IfcRectangleProfileDef"):
                    profile_thickness = extrusion.profile.YDim
                    if min_thickness is None or profile_thickness < min_thickness:
                        min_thickness = profile_thickness
        return min_thickness if min_thickness is not None else 0.0

    @staticmethod
    def get_edges_intersection( edge1, edge2):
        """Calculate intersection point of two edges (lines)."""
        p1, p2 = edge1
        p3, p4 = edge2
        # Check if endpoints match
        if allclose(p1, p3) or allclose(p1, p4):
            return p1
        if allclose(p2, p3) or allclose(p2, p4):
            return p2
        # Compute 2D intersection in XY plane
        d1 = p2 - p1
        d2 = p4 - p3
        denom = d1[0]*d2[1] - d1[1]*d2[0]
        if abs(denom) < 1e-6:
            return None  # Parallel or collinear without endpoint match
        t = ((p3[0] - p1[0])*d2[1] - (p3[1] - p1[1])*d2[0]) / denom
        if 0 <= t <= 1:  # Check if intersection is within segments
            intersect = p1 + t * d1
            # Check if z matches (for 3D)
            if allclose(intersect[2], p3[2] + t * (p4[2] - p3[2])):
                return intersect
        return None

    @staticmethod
    def get_distance(point1, point2):
        length = linalg.norm(array(point2) - array(point1))
        return float(length)

    @staticmethod
    def placement_information(point1, point2, elevation):
        v = array(point2) - array(point1)
        linear_distance = float(linalg.norm(v))
        v /= linear_distance
        matrix = array(
            [
                [v[0], -v[1], 0, point1[0]],
                [v[1], v[0], 0, point1[1]],
                [0, 0, 1, elevation],
                [0, 0, 0, 1],
            ]
        )
        rotation = Rotation(0, 0, GeometryUtils.angle_between_points_2d(point1, point2))
        return matrix, linear_distance, rotation
    
    @staticmethod
    def transform_polyline(polyline, matrix):
        """Transform a list of Position points using a 4x4 transformation matrix."""
        global_polyline = []
        for p in polyline:
            vec = np.array([p.x, p.y, p.z, 1.0])
            transformed = matrix @ vec
            global_polyline.append(Position(transformed[0], transformed[1], transformed[2]))
        return global_polyline
    
    @staticmethod
    def angle_between_points_2d(p1, p2):
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        angle = atan2(dy, dx)
        return degrees(angle)
    
    @staticmethod
    def get_elevation(element):
        """Get the global Z elevation of the element's placement."""
        matrix = get_local_placement(element.ObjectPlacement)
        return matrix[2, 3]  # Translation in Z

    @staticmethod
    def get_enclosure(elements, enclosure_type='internal'):
        """
        Compute the enclosure footprint from elements.
        
        :param elements: List of IFC elements (e.g., walls, slabs).
        :param enclosure_type: 'internal' for the main enclosed area (interior), 'external' for the union including thickness.
        :return: A single Polygon object for 'internal' (the largest enclosed area), or a Polygon/MultiPolygon for 'external'.
        """
        polygons = []
        all_coords = []
        for element in elements:
            polyline = GeometryUtils.get_polyline(element)
            if polyline:
                matrix = get_local_placement(element.ObjectPlacement)
                global_polyline = GeometryUtils.transform_polyline(polyline, matrix)
                coords = [(p.x, p.y) for p in global_polyline]
                all_coords.extend(coords)
                if len(coords) > 2:
                    poly = Polygon(coords)
                    if enclosure_type == 'external':
                        thickness = GeometryUtils.get_thickness(element)
                        poly = poly.buffer(thickness)
                    polygons.append(poly)
        
        if not polygons:
            return None
        
        union = unary_union(polygons)
        
        if enclosure_type == 'internal':
            interiors = []
            if isinstance(union, MultiPolygon):
                for poly in union.geoms:
                    interiors.extend(poly.interiors)
            elif isinstance(union, Polygon):
                interiors = union.interiors
            if not interiors:
                # If no enclosed area, return the convex hull of all points to close the loop
                if all_coords:
                    hull = MultiPoint(all_coords).convex_hull
                    return hull
                return None
            # Return the largest interior
            largest = max(interiors, key=lambda p: Polygon(p).area)
            return Polygon(largest)
        else:
            return union

def by_name(model, ifc_class, name):
    for entity in model.by_type(ifc_class):
        if _string_matches(entity.Name, name):
            return entity
    return None

def get_container_by_name(model, container_name):
    for container in model.by_type("IfcSpatialStructureElement"):
        if _string_matches(container.Name, container_name):
            return container
    return None

def get_profile(model, profile_name):
    for profile in model.by_type("IfcProfileDef"):
        if _string_matches(profile.ProfileName, profile_name):
            return profile
    return None

def _string_matches(string1, string2):
    if not string1 or not string2:
        return False
    if string1.lower() == string2.lower():
        return True
    return False

def get_types(model, classification_name, classificiation_type='ifc'):
    if classificiation_type == 'ifc':
        ifc_class = 'Ifc' + classification_name + 'Type'
        return model.by_type(ifc_class)
    return []

def get_type(model, classification_name, name, classificiation_type='ifc'):
    if classificiation_type == 'ifc':
        class_name = 'Ifc' + classification_name + 'Type'
        return by_name(model, class_name, name)
    types = get_types(model, classification_name, classificiation_type)
    for t in types:
        if _string_matches(t.Name, name):
            return t
    return None

def get_axis(model, axis_tag):
    for grid in model.by_type("IfcGrid") or []:
        for axes in [grid.UAxes, grid.VAxes, grid.WAxes]:
            if axes:
                for axis in axes:
                    if axis.AxisTag == axis_tag:
                        return axis
    return None



class PlacementUtils:
    @staticmethod
    def get_placement(element):
        return get_local_placement(element.ObjectPlacement)

    @staticmethod
    def get_position(element):
        placement = PlacementUtils.get_placement(element)
        position = Position(x=placement[0][3], y=placement[1][3], z=placement[2][3])
        return position

    @staticmethod
    def get_rotation(element):
        placement = PlacementUtils.get_placement(element)
        R = array(placement)[:3, :3]
        if abs(R[2, 0]) < 1 - 1e-6:  # not gimbal lock
            ry = -asin(R[2, 0])
            cy = cos(ry)
            rx = atan2(R[2, 1] / cy, R[2, 2] / cy)
            rz = atan2(R[1, 0] / cy, R[0, 0] / cy)
        else:
            rz = 0
            if R[2, 0] == -1:
                ry = pi / 2
                rx = rz + atan2(R[0, 1], R[0, 2])
            else:
                ry = -pi / 2
                rx = -rz + atan2(-R[0, 1], -R[0, 2])
        rotation = Rotation(x=degrees(rx), y=degrees(ry), z=degrees(rz))
        return rotation

    @staticmethod
    def get_local_orientation(element):
        return PlacementUtils.get_rotation(element)

    @staticmethod
    def get_matrix(position) -> ndarray:
        matrix = eye(4)
        matrix[:, 3][:3] = [position.x, position.y, position.z]
        return matrix

    @staticmethod
    def placement_as_matrix(position: Position, rotation: Rotation or None) -> ndarray:
        translation_matrix = PlacementUtils.get_matrix(position)
        if rotation:
            rot_x = rot(rotation.x, "X")
            rot_y = rot(rotation.y, "Y")
            rot_z = rot(rotation.z, "Z")
            rotation_matrix = rot_z @ rot_y @ rot_x
            placement_matrix = translation_matrix @ rotation_matrix
            return round(placement_matrix, decimals=1)
        return round(translation_matrix, decimals=1)
    
    @staticmethod
    def get_global_z(elevation_offset, rel_storey):
        elevation = get_storey_elevation(rel_storey)
        elevation = elevation + elevation_offset
        return elevation

    @staticmethod
    def get_direction_vector(start, end):
        dx = end.x - start.x
        dy = end.y - start.y
        dz = end.z - start.z
        length = (dx**2 + dy**2 + dz**2)**0.5
        if length == 0:
            return (0, 0, 0)
        return (dx / length, dy / length, dz / length)

    @staticmethod
    def get_normal_vector(element):
        placement = PlacementUtils.get_placement(element)
        # Local Z axis is the third column of the rotation matrix
        normal_vector = placement[:3, 2]
        norm = (normal_vector[0]**2 + normal_vector[1]**2 + normal_vector[2]**2)**0.5
        if norm == 0:
            return (0.0, 0.0, 0.0)
        return (normal_vector[0]/norm, normal_vector[1]/norm, normal_vector[2]/norm)
    
    @staticmethod
    def offset_position_horizontal_plane(element, position, distance):
        normal = PlacementUtils.get_normal_vector(element)
        new_x = position.x + normal[0] * distance
        new_y = position.y + normal[2] * distance # funky hack TODO fix later
        new_z = position.z + normal[1] * distance
        return Position(new_x, new_y, new_z)
    
    @staticmethod
    def offset_position_along_axis_horizontal(position, rotation, distance):
        z_rot_rad = radians(rotation.z)
        dx = distance * cos(z_rot_rad)
        dy = distance * sin(z_rot_rad)
        new_x = position.x
        new_y = position.y + float(dy)
        new_z = position.z + float(dx)
        return Position(new_x, new_y, new_z)

    @staticmethod
    def get_z_rotation(direction_vector):
        dx, dy, dz = direction_vector
        angle = atan2(dy, dx)
        return degrees(angle)
    
    @staticmethod
    def get_rotation_from_vector(direction_vector):
        rotation = PlacementUtils.get_z_rotation(direction_vector)
        return Rotation(x=0.0, y=-90.0, z=rotation)

    
    @staticmethod
    def get_distance(start, end):
        dx = end.x - start.x
        dy = end.y - start.y
        dz = end.z - start.z
        return (dx**2 + dy**2 + dz**2)**0.5

    @staticmethod
    def get_center(start, end):
        return Position(
            x=(start.x + end.x) / 2,
            y=(start.y + end.y) / 2,
            z=(start.z + end.z) / 2
        )

    @staticmethod
    def get_element_direction(element):
        representation = get_representation(element, "Model", "Body", "MODEL_VIEW")
        if representation:
            for item in representation.Items:
                # Assuming local X direction is the element's direction (e.g., wall direction)
                dir_local = array([1, 0, 0])
                placement_matrix = PlacementUtils.get_placement(element)
                rotation_matrix = array(placement_matrix)[:3, :3]
                dir_world = rotation_matrix @ dir_local
                return tuple(float(x) for x in dir_world)
        return (1.0, 0.0, 0.0)

    @staticmethod
    def get_axis_intersection(axis1:entity_instance, axis2:entity_instance ) -> Position:
        grid = None
        x = 0.0
        y = 0.0
        for axis in [axis1, axis2]:
            if axis.PartOfU:
                grid = axis.PartOfU[0]
                break
            elif axis.PartOfV:
                grid = axis.PartOfV[0]
                break
            elif axis.PartOfW:
                grid = axis.PartOfW[0]
                break
        if not grid:
            return Position(0.0, 0.0, 0.0)
        for axis in [axis1, axis2]:
            if axis.AxisCurve:
                p1 = axis.AxisCurve.Points[0]
                p2 = axis.AxisCurve.Points[1]
                if axis.PartOfU:
                    y = p1.Coordinates[1] if p1.Coordinates[1] == p2.Coordinates[1] else p1.Coordinates[1]
                elif axis.PartOfV:
                    x = p1.Coordinates[0] if p1.Coordinates[0] == p2.Coordinates[0] else p1.Coordinates[0]
        return Position(x, y, 0.0)


    @staticmethod
    def get_placement_axes(orientation: str) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
        if orientation == "vertical":
            return ((0.0, 0.0, 1.0), (1.0, 0.0, 0.0))
        elif orientation == "horizontal":
            return ((0.0, 0.0, 0.0), (1.0, 0.0, 0.0))
        else:
            raise ValueError("Orientation must be 'horizontal' or 'vertical'")
    
    @staticmethod
    def underside_axis(orientation: str, depth: float) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
        if orientation == "vertical":
            axis = ((0.0, 0.0, 0.0), (0.0, 0.0, depth))
        elif orientation == "horizontal":
            axis = ((0.0, 0.0, 0.0), (0.0, depth, 0.0))
        else:
            raise ValueError("Orientation must be 'horizontal' or 'vertical'")
        return axis




def available_types(model, ifc_class):
    types = model.by_type(ifc_class)
    return types

def get_random_type(model, ifc_class):
    types = model.by_type(ifc_class)
    if types:
        
        return random.choice(types)
    return None


