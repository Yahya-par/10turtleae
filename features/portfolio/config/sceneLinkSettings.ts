import { assetNames } from "./assetNames";

export type SceneLinkConfig = {
  id: string;
  objectName: string;
  blenderObjectName: string;
  objectMaterial: string;
  url: string;
};

export const sceneLinkSettings = {
  dragThreshold: 6,
  links: [
    {
      id: "perfectBuildings",
      objectName: assetNames.perfectBuildings.object,
      blenderObjectName: assetNames.perfectBuildings.blenderName,
      objectMaterial: assetNames.perfectBuildings.material,
      url: "https://10turtle.ae/branding/brand-identity",
    },
    {
      id: "dubaiFrame",
      objectName: assetNames.scenes.dubaiFrameLandmark,
      blenderObjectName: "proper_dubaiframe.001",
      objectMaterial: "proper_dubaiframe",
      url: "https://10turtle.ae/web/website-redesign",
    },
    {
      id: "metro",
      objectName: assetNames.metro.train,
      blenderObjectName: "Metro.001",
      objectMaterial: "Metro",
      url: "https://10turtle.ae/ai-automation/workflow-automation",
    },
    {
      id: "futureMuseum",
      objectName: assetNames.metro.futureMuseum,
      blenderObjectName: "futuremuseum.001",
      objectMaterial: "futuremuseum",
      url: "https://10turtle.ae/ai-automation/ai-agents",
    },
    {
      id: "bigFountain",
      objectName: "BigFountain001",
      blenderObjectName: "BigFountain.001",
      objectMaterial: "BigFountain",
      url: "https://10turtle.ae/web/custom-development",
    },
    {
      id: "burjAlArab",
      objectName: assetNames.scenes.alRabLandmark,
      blenderObjectName: "burjalarab.001",
      objectMaterial: "burjalarab",
      url: "https://10turtle.ae/web/ui-ux-design",
    },
    {
      id: "finalcta001",
      objectName: "finalcta001",
      blenderObjectName: "finalcta.001",
      objectMaterial: "finalcta",
      url: "https://10turtle.ae",
    },
  ] satisfies SceneLinkConfig[],
} as const;
