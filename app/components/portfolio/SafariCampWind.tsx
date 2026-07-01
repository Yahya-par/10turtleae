"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { safariCampWindSettings } from "@/app/config/safariCampWindSettings";
import { findSceneObject, normalizeObjectName } from "./sceneObjectUtils";
import {   
  applySoftWindToObject,
  type WindMaterialHandle,
} from "./windMaterial";

type SafariCampWindProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

// findSafariCamp - find the safari camp object in the scene
function findSafariCamp(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const byName = findSceneObject(scene, nodes, safariCampWindSettings.objectName);
  if (byName) return byName;

  const byBlenderName = findSceneObject(
    scene,
    nodes,
    safariCampWindSettings.blenderObjectName,
  );
  if (byBlenderName) return byBlenderName;

  let byMaterial: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (byMaterial || !(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    if (
      materials.some((material) => {
        const materialName = material?.name ?? "";
        return (
          materialName === safariCampWindSettings.objectMaterial ||
          normalizeObjectName(materialName) ===
            normalizeObjectName(safariCampWindSettings.objectMaterial)
        );
      })
    ) {
      byMaterial = mesh;
    }
  });

  return byMaterial;
}

// SafariCampWind - the safari camp wind component
export default function SafariCampWind({ scene, nodes }: SafariCampWindProps) {
  const windRef = useRef<WindMaterialHandle | null>(null);
  const retryTimerRef = useRef(0);

  useLayoutEffect(() => {
    windRef.current = null;
  }, [scene, nodes]);

  useFrame((_, delta) => {
    if (!windRef.current) {
      retryTimerRef.current += delta;
      if (retryTimerRef.current < 0.1) return;

      retryTimerRef.current = 0;
      scene.updateMatrixWorld(true);

      const safariCamp = findSafariCamp(scene, nodes);
      if (!safariCamp) return;

      const handle = applySoftWindToObject(safariCamp);
      if (!handle) return;

      windRef.current = handle;

      if (process.env.NODE_ENV === "development") {
        console.info("[SafariCampWind] Ready:", {
          object: safariCamp.name,
          materials: handle.materials.map((material) => material.name),
        });
      }
      return;
    }

    windRef.current.uniforms.uTime.value += delta;
  });

  return null;
}
