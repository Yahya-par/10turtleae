import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { assetNames } from "@features/portfolio/config/assetNames";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type SafariCampTextAudioProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function SafariCampTextAudio({
  scene,
  nodes,
}: SafariCampTextAudioProps) {
  const targetRef = useRef<THREE.Object3D | null>(null);
  const wasVisibleRef = useRef(false);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const safariCamp = findSceneObject(
      scene,
      nodes,
      assetNames.safari.camp,
      assetNames.safari.campBlender,
    );

    targetRef.current = safariCamp;

    if (process.env.NODE_ENV === "development") {
      console.info(
        "[SafariCampTextAudio] Target:",
        targetRef.current?.name ?? "none",
      );
    }

    return () => {
      targetRef.current = null;
      wasVisibleRef.current = false;
    };
  }, [scene, nodes]);

  useFrame(({ camera }) => {
    const target = targetRef.current;
    if (!target) return;

    const visible = isCarVisibleOnScreen(target, camera);

    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }

    if (!wasVisibleRef.current) {
      audioManager.playDesertTextCue();
    }

    wasVisibleRef.current = true;
  });

  return null;
}
