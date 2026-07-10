"use client";

import { acceptEndCamelScrollSettingsUpdate } from "@features/portfolio/hooks/acceptEndCamelScrollSettingsHmr";
import { useEndCamelScrollSettingsHmr } from "@features/portfolio/hooks/useEndCamelScrollSettingsHmr";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { endCamelScrollSettings } from "@features/portfolio/config/endCamelScrollSettings";
import { type SceneFrame } from "@features/portfolio/components/camera/CameraPath";
import {
  findSceneObject,
  resolveSafariCamelTrack,
  type Scene1CamelTrack,
} from "@features/portfolio/utils/sceneObjectUtils";

type SafariCamelWalkAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  turtleOnSafariCamelRef: RefObject<boolean>;
  turtleOnYachtRef: RefObject<boolean>;
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
  sides: LegSide[];
  safariTrack: Scene1CamelTrack;
};

const swingWorldAxis = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
} as const;

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


function getCarrierWorldX(carrier: THREE.Object3D) {
  const world = new THREE.Vector3();
  carrier.updateMatrixWorld(true);
  carrier.getWorldPosition(world);
  return world.x;
}

function resolveSafariTrack(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
) {
  return resolveSafariCamelTrack(scene, nodes, sceneFrame, {
    startInset: endCamelScrollSettings.startInset,
    endInset: endCamelScrollSettings.endInset,
    startOffsetX: endCamelScrollSettings.startOffsetX,
  });
}

