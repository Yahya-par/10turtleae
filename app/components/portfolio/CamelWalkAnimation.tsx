"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { camelWalkSettings } from "@/app/config/camelWalkSettings";
import { getScrollProgressAtX, getScrollRange, type SceneFrame } from "./cameraPath";
import { findSceneObject, getObjectBounds } from "./sceneObjectUtils";

type CamelWalkAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
};

type LegRig = {
  leg: THREE.Object3D;
  baseQuaternion: THREE.Quaternion;
  baseScale: THREE.Vector3;
  pivotInParent: THREE.Vector3;
  hipLocal: THREE.Vector3;
};

type LegSide = {
  legs: LegRig[];
  phaseOffset: number;
};

type WalkRig = {
  body: THREE.Object3D | null;
  bodyBaseRotation: THREE.Euler | null;
  bodyBaseWorld: THREE.Vector3;
  sides: LegSide[];
  movers: { object: THREE.Object3D; basePosition: THREE.Vector3 }[];
  track: CamelTrack;
};

type CamelTrack = {
  startX: number;
  endX: number;
  progressAtStart: number;
  progressAtEnd: number;
};

const swingAxisVector = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
} as const;

function getCamelTrack(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
) {
  const sceneStart = findSceneObject(
    scene,
    nodes,
    camelWalkSettings.sceneStart,
  );
  const sceneEnd = findSceneObject(scene, nodes, camelWalkSettings.sceneEnd);

  if (!sceneStart) return null;

  const startBox = getObjectBounds(sceneStart);
  const endBox = sceneEnd ? getObjectBounds(sceneEnd) : null;
  const { startInset, endInset } = camelWalkSettings;
  const scrollRange = getScrollRange(sceneFrame);

  const startX = startBox.max.x - startInset;
  const boundaryX = endBox
    ? Math.min(startBox.min.x, endBox.max.x)
    : startBox.min.x;
  const endX = boundaryX + endInset;

  return {
    startX,
    endX,
    progressAtStart: getScrollProgressAtX(startX, scrollRange),
    progressAtEnd: getScrollProgressAtX(endX, scrollRange),
    startBox,
    endBox,
    scrollRange,
  };
}

function getCamelTravelProgress(track: CamelTrack, scrollValue: number) {
  const span = track.progressAtStart - track.progressAtEnd;
  if (span <= 0) return 0;

  return THREE.MathUtils.clamp(
    (track.progressAtStart - scrollValue) / span,
    0,
    1,
  );
}

function getCamelTargetWorldX(track: CamelTrack, scrollValue: number) {
  const travelProgress = getCamelTravelProgress(track, scrollValue);
  return THREE.MathUtils.lerp(track.startX, track.endX, travelProgress);
}
function findLeg(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeName: string,
  blenderName: string,
) {
  return (
    findSceneObject(scene, nodes, runtimeName) ??
    findSceneObject(scene, nodes, blenderName)
  );
}

function unwrapLegFromPivot(leg: THREE.Object3D) {
  const pivot = leg.parent;
  if (!pivot?.name.endsWith("_pivot")) return leg;

  const grandparent = pivot.parent;
  if (!grandparent) return leg;

  pivot.updateMatrixWorld(true);
  const legWorld = leg.matrixWorld.clone();

  pivot.remove(leg);
  grandparent.add(leg);
  pivot.removeFromParent();

  const grandparentInverse = new THREE.Matrix4()
    .copy(grandparent.matrixWorld)
    .invert();
  legWorld.premultiply(grandparentInverse);
  legWorld.decompose(leg.position, leg.quaternion, leg.scale);

  return leg;
}

function getHipLocalInLegSpace(leg: THREE.Object3D, body: THREE.Object3D | null) {
  const box = new THREE.Box3();
  const rootInverse = new THREE.Matrix4();
  let hasMesh = false;

  leg.updateMatrixWorld(true);
  rootInverse.copy(leg.matrixWorld).invert();

  leg.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;

    mesh.updateWorldMatrix(true, false);
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;

    const meshBox = mesh.geometry.boundingBox.clone();
    const meshToLeg = new THREE.Matrix4().multiplyMatrices(
      rootInverse,
      mesh.matrixWorld,
    );
    meshBox.applyMatrix4(meshToLeg);
    box.union(meshBox);
    hasMesh = true;
  });

  if (!hasMesh || box.isEmpty()) {
    const worldBox = new THREE.Box3().setFromObject(leg);
    return leg.worldToLocal(
      new THREE.Vector3(
        (worldBox.min.x + worldBox.max.x) * 0.5,
        worldBox.max.y,
        (worldBox.min.z + worldBox.max.z) * 0.5,
      ),
    );
  }

  let x = (box.min.x + box.max.x) * 0.5;
  let z = (box.min.z + box.max.z) * 0.5;

  if (body) {
    const bodyWorld = new THREE.Vector3();
    body.getWorldPosition(bodyWorld);
    const bodyInLeg = leg.worldToLocal(bodyWorld);

    x = THREE.MathUtils.clamp(bodyInLeg.x, box.min.x, box.max.x);
    z = THREE.MathUtils.clamp(bodyInLeg.z, box.min.z, box.max.z);
  }

  return new THREE.Vector3(x, box.max.y, z);
}

