import dataStore from "../../data/index.js";

import { Collection } from "../../data/index.js"

import { Attribute, BIMAttributes } from "../../data/index.js"

import tools from "../index.js";

import * as THREE from "three";

import IfcLiteGeometryTool from "./ifcLiteGeometry.js";

import GeometryTool from "./geometry.js";

import { extractLiteModelIdentityFromBuffer } from "./ifcLiteModelMetadata.js";

class ProjectTool {

    static modelBuffers = new Map();

    static modelPaths = new Map();

    static isPythonBimReady() {
        return Boolean(tools.code.pyWorker.isReady && tools.code.pyWorker.initialized.bim);
    }

    static modelHasCachedSource(modelName) {
        return ProjectTool.modelBuffers.has(modelName) || ProjectTool.modelPaths.has(modelName);
    }

    static storeProject( context, identity ) {

        const { GlobalId, Name, FileName, TotalElements, Path } = identity;

        const dataCollection = new Collection().setType('BIM_ProjectCollection')

        dataCollection.GlobalId = GlobalId;
        
        dataCollection.name = Name;

        dataCollection.fileName = FileName;

        dataCollection.totalElements = TotalElements

        dataCollection.path = Path || null;

        dataStore.registerCollection(GlobalId, dataCollection);

        if (Path) {
            ProjectTool.modelPaths.set(FileName, Path);
        }

        if (!context.ifc.availableModels.includes(FileName)) {
            context.ifc.availableModels.push(FileName);
        }
    }

    static deleteProject( { GlobalId } ) {
        dataStore.unregisterCollection(GlobalId);
    }

    /**
     * Refresh/update the project collection with a new name
     * @param {string} GlobalId - The project's global ID
     * @param {string} newName - The new project name
     */
    static refreshProjectCollection(GlobalId, newName) {
        const collection = dataStore.getCollection(GlobalId);
        
        if (collection) {
            collection.name = newName;
        }
    }

    static async newIFCModel(modelName = "default") {

        return await tools.code.pyWorker.run_api('newIFCModel', { modelName: modelName });

    }

    static async loadModelFromPath(path = null) {
        const fileName = path.split("/").pop();

        if (ProjectTool.isPythonBimReady()) {
            const result = await tools.code.pyWorker.run_api("loadModelFromPath", { path });

            if (fileName) {
                ProjectTool.modelPaths.set(fileName, path);

                try {
                    const response = await fetch(path);

                    if (response.ok) {
                        const buffer = await response.arrayBuffer();

                        ProjectTool.modelBuffers.set(fileName, buffer);
                    }
                } catch (error) {
                    console.warn("[ProjectTool.loadModelFromPath] IFC buffer cache failed", error);
                }
            }

            return result;
        }

        const response = await fetch(path);

        if (!response.ok) {
            throw new Error(`Failed to fetch IFC model from ${path}`);
        }

        const buffer = await response.arrayBuffer();

        if (fileName) {
            ProjectTool.modelPaths.set(fileName, path);

            ProjectTool.modelBuffers.set(fileName, buffer);
        }

        const identity = await extractLiteModelIdentityFromBuffer(fileName || "model.ifc", buffer);

        return {
            GlobalId: identity.GlobalId,
            Name: identity.Name,
            totalElements: identity.totalElements,
        };
    }

    static async loadModelFromBlob(fileName, arrayBuffer) {
        ProjectTool.modelBuffers.set(fileName, arrayBuffer.slice(0));

        if (ProjectTool.isPythonBimReady()) {
            const decoder = new TextDecoder("utf-8");

            const blobContent = decoder.decode(arrayBuffer);

            return await tools.code.pyWorker.run_api("loadModelFromBlob", { fileName, blobContent });
        }

        const identity = await extractLiteModelIdentityFromBuffer(fileName, arrayBuffer);

        return {
            GlobalId: identity.GlobalId,
            Name: identity.Name,
            totalElements: identity.totalElements,
        };
    }

    static async getModelBuffer(modelName) {
        if (ProjectTool.modelBuffers.has(modelName)) {
            return ProjectTool.modelBuffers.get(modelName);
        }

        const modelPath = ProjectTool.modelPaths.get(modelName);

        if (modelPath) {
            const response = await fetch(modelPath);

            if (!response.ok) {
                throw new Error(`Failed to fetch IFC model from ${modelPath}`);
            }

            const buffer = await response.arrayBuffer();

            ProjectTool.modelBuffers.set(modelName, buffer);

            return buffer;
        }

        throw new Error(`No IFC source buffer found for ${modelName}`);
    }

