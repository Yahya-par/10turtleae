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
    rail: "RR001",
  },
  cameraWaypoints: /^Empty\.\d+$/,
  sceneMeshes:
    /^(Plane|Sand_Dunes|Cloud|Desert_Scene_Floor|Floor_Img|Backdrop)/,
} as const;
