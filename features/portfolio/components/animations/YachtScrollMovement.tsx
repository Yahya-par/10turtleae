import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { YachtScrollSettings } from "@features/portfolio/config/yachtScrollSettings";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type YachtScrollMovementProps = {
  settings: YachtScrollSettings;
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

type YachtRig = {
  carrier: THREE.Group;
  restPosition: THREE.Vector3;
  lastX: number;
};

const tempPosition = new THREE.Vector3();

function resolveObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  runtimeName: string,
  blenderName?: string,
) {
  return (
    findSceneObject(scene, nodes, runtimeName) ??
    (blenderName ? findSceneObject(scene, nodes, blenderName) : null)
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
  trackEnd: THREE.Object3D,
  pathInset: number,
  positionOffset: { x: number; y: number; z: number },
  startOffsetX: number,
  endOffsetX: number,
  authoredStart: THREE.Vector3 | null,
  waterEnd: THREE.Object3D | null,
  trackEndMode: YachtScrollSettings["trackEndMode"],
) {
  const startWaterBox = getObjectBounds(waterStart);
  const endWaterBox = waterEnd ? getObjectBounds(waterEnd) : startWaterBox;
  const trackEndBox = getObjectBounds(trackEnd);
  const startCenter = new THREE.Vector3();
  const endCenter = new THREE.Vector3();
  startWaterBox.getCenter(startCenter);
  endWaterBox.getCenter(endCenter);

  const startY = startCenter.y + positionOffset.y;
  const startZ = startCenter.z + positionOffset.z;
  const endY = endCenter.y + positionOffset.y;
  const endZ = endCenter.z + positionOffset.z;

  const edgeStartX =
    startWaterBox.max.x - pathInset + positionOffset.x + startOffsetX;

  const panelEdgeX = trackEndBox.min.x + pathInset + endOffsetX;
  const waterEdgeX = endWaterBox.min.x + pathInset + endOffsetX;
  const edgeEndX =
    trackEndMode === "throughNextScene"
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

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  settings: YachtScrollSettings,
): YachtRig | null {
  const { yacht, yachtBlender, carrierName } = settings;

  scene.updateMatrixWorld(true);

  const yachtObject = resolveObject(scene, nodes, yacht, yachtBlender);
  if (!yachtObject?.parent) return null;

  const carrier =
    yachtObject.parent.name === carrierName
      ? (yachtObject.parent as THREE.Group)
      : attachAnimationCarrier(yachtObject, carrierName);

  const storedRest = carrier.userData.authoredPosition;
  const restPosition =
    storedRest instanceof THREE.Vector3
      ? storedRest.clone()
      : carrier.position.clone();
  carrier.userData.authoredPosition = restPosition.clone();

  return {
    carrier,
    restPosition,
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
}: YachtScrollMovementProps) {
  const rigRef = useRef<YachtRig | null>(null);
  const waterRef = useRef<THREE.Object3D | null>(null);
  const waterEndRef = useRef<THREE.Object3D | null>(null);
  const trackEndRef = useRef<THREE.Object3D | null>(null);
  const sceneStartRef = useRef<THREE.Object3D | null>(null);
  const sceneEndRef = useRef<THREE.Object3D | null>(null);

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

    const waterObject = resolveObject(scene, nodes, water, waterBlender);
    const waterEndObject = settings.waterEnd
      ? resolveObject(
          scene,
          nodes,
          settings.waterEnd,
          settings.waterEndBlender,
        )
      : null;
    const trackEndObject = resolveObject(
      scene,
      nodes,
      trackEnd,
      trackEndBlender,
    );
    const sceneStartObject = resolveObject(
      scene,
      nodes,
      sceneStart,
      sceneStartBlender,
    );
    const sceneEndObject = resolveObject(
      scene,
      nodes,
      sceneEnd,
      sceneEndBlender,
    );

    if (!rigRef.current) {
      rigRef.current = buildRig(scene, nodes, settings);
    }

    if (
      !waterObject ||
      !trackEndObject ||
      !sceneStartObject ||
      !sceneEndObject ||
      !rigRef.current ||
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
      );
      const window = getSceneScrollWindow(
        sceneStartObject,
        sceneEndObject,
        sceneFrame,
        scrollStart,
        scrollEnd,
        scrollFallback,
      );
      console.info(`[YachtScrollMovement:${label}] Ready:`, {
        yacht: rigRef.current.carrier.children[0]?.name,
        water: waterObject.name,
        waterEnd: waterEndObject?.name ?? null,
        waterX: [waterBox.min.x, waterBox.max.x],
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
    if (!water || !trackEndObject || !sceneStart || !sceneEnd || !rig) return;

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
    );
    applyManualPositions(start, end, settings);

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    const { scrollStart: winStart, scrollEnd: winEnd } = getSceneScrollWindow(
      sceneStart,
      sceneEnd,
      sceneFrame,
      scrollStart,
      scrollEnd,
      scrollFallback,
    );

    const inWindow = isInScrollWindow(progress, winStart, winEnd);
    rig.carrier.visible = true;

    if (!inWindow) {
      const parkedAtStart = winEnd < winStart
        ? progress > winStart
        : progress < winStart;
      tempPosition.copy(parkedAtStart ? start : end);
      rig.carrier.position.copy(tempPosition);
      rig.lastX = tempPosition.x;
      return;
    }

    const trackProgress = getTrackProgress(progress, winStart, winEnd);
    tempPosition.copy(start).lerp(end, trackProgress);
    rig.carrier.position.copy(tempPosition);
    rig.lastX = tempPosition.x;
  });

  return null;
}