    /**
     * Export model to content for saving (ifc, ifcxml, or ifczip).
     * @param {string} modelName - Loaded model name (e.g. "model.ifc")
     * @param {string} format - "ifc" | "ifcxml" | "ifczip"
     * @returns {Promise<{ content: string, filename: string, mimeType: string, isBase64?: boolean }>}
     */
    static async saveModelContent(modelName, format) {
        return await tools.code.pyWorker.run_api("saveModel", { modelName, format });
    }

    static async getModelElementTypes(modelName) {

        return await tools.bim.ifc.get(modelName, "IfcElementType");
    }

    static async getModelElements(modelName) {

        return await tools.bim.ifc.get(modelName, "IfcElement");
    }

    static async getModelWorkSchedules(modelName) {

        return await tools.bim.ifc.get(modelName, "IfcWorkSchedule");
    }

    static async getModelWorkPlan(modelName) {

        return await tools.bim.ifc.get(modelName, "IfcWorkPlan");
    }

    static async getModelCostSchedules(modelName) {

        return await tools.bim.ifc.get(modelName, "IfcCostSchedule");
    }

    static async getModelOverview(modelName) {
        return await tools.code.pyWorker.run_api("getDirectorOverview", {
            modelName,
        });
    }

    static async getDirectorFilteredSlice(modelName, filterSpec) {
        const spec = filterSpec && typeof filterSpec === "object" ? filterSpec : {};

        return await tools.code.pyWorker.run_api("getDirectorFilteredSlice", {
            modelName,
            filterSpec: spec,
        });
    }

    static async getModelElementClasses(modelName) {
        const elements = await tools.bim.ifc.get(modelName, "IfcElement");

        const classesSet = new Set();

        elements.forEach(element => {
            if (element.type) {
                classesSet.add(element.type);
            }
        });

        return Array.from(classesSet);
    }

  static async generateMeshLayerStructure(source='IFC4', modelName) {

    if (source == "IFC4") {
      
      return await tools.code.pyWorker.run_api("generateMeshLayerStructure", { modelName } );
      
    }

        if (source == "IFC_LITE") {
            const modelBuffer = await ProjectTool.getModelBuffer(modelName);

            return await IfcLiteGeometryTool.generateMeshLayerStructure(modelName, modelBuffer);
        }

        throw new Error(`Unsupported geometry source: ${source}`);
  }

