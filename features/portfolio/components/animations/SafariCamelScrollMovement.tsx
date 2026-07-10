"use client";

import { acceptEndCamelScrollSettingsUpdate } from "@features/portfolio/hooks/acceptEndCamelScrollSettingsHmr";
import { useEndCamelScrollSettingsHmr } from "@features/portfolio/hooks/useEndCamelScrollSettingsHmr";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { endCamelScrollSettings } from "@features/portfolio/config/endCamelScrollSettings";
import { carPassState } from "@features/portfolio/config/carPassState";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import {
  isTurtleSceneObject,
} from "@features/portfolio/utils/safariCamelSeat";
import {
  attachAnimationCarrier,
  attachObjectToCarrier,
  findSceneObject,
  getScene1TravelProgress,
  resolveSafariCamelTrack,
  setObjectWorldPosition,
} from "@features/portfolio/utils/sceneObjectUtils";

type SafariCamelRig = {
  carrier: THREE.Group;
  body: THREE.Object3D;
  restX: number;
  trackEndX: number;
  baseY: number;
  baseZ: number;
  startX: number;
  endX: number;
  progressAtStart: number;
  progressAtEnd: number;
  travelProgress: number;
};

type SafariCamelScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnSafariCamelRef: RefObject<boolean>;
  turtleOnYachtRef: RefObject<boolean>;
  safariCamelTravelProgressRef: RefObject<number>;
};

const tempOffset = new THREE.Vector3();

function resolveObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeName: string,
  blenderName?: string,
) {
  return findSceneObject(scene, nodes, runtimeName, blenderName);
}

function isDescendantOf(object: THREE.Object3D, ancestor: THREE.Object3D) {
  let parent: THREE.Object3D | null = object.parent;
  while (parent) {
    if (parent === ancestor) return true;
    parent = parent.parent;
  }
  return false;
}

function unwrapSafariCarrier(scene: THREE.Object3D, nodes: Record<string, THREE.Object3D>) {
  const carrier = findSceneObject(
    scene,
    nodes,
    endCamelScrollSettings.carrierName,
  );
  if (!carrier?.parent) return;

  const grandparent = carrier.parent;
  for (const child of [...carrier.children]) {
    grandparent.attach(child);
  }
  carrier.removeFromParent();
}

function setupSafariCarrier(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  camelBody: THREE.Object3D,
) {
  const { carrierName, legs, legsBlender, carrierRenderOrder } =
    endCamelScrollSettings;
  const resolvedLegs = legs
    .map((runtimeName, index) =>
      resolveObject(scene, nodes, runtimeName, legsBlender[index]),
    )
    .filter((leg): leg is THREE.Object3D => Boolean(leg));

  const existing = findSceneObject(scene, nodes, carrierName);
  const carrierReady =
    existing &&
    camelBody.parent === existing &&
    resolvedLegs.every((leg) => isDescendantOf(leg, existing));

  if (!carrierReady) {
    unwrapSafariCarrier(scene, nodes);
  }

  const carrier =
    camelBody.parent?.name === carrierName
      ? (camelBody.parent as THREE.Group)
      : attachAnimationCarrier(camelBody, carrierName);

  for (let index = 0; index < legs.length; index += 1) {
    const leg = resolveObject(scene, nodes, legs[index], legsBlender[index]);
    if (leg) attachObjectToCarrier(carrier, leg);
  }

  carrier.renderOrder = carrierRenderOrder;
  carrier.traverse((child) => {
    if (isTurtleSceneObject(child)) return;
    child.renderOrder = carrierRenderOrder;
  });

  return carrier;
}

function setCarrierWorldPosition(
  carrier: THREE.Object3D,
  worldX: number,
  worldY: number,
  worldZ: number,
) {
  tempOffset.set(worldX, worldY, worldZ);
  setObjectWorldPosition(carrier, tempOffset);
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): SafariCamelRig | null {
  const { body, bodyBlender } = endCamelScrollSettings;

  scene.updateMatrixWorld(true);

  const camelBody = resolveObject(scene, nodes, body, bodyBlender);
  const track = resolveSafariCamelTrack(scene, nodes, sceneFrame, {
    startInset: endCamelScrollSettings.startInset,
    endInset: endCamelScrollSettings.endInset,
  });

  if (!camelBody?.parent || !track) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[SafariCamelScrollMovement] Setup failed:", {
        body,
        bodyFound: camelBody?.name ?? null,
        track: track !== null,
      });
    }
    return null;
  }

  const carrier = setupSafariCarrier(scene, nodes, camelBody);

  carrier.updateMatrixWorld(true);
  const restWorld = new THREE.Vector3();
  carrier.getWorldPosition(restWorld);

  const scrollRange = getScrollRange(sceneFrame);
  const startX = track.startX;
  const restX = startX;
  const endX = track.endX;

  if (process.env.NODE_ENV === "development") {
    console.info("[SafariCamelScrollMovement] Ready:", {
      body: camelBody.name,
      carrier: carrier.name,
      authoredX: restWorld.x,
      restX,
      startX,
      track: [track.startX, track.endX],
      rest: restWorld.toArray(),
    });
  }

  return {
    carrier,
    body: camelBody,
    restX,
    trackEndX: endX,
    baseY: restWorld.y,
    baseZ: restWorld.z,
    startX,
    endX,
    progressAtStart: getScrollProgressAtX(startX, scrollRange),
    progressAtEnd: getScrollProgressAtX(endX, scrollRange),
    travelProgress: 0,
  };
}