function captureLegRig(leg: THREE.Object3D, body: THREE.Object3D | null): LegRig | null {
  const parent = leg.parent;
  if (!parent) return null;

  parent.updateMatrixWorld(true);
  leg.updateMatrixWorld(true);
  leg.updateMatrix();

  const hipLocal = getHipLocalInLegSpace(leg, body);
  const hipWorld = leg.localToWorld(hipLocal.clone());

  return {
    leg,
    baseQuaternion: leg.quaternion.clone(),
    baseScale: leg.scale.clone(),
    pivotInParent: parent.worldToLocal(hipWorld.clone()),
    hipLocal,
  };
}

function resolveLegStatus(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeNames: readonly string[],
  blenderNames: readonly string[],
) {
  return runtimeNames.map((runtimeName, index) => {
    const leg = findLeg(
      scene,
      nodes,
      runtimeName,
      blenderNames[index] ?? runtimeName,
    );

    return {
      runtimeName,
      blenderName: blenderNames[index] ?? runtimeName,
      found: Boolean(leg),
      objectName: leg?.name ?? null,
    };
  });
}

function buildLegSide(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeNames: readonly string[],
  blenderNames: readonly string[],
  body: THREE.Object3D | null,
  phaseOffset: number,
): LegSide | null {
  const legs: LegRig[] = [];

  for (let index = 0; index < runtimeNames.length; index += 1) {
    const found = findLeg(
      scene,
      nodes,
      runtimeNames[index],
      blenderNames[index] ?? runtimeNames[index],
    );
    if (!found) continue;

    const leg = unwrapLegFromPivot(found);
    const rig = captureLegRig(leg, body);
    if (rig) legs.push(rig);
  }

  if (!legs.length) return null;

  return { legs, phaseOffset };
}

function logMissingAssets(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const body =
    findSceneObject(scene, nodes, camelWalkSettings.body) ??
    findSceneObject(scene, nodes, camelWalkSettings.bodyBlender);
  const turtle = findSceneObject(scene, nodes, camelWalkSettings.turtle);
  const leftLegs = resolveLegStatus(
    scene,
    nodes,
    camelWalkSettings.leftLegs,
    camelWalkSettings.leftLegsBlender,
  );
  const rightLegs = resolveLegStatus(
    scene,
    nodes,
    camelWalkSettings.rightLegs,
    camelWalkSettings.rightLegsBlender,
  );

  const camelLike: string[] = [];
  scene.traverse((child) => {
    if (/camel|forwardleg|turtlechar/i.test(child.name)) {
      camelLike.push(child.name);
    }
  });

  console.warn("[CamelWalkAnimation] Missing camel walk assets:", {
    body: camelWalkSettings.body,
    bodyFound: Boolean(body),
    bodyObject: body?.name ?? null,
    turtle: camelWalkSettings.turtle,
    turtleFound: Boolean(turtle),
    turtleObject: turtle?.name ?? null,
    leftLegs,
    rightLegs,
    camelLike,
  });
}

function buildWalkRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): WalkRig | null {
  scene.updateMatrixWorld(true);
  const trackData = getCamelTrack(scene, nodes, sceneFrame);
  const body =
    findSceneObject(scene, nodes, camelWalkSettings.body) ??
    findSceneObject(scene, nodes, camelWalkSettings.bodyBlender);

  if (!trackData || !body) {
    if (process.env.NODE_ENV === "development") {
      logMissingAssets(scene, nodes);
    }
    return null;
  }

  const track: CamelTrack = {
    startX: trackData.startX,
    endX: trackData.endX,
    progressAtStart: trackData.progressAtStart,
    progressAtEnd: trackData.progressAtEnd,
  };

  const leftSide = buildLegSide(
    scene,
    nodes,
    camelWalkSettings.leftLegs,
    camelWalkSettings.leftLegsBlender,
    body,
    0,
  );
  const rightSide = buildLegSide(
    scene,
    nodes,
    camelWalkSettings.rightLegs,
    camelWalkSettings.rightLegsBlender,
    body,
    camelWalkSettings.rightPhaseOffset,
  );

  const sides: LegSide[] = [];
  if (leftSide) sides.push(leftSide);
  if (rightSide) sides.push(rightSide);

  const leftStatus = resolveLegStatus(
    scene,
    nodes,
    camelWalkSettings.leftLegs,
    camelWalkSettings.leftLegsBlender,
  );
  const rightStatus = resolveLegStatus(
    scene,
    nodes,
    camelWalkSettings.rightLegs,
    camelWalkSettings.rightLegsBlender,
  );

  const allLegsFound =
    leftStatus.every((leg) => leg.found) && rightStatus.every((leg) => leg.found);

  if (!sides.length || !body || !allLegsFound) {
    if (process.env.NODE_ENV === "development") {
      logMissingAssets(scene, nodes);
    }
    return null;
  }

  const turtle =
    findSceneObject(scene, nodes, camelWalkSettings.turtle) ??
    findSceneObject(scene, nodes, camelWalkSettings.turtleBlender);

  const bodyBaseWorld = new THREE.Vector3();
  body.getWorldPosition(bodyBaseWorld);

  const moverSet = new Set<THREE.Object3D>();
  moverSet.add(body);
  if (turtle) moverSet.add(turtle);
  const movers = [...moverSet].map((object) => ({
    object,
    basePosition: object.position.clone(),
  }));

  if (process.env.NODE_ENV === "development") {
    console.info("[CamelWalkAnimation] Ready:", {
      body: body.name,
      turtle: turtle?.name ?? null,
      leftLegs: leftSide?.legs.map(({ leg, pivotInParent, hipLocal }) => ({
        name: leg.name,
        pivot: pivotInParent.toArray(),
        hipLocal: hipLocal.toArray(),
      })),
      rightLegs: rightSide?.legs.map(({ leg, pivotInParent, hipLocal }) => ({
        name: leg.name,
        pivot: pivotInParent.toArray(),
        hipLocal: hipLocal.toArray(),
      })),
      swingAxis: camelWalkSettings.swingAxis,
      swingAngle: camelWalkSettings.swingAngle,
      swingSpeed: camelWalkSettings.swingSpeed,
      track: {
        startX: track.startX,
        endX: track.endX,
        progressAtStart: track.progressAtStart,
        progressAtEnd: track.progressAtEnd,
      },
      sceneStartX: trackData.startBox
        ? [trackData.startBox.min.x, trackData.startBox.max.x]
        : null,
      sceneEndX: trackData.endBox
        ? [trackData.endBox.min.x, trackData.endBox.max.x]
        : null,
    });
  }

  return {
    body,
    bodyBaseRotation: body.rotation.clone(),
    bodyBaseWorld,
    sides,
    movers,
    track,
  };
}

function isWalkRig(value: unknown): value is WalkRig {
  const rig = value as WalkRig;
  if (
    !rig ||
    !Array.isArray(rig.sides) ||
    !rig.sides.length ||
    !Array.isArray(rig.movers) ||
    !rig.movers.length
  ) {
    return false;
  }

  const sidesValid = rig.sides.every(
    (side) =>
      Array.isArray(side?.legs) &&
      side.legs.length > 0 &&
      side.legs.every(
        (entry) =>
          entry?.leg instanceof THREE.Object3D &&
          entry.baseQuaternion instanceof THREE.Quaternion &&
          entry.baseScale instanceof THREE.Vector3 &&
          entry.pivotInParent instanceof THREE.Vector3 &&
          entry.hipLocal instanceof THREE.Vector3,
      ),
  );
  const moversValid = rig.movers.every(
    (mover) =>
      mover?.object instanceof THREE.Object3D &&
      mover.basePosition instanceof THREE.Vector3,
  );
  const trackValid =
    typeof rig.track?.startX === "number" &&
    typeof rig.track?.endX === "number" &&
    typeof rig.track?.progressAtStart === "number" &&
    typeof rig.track?.progressAtEnd === "number" &&
    rig.bodyBaseWorld instanceof THREE.Vector3;

  return sidesValid && moversValid && trackValid;
}

function applyLegPendulum(
  legRig: LegRig,
  sideSwing: number,
  axis: THREE.Vector3,
  forwardOffset: THREE.Vector3,
) {
  const swingQ = new THREE.Quaternion().setFromAxisAngle(axis, sideSwing);
  const quaternion = swingQ.clone().multiply(legRig.baseQuaternion);
  const scaledHip = legRig.hipLocal.clone().multiply(legRig.baseScale);
  const rotatedHip = scaledHip.applyQuaternion(quaternion);

  legRig.leg.scale.copy(legRig.baseScale);
  legRig.leg.quaternion.copy(quaternion);
  legRig.leg.position.copy(legRig.pivotInParent).add(forwardOffset).sub(rotatedHip);
}

