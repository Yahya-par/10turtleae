import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { boatScrollSettings } from "@features/portfolio/config/boatScrollSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type BoatRig = {
  carrier: THREE.Group;
  baseY: number;
  baseZ: number;
  restX: number;
  trackEndX: number;
  scene2ScrollStart: number;
  scene2ScrollEnd: number;
  boardScene2T: number | null;
  boatProgress: number;
};

type BoatScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnBoatRef: RefObject<boolean>;
  boatTravelProgressRef: RefObject<number>;
};

function getScene2Track(
  floor: THREE.Object3D,
  restX: number,
  carrierY: number,
  carrierZ: number,
  scrollRange: { min: number; max: number },
) {
  const floorBounds = getObjectBounds(floor);
  const { pathInset } = boatScrollSettings;
  const scrollSpan = scrollRange.max - scrollRange.min;
  const floorCenterX = (floorBounds.min.x + floorBounds.max.x) * 0.5;

  const trackEndX =
    restX >= floorCenterX
      ? floorBounds.min.x + pathInset
      : floorBounds.max.x - pathInset;

  const scene2ScrollStart =
    scrollSpan > 0 ? (floorBounds.min.x - scrollRange.min) / scrollSpan : 0;
  const scene2ScrollEnd =
    scrollSpan > 0 ? (floorBounds.max.x - scrollRange.min) / scrollSpan : 1;

  return {
    restX,
    trackEndX,
    baseY: carrierY,
    baseZ: carrierZ,
    scene2ScrollStart: THREE.MathUtils.clamp(scene2ScrollStart, 0, 1),
    scene2ScrollEnd: THREE.MathUtils.clamp(scene2ScrollEnd, 0, 1),
  };
}

function getScene2Progress(
  scrollProgress: number,
  scene2ScrollStart: number,
  scene2ScrollEnd: number,
) {
  if (scene2ScrollEnd <= scene2ScrollStart) return 0;

  return THREE.MathUtils.clamp(
    (scrollProgress - scene2ScrollStart) / (scene2ScrollEnd - scene2ScrollStart),
    0,
    1,
  );
}

/** Scene 2 is traversed while global scroll progress decreases. */
function getScene2TravelT(
  scrollProgress: number,
  scene2ScrollStart: number,
  scene2ScrollEnd: number,
) {
  return 1 - getScene2Progress(scrollProgress, scene2ScrollStart, scene2ScrollEnd);
}

function getBoatTargetProgress(
  scrollProgress: number,
  boardScene2T: number,
  scene2ScrollStart: number,
  scene2ScrollEnd: number,
) {
  const scene2T = getScene2TravelT(
    scrollProgress,
    scene2ScrollStart,
    scene2ScrollEnd,
  );

  if (boardScene2T >= 1) return 1;

  const linear = THREE.MathUtils.clamp(
    (scene2T - boardScene2T) / (1 - boardScene2T),
    0,
    1,
  );

  return linear ** boatScrollSettings.travelExponent;
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): BoatRig | null {
  scene.updateMatrixWorld(true);

  const boat =
    findSceneObject(scene, nodes, boatScrollSettings.boat) ??
    findSceneObject(scene, nodes, boatScrollSettings.boatBlender);
  const floor = findSceneObject(scene, nodes, boatScrollSettings.scene2Floor);

  if (!boat || !floor) return null;

  const carrier = attachAnimationCarrier(boat, boatScrollSettings.carrierName);
  const restX = carrier.position.x;
  const track = getScene2Track(
    floor,
    restX,
    carrier.position.y,
    carrier.position.z,
    getScrollRange(sceneFrame),
  );

  carrier.position.set(track.restX, track.baseY, track.baseZ);

  if (process.env.NODE_ENV === "development") {
    console.info("[BoatScrollMovement] Ready:", {
      restX: track.restX,
      trackEndX: track.trackEndX,
      scene2Scroll: [track.scene2ScrollStart, track.scene2ScrollEnd],
      boat: boat.name,
    });
  }

  return {
    carrier,
    baseY: track.baseY,
    baseZ: track.baseZ,
    restX: track.restX,
    trackEndX: track.trackEndX,
    scene2ScrollStart: track.scene2ScrollStart,
    scene2ScrollEnd: track.scene2ScrollEnd,
    boardScene2T: null,
    boatProgress: 0,
  };
}

export default function BoatScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnBoatRef,
  boatTravelProgressRef,
}: BoatScrollMovementProps) {
  const rigRef = useRef<BoatRig | null>(null);

  useLayoutEffect(() => {
    const rig = buildRig(scene, nodes, sceneFrame);
    rigRef.current = rig;
    return () => {
      rigRef.current = null;
    };
  }, [scene, nodes, sceneFrame]);

  useFrame((_, delta) => {
    let rig = rigRef.current;
    if (!rig) {
      rig = buildRig(scene, nodes, sceneFrame);
      if (!rig) return;
      rigRef.current = rig;
    }

    const progress = scrollProgress.current;

    if (!turtleOnBoatRef.current) {
      rig.boardScene2T = null;
      rig.boatProgress = 0;
      boatTravelProgressRef.current = 0;
      rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
      return;
    }

    if (rig.boardScene2T === null) {
      rig.boardScene2T = getScene2TravelT(
        progress,
        rig.scene2ScrollStart,
        rig.scene2ScrollEnd,
      );
      rig.boatProgress = 0;
    }

    const targetProgress = getBoatTargetProgress(
      progress,
      rig.boardScene2T,
      rig.scene2ScrollStart,
      rig.scene2ScrollEnd,
    );

    rig.boatProgress = THREE.MathUtils.lerp(
      rig.boatProgress,
      targetProgress,
      boatScrollSettings.followLerp * delta * 60,
    );

    rig.carrier.position.set(
      THREE.MathUtils.lerp(rig.restX, rig.trackEndX, rig.boatProgress),
      rig.baseY,
      rig.baseZ,
    );
    boatTravelProgressRef.current = rig.boatProgress;
  });

  return null;
}
