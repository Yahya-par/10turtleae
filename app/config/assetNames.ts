/**
 * Blender object names from `public/Asset Names/Model.blend` / AuroraModel.glb.
 * Use these strings with `scene.getObjectByName()`.
 */

export const assetNames = {
  metro: {
    /** Runtime name after GLTFLoader (Blender export: Metro.001) */
    train: "Metro001",
    /** Left metro station marker (Blender: futuremuseum.001) */
    stationLeft: "futuremuseum001",
    /** Right metro station marker (Blender: sheikhzayedroade11.001) */
    stationRight: "sheikhzayedroade11001",
    /** Updated metro bridge mesh in the new model */
    bridge: "METROBRIDGE001",
    sheikhZayedRoad: "SHEIKHZAYEDROAD001",
    futureMuseum: "futuremuseum001",
  },
  cars: {
    /** Blender: Car1.001 */
    sedan: "Car1001",
    /** Blender: RR.001 */
    rangeRover: "RR001",
  },
  clouds: {
    /** Blender: cloud.001 */
    one: "cloud001",
    /** Blender: cloud.002 */
    two: "cloud002",
    /** Blender: cloud.003 */
    three: "cloud003",
  },
  roads: {
    /** Last road segment before Atlantis (Blender: Road.004, ~X -92 to -101) */
    alRabEnd: "Road004",
  },
  campfire: {
    /** Blender: campfire.001 */
    object: "campfire001",
    blenderName: "campfire.001",
  },
  safari: {
    /** Blender: SafariCamp.001 */
    camp: "SafariCamp001",
    campBlender: "SafariCamp.001",
    campMaterial: "SafariCamp",
    /** Blender: safariland.001 */
    land: "safariland001",
    landBlender: "safariland.001",
    mountains: "safarimountains001",
  },
  perfectBuildings: {
    /** Blender: Perfect_Buildings.001 */
    object: "Perfect_Buildings001",
    blenderName: "Perfect_Buildings.001",
    material: "Perfect_Buildings",
  },
  scenes: {
    /** Opening desert sky panel (Desert_Scene_Floor, ~X 11) */
    openingDesert: "Desert_Scene_Floor",
    /** One scene left of Dubai Frame (~X -6) */
    floor1: "Desert_Scene_Floor001",
    /** Blender scene 3 — Dubai Frame (Desert_Scene_Floor.002, ~X -22) */
    dubaiFrame: "Desert_Scene_Floor002",
    /** Blender scene 7 — Burj Al Arab (Desert_Scene_Floor.005, ~X -92) */
    alRab: "Desert_Scene_Floor005",
    /** Atlantis panel — NOT the car route end (Desert_Scene_Floor.007, ~X -110) */
    atlantis: "Desert_Scene_Floor007",
    /** One scene left of Atlantis (~X -127) — safari scene floor */
    floor8: "Desert_Scene_Floor008",
    safariFloor: "Desert_Scene_Floor008",
    safariFloorBlender: "Desert_Scene_Floor.008",
    /** NOT scene 3 — this is the Museum of the Future panel (~X -57) */
    museumFloor: "Desert_Scene_Floor003",
    dubaiFrameLandmark: "proper_dubaiframe001",
    alRabLandmark: "burjalarab001",
    /** Last scene panel (Desert_Scene_Floor.011, ~X -181) */
    floor11: "Desert_Scene_Floor011",
  },
  lastScene: {
    /** Blender object name: ain */
    ain: "ain",
    ainDubaiLegs: "aindubailegs001",
  },
  cameraWaypoints: /^Empty\.\d+$/,
  sceneMeshes:
    /^(Plane|Sand_Dunes|Cloud|Desert_Scene_Floor|Floor_Img|Backdrop)/,
} as const;
