export class ObjectRegistry {
  constructor() {
    this.objects = new Map();
  }

  get(globalId) {
    const data = this.objects.get(globalId);

    return data ? data.object : null;
  }

  getData(globalId) {
    return this.objects.get(globalId);
  }

  getAll() {
    return Array.from(this.objects.values()).map((data) => data.object);
  }

  register(object, metadata = {
    isIfc: false,
    expressId: null,
    ifcClass: null,
    guid: null,
    name: null,
    objectSource: null
  }) {

    if (metadata.isIfc){

      object.uuid = metadata.GlobalId,

      object.expressId = metadata.expressId;

      object.ifcClass = metadata.ifcClass;
      
      object.isIfc = true;
      object.name = `#${metadata.expressId} ${metadata.name ||'Unnamed'} `;
      
      object.objectSource = metadata.objectSource;
    }

    this.objects.set(object.uuid, { object, ...metadata });

    return true;
  }
  link_element(object, metadata) {
    this.register(object, metadata);
  }
  unregister(objectOrUuid) {
    const uuid =
      typeof objectOrUuid === "string" ? objectOrUuid : objectOrUuid.uuid;

    const data = this.objects.get(uuid);

    if (data) {
      this.objects.delete(uuid);
    }
  }
  count() {
    return this.objects.size;
  }

  getVisibleObjects() {
    return Array.from(this.objects.values())
      .filter((data) => this.isObjectVisible(data.object))
      .map((data) => data.object);
  }

  getObjectsByIfcClass(ifcClass) {
    return Array.from(this.objects.values())
      .filter((data) => data.ifcClass === ifcClass)
      .map((data) => data.object);
  }

  getObjectsByType(type, options = {}) {
    return Array.from(this.objects.values())
      .filter((data) => {
        if (data.object.type !== type) return false;

        if (options.hasGuid && !data.guid) return false;

        return true;
      })
      .map((data) => data.object);
  }

  isObjectVisible(object) {
    if (!object.visible) return false;

    let parent = object.parent;

    while (parent) {
      if (!parent.visible) return false;

      parent = parent.parent;
    }

    return true;
  }

  getEdgeForMesh(mesh) {
    return null;
  }

  getMeshForEdge(edge) {
    return null;
  }

  clear() {
    this.objects.clear();
  }

  dispose() {
    this.clear();
  }
}
