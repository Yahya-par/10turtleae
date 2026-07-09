"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import { desertSafariVideoSettings } from "@features/portfolio/config/desertSafariVideoSettings";
import { desertSafariScreenAnchor } from "@features/portfolio/utils/desertSafariScreenAnchor";
import {
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type DesertSafariVideoPositionTrackerProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
};

const anchorWorld = new THREE.Vector3();

export default function DesertSafariVideoPositionTracker({
  scene,
  nodes,
  sceneFrame,
}: DesertSafariVideoPositionTrackerProps) {
  const { camera, size } = useThree();
  const settings = desertSafariVideoSettings;

  const land = useMemo(
    () =>
      findSceneObject(
        scene,
        nodes,
        settings.anchorAsset,
        settings.anchorAssetBlender,
      ),
    [scene, nodes, settings.anchorAsset, settings.anchorAssetBlender],
  );

  useLayoutEffect(() => {
    if (!land || !sceneFrame) {
      desertSafariScreenAnchor.rangeReady = false;
      return;
    }

    const bounds = getObjectBounds(land);
    if (bounds.isEmpty()) {
      desertSafariScreenAnchor.rangeReady = false;
      return;
    }

    const range = getScrollRange(sceneFrame);
    const pad = settings.visibleProgressPadding;
    const progressAtMinX = getScrollProgressAtX(bounds.min.x, range);
    const progressAtMaxX = getScrollProgressAtX(bounds.max.x, range);

    desertSafariScreenAnchor.visibleMin = THREE.MathUtils.clamp(
      Math.min(progressAtMinX, progressAtMaxX) - pad,
      0,
      1,
    );
    desertSafariScreenAnchor.visibleMax = THREE.MathUtils.clamp(
      Math.max(progressAtMinX, progressAtMaxX) + pad,
      0,
      1,
    );
    desertSafariScreenAnchor.rangeReady = true;

    if (process.env.NODE_ENV === "development") {
      console.info("[DesertSafariVideoPositionTracker] Ready:", {
        land: land.name,
        bounds: {
          min: bounds.min.toArray(),
          max: bounds.max.toArray(),
        },
        visibleBetweenProgress: [
          desertSafariScreenAnchor.visibleMin,
          desertSafariScreenAnchor.visibleMax,
        ],
      });
    }
  }, [land, sceneFrame, settings.visibleProgressPadding]);

  useLayoutEffect(() => {
    return () => {
      desertSafariScreenAnchor.ready = false;
      desertSafariScreenAnchor.rangeReady = false;
    };
  }, []);

  useFrame(() => {
    if (!land) {
      desertSafariScreenAnchor.ready = false;
      return;
    }

    const bounds = getObjectBounds(land);
    if (bounds.isEmpty()) {
      desertSafariScreenAnchor.ready = false;
      return;
    }

    const [u, v, w] = settings.anchorUVW;
    anchorWorld.set(
      THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, u),
      THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, v),
      THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, w),
    );

    anchorWorld.project(camera);

    desertSafariScreenAnchor.left =
      (anchorWorld.x * 0.5 + 0.5) * size.width + settings.screenOffset.x;
    desertSafariScreenAnchor.top =
      (-anchorWorld.y * 0.5 + 0.5) * size.height + settings.screenOffset.y;
    desertSafariScreenAnchor.ready = anchorWorld.z > -1 && anchorWorld.z < 1;
  });

  return null;
}