function getForwardOffset(rig: WalkRig, scrollValue: number) {
  const targetWorld = rig.bodyBaseWorld.clone();
  targetWorld.x = getCamelTargetWorldX(rig.track, scrollValue);

  const parent = rig.body?.parent;
  if (!parent) {
    return targetWorld.sub(rig.bodyBaseWorld);
  }

  const targetLocal = parent.worldToLocal(targetWorld.clone());
  const baseLocal = parent.worldToLocal(rig.bodyBaseWorld.clone());
  return targetLocal.sub(baseLocal);
}

function applyForwardTravel(rig: WalkRig, offset: THREE.Vector3) {
  for (const mover of rig.movers) {
    mover.object.position.copy(mover.basePosition).add(offset);
  }
}

function applySwing(
  rig: WalkRig,
  walkPhase: number,
  scrollValue: number,
  isWalking: boolean,
) {
  const axis = swingAxisVector[camelWalkSettings.swingAxis];
  const forwardOffset = getForwardOffset(rig, scrollValue);

  for (const side of rig.sides) {
    const sideSwing = isWalking
      ? Math.sin(walkPhase + side.phaseOffset) * camelWalkSettings.swingAngle
      : 0;

    for (const legRig of side.legs) {
      applyLegPendulum(legRig, sideSwing, axis, forwardOffset);
    }
  }

  if (rig.body && rig.bodyBaseRotation) {
    const rock = isWalking
      ? Math.sin(walkPhase) * camelWalkSettings.bodyRockAngle
      : 0;
    rig.body.rotation.x = rig.bodyBaseRotation.x;
    rig.body.rotation.y = rig.bodyBaseRotation.y;
    rig.body.rotation.z = rig.bodyBaseRotation.z + rock;
  }

  applyForwardTravel(rig, forwardOffset);
}

export default function CamelWalkAnimation({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
}: CamelWalkAnimationProps) {
  const rigRef = useRef<WalkRig | null>(null);
  const walkPhaseRef = useRef(0);
  const lastTravelProgressRef = useRef<number | null>(null);
  const retryTimerRef = useRef(0);
  const mountAttemptsRef = useRef(0);
  const warnedRef = useRef(false);

  useLayoutEffect(() => {
    rigRef.current = null;
    walkPhaseRef.current = 0;
    lastTravelProgressRef.current = null;
    mountAttemptsRef.current = 0;
    warnedRef.current = false;
  }, [scene, nodes, sceneFrame]);

  useFrame((_, delta) => {
    const mounted = rigRef.current;
    if (mounted && !isWalkRig(mounted)) {
      rigRef.current = null;
      return;
    }

    if (!rigRef.current) {
      retryTimerRef.current += delta;
      if (retryTimerRef.current < 0.1) return;

      retryTimerRef.current = 0;
      mountAttemptsRef.current += 1;
      scene.updateMatrixWorld(true);

      const rig = buildWalkRig(scene, nodes, sceneFrame);
      if (!rig) {
        if (
          process.env.NODE_ENV === "development" &&
          !warnedRef.current &&
          mountAttemptsRef.current >= 4
        ) {
          warnedRef.current = true;
          console.warn(
            "[CamelWalkAnimation] Walk rig not mounted after retries:",
            { attempts: mountAttemptsRef.current },
          );
        }
        return;
      }

      rigRef.current = rig;
      lastTravelProgressRef.current = getCamelTravelProgress(
        rig.track,
        scrollProgress.current,
      );
      return;
    }

    const rig = rigRef.current;
    const travelProgress = getCamelTravelProgress(
      rig.track,
      scrollProgress.current,
    );
    const lastTravelProgress = lastTravelProgressRef.current ?? travelProgress;
    const travelDelta = travelProgress - lastTravelProgress;
    lastTravelProgressRef.current = travelProgress;

    const isWalking =
      Math.abs(travelDelta) > camelWalkSettings.scrollIdleThreshold;
    if (isWalking) {
      walkPhaseRef.current +=
        Math.abs(travelDelta) *
        camelWalkSettings.walkCyclesPerScene *
        Math.PI *
        2;
    }

    applySwing(rig, walkPhaseRef.current, scrollProgress.current, isWalking);
  });

  return null;
}
