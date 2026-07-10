import { useLayoutEffect } from "react";
import * as THREE from "three";
import {
  sceneLayerSettings,
  type SceneMeshLayerFix,
} from "@features/portfolio/config/sceneLayerSettings";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";

type SceneMeshLayerFixProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

function applyMaterialLayerFix(
  mesh: THREE.Mesh,
  fix: SceneMeshLayerFix,
) {
  const sourceMaterials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  const nextMaterials = sourceMaterials.map((material) => {
    const layered = material.clone();
    if (fix.polygonOffsetFactor !== undefined) {
      layered.polygonOffset = true;
      layered.polygonOffsetFactor = fix.polygonOffsetFactor;
      layered.polygonOffsetUnits = fix.polygonOffsetUnits ?? -1;
    }
    layered.needsUpdate = true;
    return layered;
  });

  mesh.material =
    nextMaterials.length === 1 ? nextMaterials[0] : nextMaterials;
}

function applyObjectLayerFix(root: THREE.Object3D, fix: SceneMeshLayerFix) {
  const { positionOffset, renderOrder } = fix;

  if (positionOffset) {
    if (positionOffset.x !== undefined) {
      root.position.x += positionOffset.x;
    }
    if (positionOffset.y !== undefined) {
      root.position.y += positionOffset.y;
    }
    if (positionOffset.z !== undefined) {
      root.position.z += positionOffset.z;
    }
  }

  root.traverse((child) => {
    if (renderOrder !== undefined) {
      child.renderOrder = renderOrder;
    }

    if ((child as THREE.Mesh).isMesh) {
      applyMaterialLayerFix(child as THREE.Mesh, fix);
    }
  });

  root.updateMatrixWorld(true);
}

export default function SceneMeshLayerFix({
  scene,
  nodes,
}: SceneMeshLayerFixProps) {
  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    for (const fix of sceneLayerSettings.meshLayerFixes) {
      const object = findSceneObject(
        scene,
        nodes,
        fix.runtimeName,
        fix.blenderName,
      );

      if (!object) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[SceneMeshLayerFix] Missing object:", {
            id: fix.id,
            runtimeName: fix.runtimeName,
            blenderName: fix.blenderName ?? null,
          });
        }
        continue;
      }

      applyObjectLayerFix(object, fix);

      if (process.env.NODE_ENV === "development") {
        console.info("[SceneMeshLayerFix] Applied:", {
          id: fix.id,
          object: object.name,
          positionOffset: fix.positionOffset ?? null,
          renderOrder: fix.renderOrder ?? null,
        });
      }
    }
  }, [scene, nodes]);

  return null;
}