function getTrackWorldX(
  progress: number,
  track: Pick<SafariCamelRig, "startX" | "endX" | "progressAtStart" | "progressAtEnd">,
) {
  const travelT = getScene1TravelProgress(progress, track);
  return THREE.MathUtils.lerp(track.startX, track.endX, travelT);
}

acceptEndCamelScrollSettingsUpdate();

export default function SafariCamelScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnSafariCamelRef,
  turtleOnYachtRef,
  safariCamelTravelProgressRef,
}: SafariCamelScrollMovementProps) {
  const rigRef = useRef<SafariCamelRig | null>(null);
  const sessionActiveRef = useRef(false);
  const settingsRevision = useEndCamelScrollSettingsHmr();
  const prevSettingsRevisionRef = useRef(settingsRevision);

  useLayoutEffect(() => {
    if (!sceneFrame) {
      rigRef.current = null;
      safariCamelTravelProgressRef.current = 0;
      carPassState.safariCamelToYachtTransfer = false;
      return;
    }
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    safariCamelTravelProgressRef.current = 0;
    sessionActiveRef.current = false;
    return () => {
      rigRef.current = null;
      safariCamelTravelProgressRef.current = 0;
      carPassState.yachtToSafariCamelTransfer = false;
      carPassState.yachtDockedAtEnd = false;
      carPassState.safariCamelToYachtTransfer = false;
      sessionActiveRef.current = false;
    };
  }, [scene, nodes, sceneFrame, safariCamelTravelProgressRef]);

  useLayoutEffect(() => {
    if (prevSettingsRevisionRef.current === settingsRevision) return;
    prevSettingsRevisionRef.current = settingsRevision;
    if (settingsRevision === 0 || !sceneFrame) return;

    const rig = rigRef.current ?? buildRig(scene, nodes, sceneFrame);
    if (!rig) return;

    rigRef.current = rig;
    const heldProgress = safariCamelTravelProgressRef.current;
    rig.travelProgress = heldProgress;

    const heldX = THREE.MathUtils.lerp(
      rig.restX,
      rig.trackEndX,
      THREE.MathUtils.clamp(heldProgress, 0, 1),
    );
    setCarrierWorldPosition(rig.carrier, heldX, rig.baseY, rig.baseZ);
  }, [settingsRevision, scene, nodes, sceneFrame, safariCamelTravelProgressRef]);

  useFrame(() => {
    void settingsRevision;
    if (!sceneFrame) return;

    let rig = rigRef.current;
    if (!rig) {
      rig = buildRig(scene, nodes, sceneFrame);
      if (!rig) return;
      rigRef.current = rig;
    }

    const track = resolveSafariCamelTrack(scene, nodes, sceneFrame, {
      startInset: endCamelScrollSettings.startInset,
      endInset: endCamelScrollSettings.endInset,
    });
    if (track) {
      const scrollRange = getScrollRange(sceneFrame);
      rig.trackEndX = track.endX;
      rig.endX = track.endX;
      rig.progressAtStart = getScrollProgressAtX(rig.startX, scrollRange);
      rig.progressAtEnd = getScrollProgressAtX(track.endX, scrollRange);
    }

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    if (turtleOnSafariCamelRef.current) {
      sessionActiveRef.current = true;
    }

    const parkAtRest = () => {
      setCarrierWorldPosition(rig!.carrier, rig!.restX, rig!.baseY, rig!.baseZ);
    };

    if (turtleOnYachtRef.current && !turtleOnSafariCamelRef.current) {
      // Keep camel at whichever safari position it had at handoff:
      // - near 0 when returning to Atlantis yacht
      // - near 1 when handing off to yacht002 at safari end
      sessionActiveRef.current = true;
      const heldT = THREE.MathUtils.clamp(safariCamelTravelProgressRef.current, 0, 1);
      rig.travelProgress = heldT;
      safariCamelTravelProgressRef.current = heldT;
      const heldX = THREE.MathUtils.lerp(rig.restX, rig.trackEndX, heldT);
      setCarrierWorldPosition(rig.carrier, heldX, rig.baseY, rig.baseZ);
      return;
    }

    if (carPassState.yachtToSafariCamelTransfer) {
      rig.travelProgress = 0;
      safariCamelTravelProgressRef.current = 0;
      parkAtRest();
      return;
    }

    if (!turtleOnSafariCamelRef.current) {
      if (!sessionActiveRef.current) {
        parkAtRest();
        safariCamelTravelProgressRef.current = 0;
      } else {
        const heldX = THREE.MathUtils.lerp(
          rig.restX,
          rig.trackEndX,
          safariCamelTravelProgressRef.current,
        );
        setCarrierWorldPosition(rig.carrier, heldX, rig.baseY, rig.baseZ);
      }
      return;
    }

    const travelT = getScene1TravelProgress(progress, rig);
    rig.travelProgress = travelT;
    safariCamelTravelProgressRef.current = travelT;
    const worldX = getTrackWorldX(progress, rig);
    setCarrierWorldPosition(rig.carrier, worldX, rig.baseY, rig.baseZ);
  });

  return null;
}
