async function loadProperties(modelName, GlobalId, {context, psetTool}) {

    const psetResult = await psetTool.loadProperties(modelName, GlobalId);

    if (psetResult.psets?.length > 0 || psetResult.qtos?.length > 0) {

      psetTool.storeProperties(GlobalId, psetResult);
      
    }
    
}

export {
    loadProperties
}