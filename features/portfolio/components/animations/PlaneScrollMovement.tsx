import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { planeScrollSettings } from "@features/portfolio/config/planeScrollSettings";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type PlaneScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

type PlaneRig = {
  carrier: THREE.Group;
  restPosition: THREE.Vector3;
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

function getSkyTrack(
  trackEnd: THREE.Object3D,
  pathInset: number,
  endOffsetX: number,
  positionOffset: { x: number; y: number; z: number },
  authoredStart: THREE.Vector3,
) {
  const panelBox = getObjectBounds(trackEnd);
  const edgeEndX = panelBox.min.x + pathInset + endOffsetX + positionOffset.x;

  const start = new THREE.Vector3(
    authoredStart.x + positionOffset.x,
    authoredStart.y + positionOffset.y,
    authoredStart.z + positionOffset.z,
  );

  return {
    start,
    end: new THREE.Vector3(edgeEndX, start.y, start.z),
  };
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
): PlaneRig | null {
  const { plane, planeBlender, carrierName } = planeScrollSettings;

  scene.updateMatrixWorld(true);

  const planeObject = resolveObject(scene, nodes, plane, planeBlender);
  if (!planeObject?.parent) return null;

  const carrier =
    planeObject.parent.name === carrierName
      ? (planeObject.parent as THREE.Group)
      : attachAnimationCarrier(planeObject, carrierName);

  const storedRest = carrier.userData.authoredPosition;
  const restPosition =
    storedRest instanceof THREE.Vector3
      ? storedRest.clone()
      : carrier.position.clone();
  carrier.userData.authoredPosition = restPosition.clone();

  return { carrier, restPosition };
}

export default function PlaneScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: PlaneScrollMovementProps) {
  const rigRef = useRef<PlaneRig | null>(null);
  const trackEndRef = useRef<THREE.Object3D | null>(null);
  const sceneStartRef = useRef<THREE.Object3D | null>(null);
  const sceneEndRef = useRef<THREE.Object3D | null>(null);
  const maxTrackProgressRef = useRef(0);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const {
      trackEnd,
      trackEndBlender,
      sceneStart,
      sceneStartBlender,
      sceneEnd,
      sceneEndBlender,
    } = planeScrollSettings;

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

    maxTrackProgressRef.current = 0;

    if (
      !trackEndObject ||
      !sceneStartObject ||
      !sceneEndObject ||
      !rigRef.current
    ) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PlaneScrollMovement] Setup failed:", {
          trackEnd,
          trackEndFound: trackEndObject?.name ?? null,
          plane: resolveObject(
            scene,
            nodes,
            planeScrollSettings.plane,
            planeScrollSettings.planeBlender,
          )?.name ?? null,
        });
      }
      return;
    }

    trackEndRef.current = trackEndObject;
    sceneStartRef.current = sceneStartObject;
    sceneEndRef.current = sceneEndObject;

    if (process.env.NODE_ENV === "development") {
      const { start, end } = getSkyTrack(
        trackEndObject,
        planeScrollSettings.pathInset,
        planeScrollSettings.endOffsetX,
        planeScrollSettings.positionOffset,
        rigRef.current.restPosition,
      );
      const window = getSceneScrollWindow(
        sceneStartObject,
        sceneEndObject,
        sceneFrame,
        planeScrollSettings.scrollStart,
        planeScrollSettings.scrollEnd,
        planeScrollSettings.scrollFallback,
      );
      console.info("[PlaneScrollMovement] Ready:", {
        plane: rigRef.current.carrier.children[0]?.name,
        start: start.toArray(),
        end: end.toArray(),
        scrollWindow: [window.scrollStart, window.scrollEnd],
      });
    }
  }, [scene, nodes, sceneFrame]);

  useFrame(() => {
    const trackEndObject = trackEndRef.current;
    const sceneStart = sceneStartRef.current;
    const sceneEnd = sceneEndRef.current;
    const rig = rigRef.current;
    if (!trackEndObject || !sceneStart || !sceneEnd || !rig) return;

    const {
      pathInset,
      endOffsetX,
      positionOffset,
      scrollStart,
      scrollEnd,
      scrollFallback,
    } = planeScrollSettings;

    const { start, end } = getSkyTrack(
      trackEndObject,
      pathInset,
      endOffsetX,
      positionOffset,
      rig.restPosition,
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
      scrollFallback,
    );

    const beforeScene =
      winEnd < winStart ? progress > winStart : progress < winStart;

    if (beforeScene) {
      maxTrackProgressRef.current = 0;
      rig.carrier.position.copy(start);
      return;
    }

    if (isInScrollWindow(progress, winStart, winEnd)) {
      const trackProgress = getTrackProgress(progress, winStart, winEnd);
      maxTrackProgressRef.current = Math.max(
        maxTrackProgressRef.current,
        trackProgress,
      );
    }

    tempPosition.copy(start).lerp(end, maxTrackProgressRef.current);
    rig.carrier.position.copy(tempPosition);
  });

  return null;
}
