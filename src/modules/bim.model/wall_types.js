import Paths from "../../utils/paths.js";

const typeData = {
  Wall: [
    {
      GlobalId: "wal50",
      Name: "WAL50",
      Description: "50cm generic wall",
      icon: Paths.data("resources/icons/tools/WallTool.svg"),
      instances: 2,
      cost: { costValue: 150, measureUnit: "m²" },
    },
    {
      GlobalId: "wal100",
      Name: "WAL100",
      Description: "100cm generic wall",
      icon: Paths.data("resources/icons/tools/WallTool.svg"),
      instances: 1,
      cost: { costValue: 300, measureUnit: "m²" },
    },
    {
        GlobalId: "wal200",
        Name: "WAL200",
        Description: "200cm generic wall",
        icon: Paths.data("resources/icons/tools/WallTool.svg"),
        instances: 0,
        cost: { costValue: 600, measureUnit: "m²" },
    },
  ],
  Window: [
    {
      GlobalId: "winA",
      Name: "WIN_A",
      Description: "SlGlobalIding window",
      icon: Paths.data("resources/icons/tools/WindowTool.svg"),
      instances: 3,
      cost: { costValue: 200, measureUnit: "U" },
    },
    {
      GlobalId: "winB",
      Name: "WIN_B",
      Description: "Fixed window",
      icon: Paths.data("resources/icons/tools/WindowTool.svg"),
      instances: 1,
    cost: { costValue: 150, measureUnit: "U" },
    },
  ],
  Door: [
    {
      GlobalId: "drA",
      Name: "DOOR_A",
      Description: "Single door",
      icon: Paths.data("resources/icons/tools/DoorTool.svg"),
      instances: 4,
      cost: { costValue: 100, measureUnit: "U" },
    },
    {
      GlobalId: "drB",
      Name: "DOOR_B",
      Description: "Double door",
      icon: Paths.data("resources/icons/tools/DoorTool.svg"),
      instances: 0,
        cost: { costValue: 250, measureUnit: "U" },
    },
  ],
  Column: [
    {
      GlobalId: "colA",
      Name: "COL_A",
      Description: "C35/C40 concrete",
      icon: Paths.data("resources/icons/tools/ColumnTool.svg"),
      instances: 2,
      cost: { costValue: 200, measureUnit: "m³" },
    }  ,
    {
      GlobalId: "colB",
      Name: "COL_B",
      Description: "C35/C40 concrete with additives",
      icon: Paths.data("resources/icons/tools/ColumnTool.svg"),
      instances: 1,
    cost: { costValue: 240, measureUnit: "m³" },
    },
  ],
  Beam: [
    {
      GlobalId: "bmA",
      Name: "BEAM_A",
      Description: "C35/C40 concrete beam",
      icon: Paths.data("resources/icons/tools/BeamTool.svg"),
      instances: 5,
      cost: { costValue: 200, measureUnit: "m³" },
    },
    {
      GlobalId: "bmB",
      Name: "BEAM_B",
      Description: "C35/C40 concrete beam",
      icon: Paths.data("resources/icons/tools/BeamTool.svg"),
      instances: 0,
      cost: { costValue: 200, measureUnit: "m³" },
    },
  ],
};

export default typeData;
