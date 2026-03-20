const sceneColor = 0x1b2122;

export const SceneConfig = {
    backgroundColor: sceneColor,
    enableFog: false,
    fog: {
      fogType: 'FogExp2', // 'None' | 'Fog' | 'FogExp2'
      fogColor: sceneColor,
      fogNear: 50,
      fogFar: 2000,
      fogDensity: 0.01,
    },
    highQuality: true,
    gridSize: 10000,
    gridDivisions: 1000,
    primaryGrid: {
      size: 10000,
      divisions: 10000,
      color: 0x555555,
      opacity: 0.11,
    },
    secondaryGrid: {
      size: 10000,
      divisions: 1000,
      color: 0xaaaaaa,
      opacity: 0.2,
    },
    gridVisible: true,
    axesVisible: true,
    axesSize: 30,
  };