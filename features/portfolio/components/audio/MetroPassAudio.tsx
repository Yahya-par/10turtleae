import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { assetNames } from "@features/portfolio/config/assetNames";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type MetroPassAudioProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function MetroPassAudio({ scene, nodes }: MetroPassAudioProps) {
  const targetRef = useRef<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const metroCarrier = findSceneObject(scene, nodes, "MetroTrainCarrier");
    const metroTrain = findSceneObject(scene, nodes, assetNames.metro.train);

    targetRef.current = metroCarrier ?? metroTrain;

    if (process.env.NODE_ENV === "development") {
      console.info("[MetroPassAudio] Target:", targetRef.current?.name ?? "none");
    }

    return () => {
      targetRef.current = null;
      audioManager.setMetroPassActive(false);
    };
  }, [scene, nodes]);

  useFrame(({ camera }) => {
    const target = targetRef.current;
    if (!target) {
      audioManager.setMetroPassActive(false);
      return;
    }

    audioManager.setMetroPassActive(isCarVisibleOnScreen(target, camera));
  });

  return null;
}