  /**
   * Create a Three.js layer from spatial structure data
   * Supports instanced rendering for repeated geometries (windows, doors, etc.)
   * 
   * Instanced meshes are added directly as children of their element groups,
   * maintaining the spatial hierarchy while still benefiting from GPU instancing.
   * 
   * @param {Object} spatialStructure - The spatial structure with meshData
   * @param {Object} instancedGeometryMap - Map of geometryId to instance data
   * @param {Object} [layerOptions]
   * @param {'merged'|'multiMesh'} [layerOptions.ifcGeometryAssembly='merged']
   * @returns {THREE.Group} The project root group
   */
  static createLayer(spatialStructure, instancedGeometryMap = {}, layerOptions = {}) {
      const ifcGeometryAssembly =
        layerOptions.ifcGeometryAssembly === "multiMesh" ? "multiMesh" : "merged";

      const meshAssemblyOptions = { assembly: ifcGeometryAssembly };

      const globalIdToInstanceInfo = new Map();

      for (const [geometryId, instanceData] of Object.entries(instancedGeometryMap)) {
        const { instancedMeshes, instanceMapping } = GeometryTool.generateInstancedMesh(instanceData);

        for (const [globalId, meshInfos] of instanceMapping.entries()) {
          globalIdToInstanceInfo.set(globalId, { 
            meshes: instancedMeshes,
            instanceInfos: meshInfos,  
            geometryId: geometryId
          });
        }
      }

      function generateStructure(structure, parent) {
          for (const [GlobalId, objectData] of Object.entries(structure)) {

              const group = new THREE.Group();

              const { id, name, type, meshData, container, children } = objectData;

              group.name = name;

              group.isIfc = true;

              group.uuid = GlobalId;

              group.GlobalId = GlobalId;

              group.ifcClassification = type;

              group.entityId = id;

              group.isSpatialContainer = container || false;

              parent.add(group);

              const instanceInfo = globalIdToInstanceInfo.get(GlobalId);
              
              if (instanceInfo) {
                group.isInstancedRef = true;

                group.geometryId = instanceInfo.geometryId;

                group.instancedMeshInfos = instanceInfo.instanceInfos; 
              } else if (meshData && meshData.geometries) {
                
                const { meshes, lines } = GeometryTool.createThreeJSMesh(
                  meshData,
                  GlobalId,
                  meshAssemblyOptions,
                );
                
                meshes.forEach(mesh => group.add(mesh));

                if (lines) {
                  group.add(lines);
                }
              }

              if (children) {
                generateStructure(children, group);
              }
          }
      } 

      const projectNode = Object.entries(spatialStructure)[0];

      const children = projectNode[1].children;

      const unsorted = projectNode[1].unsorted;

      const projectRoot = new THREE.Group();

      projectRoot.name = projectNode[1].name;

      projectRoot.globalIdToInstanceInfo = globalIdToInstanceInfo;

      generateStructure(children, projectRoot);

      if (globalIdToInstanceInfo.size > 0) {
        const instancedMeshContainer = new THREE.Group();

        instancedMeshContainer.name = '_InstancedMeshes';

        instancedMeshContainer.visible = true;

        instancedMeshContainer.isHelperGroup = true;

        const addedMeshes = new Set();

        for (const { meshes } of globalIdToInstanceInfo.values()) {
          for (const mesh of meshes) {
            if (!addedMeshes.has(mesh)) {
              addedMeshes.add(mesh);

              instancedMeshContainer.add(mesh);
            }
          }
        }
        
        projectRoot.add(instancedMeshContainer);
      }

      if (unsorted && unsorted.length > 0) {
          const unsortedGroup = new THREE.Group();

          unsortedGroup.name = 'Unsorted';

          projectRoot.add(unsortedGroup);

          for (const globalId of unsorted) {
              const objectData = spatialStructure[globalId];

              if (objectData) {
                  const group = new THREE.Group();

                  group.name = objectData.name;

                  group.isIfc = true;

                  group.uuid = globalId;

                  group.GlobalId = globalId;

                  group.ifcClassification = objectData.type;

                  group.entityId = objectData.id;

                  group.isSpatialContainer = false;

                  unsortedGroup.add(group);

                  const instanceInfo = globalIdToInstanceInfo.get(globalId);
                  
                  if (instanceInfo) {
                      group.isInstancedRef = true;

                      group.geometryId = instanceInfo.geometryId;

                      group.instancedMeshInfos = instanceInfo.instanceInfos;
                  } else if (objectData.meshData && objectData.meshData.geometries) {
                      const { meshes, lines } = GeometryTool.createThreeJSMesh(
                        objectData.meshData,
                        globalId,
                        meshAssemblyOptions,
                      );

                      meshes.forEach(mesh => group.add(mesh));

                      if (lines) {
                          group.add(lines);
                      }
                  }
              }
          }
      }

      return projectRoot;
  }
  
    static getWeatherData( location="London", apiKEY ) {

        const encodedLocation = encodeURIComponent(location);

        console.log("Fetching weather data for location:",  encodedLocation);

        const url = `https://api.weatherapi.com/v1/current.json?key=${apiKEY}&q=${encodedLocation}&aqi=no`;

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return response.json();
            })
            .then(data => {
                return data;
            })
            .catch(error => {
                return null;
            });
    }

    /**
     * Refresh weather data for a location and optionally update an existing panel
     * @param {string} location - Location to fetch weather for
     * @param {Object} weatherPanel - Optional existing weather panel to update
     * @returns {Promise<{data: Object, updated: boolean}>} Weather data and update status
     */
    static async refreshWeatherData(location = "London", weatherPanel = null) {
        const weatherData = await ProjectTool.getWeatherData(location);
        
        if (!weatherData) {
            return { data: null, updated: false, error: "Failed to fetch weather data" };
        }

        let updated = false;

        if (weatherPanel && typeof weatherPanel.updateWeather === 'function') {
            weatherPanel.updateWeather(weatherData);

            updated = true;
        }

        return { data: weatherData, updated };
    }

    /**
     * Update an existing weather panel with new data
     * @param {Object} weatherPanel - The weather panel to update
     * @param {Object} weatherData - The weather data to apply
     * @returns {boolean} True if updated successfully
     */
    static updateWeatherPanel(weatherPanel, weatherData) {
        if (!weatherPanel) {

            return false;
        }

        if (!weatherData || !weatherData.current) {

            return false;
        }

        if (typeof weatherPanel.updateWeather !== 'function') {

            return false;
        }

        weatherPanel.updateWeather(weatherData);

        return true;
    }

}

export default ProjectTool;
