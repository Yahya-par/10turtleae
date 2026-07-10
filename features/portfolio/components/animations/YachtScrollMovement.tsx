import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { YachtScrollSettings } from "@features/portfolio/config/yachtScrollSettings";
import { carPassState } from "@features/portfolio/config/carPassState";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import {
  attachAnimationCarrier,
  findObjectByNamePattern,
  findSceneObject,
  getObjectBounds,
  setObjectWorldPosition,
} from "@features/portfolio/utils/sceneObjectUtils";

type YachtScrollMovementProps = {
  settings: YachtScrollSettings;
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  travelProgressRef?: RefObject<number>;
  /** When set, yacht only sails after the turtle has mounted. */
  turtleOnYachtRef?: RefObject<boolean>;
};

type YachtRig = {
  carrier: THREE.Group;
  restPosition: THREE.Vector3;
  baseY: number;
  baseZ: number;
  lastX: number;
};

const tempPosition = new THREE.Vector3();
const tempYachtSize = new THREE.Vector3();

export function getYachtSeatWorld(
  yacht: THREE.Object3D,
  settings: YachtScrollSettings,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(yacht);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempYachtSize);
  const deckFactor = settings.turtleDeckHeightFactor ?? 0.62;

  target.set(
    center.x + (settings.turtleSeatOffsetX ?? 0),
    bounds.min.y + size.y * deckFactor + (settings.turtleSeatOffsetY ?? 0),
    center.z + (settings.turtleSeatOffsetZ ?? 0),
  );

  return target;
}

function resolveObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeName: string,
  blenderName?: string,
  namePattern?: RegExp,
) {
  return (
    findSceneObject(
      scene,
      nodes,
      runtimeName,
      ...(blenderName ? [blenderName] : []),
    ) ?? (namePattern ? findObjectByNamePattern(scene, namePattern) : null)
  );
}

function xToScroll(
  x: number,
  scrollRange: { min: number; max: number },
) {
  const span = scrollRange.max - scrollRange.min;
  return span > 0 ? (x - scrollRange.min) / span : 0;
}

function getSceneScrollWindow(
  sceneStart: THREE.Object3D,
  sceneEnd: THREE.Object3D,
  sceneFrame: SceneFrame | null,
  manualStart: number | null,
  manualEnd: number | null,
  scrollFallback: { scrollStart: number; scrollEnd: number },
) {
  if (manualStart !== null && manualEnd !== null) {
    return { scrollStart: manualStart, scrollEnd: manualEnd };
  }

  const scrollRange = getScrollRange(sceneFrame);
  const startBounds = getObjectBounds(sceneStart);
  const samePanel = sceneStart === sceneEnd || sceneStart.name === sceneEnd.name;
  const endBounds = samePanel ? startBounds : getObjectBounds(sceneEnd);

  const scrollStart = THREE.MathUtils.clamp(
    xToScroll(startBounds.max.x, scrollRange),
    0,
    1,
  );
  const scrollEnd = THREE.MathUtils.clamp(
    xToScroll(
      samePanel ? startBounds.min.x : endBounds.min.x,
      scrollRange,
    ),
    0,
    1,
  );

  if (scrollStart <= scrollEnd && scrollStart < 0.02) {
    return scrollFallback;
  }

  return { scrollStart, scrollEnd };
}

function getTrackProgress(
  scrollValue: number,
  scrollStart: number,
  scrollEnd: number,
) {
  if (scrollEnd === scrollStart) return 0;

  if (scrollEnd < scrollStart) {
    return THREE.MathUtils.clamp(
      (scrollStart - scrollValue) / (scrollStart - scrollEnd),
      0,
      1,
    );
  }

  return THREE.MathUtils.clamp(
    (scrollValue - scrollStart) / (scrollEnd - scrollStart),
    0,
    1,
  );
}

function isInScrollWindow(
  scrollValue: number,
  scrollStart: number,
  scrollEnd: number,
) {
  if (scrollEnd < scrollStart) {
    return scrollValue <= scrollStart && scrollValue >= scrollEnd;
  }

  return scrollValue >= scrollStart && scrollValue <= scrollEnd;
}

