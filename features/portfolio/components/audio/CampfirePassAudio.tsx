import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { assetNames } from "@features/portfolio/config/assetNames";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type CampfirePassAudioProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function CampfirePassAudio({
  scene,
  nodes,
}: CampfirePassAudioProps) {
  const targetRef = useRef<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const campfire = findSceneObject(scene, nodes, assetNames.campfire.object);

    targetRef.current = campfire;

    if (process.env.NODE_ENV === "development") {
      console.info(
        "[CampfirePassAudio] Target:",
        targetRef.current?.name ?? "none",
      );
    }

    return () => {
      targetRef.current = null;
      audioManager.setCampfirePassActive(false);
    };
  }, [scene, nodes]);

  useFrame(({ camera }) => {
    const target = targetRef.current;
    if (!target) {
      audioManager.setCampfirePassActive(false);
      return;
    }

    audioManager.setCampfirePassActive(isCarVisibleOnScreen(target, camera));
  });

  return null;
}
