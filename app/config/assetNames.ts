/**
 * Blender object names from `public/Asset Names/Model.blend` / AuroraModel.glb.
 * Use these strings with `scene.getObjectByName()`.
 */

export const assetNames = {
  metro: {
    /** Runtime name after GLTFLoader (Blender export: Metro.001) */
    train: "Metro001",
    /** Left metro scene panel (Blender export: metrowithstation1.001) */
    stationLeft: "metrowithstation1001",
    /** Right metro scene panel (Blender export: metrowithstation1.002) */
    stationRight: "metrowithstation1002",
    sheikhZayedRoad: "SHEIKHZAYEDROAD001",
    futureMuseum: "futuremuseum001",
  },
  cars: {
    /** Blender: Car1.001 */
    sedan: "Car1001",
    /** Blender: RR.001 */
    rangeRover: "RR001",
  },
  roads: {
    /** Last road segment before Atlantis (Blender: Road.004, ~X -92 to -101) */
    alRabEnd: "Road004",
  },
  scenes: {
    /** One scene left of Dubai Frame (~X -6) */
    floor1: "Desert_Scene_Floor001",
    /** Blender scene 3 — Dubai Frame (Desert_Scene_Floor.002, ~X -22) */
    dubaiFrame: "Desert_Scene_Floor002",
    /** Blender scene 7 — Burj Al Arab (Desert_Scene_Floor.005, ~X -92) */
    alRab: "Desert_Scene_Floor005",
    /** Atlantis panel — NOT the car route end (Desert_Scene_Floor.007, ~X -110) */
    atlantis: "Desert_Scene_Floor007",
    /** One scene left of Atlantis (~X -127) */
    floor8: "Desert_Scene_Floor008",
    /** NOT scene 3 — this is the Museum of the Future panel (~X -57) */
    museumFloor: "Desert_Scene_Floor003",
    dubaiFrameLandmark: "proper_dubaiframe001",
    alRabLandmark: "burjalarab001",
  },
  cameraWaypoints: /^Empty\.\d+$/,
  sceneMeshes:
    /^(Plane|Sand_Dunes|Cloud|Desert_Scene_Floor|Floor_Img|Backdrop)/,
} as const;