function getWaterTrack(
  waterStart: THREE.Object3D,
  trackEnd: THREE.Object3D | null,
  pathInset: number,
  positionOffset: { x: number; y: number; z: number },
  startOffsetX: number,
  endOffsetX: number,
  authoredStart: THREE.Vector3 | null,
  waterEnd: THREE.Object3D | null,
  trackEndMode: YachtScrollSettings["trackEndMode"],
  useWaterBounds = false,
  authoredSurfaceY: number | null = null,
  authoredSurfaceZ: number | null = null,
) {
  const startWaterBox = getObjectBounds(waterStart);
  const endWaterBox = waterEnd ? getObjectBounds(waterEnd) : startWaterBox;
  const trackEndBox = trackEnd ? getObjectBounds(trackEnd) : null;
  const startCenter = new THREE.Vector3();
  const endCenter = new THREE.Vector3();
  startWaterBox.getCenter(startCenter);
  endWaterBox.getCenter(endCenter);

  const startY =
    useWaterBounds && authoredSurfaceY !== null
      ? authoredSurfaceY
      : startCenter.y + positionOffset.y;
  const startZ =
    useWaterBounds && authoredSurfaceZ !== null
      ? authoredSurfaceZ
      : startCenter.z + positionOffset.z;
  const endY =
    useWaterBounds && authoredSurfaceY !== null
      ? authoredSurfaceY
      : endCenter.y + positionOffset.y;
  const endZ =
    useWaterBounds && authoredSurfaceZ !== null
      ? authoredSurfaceZ
      : endCenter.z + positionOffset.z;

  const edgeStartX =
    startWaterBox.max.x - pathInset + positionOffset.x + startOffsetX;

  const panelEdgeX = trackEndBox
    ? trackEndBox.min.x + pathInset + endOffsetX
    : startWaterBox.min.x + pathInset + endOffsetX;
  const waterEdgeX = endWaterBox.min.x + pathInset + endOffsetX;
  // useWaterBounds anchors the stop line to the water's own western edge,
  // ignoring the scene panel so the yacht sails the full shinywater corridor.
  const edgeEndX = useWaterBounds
    ? startWaterBox.min.x + pathInset + endOffsetX
    : trackEndMode === "throughNextScene"
      ? Math.min(waterEdgeX, panelEdgeX)
      : Math.max(startWaterBox.min.x + pathInset + endOffsetX, panelEdgeX);

  const start = authoredStart
    ? new THREE.Vector3(
        authoredStart.x + startOffsetX,
        startY,
        startZ,
      )
    : new THREE.Vector3(edgeStartX, startY, startZ);

  return {
    start,
    end: new THREE.Vector3(edgeEndX, endY, endZ),
    waterBox: startWaterBox,
    edgeEndX,
    panelEdgeX,
  };
}

function applyManualPositionOffset(
  x: number,
  y: number,
  z: number,
  settings: YachtScrollSettings,
  target = tempPosition,
) {
  const offset = settings.manualPosition ?? { x: 0, y: 0, z: 0 };
  target.set(x + offset.x, y + offset.y, z + offset.z);
  return target;
}

function applyManualPositions(
  start: THREE.Vector3,
  end: THREE.Vector3,
  settings: YachtScrollSettings,
) {
  const { manualStartPosition, manualEndPosition } = settings;
  if (manualStartPosition) {
    start.x += manualStartPosition.x;
    start.y += manualStartPosition.y;
    start.z += manualStartPosition.z;
  }
  if (manualEndPosition) {
    end.x += manualEndPosition.x;
    end.y += manualEndPosition.y;
    end.z += manualEndPosition.z;
  }
}

function isTurtleOnCarrier(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  carrier: THREE.Object3D,
) {
  const turtle =
    findSceneObject(scene, nodes, "turtlechar001", "turtlechar.001") ??
    findObjectByNamePattern(scene, /turtlechar/i);
  if (!turtle) return false;

  let node: THREE.Object3D | null = turtle;
  while (node) {
    if (node === carrier) return true;
    node = node.parent;
  }
  return false;
}

function trackTFromCarrierX(
  carrierX: number,
  startX: number,
  endX: number,
) {
  const span = endX - startX;
  if (Math.abs(span) < 1e-6) return 0;
  return THREE.MathUtils.clamp((carrierX - startX) / span, 0, 1);
}

