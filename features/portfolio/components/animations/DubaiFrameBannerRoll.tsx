"use client";

import type { RefObject } from "react";
import * as THREE from "three";
import type { SceneFrame } from "@features/portfolio/components/camera/CameraPath";
import SceneBannerRoll from "@features/portfolio/components/animations/SceneBannerRoll";
import type { BannerRollSettings } from "@features/portfolio/config/bannerRollSettings";
import { dubaiFrameBannerSettings } from "@features/portfolio/config/dubaiFrameBannerSettings";

type DubaiFrameBannerRollProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnCarRef: RefObject<boolean>;
  carTravelProgressRef: RefObject<number>;
};

export default function DubaiFrameBannerRoll(props: DubaiFrameBannerRollProps) {
  return (
    <SceneBannerRoll
      settings={dubaiFrameBannerSettings as BannerRollSettings}
      {...props}
    />
  );
}
