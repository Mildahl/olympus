import { Collection, _generateGuid } from "./Collection.js";

class SpatialCollection extends Collection {
  constructor({
    name = "Template_Spatial_Collection",
    type = "Spatial_Collection",
    GlobalId = null,
    entityId = null,
    classificationCode = "AECO_Spatial",
  } = {}) {
    super({ name, type, GlobalId, entityId, classificationCode });

    this.scene = null;

    this.RelativePlacement = null;

    this.AecoMapProjection = {
      latitude: 0,
      longitude: 0,
      elevation: 0,
    };
  }
}

class CRS_Spatial_Collection extends SpatialCollection {
  constructor({
    name = "Template_CRS_Collection",
    type = "Georeferenced_Spatial_Collection",
    GlobalId = null,
    entityId = null,
    classificationCode = "IfcProjectedCRS",
  } = {}) {
    super({ name, type, GlobalId, entityId, classificationCode });

    this.IfcProjectedCRS = {
      GeodeticDatum: null, 
      VerticalDatum: null, 
      MapProjection: null, 
      MapZone: null, 
      MapUnit: "Meter", 
    };

    this.IfcMapConversion = {
      Eastings: 0,
      Northings: 0,
      OrthogonalHeight: 0,
      XAxisAbscissa: 1,
      XAxisOrdinate: 0,
      Scale: 1,
    };
  }
}

export { SpatialCollection, CRS_Spatial_Collection };