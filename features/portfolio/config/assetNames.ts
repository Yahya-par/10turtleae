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
    /** Blender: carbody.001 — scroll-driven convertible body */
    body: "carbody001",
    bodyBlender: "carbody.001",
    /** Legacy export typo kept as fallback alias */
    bodyTypo: "carboady001",
    bodyTypoBlender: "carboady.001",
    /** Blender: aagadnutyre.001 (front tyre) */
    frontWheel: "aagadnutyre001",
    frontWheelBlender: "aagadnutyre.001",
    /** Blender: paachadnutyre.001 (back tyre) */
    backWheel: "paachadnutyre001",
    backWheelBlender: "paachadnutyre.001",
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
    /** Blender: junaroadjevu.001 — scene 3 car drive strip (boat dock → frame). */
    juneRoad: "junaroadjevu001",
    juneRoadBlender: "junaroadjevu.001",
    /** Last road segment before Atlantis (Blender: Road.004, ~X -92 to -101) */
    alRabEnd: "Road004",
    /** Blender: Roadthatpart.001 */
    thatPart: "roadthatpart001",
    thatPartBlender: "Roadthatpart.001",
    /** Blender: RoadStreched.001 */
    stretched: "roadstreched001",
    stretchedBlender: "RoadStreched.001",
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
    mountainsBlender: "safarimountains.001",
    /** Blender: lahbbabimageasset.001 — desert camp image billboard */
    bellyDancerBillboard: "lahbbabimageasset001",
    bellyDancerBillboardBlender: "lahbbabimageasset.001",
  },
  camel: {
    /** Blender: camel.001 — opening scene camel with turtle rider */
    body: "camel001",
    bodyBlender: "camel.001",
    turtle: "turtlechar001",
    turtleBlender: "turtlechar.001",
    leftLegs: ["forwardleg001", "forwardleg002"] as const,
    leftLegsBlender: ["forwardleg.001", "forwardleg.002"] as const,
    rightLegs: ["forwardleg003", "forwardleg004"] as const,
    rightLegsBlender: ["forwardleg.003", "forwardleg.004"] as const,
    legs: [
      "forwardleg001",
      "forwardleg002",
      "forwardleg003",
      "forwardleg004",
    ] as const,
    legsBlender: [
      "forwardleg.001",
      "forwardleg.002",
      "forwardleg.003",
      "forwardleg.004",
    ] as const,
  },
  boat: {
    object: "boat001",
    blenderName: "boat.001",
  },
  jetski: {
    object: "jetski001",
    blenderName: "jetski.001",
    driver: "jetskidriver001",
    driverBlender: "jetskidriver.001",
    /** Al Arab scene water corridor — jetski start/end reference. */
    water: "water001",
    waterBlender: "water.001",
  },
  plane: {
    object: "planewithtext001",
    blenderName: "planewithtext.001",
  },
  yacht: {
    object: "yacht001",
    blenderName: "yacht.001",
    water: "shinywater001",
    waterBlender: "shinywater.001",
    mosqueYacht: "yacht002",
    mosqueYachtBlender: "yacht.002",
    mosqueRiver: "mosqueriver001",
    mosqueRiverBlender: "mosqueriver.001",
    marinaWater: "water002",
    marinaWaterBlender: "water.002",
    mgrWater: "mgrwater001",
    mgrWaterBlender: "mgrwater.001",
  },
  perfectBuildings: {
    /** Blender: Perfect_Buildings.001 */
    object: "Perfect_Buildings001",
    blenderName: "Perfect_Buildings.001",
    material: "Perfect_Buildings",
  },
  scenes: {
    /** Scene 1 continuity panel in Modelv1 (Blender: continuefloor.001) */
    continuityFloor: "continuefloor001",
    continuityFloorBlender: "continuefloor.001",
    /** Opening desert sky panel (Desert_Scene_Floor, ~X 11) */
    openingDesert: "Desert_Scene_Floor",
    /** One scene left of Dubai Frame (~X -6) */
    floor1: "Desert_Scene_Floor001",
    floor1Blender: "Desert_Scene_Floor.001",
    /** Blender scene 3 — Dubai Frame (Desert_Scene_Floor.002, ~X -22) */
    dubaiFrame: "Desert_Scene_Floor002",
    /** Blender scene 5 — Dubai Mall (Desert_Scene_Floor.004, ~X -74) */
    dubaiMallFloor: "Desert_Scene_Floor004",
    /** Blender scene 5 — Burj Khalifa cutout (anotherasset.003) */
    burjKhalifa: "anotherasset003",
    burjKhalifaBlender: "anotherasset.003",
    /** Blender scene 7 — Burj Al Arab (Desert_Scene_Floor.005, ~X -92) */
    alRab: "Desert_Scene_Floor005",
    /** Atlantis panel (Desert_Scene_Floor.007, ~X -110) */
    atlantis: "Desert_Scene_Floor007",
    atlantisBlender: "Desert_Scene_Floor.007",
    /** One scene left of Atlantis (~X -127) — safari scene floor */
    floor8: "Desert_Scene_Floor008",
    safariFloor: "Desert_Scene_Floor008",
    safariFloorBlender: "Desert_Scene_Floor.008",
    /** NOT scene 3 — this is the Museum of the Future panel (~X -57) */
    museumFloor: "Desert_Scene_Floor003",
    dubaiFrameLandmark: "proper_dubaiframe001",
    alRabLandmark: "burjalarab001",
    /** Abu Dhabi Grand Mosque panel (Desert_Scene_Floor.009, ~X -145) */
    abuDhabiMosque: "Desert_Scene_Floor009",
    abuDhabiMosqueBlender: "Desert_Scene_Floor.009",
    /** Scene after mosque (Desert_Scene_Floor.010, ~X -163) */
    floor10: "Desert_Scene_Floor010",
    floor10Blender: "Desert_Scene_Floor.010",
    /** Last scene panel (Desert_Scene_Floor.011, ~X -181) */
    floor11: "Desert_Scene_Floor011",
    floor11Blender: "Desert_Scene_Floor.011",
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
