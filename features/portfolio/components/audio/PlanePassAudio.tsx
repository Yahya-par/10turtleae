import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { assetNames } from "@features/portfolio/config/assetNames";
import { planeScrollSettings } from "@features/portfolio/config/planeScrollSettings";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type PlanePassAudioProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function PlanePassAudio({ scene, nodes }: PlanePassAudioProps) {
  const targetRef = useRef<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const planeCarrier = findSceneObject(
      scene,
      nodes,
      planeScrollSettings.carrierName,
    );
    const plane = findSceneObject(
      scene,
      nodes,
      assetNames.plane.object,
      assetNames.plane.blenderName,
    );

    targetRef.current = planeCarrier ?? plane;

    if (process.env.NODE_ENV === "development") {
      console.info("[PlanePassAudio] Target:", targetRef.current?.name ?? "none");
    }

    return () => {
      targetRef.current = null;
      audioManager.setPlanePassActive(false);
    };
  }, [scene, nodes]);

  useFrame(({ camera }) => {
    const target = targetRef.current;
    if (!target) {
      audioManager.setPlanePassActive(false);
      return;
    }

    audioManager.setPlanePassActive(isCarVisibleOnScreen(target, camera));
  });

  return null;
}