function isCarrierRigReady(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const carrier = findSceneObject(scene, nodes, endCamelScrollSettings.carrierName);
  if (!carrier) return false;

  const legNames = [
    ...endCamelScrollSettings.leftLegs,
    ...endCamelScrollSettings.rightLegs,
  ];

  return legNames.every((runtimeName, index) => {
    const blenderName =
      [
        ...endCamelScrollSettings.leftLegsBlender,
        ...endCamelScrollSettings.rightLegsBlender,
      ][index] ?? runtimeName;
    const leg = findLeg(scene, nodes, runtimeName, blenderName);
    if (!leg) return false;

    let parent: THREE.Object3D | null = leg.parent;
    while (parent) {
      if (parent === carrier) return true;
      parent = parent.parent;
    }
    return false;
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

function buildWalkRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): WalkRig | null {
  if (!isCarrierRigReady(scene, nodes)) return null;

  scene.updateMatrixWorld(true);
  const body = findSceneObject(
    scene,
    nodes,
    endCamelScrollSettings.body,
    endCamelScrollSettings.bodyBlender,
  );
  const safariTrack = resolveSafariTrack(scene, nodes, sceneFrame);

  if (!body || !safariTrack) return null;

  const leftSide = buildLegSide(
    scene,
    nodes,
    endCamelScrollSettings.leftLegs,
    endCamelScrollSettings.leftLegsBlender,
    body,
    0,
  );
  const rightSide = buildLegSide(
    scene,
    nodes,
    endCamelScrollSettings.rightLegs,
    endCamelScrollSettings.rightLegsBlender,
    body,
    endCamelScrollSettings.rightPhaseOffset,
  );

  const sides: LegSide[] = [];
  if (leftSide) sides.push(leftSide);
  if (rightSide) sides.push(rightSide);

  if (!sides.length || sides.length < 2) return null;

  if (process.env.NODE_ENV === "development") {
    console.info("[SafariCamelWalkAnimation] Ready:", {
      body: body.name,
      leftLegs: leftSide?.legs.map(({ leg }) => leg.name),
      rightLegs: rightSide?.legs.map(({ leg }) => leg.name),
      swingAxis: endCamelScrollSettings.swingAxis,
      track: [safariTrack.startX, safariTrack.endX],
    });
  }

  return {
    body,
    bodyBaseRotation: body.rotation.clone(),
    sides,
    safariTrack,
  };
}

function isWalkRig(value: unknown): value is WalkRig {
  const rig = value as WalkRig;
  if (!rig || !Array.isArray(rig.sides) || !rig.sides.length) return false;

  return rig.sides.every(
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
}

function applyLegPendulum(
  legRig: LegRig,
  sideSwing: number,
  worldAxis: THREE.Vector3,
) {
  const leg = legRig.leg;
  const parent = leg.parent;
  const swingWorldQ = new THREE.Quaternion().setFromAxisAngle(worldAxis, sideSwing);

  let quaternion: THREE.Quaternion;
  if (parent) {
    parent.updateMatrixWorld(true);
    const parentWorldQ = new THREE.Quaternion();
    parent.getWorldQuaternion(parentWorldQ);
    const parentWorldQInv = parentWorldQ.clone().invert();
    const swingLocalQ = parentWorldQInv
      .clone()
      .multiply(swingWorldQ)
      .multiply(parentWorldQ);
    quaternion = swingLocalQ.multiply(legRig.baseQuaternion);
  } else {
    quaternion = swingWorldQ.clone().multiply(legRig.baseQuaternion);
  }

  const scaledHip = legRig.hipLocal.clone().multiply(legRig.baseScale);
  const rotatedHip = scaledHip.applyQuaternion(quaternion);

  leg.scale.copy(legRig.baseScale);
  leg.quaternion.copy(quaternion);
  leg.position.copy(legRig.pivotInParent).sub(rotatedHip);
}

function applySwing(rig: WalkRig, walkPhase: number, isWalking: boolean) {
  const worldAxis = swingWorldAxis[endCamelScrollSettings.swingAxis];

  for (const side of rig.sides) {
    const sideSwing = isWalking
      ? Math.sin(walkPhase + side.phaseOffset) * endCamelScrollSettings.swingAngle
      : 0;

    for (const legRig of side.legs) {
      applyLegPendulum(legRig, sideSwing, worldAxis);
    }
  }

  if (rig.body && rig.bodyBaseRotation) {
    const rock = isWalking
      ? Math.sin(walkPhase) * endCamelScrollSettings.bodyRockAngle
      : 0;
    rig.body.rotation.x = rig.bodyBaseRotation.x;
    rig.body.rotation.y = rig.bodyBaseRotation.y;
    rig.body.rotation.z = rig.bodyBaseRotation.z + rock;
  }
}

acceptEndCamelScrollSettingsUpdate();

export default function SafariCamelWalkAnimation({
  scene,
  nodes,
  sceneFrame,
  turtleOnSafariCamelRef,
  turtleOnYachtRef,
}: SafariCamelWalkAnimationProps) {
  const rigRef = useRef<WalkRig | null>(null);
  const walkPhaseRef = useRef(0);
  const lastCarrierWorldXRef = useRef<number | null>(null);
  const wasWalkingRef = useRef(false);
  const retryTimerRef = useRef(0);
  const mountAttemptsRef = useRef(0);
  const warnedRef = useRef(false);
  const settingsRevision = useEndCamelScrollSettingsHmr();

  useLayoutEffect(() => {
    rigRef.current = null;
    walkPhaseRef.current = 0;
    lastCarrierWorldXRef.current = null;
    wasWalkingRef.current = false;
    mountAttemptsRef.current = 0;
    warnedRef.current = false;
  }, [scene, nodes, sceneFrame, settingsRevision]);

  useFrame((_, delta) => {
    void settingsRevision;
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
            "[SafariCamelWalkAnimation] Walk rig not mounted after retries:",
            { attempts: mountAttemptsRef.current },
          );
        }
        return;
      }

      rigRef.current = rig;
      const initCarrier = findSceneObject(
        scene,
        nodes,
        endCamelScrollSettings.carrierName,
      );
      lastCarrierWorldXRef.current = initCarrier
        ? getCarrierWorldX(initCarrier)
        : null;
      return;
    }

    const rig = rigRef.current;
    const refreshedTrack = resolveSafariTrack(scene, nodes, sceneFrame);
    if (refreshedTrack) {
      rig.safariTrack = refreshedTrack;
    }

    const carrier = findSceneObject(scene, nodes, endCamelScrollSettings.carrierName);
    if (!carrier) return;

    const carrierWorldX = getCarrierWorldX(carrier);
    const mayAnimateLegs =
      turtleOnSafariCamelRef.current && !turtleOnYachtRef.current;

    if (!mayAnimateLegs) {
      lastCarrierWorldXRef.current = carrierWorldX;
      walkPhaseRef.current = 0;
      wasWalkingRef.current = false;
      applySwing(rig, 0, false);
      return;
    }

    const lastCarrierWorldX = lastCarrierWorldXRef.current ?? carrierWorldX;
    const carrierWorldDelta = carrierWorldX - lastCarrierWorldX;
    lastCarrierWorldXRef.current = carrierWorldX;

    const trackSpan = Math.abs(rig.safariTrack.startX - rig.safariTrack.endX);
    const isWalking =
      trackSpan > 0 &&
      Math.abs(carrierWorldDelta) > endCamelScrollSettings.scrollIdleThreshold;

    if (isWalking) {
      walkPhaseRef.current +=
        (Math.abs(carrierWorldDelta) / trackSpan) *
        endCamelScrollSettings.walkCyclesPerScene *
        Math.PI *
        2;
    } else if (wasWalkingRef.current) {
      walkPhaseRef.current = 0;
    }

    wasWalkingRef.current = isWalking;
    applySwing(rig, walkPhaseRef.current, isWalking);
  });

  return null;
}