function setCarrierWorldPosition(
  carrier: THREE.Object3D,
  worldX: number,
  worldY: number,
  worldZ: number,
) {
  tempPosition.set(worldX, worldY, worldZ);
  setObjectWorldPosition(carrier, tempPosition);
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  settings: YachtScrollSettings,
): YachtRig | null {
  const { yacht, yachtBlender, carrierName } = settings;

  scene.updateMatrixWorld(true);

  const yachtNumber = yacht.match(/(\d+)/)?.[1] ?? "001";
  const yachtPattern = new RegExp(`yacht\\.?${yachtNumber}`, "i");
  const yachtObject = resolveObject(
    scene,
    nodes,
    yacht,
    yachtBlender,
    yachtPattern,
  );
  if (!yachtObject?.parent) return null;

  const carrier =
    yachtObject.parent.name === carrierName
      ? (yachtObject.parent as THREE.Group)
      : attachAnimationCarrier(yachtObject, carrierName);

  carrier.updateMatrixWorld(true);
  const restWorld = new THREE.Vector3();
  carrier.getWorldPosition(restWorld);

  const storedRest = carrier.userData.authoredPosition;
  const restPosition =
    storedRest instanceof THREE.Vector3
      ? storedRest.clone()
      : carrier.position.clone();
  carrier.userData.authoredPosition = restPosition.clone();

  const { positionOffset } = settings;

  return {
    carrier,
    restPosition,
    baseY: restWorld.y + positionOffset.y,
    baseZ: restWorld.z + positionOffset.z,
    lastX: carrier.position.x,
  };
}

