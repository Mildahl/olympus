import { Collection, _generateGuid } from "./Collection.js";

import {Attribute} from "./Attribute.js";
export class MeasurementCollection extends Collection {
  constructor(options = {}) {
    super({
      name: options.name || 'Measurements',
      type: 'MeasurementCollection',
      GlobalId: options.GlobalId || _generateGuid(),
      classificationCode: 'MEASURE',
    });

    this.measurements = [];
  }

  addMeasurement(measurement) {
    const record = {
      id: measurement.id,
      type: measurement.type,
      value: measurement.value,
      unit: measurement.unit,
      points: this.serializePoints(measurement),
      createdAt: new Date().toISOString(),
    };

    this.measurements.push(record);

    return record;
  }

  removeMeasurement(id) {
    const index = this.measurements.findIndex(m => m.id === id);

    if (index !== -1) {
      this.measurements.splice(index, 1);

      return true;
    }

    return false;
  }

  clearMeasurements() {
    this.measurements = [];
  }

  getMeasurements() {
    return [...this.measurements];
  }

  serializePoints(measurement) {
    if (measurement.start && measurement.end) {
      return {
        start: { x: measurement.start.x, y: measurement.start.y, z: measurement.start.z },
        end: { x: measurement.end.x, y: measurement.end.y, z: measurement.end.z },
      };
    }

    if (measurement.vertex && measurement.point1 && measurement.point3) {
      return {
        vertex: { x: measurement.vertex.x, y: measurement.vertex.y, z: measurement.vertex.z },
        point1: { x: measurement.point1.x, y: measurement.point1.y, z: measurement.point1.z },
        point3: { x: measurement.point3.x, y: measurement.point3.y, z: measurement.point3.z },
      };
    }

    if (measurement.points) {
      return {
        points: measurement.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
      };
    }

    if (measurement.point && measurement.perpPoint) {
      return {
        point: { x: measurement.point.x, y: measurement.point.y, z: measurement.point.z },
        perpPoint: { x: measurement.perpPoint.x, y: measurement.perpPoint.y, z: measurement.perpPoint.z },
      };
    }

    return {};
  }

  toJSON() {
    return {
      ...super.toJSON?.() || {},
      type: this.type,
      name: this.name,
      GlobalId: this.GlobalId,
      measurements: this.measurements,
    };
  }
}
