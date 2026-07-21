"use client";

import { useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { arrowFountainTextSettings } from "@features/portfolio/config/arrowFountainTextSettings";
import { createArrowFountainTextTexture } from "@features/portfolio/utils/arrowFountainCurvedText";
import {
  findObjectByNamePattern,
  findSceneObject,
} from "@features/portfolio/utils/sceneObjectUtils";

type ArrowFountainTextProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type TexturedMaterial = THREE.Material & {
  map: THREE.Texture | null;
  needsUpdate: boolean;
};

function getTexturedMaterials(root: THREE.Object3D) {
  const materials: TexturedMaterial[] = [];
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material && "map" in material && material.map) {
        materials.push(material as TexturedMaterial);
      }
    }
  });
  return materials;
}

function whenTextureReady(map: THREE.Texture): Promise<void> {
  const image = map.image as
    | HTMLImageElement
    | ImageBitmap
    | HTMLCanvasElement
    | OffscreenCanvas
    | undefined;

  if (image && "width" in image && image.width > 0) {
    return Promise.resolve();
  }

  if (image && "decode" in image && typeof image.decode === "function") {
    return image.decode().then(() => undefined).catch(() => undefined);
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, 300);
  });
}

/**
 * Paints the curved headline onto `arrowfountain001` by compositing into
 * the billboard's existing texture (matches the arrow UV exactly).
 */
export default function ArrowFountainText({
  scene,
  nodes,
}: ArrowFountainTextProps) {
  const [revision, setRevision] = useState(0);

  useLayoutEffect(() => {
    if (!import.meta.hot) return;
    import.meta.hot.accept(
      "@features/portfolio/config/arrowFountainTextSettings",
      () => {
        setRevision((value) => value + 1);
      },
    );
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    const applied: Array<{
      material: TexturedMaterial;
      originalMap: THREE.Texture;
      paintedMap: THREE.Texture;
    }> = [];

    const fountain =
      findSceneObject(
        scene,
        nodes,
        arrowFountainTextSettings.objectName,
        arrowFountainTextSettings.blenderObjectName,
      ) ?? findObjectByNamePattern(scene, /arrowfountain\.?001$/i);

    if (!fountain) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[ArrowFountainText] Missing asset:",
          arrowFountainTextSettings.objectName,
        );
      }
      return;
    }

    const materials = getTexturedMaterials(fountain);
    if (materials.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ArrowFountainText] No textured material on", fountain.name);
      }
      return;
    }

    void (async () => {
      for (const material of materials) {
        const originalMap = material.map;
        if (!originalMap) continue;

        await whenTextureReady(originalMap);
        if (cancelled) return;

        const paintedMap = createArrowFountainTextTexture(originalMap);
        if (!paintedMap) continue;
        if (cancelled) {
          paintedMap.dispose();
          return;
        }

        material.map = paintedMap;
        material.needsUpdate = true;
        applied.push({ material, originalMap, paintedMap });
      }

      if (process.env.NODE_ENV === "development" && applied.length) {
        console.info("[ArrowFountainText] Ready:", {
          object: fountain.name,
          materials: applied.length,
          text: arrowFountainTextSettings.text,
        });
      }
    })();

    return () => {
      cancelled = true;
      for (const entry of applied) {
        entry.material.map = entry.originalMap;
        entry.material.needsUpdate = true;
        entry.paintedMap.dispose();
      }
    };
  }, [scene, nodes, revision]);

  return null;
}