export default function YachtScrollMovement({
  settings,
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  travelProgressRef,
  turtleOnYachtRef,
}: YachtScrollMovementProps) {
  const rigRef = useRef<YachtRig | null>(null);
  const waterRef = useRef<THREE.Object3D | null>(null);
  const waterEndRef = useRef<THREE.Object3D | null>(null);
  const trackEndRef = useRef<THREE.Object3D | null>(null);
  const sceneStartRef = useRef<THREE.Object3D | null>(null);
  const sceneEndRef = useRef<THREE.Object3D | null>(null);
  const prevTurtleBoardedRef = useRef(true);
  const prevTurtleOnThisYachtRef = useRef(false);
  const safariHandoffLatchUntilRef = useRef(0);
  const lastRideProgressRef = useRef<number | null>(null);
  const rideTrackTRef = useRef(0);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const {
      water,
      waterBlender,
      trackEnd,
      trackEndBlender,
      sceneStart,
      sceneStartBlender,
      sceneEnd,
      sceneEndBlender,
      scrollStart,
      scrollEnd,
      scrollFallback,
      label,
    } = settings;

    const waterObject = resolveObject(
      scene,
      nodes,
      water,
      waterBlender,
      /shinywater/i,
    );
    const waterEndObject = settings.waterEnd
      ? resolveObject(
          scene,
          nodes,
          settings.waterEnd,
          settings.waterEndBlender,
          /mgrwater|water\.?002/i,
        )
      : null;
    const trackEndObject = resolveObject(
      scene,
      nodes,
      trackEnd,
      trackEndBlender,
      /Desert_Scene_Floor0*07|Desert_Scene_Floor\.007/i,
    );
    const sceneStartObject = resolveObject(
      scene,
      nodes,
      sceneStart,
      sceneStartBlender,
      settings.label === "Atlantis"
        ? /Desert_Scene_Floor0*07|Desert_Scene_Floor\.007/i
        : /Desert_Scene_Floor0*09|Desert_Scene_Floor\.009/i,
    );
    const sceneEndObject = resolveObject(
      scene,
      nodes,
      sceneEnd,
      sceneEndBlender,
      settings.label === "Atlantis"
        ? /Desert_Scene_Floor0*07|Desert_Scene_Floor\.007/i
        : /Desert_Scene_Floor0*11|Desert_Scene_Floor\.011/i,
    );

    if (!rigRef.current) {
      rigRef.current = buildRig(scene, nodes, settings);
    }

    // With useWaterBounds the yacht is driven entirely by the water mesh, so
    // the scene floor panels (absent in Modelv1) are not required.
    const requiresScenePanels = !settings.useWaterBounds;

    if (
      !waterObject ||
      !rigRef.current ||
      (requiresScenePanels &&
        (!trackEndObject || !sceneStartObject || !sceneEndObject)) ||
      (settings.waterEnd && !waterEndObject)
    ) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[YachtScrollMovement:${label}] Setup failed:`, {
          water,
          waterFound: waterObject?.name ?? null,
          waterEnd: settings.waterEnd ?? null,
          waterEndFound: waterEndObject?.name ?? null,
          trackEnd,
          trackEndFound: trackEndObject?.name ?? null,
          sceneStart,
          sceneStartFound: sceneStartObject?.name ?? null,
          yacht: resolveObject(scene, nodes, settings.yacht, settings.yachtBlender)
            ?.name ?? null,
        });
      }
      return;
    }

    waterRef.current = waterObject;
    waterEndRef.current = waterEndObject;
    trackEndRef.current = trackEndObject;
    sceneStartRef.current = sceneStartObject;
    sceneEndRef.current = sceneEndObject;

    if (process.env.NODE_ENV === "development") {
      const { start, end, waterBox, edgeEndX, panelEdgeX } = getWaterTrack(
        waterObject,
        trackEndObject,
        settings.pathInset,
        settings.positionOffset,
        settings.startOffsetX,
        settings.endOffsetX,
        settings.useAuthoredStart ? rigRef.current.restPosition : null,
        waterEndObject,
        settings.trackEndMode,
        settings.useWaterBounds,
      );
      const window =
        sceneStartObject && sceneEndObject
          ? getSceneScrollWindow(
              sceneStartObject,
              sceneEndObject,
              sceneFrame,
              scrollStart,
              scrollEnd,
              scrollFallback,
            )
          : { scrollStart: NaN, scrollEnd: NaN };
      console.info(`[YachtScrollMovement:${label}] Ready:`, {
        yacht: rigRef.current.carrier.children[0]?.name,
        water: waterObject.name,
        waterEnd: waterEndObject?.name ?? null,
        waterX: [waterBox.min.x, waterBox.max.x],
        useWaterBounds: settings.useWaterBounds ?? false,
        panelEdgeX,
        edgeEndX,
        start: start.toArray(),
        end: end.toArray(),
        scrollWindow: [window.scrollStart, window.scrollEnd],
      });
    }
  }, [scene, nodes, sceneFrame, settings]);

  useFrame(() => {
    const water = waterRef.current;
    const waterEndObject = waterEndRef.current;
    const trackEndObject = trackEndRef.current;
    const sceneStart = sceneStartRef.current;
    const sceneEnd = sceneEndRef.current;
    const rig = rigRef.current;
    if (!water || !rig) return;
    rig.carrier.visible = true;
    if (!settings.useWaterBounds && (!trackEndObject || !sceneStart || !sceneEnd)) {
      return;
    }

    const {
      pathInset,
      positionOffset,
      startOffsetX,
      endOffsetX,
      useAuthoredStart,
      scrollStart,
      scrollEnd,
      scrollFallback,
      trackEndMode,
    } = settings;

    const { start, end } = getWaterTrack(
      water,
      trackEndObject,
      pathInset,
      positionOffset,
      startOffsetX,
      endOffsetX,
      useAuthoredStart ? rig.restPosition : null,
      waterEndObject,
      trackEndMode,
      settings.useWaterBounds,
      settings.useWaterBounds ? rig.baseY : null,
      settings.useWaterBounds ? rig.baseZ : null,
    );
    applyManualPositions(start, end, settings);

    const placeCarrier = (x: number, y: number, z: number) => {
      applyManualPositionOffset(x, y, z, settings);
      if (settings.useWaterBounds) {
        setCarrierWorldPosition(
          rig.carrier,
          tempPosition.x,
          tempPosition.y,
          tempPosition.z,
        );
      } else {
        rig.carrier.position.copy(tempPosition);
      }
    };

    const isAtlantisYacht = settings.carrierName === "YachtScrollCarrier001";
    const isSafariHandoffYacht = settings.carrierName === "YachtScrollCarrier002";
    const now = performance.now();

    if (
      isAtlantisYacht &&
      (carPassState.yachtToSafariCamelTransfer ||
        carPassState.yachtDockedAtEnd)
    ) {
      placeCarrier(end.x, end.y, end.z);
      rig.lastX = end.x;
      if (travelProgressRef) {
        travelProgressRef.current = 1;
      }
      return;
    }

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );
    const turtleBoarded = !turtleOnYachtRef || turtleOnYachtRef.current;

    let winStart: number;
    let winEnd: number;

    if (settings.useWaterBounds) {
      // Keep the scroll window aligned with the water positions so the yacht
      // travels across the full shinywater corridor as the user scrolls.
      const scrollRange = getScrollRange(sceneFrame);
      const waterBox = getObjectBounds(water);
      winStart = THREE.MathUtils.clamp(
        xToScroll(waterBox.max.x, scrollRange),
        0,
        1,
      );
      winEnd = THREE.MathUtils.clamp(
        xToScroll(waterBox.min.x, scrollRange),
        0,
        1,
      );
    } else {
      const sceneWindow = getSceneScrollWindow(
        sceneStart!,
        sceneEnd!,
        sceneFrame,
        scrollStart,
        scrollEnd,
        scrollFallback,
      );
      winStart = sceneWindow.scrollStart;
      winEnd = sceneWindow.scrollEnd;
    }

    const inWindow = isInScrollWindow(progress, winStart, winEnd);
    const turtleOnThisYacht =
      turtleBoarded && isTurtleOnCarrier(scene, nodes, rig.carrier);

    if (isSafariHandoffYacht && turtleBoarded && !prevTurtleBoardedRef.current) {
      safariHandoffLatchUntilRef.current = now + 350;
    }
    prevTurtleBoardedRef.current = turtleBoarded;

    if (
      isSafariHandoffYacht &&
      !turtleOnThisYacht &&
      carPassState.safariCamelToYachtTransfer
    ) {
      placeCarrier(start.x, start.y, start.z);
      rig.lastX = start.x;
      rideTrackTRef.current = 0;
      if (travelProgressRef) {
        travelProgressRef.current = 0;
      }
      return;
    }

    if (
      isSafariHandoffYacht &&
      !turtleOnThisYacht &&
      now < safariHandoffLatchUntilRef.current
    ) {
      return;
    }

    if (isSafariHandoffYacht && !turtleOnThisYacht) {
      lastRideProgressRef.current = null;
    }

    if (isSafariHandoffYacht && turtleOnThisYacht) {
      const justBoardedOnThisYacht =
        turtleOnThisYacht && !prevTurtleOnThisYachtRef.current;
      prevTurtleOnThisYachtRef.current = true;

      const scrollSpan = winEnd - winStart;
      let trackT = rideTrackTRef.current;

      if (justBoardedOnThisYacht || lastRideProgressRef.current === null) {
        rig.carrier.updateMatrixWorld(true);
        const carrierX = rig.carrier.getWorldPosition(tempPosition).x;
        trackT = trackTFromCarrierX(carrierX, start.x, end.x);
        rideTrackTRef.current = trackT;
        lastRideProgressRef.current = progress;
      } else if (Math.abs(scrollSpan) > 1e-6) {
        trackT = THREE.MathUtils.clamp(
          rideTrackTRef.current +
            (progress - lastRideProgressRef.current) / scrollSpan,
          0,
          1,
        );
        rideTrackTRef.current = trackT;
        lastRideProgressRef.current = progress;
      }

      if (travelProgressRef) {
        travelProgressRef.current = trackT;
      }
      tempPosition.copy(start).lerp(end, trackT);
      placeCarrier(tempPosition.x, tempPosition.y, tempPosition.z);
      rig.lastX = tempPosition.x;
      return;
    }

    if (isSafariHandoffYacht && !turtleOnThisYacht) {
      prevTurtleOnThisYachtRef.current = false;
    }

    if (!inWindow) {
      if (isSafariHandoffYacht) {
        // yacht002: keep last valid transform outside window to avoid
        // disappearance from start/end snap during handoff transitions.
        return;
      }
      const parkedAtStart =
        !carPassState.yachtDockedAtEnd &&
        (winEnd < winStart
          ? progress > winStart
          : progress < winStart);
      const parked = parkedAtStart ? start : end;
      placeCarrier(parked.x, parked.y, parked.z);
      rig.lastX = parked.x;
      if (travelProgressRef) {
        travelProgressRef.current = parkedAtStart ? 0 : 1;
      }
      return;
    }

    // During turtle transfer, keep the yacht anchored at its current position
    // instead of teleporting to route start/end, which causes visible flicker.
    if (!turtleBoarded) {
      if (travelProgressRef) {
        travelProgressRef.current = getTrackProgress(progress, winStart, winEnd);
      }
      return;
    }

    const trackProgress = getTrackProgress(progress, winStart, winEnd);
    if (travelProgressRef) {
      travelProgressRef.current = trackProgress;
    }
    tempPosition.copy(start).lerp(end, trackProgress);
    placeCarrier(tempPosition.x, tempPosition.y, tempPosition.z);
    rig.lastX = tempPosition.x;
  });

  return null;
}
