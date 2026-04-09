from json import tool
import numpy as np
import numpy.typing as npt
from typing import Union, Any, Optional, cast
from ifcopenshell.util.shape_builder import np_to_4d
import ifcopenshell.util.placement
import ifcopenshell.util.geolocation
import ifcopenshell.util.shape

def normalise_angle(angle: float) -> float:
    """Normalise an angle between -179 and 180"""
    angle = angle % 360
    angle = (angle + 360) % 360
    if angle > 180:
        angle -= 360
    return angle

class Geolocation:

    def __init__(self):
        self.settings = {
            "distance_limit": 1000.0,  # in meters
            "false_origin": None,
            "project_north": None,
        }
        pass

    def calculate_model_offset(self) -> None:
        # TODO:
        if isinstance(self.file, ifcopenshell.sqlite):
            print("WARNING. Calculating model offset for IFCSQLite is not supported.")
            return
        props = {
            "has_three_offset": self.settings["false_origin"] is not None,
        }
        if self.ifc_import_settings.false_origin_mode == "MANUAL":
            pass
            # self.set_manual_three_offset(self.file)
        elif self.ifc_import_settings.false_origin_mode == "AUTOMATIC":
            pass
            # if not props.has_three_offset:
            #     self.guess_false_origin(self.file)
        self.set_model_origin()

    def guess_false_origin(self, ifc_file: ifcopenshell.file) -> None:
        if ifc_file.schema == "IFC2X3":
            project = ifc_file.by_type("IfcProject")[0]
        else:
            project = ifc_file.by_type("IfcContext")[0]
        site = self.find_decomposed_ifc_class(project, "IfcSite")
        if site and self.is_element_far_away(site):
            return self.guess_false_origin_and_project_north(ifc_file, site)
        building = self.find_decomposed_ifc_class(project, "IfcBuilding")
        if building and self.is_element_far_away(building):
            return self.guess_false_origin_and_project_north(ifc_file, building)
        return self.guess_false_origin_from_elements(ifc_file)

    def find_decomposed_ifc_class(
        self, element: ifcopenshell.entity_instance, ifc_class: str
    ) -> Union[ifcopenshell.entity_instance, None]:
        if element.is_a(ifc_class):
            return element
        rel_aggregates = element.IsDecomposedBy
        for rel_aggregate in rel_aggregates:
            for part in rel_aggregate.RelatedObjects:
                result = self.find_decomposed_ifc_class(part, ifc_class)
                if result:
                    return result


    @classmethod
    def guess_false_origin_and_project_north(
        self, ifc_file: ifcopenshell.file, element: ifcopenshell.entity_instance
    ) -> None:
        if not element.ObjectPlacement or not element.ObjectPlacement.is_a("IfcLocalPlacement"):
            return
        placement = ifcopenshell.util.placement.get_local_placement(element.ObjectPlacement)
        offset_point = [placement[0][3], placement[1][3], placement[2][3]]
        self.settings["false_origin"] = ifcopenshell.util.geolocation.auto_xyz2enh(
            ifc_file, *offset_point, should_return_in_map_units=False
        )

        # Prioritise coordinate operation angles
        angle = ifcopenshell.util.geolocation.get_grid_north(ifc_file)
        if np.isclose(angle, 0.0):
            # Fallback to the placement angle as a good guess
            xaa, xao = placement[:, 0][0:2]
            angle = ifcopenshell.util.geolocation.xaxis2angle(xaa, xao)

        self.settings["project_north"] = 0 if np.isclose(angle, 0) else angle
        self.set_manual_three_offset(ifc_file)

    def guess_false_origin_from_elements(self, ifc_file: ifcopenshell.file) -> None:
        # Civil BIM applications like to work in absolute coordinates, where the
        # ObjectPlacement is usually 0,0,0 (but not always, so we'll need to
        # check for the actual transformation) but each individual coordinate of
        # the shape representation is in absolute values.
        offset_point = self.get_offset_point(ifc_file)
        if offset_point is None:
            return
        self.settings["false_origin"] = ifcopenshell.util.geolocation.auto_xyz2enh(
            ifc_file, *offset_point, should_return_in_map_units=False
        )
        if (angle := ifcopenshell.util.geolocation.get_grid_north(ifc_file)) and not tool.Cad.is_x(angle, 0):
            self.settings["project_north"] = angle
        self.set_manual_three_offset(ifc_file)

    @classmethod
    def is_element_far_away(self, element: ifcopenshell.entity_instance) -> bool:
        try:
            placement = ifcopenshell.util.placement.get_local_placement(element.ObjectPlacement)
            point = placement[:, 3][0:3]
            return self.is_point_far_away(point, is_meters=False)
        except:
            return False

    @classmethod
    def is_point_far_away(
        self, point: Union[ifcopenshell.entity_instance, npt.NDArray[np.float64]], is_meters: bool = True
    ) -> bool:
        limit = self.settings["distance_limit"]
        limit = limit if is_meters else (limit / self.unit_scale)
        if isinstance(point, ifcopenshell.entity_instance):
            coords = cast(tuple[float, ...], point.Coordinates)
        else:
            coords = point
        return any(abs(c) > limit for c in coords)

    def get_offset_point(self, ifc_file: ifcopenshell.file) -> Union[npt.NDArray[np.float64], None]:
        # Check walls first, as they're usually cheap
        elements = ifc_file.by_type("IfcWall")
        elements += ifc_file.by_type("IfcElement")

        if ifc_file.schema not in ("IFC2X3", "IFC4"):
            elements += ifc_file.by_type("IfcLinearPositioningElement")
            elements += ifc_file.by_type("IfcReferent")
            elements += ifc_file.by_type("IfcGrid")

        if ifc_file.schema == "IFC2X3":
            elements += ifc_file.by_type("IfcSpatialStructureElement")
        else:
            elements += ifc_file.by_type("IfcSpatialElement")

        for element in elements:
            if not element.Representation:
                continue
            shape = self.create_generic_shape(element, is_gross=True)
            if not shape:
                continue
            mat = ifcopenshell.util.shape.get_shape_matrix(shape)
            verts = ifcopenshell.util.shape.get_vertices(shape.geometry)
            point = (mat @ np_to_4d(verts[0]))[:3]
            if self.is_point_far_away(point, is_meters=True):
                # Arbitrary origins should be to the nearest millimeter.
                # Anything more precise is just ridiculous from a practical surveying perspective.
                return np.array([round(float(p), 3) / self.unit_scale for p in point])
            break


    def get_model_origin(self, model) -> None:
        unit_scale = ifcopenshell.util.unit.calculate_unit_scale(model)
        gprops = {
            "has_three_offset": self.settings["false_origin"] is not None,
            "three_x_axis_abscissa": 1.0,
            "three_x_axis_ordinate": 0.0,
            "model_origin": [0.0, 0.0, 0.0],
            "model_origin_si": [0.0, 0.0, 0.0],
            "model_project_north": 0.0,
            
        }
        e, n, h = self.xyz2enh((0, 0, 0), should_return_in_map_units=False)

        gprops["model_origin"] = f"{e},{n},{h}"
        gprops["model_origin_si"] = f"{e * unit_scale},{n * unit_scale},{h * unit_scale}"
        angle = ifcopenshell.util.geolocation.get_grid_north(model)
        if gprops["has_three_offset"]:
            angle += ifcopenshell.util.geolocation.xaxis2angle(
                float(gprops["three_x_axis_abscissa"]), float(gprops["three_x_axis_ordinate"])
            )
            angle = normalise_angle(angle)
        gprops["model_project_north"] = str(angle)

        return gprops


    def xyz2enh(
        self, coordinates: tuple[float, float, float], should_return_in_map_units: bool = True
    ) -> tuple[float, float, float]:
        props = self.get_georeference_props()
        if props.has_three_offset:
            coordinates = ifcopenshell.util.geolocation.xyz2enh(
                coordinates[0],
                coordinates[1],
                coordinates[2],
                float(props.three_offset_x),
                float(props.three_offset_y),
                float(props.three_offset_z),
                float(props.three_x_axis_abscissa),
                float(props.three_x_axis_ordinate),
            )
        return ifcopenshell.util.geolocation.auto_xyz2enh(
            tool.Ifc.get(), *coordinates, should_return_in_map_units=should_return_in_map_units
        )

    def set_manual_three_offset(self, ifc_file: ifcopenshell.file) -> None:
        false_origin = np.array(self.settings.false_origin)
        model_offset = np.array(
            ifcopenshell.util.geolocation.auto_enh2xyz(
                ifc_file, *self.settings.false_origin, is_specified_in_map_units=False
            )
        )
        zero_origin = np.array((0, 0, 0))
        has_offset = not np.allclose(model_offset, zero_origin)

        model_north = ifcopenshell.util.geolocation.get_grid_north(ifc_file)
        project_north = self.settings["project_north"]
        model_rotation = normalise_angle(project_north - model_north)
        has_rotation = not np.isclose(model_north, project_north)

        if not has_offset:
            model_offset = false_origin = (0, 0, 0)

        if np.isclose(project_north, 0):
            project_north = 0

        if has_offset or has_rotation:
            props = tool.Georeference.get_georeference_props()
            props.three_offset_x = str(model_offset[0])
            props.three_offset_y = str(model_offset[1])
            props.three_offset_z = str(model_offset[2])
            xaa, xao = ifcopenshell.util.geolocation.angle2xaxis(model_rotation)
            props.three_x_axis_abscissa = str(xaa)
            props.three_x_axis_ordinate = str(xao)
            props.has_three_offset = True

