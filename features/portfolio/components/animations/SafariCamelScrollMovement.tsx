"use client";

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
  attachAnimationCarrier,
  attachObjectToCarrier,
  findSceneObject,
  getObjectBounds,
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
  const { carrierName, legs, legsBlender } = endCamelScrollSettings;
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

export function getSafariCamelSeatWorld(
  camel: THREE.Object3D,
  turtle: THREE.Object3D | null = null,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(camel);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempOffset);
  const {
    saddleHeightFactor,
    saddleOffsetXFactor,
    turtleSeatOffsetX,
    turtleSeatOffsetY,
    turtleSeatOffsetZ,
  } = endCamelScrollSettings;

  const saddleY = bounds.min.y + size.y * saddleHeightFactor;
  const saddleX = center.x + size.x * saddleOffsetXFactor;

  // Place the turtle mesh bottom on the saddle, not the pivot point.
  let pivotToBottom = 0;
  if (turtle) {
    turtle.updateMatrixWorld(true);
    const turtleBounds = getObjectBounds(turtle);
    const turtleOrigin = new THREE.Vector3();
    turtle.getWorldPosition(turtleOrigin);
    pivotToBottom = turtleOrigin.y - turtleBounds.min.y;
  }

  target.set(
    saddleX + turtleSeatOffsetX,
    saddleY + pivotToBottom + turtleSeatOffsetY,
    center.z + turtleSeatOffsetZ,
  );

  return target;
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
  const startX = restWorld.x;
  const endX = track.endX;

  if (process.env.NODE_ENV === "development") {
    console.info("[SafariCamelScrollMovement] Ready:", {
      body: camelBody.name,
      carrier: carrier.name,
      authoredX: startX,
      track: [track.startX, track.endX],
      rest: restWorld.toArray(),
    });
  }

  return {
    carrier,
    body: camelBody,
    restX: startX,
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

  useLayoutEffect(() => {
    if (!sceneFrame) {
      rigRef.current = null;
      safariCamelTravelProgressRef.current = 0;
      return;
    }
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    safariCamelTravelProgressRef.current = 0;
    return () => {
      rigRef.current = null;
      safariCamelTravelProgressRef.current = 0;
      carPassState.yachtToSafariCamelTransfer = false;
      carPassState.yachtDockedAtEnd = false;
    };
  }, [scene, nodes, sceneFrame, safariCamelTravelProgressRef, settingsRevision]);

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
      sessionActiveRef.current = false;
      rig.travelProgress = 0;
      safariCamelTravelProgressRef.current = 0;
      parkAtRest();
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

const hot = import.meta.hot;
if (hot) {
  hot.accept("@features/portfolio/config/endCamelScrollSettings", () => {
    hot.invalidate();
  });
}
