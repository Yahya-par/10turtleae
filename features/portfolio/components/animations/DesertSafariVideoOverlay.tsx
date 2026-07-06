"use client";

import type * as THREE from "three";
import { desertSafariVideoSettings } from "@features/portfolio/config/desertSafariVideoSettings";
import SceneVideoOverlay from "./SceneVideoOverlay";

type DesertSafariVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function DesertSafariVideoOverlay({
  scene,
  nodes,
}: DesertSafariVideoOverlayProps) {
  return (
    <SceneVideoOverlay
      scene={scene}
      nodes={nodes}
      settings={desertSafariVideoSettings}
      logLabel="DesertSafariVideoOverlay"
    />
  );
}
