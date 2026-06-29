"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { cloudAnimationSettings } from "@/app/config/cloudAnimationSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
  getDioramaFloorBounds,
} from "./sceneObjectUtils";

type CloudTrack = {
  startX: number;
  endX: number;
};

type AnimatedCloud = {
  carrier: THREE.Group;
  lapDuration: number;
  phaseOffset: number;
};

type CloudAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

function getLoopProgress(
  elapsed: number,
  lapDuration: number,
  phaseOffset: number,
) {
  return ((elapsed + phaseOffset) % lapDuration) / lapDuration;
}

function getCloudTrack(dioramaBounds: THREE.Box3) {
  const { startMargin, endMargin } = cloudAnimationSettings;

  return {
    // Screen left → right across the full diorama (scene 1 → last scene).
    startX: dioramaBounds.max.x + endMargin,
    endX: dioramaBounds.min.x - startMargin,
    dioramaBounds,
  };
}

export default function CloudAnimation({ scene, nodes }: CloudAnimationProps) {
  const cloudsRef = useRef<AnimatedCloud[]>([]);
  const trackRef = useRef<CloudTrack | null>(null);
  const elapsedRef = useRef(0);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    if (initializedRef.current) return;

    scene.updateMatrixWorld(true);

    const dioramaBounds = getDioramaFloorBounds(scene);

    if (!dioramaBounds) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[CloudAnimation] No diorama floor panels found.");
      }
      return;
    }

    const animatedClouds: AnimatedCloud[] = [];

    for (const cloudConfig of cloudAnimationSettings.clouds) {
      const cloud = findSceneObject(scene, nodes, cloudConfig.objectName);
      if (!cloud) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[CloudAnimation] Missing cloud:", cloudConfig.objectName);
        }
        continue;
      }

      const carrier = attachAnimationCarrier(cloud, cloudConfig.carrierName);
      animatedClouds.push({
        carrier,
        lapDuration: cloudConfig.lapDuration,
        phaseOffset: cloudConfig.phaseOffset,
      });
    }

    if (!animatedClouds.length) return;

    const { startX, endX, dioramaBounds: bounds } = getCloudTrack(dioramaBounds);

    trackRef.current = { startX, endX };
    cloudsRef.current = animatedClouds;
    initializedRef.current = true;

    for (const { carrier, lapDuration, phaseOffset } of animatedClouds) {
      const t = getLoopProgress(0, lapDuration, phaseOffset);
      carrier.position.x = THREE.MathUtils.lerp(startX, endX, t);
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[CloudAnimation] Ready:", {
        clouds: animatedClouds.map((entry) => entry.carrier.children[0]?.name),
        startX,
        endX,
        dioramaX: [bounds.min.x, bounds.max.x],
      });
    }
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const track = trackRef.current;
    const clouds = cloudsRef.current;
    if (!track || !clouds.length) return;

    elapsedRef.current += delta;

    for (const { carrier, lapDuration, phaseOffset } of clouds) {
      const t = getLoopProgress(
        elapsedRef.current,
        lapDuration,
        phaseOffset,
      );
      carrier.position.x = THREE.MathUtils.lerp(track.startX, track.endX, t);
    }
  });

  return null;
}
