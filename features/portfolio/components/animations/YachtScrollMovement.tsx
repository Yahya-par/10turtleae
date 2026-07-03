import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { yachtScrollSettings } from "@features/portfolio/config/yachtScrollSettings";
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

const LEFT_SCENE_SCROLL_FALLBACK = { scrollStart: 0.12, scrollEnd: 0 };

// resolveObject - resolve the object in the scene by name
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

// xToScroll - convert the x position to a scroll progress
function xToScroll(
  x: number,
  scrollRange: { min: number; max: number },
) {
  const span = scrollRange.max - scrollRange.min;
  return span > 0 ? (x - scrollRange.min) / span : 0;
}

// getSceneScrollWindow - get the scroll window for the scene
function getSceneScrollWindow(
  sceneStart: THREE.Object3D,
  sceneEnd: THREE.Object3D,
  sceneFrame: SceneFrame | null,
  manualStart: number | null,
  manualEnd: number | null,
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
    return LEFT_SCENE_SCROLL_FALLBACK;
  }

  return { scrollStart, scrollEnd };
}

// getTrackProgress - get the progress of the track
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

// isInScrollWindow - check if the scroll value is in the scroll window
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

// getWaterTrack - get the water track
function getWaterTrack(
  water: THREE.Object3D,
  trackEnd: THREE.Object3D,
  pathInset: number,
  positionOffset: { x: number; y: number; z: number },
  startOffsetX: number,
  endOffsetX: number,
  authoredStart: THREE.Vector3 | null,
) {
  const waterBox = getObjectBounds(water);
  const trackEndBox = getObjectBounds(trackEnd);
  const waterCenter = new THREE.Vector3();
  waterBox.getCenter(waterCenter);

  const trackY = waterCenter.y + positionOffset.y;
  const trackZ = waterCenter.z + positionOffset.z;

  const edgeStartX =
    waterBox.max.x - pathInset + positionOffset.x + startOffsetX;

  // Safari/desert sits at lower X. Cap the stop at the Atlantis panel edge
  // (higher X = further from desert), never past water into the next scene.
  const panelEdgeX = trackEndBox.min.x + pathInset + endOffsetX;
  const waterEdgeX = waterBox.min.x + pathInset + endOffsetX;
  const edgeEndX = Math.max(waterEdgeX, panelEdgeX);

  const start = authoredStart
    ? new THREE.Vector3(
        authoredStart.x + startOffsetX,
        trackY,
        trackZ,
      )
    : new THREE.Vector3(edgeStartX, trackY, trackZ);

  return {
    start,
    end: new THREE.Vector3(edgeEndX, trackY, trackZ),
    waterBox,
    edgeEndX,
    panelEdgeX,
  };
}

// buildRig - build the rig for the yacht
function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
): YachtRig | null {
  const { yacht, yachtBlender, carrierName } = yachtScrollSettings;

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

// YachtScrollMovement - the component that controls the yacht scroll movement
export default function YachtScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: YachtScrollMovementProps) {
  const rigRef = useRef<YachtRig | null>(null);
  const waterRef = useRef<THREE.Object3D | null>(null);
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
    } = yachtScrollSettings;

    const waterObject = resolveObject(scene, nodes, water, waterBlender);
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
      rigRef.current = buildRig(scene, nodes);
    }

    if (!waterObject || !trackEndObject || !sceneStartObject || !sceneEndObject || !rigRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[YachtScrollMovement] Setup failed:", {
          water,
          waterFound: waterObject?.name ?? null,
          trackEnd,
          trackEndFound: trackEndObject?.name ?? null,
          sceneStart,
          sceneStartFound: sceneStartObject?.name ?? null,
          sceneEnd,
          sceneEndFound: sceneEndObject?.name ?? null,
          yacht: resolveObject(
            scene,
            nodes,
            yachtScrollSettings.yacht,
            yachtScrollSettings.yachtBlender,
          )?.name ?? null,
        });
      }
      return;
    }

    waterRef.current = waterObject;
    trackEndRef.current = trackEndObject;
    sceneStartRef.current = sceneStartObject;
    sceneEndRef.current = sceneEndObject;

    if (process.env.NODE_ENV === "development") {
      const { start, end, waterBox, edgeEndX, panelEdgeX } = getWaterTrack(
        waterObject,
        trackEndObject,
        yachtScrollSettings.pathInset,
        yachtScrollSettings.positionOffset,
        yachtScrollSettings.startOffsetX,
        yachtScrollSettings.endOffsetX,
        yachtScrollSettings.useAuthoredStart ? rigRef.current.restPosition : null,
      );
      const window = getSceneScrollWindow(
        sceneStartObject,
        sceneEndObject,
        sceneFrame,
        scrollStart,
        scrollEnd,
      );
      console.info("[YachtScrollMovement] Ready:", {
        yacht: rigRef.current.carrier.children[0]?.name,
        water: waterObject.name,
        waterX: [waterBox.min.x, waterBox.max.x],
        panelEdgeX,
        edgeEndX,
        start: start.toArray(),
        end: end.toArray(),
        scrollWindow: [window.scrollStart, window.scrollEnd],
      });
    }
  }, [scene, nodes, sceneFrame]);

  useFrame(() => {
    const water = waterRef.current;
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
    } = yachtScrollSettings;

    const { start, end } = getWaterTrack(
      water,
      trackEndObject,
      pathInset,
      positionOffset,
      startOffsetX,
      endOffsetX,
      useAuthoredStart ? rig.restPosition : null,
    );

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
