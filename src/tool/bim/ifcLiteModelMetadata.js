function stepEntityNameToIfcClassName(stepEntityName) {
  const upper = String(stepEntityName).toUpperCase();

  if (!upper.startsWith("IFC") || upper.length <= 3) {
    return String(stepEntityName);
  }

  const tail = upper.slice(3);

  return `Ifc${tail.charAt(0)}${tail.slice(1).toLowerCase()}`;
}

function countIfcElementLikeEntities(dataStore, getInheritanceChainForEntity) {
  if (!getInheritanceChainForEntity || !dataStore.entityIndex?.byType) {
    return 0;
  }

  let total = 0;

  for (const [stepTypeName, expressIds] of dataStore.entityIndex.byType.entries()) {
    if (!expressIds || expressIds.length === 0) continue;

    const ifcClassName = stepEntityNameToIfcClassName(stepTypeName);

    let chain = null;

    try {
      chain = getInheritanceChainForEntity(ifcClassName);
    } catch {
      try {
        chain = getInheritanceChainForEntity(stepTypeName);
      } catch {
        chain = null;
      }
    }

    if (chain && Array.isArray(chain) && chain.includes("IfcElement")) {
      total += expressIds.length;
    }
  }

  return total;
}

export async function extractLiteModelIdentityFromBuffer(fileName, arrayBuffer) {
  const parserModule = await import(
    /* webpackChunkName: "ifc-lite-parser-metadata" */
    /* webpackMode: "lazy" */
    "@ifc-lite/parser"
  );

  const IfcParser = parserModule.IfcParser;

  const extractEntityAttributesOnDemand = parserModule.extractEntityAttributesOnDemand;

  const getInheritanceChainForEntity = parserModule.getInheritanceChainForEntity;

  const parser = new IfcParser();

  const dataStore = await parser.parseColumnar(arrayBuffer);

  const baseName = String(fileName).replace(/\.ifc$/i, "");

  let projectExpressId = null;

  const byType = dataStore.entityIndex?.byType;

  if (byType) {
    for (const [typeName, expressIds] of byType.entries()) {
      if (String(typeName).toUpperCase() === "IFCPROJECT" && expressIds && expressIds.length > 0) {
        projectExpressId = expressIds[0];

        break;
      }
    }
  }

  let GlobalId = null;

  let Name = baseName;

  if (projectExpressId != null && typeof extractEntityAttributesOnDemand === "function") {
    const attributes = extractEntityAttributesOnDemand(dataStore, projectExpressId) || {};

    GlobalId = attributes.globalId ?? attributes.GlobalId ?? null;

    Name = attributes.name ?? attributes.Name ?? Name;
  }

  if (!GlobalId) {
    GlobalId = `IFCLITE_PROJECT_${baseName}`;
  }

  let totalElements = countIfcElementLikeEntities(dataStore, getInheritanceChainForEntity);

  if (totalElements === 0) {
    totalElements = dataStore.entityCount ?? 0;
  }

  return {
    GlobalId,
    Name,
    totalElements,
  };
}
