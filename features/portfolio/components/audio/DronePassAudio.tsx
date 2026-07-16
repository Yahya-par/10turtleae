import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { droneAnimationSettings } from "@features/portfolio/config/droneAnimationSettings";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type DronePassAudioProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function DronePassAudio({ scene, nodes }: DronePassAudioProps) {
  const targetRef = useRef<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const droneCarrier = findSceneObject(
      scene,
      nodes,
      droneAnimationSettings.carrierName,
    );
    const drone = findSceneObject(
      scene,
      nodes,
      droneAnimationSettings.droneName,
      droneAnimationSettings.droneBlenderName,
      ...droneAnimationSettings.droneAliases,
    );

    targetRef.current = droneCarrier ?? drone;

    if (process.env.NODE_ENV === "development") {
      console.info("[DronePassAudio] Target:", targetRef.current?.name ?? "none");
    }

    return () => {
      targetRef.current = null;
      audioManager.setDronePassActive(false);
    };
  }, [scene, nodes]);

  useFrame(({ camera }) => {
    const target = targetRef.current;
    if (!target) {
      audioManager.setDronePassActive(false);
      return;
    }

    audioManager.setDronePassActive(isCarVisibleOnScreen(target, camera));
  });

  return null;
}
