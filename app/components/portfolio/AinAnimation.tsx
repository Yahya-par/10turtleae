"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { ainAnimationSettings } from "@/app/config/ainAnimationSettings";
import { findSceneObject } from "./sceneObjectUtils";

type AinAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

export default function AinAnimation({ scene, nodes }: AinAnimationProps) {
  const ainRef = useRef<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const ain = findSceneObject(scene, nodes, ainAnimationSettings.objectName);
    if (!ain) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AinAnimation] Missing asset:", ainAnimationSettings.objectName);
      }
      return;
    }

    ainRef.current = ain;

    if (process.env.NODE_ENV === "development") {
      console.info("[AinAnimation] Ready:", { object: ain.name });
    }
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const ain = ainRef.current;
    if (!ain) return;

    ain.rotation.y += delta * ainAnimationSettings.rotationSpeed;
  });

  return null;
}
