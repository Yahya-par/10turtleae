"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { camelScrollSettings } from "@/app/config/camelScrollSettings";
import {
  attachAnimationCarrier,
  attachObjectToCarrier,
  findSceneObject,
  getObjectBounds,
} from "./sceneObjectUtils";
import type { SceneFrame } from "./cameraPath";

type CamelRig = {
  carrier: THREE.Group;
  baseY: number;
  baseZ: number;
  trackStartX: number;
  trackEndX: number;
  desertScrollStart: number;
  desertScrollEnd: number;
};

type CamelScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

function resolveObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeName: string,
  blenderName?: string,
) {
  const match =
    findSceneObject(scene, nodes, runtimeName) ??
    (blenderName ? findSceneObject(scene, nodes, blenderName) : null);
  return match;
}

function getScrollRange(sceneFrame: SceneFrame | null) {
  if (sceneFrame?.waypoints.length) {
    const xs = sceneFrame.waypoints.map((waypoint) => waypoint.position.x);
    return { min: Math.min(...xs), max: Math.max(...xs) };
  }

  if (sceneFrame?.bounds) {
    return { min: sceneFrame.bounds.min.x, max: sceneFrame.bounds.max.x };
  }

  return { min: 4, max: 19 };
}

function getDesertTrack(
  floor: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
  scrollRange: { min: number; max: number },
) {
  const floorBounds = getObjectBounds(floor);
  const { pathInset } = camelScrollSettings;

  const trackStartX = floorBounds.min.x + pathInset;
  const trackEndX = floorBounds.max.x - pathInset;
  const scrollSpan = scrollRange.max - scrollRange.min;

  const desertScrollStart =
    scrollSpan > 0
      ? (floorBounds.min.x - scrollRange.min) / scrollSpan
      : 0;
  const desertScrollEnd =
    scrollSpan > 0
      ? (floorBounds.max.x - scrollRange.min) / scrollSpan
      : 1;

  return {
    trackStartX,
    trackEndX,
    baseY: carrierY,
    baseZ: carrierZ,
    desertScrollStart: THREE.MathUtils.clamp(desertScrollStart, 0, 1),
    desertScrollEnd: THREE.MathUtils.clamp(desertScrollEnd, 0, 1),
  };
}

function getDesertProgress(
  scrollProgress: number,
  desertScrollStart: number,
  desertScrollEnd: number,
) {
  if (desertScrollEnd <= desertScrollStart) return 0;

  return THREE.MathUtils.clamp(
    (scrollProgress - desertScrollStart) / (desertScrollEnd - desertScrollStart),
    0,
    1,
  );
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): CamelRig | null {
  scene.updateMatrixWorld(true);

  const camel = resolveObject(
    scene,
    nodes,
    camelScrollSettings.camel,
    camelScrollSettings.camelBlender,
  );
  const floor = findSceneObject(
    scene,
    nodes,
    camelScrollSettings.openingFloor,
  );

  if (!camel || !floor) return null;

  const carrier = attachAnimationCarrier(camel, camelScrollSettings.carrierName);

  const turtle = resolveObject(
    scene,
    nodes,
    camelScrollSettings.turtle,
    camelScrollSettings.turtleBlender,
  );
  if (turtle) {
    attachObjectToCarrier(carrier, turtle);
  }

  for (let index = 0; index < camelScrollSettings.legs.length; index += 1) {
    const leg = resolveObject(
      scene,
      nodes,
      camelScrollSettings.legs[index],
      camelScrollSettings.legsBlender[index],
    );
    if (leg) {
      attachObjectToCarrier(carrier, leg);
    }
  }

  const track = getDesertTrack(
    floor,
    carrier.position.y,
    carrier.position.z,
    getScrollRange(sceneFrame),
  );

  if (process.env.NODE_ENV === "development") {
    console.info("[CamelScrollMovement] Ready:", {
      track: [track.trackStartX, track.trackEndX],
      desertScroll: [track.desertScrollStart, track.desertScrollEnd],
    });
  }

  return {
    carrier,
    baseY: track.baseY,
    baseZ: track.baseZ,
    trackStartX: track.trackStartX,
    trackEndX: track.trackEndX,
    desertScrollStart: track.desertScrollStart,
    desertScrollEnd: track.desertScrollEnd,
  };
}

export default function CamelScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: CamelScrollMovementProps) {
  const rigRef = useRef<CamelRig | null>(null);

  useLayoutEffect(() => {
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    return () => {
      rigRef.current = null;
    };
  }, [scene, nodes, sceneFrame]);

  useFrame(() => {
    let rig = rigRef.current;
    if (!rig) {
      rig = buildRig(scene, nodes, sceneFrame);
      if (!rig) return;
      rigRef.current = rig;
    }

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    const desertProgress = getDesertProgress(
      progress,
      rig.desertScrollStart,
      rig.desertScrollEnd,
    );

    rig.carrier.position.set(
      THREE.MathUtils.lerp(rig.trackStartX, rig.trackEndX, desertProgress),
      rig.baseY,
      rig.baseZ,
    );
  });

  return null;
}
