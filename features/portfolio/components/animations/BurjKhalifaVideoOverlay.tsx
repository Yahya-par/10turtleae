"use client";

import type * as THREE from "three";
import { burjKhalifaVideoSettings } from "@features/portfolio/config/burjKhalifaVideoSettings";
import SceneVideoOverlay from "./SceneVideoOverlay";

type BurjKhalifaVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function BurjKhalifaVideoOverlay({
  scene,
  nodes,
}: BurjKhalifaVideoOverlayProps) {
  return (
    <SceneVideoOverlay
      scene={scene}
      nodes={nodes}
      settings={burjKhalifaVideoSettings}
      logLabel="BurjKhalifaVideoOverlay"
    />
  );
}
