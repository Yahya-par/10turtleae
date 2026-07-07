import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { boatScrollSettings } from "@features/portfolio/config/boatScrollSettings";
import { carScrollSettings } from "@features/portfolio/config/carScrollSettings";
import {
  attachAnimationCarrier,
  findScrollCarRoadMesh,
  findScene2Floor,
  findSceneObject,
  findScrollCarBody,
  getObjectBounds,
  resolveCarRoadTrack,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type BoatRig = {
  carrier: THREE.Group;
  floor: THREE.Object3D;
  baseY: number;
  baseZ: number;
  restX: number;
  trackEndX: number;
  scene2ScrollStart: number;
  scene2ScrollEnd: number;
  boardScene2T: number | null;
  boatProgress: number;
  dockedAtEnd: boolean;
};

function resolveCarDockHandoffX(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const road = findScrollCarRoadMesh(scene, nodes);
  if (road) {
    const track = resolveCarRoadTrack(road, {
      roadOffset: carScrollSettings.roadOffset,
    });
    return track.roadEastX + boatScrollSettings.carHandoffInset;
  }

  const car = findScrollCarBody(scene, nodes);
  if (!car) return null;

  car.updateMatrixWorld(true);
  const carBounds = getObjectBounds(car);
  return carBounds.max.x + boatScrollSettings.carHandoffInset;
}

function resolveScene2TrackEndX(
  restX: number,
  floor: THREE.Object3D,
  carDockHandoffX: number | null,
) {
  const floorBounds = getObjectBounds(floor);
  const { pathInset } = boatScrollSettings;
  const scene2WestLimit = floorBounds.min.x + pathInset;

  if (carDockHandoffX !== null) {
    return Math.max(carDockHandoffX, scene2WestLimit);
  }

  const floorCenterX = (floorBounds.min.x + floorBounds.max.x) * 0.5;

  const fallback =
    restX >= floorCenterX
      ? floorBounds.min.x + pathInset
      : floorBounds.max.x - pathInset;

  return Math.max(fallback, scene2WestLimit);
}

function getScene2Track(
  floor: THREE.Object3D,
  restX: number,
  carrierY: number,
  carrierZ: number,
  scrollRange: { min: number; max: number },
  carDockHandoffX: number | null,
) {
  const trackEndX = resolveScene2TrackEndX(restX, floor, carDockHandoffX);
  const eastX = Math.max(restX, trackEndX);
  const westX = Math.min(restX, trackEndX);

  return {
    restX,
    trackEndX,
    baseY: carrierY,
    baseZ: carrierZ,
    scene2ScrollStart: xToScrollProgress(eastX, scrollRange),
    scene2ScrollEnd: xToScrollProgress(westX, scrollRange),
  };
}

type BoatScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnBoatRef: RefObject<boolean>;
  turtleOnCarRef: RefObject<boolean>;
  turtleOnJetskiRef: RefObject<boolean>;
  turtleOnYachtRef: RefObject<boolean>;
  boatTravelProgressRef: RefObject<number>;
  turtleReturnedFromCarRef: RefObject<boolean>;
};

const tempWorld = new THREE.Vector3();

function xToScrollProgress(
  worldX: number,
  scrollRange: { min: number; max: number },
) {
  const span = scrollRange.max - scrollRange.min;
  if (span <= 0) return 0;
  return THREE.MathUtils.clamp((worldX - scrollRange.min) / span, 0, 1);
}

function getBoatTravelProgress(
  scrollProgress: number,
  scene2ScrollStart: number,
  scene2ScrollEnd: number,
) {
  if (scrollProgress > scene2ScrollStart) return 0;
  if (scrollProgress < scene2ScrollEnd) return 1;

  const span = scene2ScrollStart - scene2ScrollEnd;
  if (span <= 0) return 0;

  return THREE.MathUtils.clamp(
    (scene2ScrollStart - scrollProgress) / span,
    0,
    1,
  );
}

function getBoatTargetProgress(
  scrollProgress: number,
  boardScene2T: number,
  scene2ScrollStart: number,
  scene2ScrollEnd: number,
) {
  const scene2T = getBoatTravelProgress(
    scrollProgress,
    scene2ScrollStart,
    scene2ScrollEnd,
  );

  if (boardScene2T >= 0.99) {
    return scene2T;
  }

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
  const floor =
    findSceneObject(
      scene,
      nodes,
      boatScrollSettings.scene2Floor,
      boatScrollSettings.scene2FloorBlender,
    ) ?? findScene2Floor(scene, nodes);

  if (!boat || !floor) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[BoatScrollMovement] Setup failed:", {
        boat: boat?.name ?? null,
        floor: floor?.name ?? null,
      });
    }
    return null;
  }

  const carrier = attachAnimationCarrier(boat, boatScrollSettings.carrierName);
  carrier.updateMatrixWorld(true);
  carrier.getWorldPosition(tempWorld);

  const restX = tempWorld.x;
  const carDockHandoffX = resolveCarDockHandoffX(scene, nodes);
  const track = getScene2Track(
    floor,
    restX,
    carrier.position.y,
    carrier.position.z,
    getScrollRange(sceneFrame),
    carDockHandoffX,
  );

  carrier.position.set(track.restX, track.baseY, track.baseZ);

    if (process.env.NODE_ENV === "development") {
      console.info("[BoatScrollMovement] Ready:", {
        restX: track.restX,
        trackEndX: track.trackEndX,
        carDockHandoffX,
        scene2Scroll: [track.scene2ScrollStart, track.scene2ScrollEnd],
        boat: boat.name,
        floor: floor.name,
      });
    }

  return {
    carrier,
    floor,
    baseY: track.baseY,
    baseZ: track.baseZ,
    restX: track.restX,
    trackEndX: track.trackEndX,
    scene2ScrollStart: track.scene2ScrollStart,
    scene2ScrollEnd: track.scene2ScrollEnd,
    boardScene2T: null,
    boatProgress: 0,
    dockedAtEnd: false,
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
  turtleOnCarRef,
  turtleOnJetskiRef,
  turtleOnYachtRef,
  boatTravelProgressRef,
  turtleReturnedFromCarRef,
}: BoatScrollMovementProps) {
  const rigRef = useRef<BoatRig | null>(null);
  const carReturnSetupDoneRef = useRef(false);

  useLayoutEffect(() => {
    if (!sceneFrame) {
      rigRef.current = null;
      return;
    }
    const rig = buildRig(scene, nodes, sceneFrame);
    rigRef.current = rig;
    return () => {
      rigRef.current = null;
    };
  }, [scene, nodes, sceneFrame]);

  useFrame((_, delta) => {
    if (!sceneFrame) return;

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

    if (turtleReturnedFromCarRef.current && turtleOnBoatRef.current) {
      if (!carReturnSetupDoneRef.current) {
        rig.boardScene2T = 1;
        rig.boatProgress = 1;
        rig.dockedAtEnd = false;
        carReturnSetupDoneRef.current = true;
      }
    }

    if (
      turtleOnCarRef.current ||
      turtleOnJetskiRef.current ||
      turtleOnYachtRef.current
    ) {
      carReturnSetupDoneRef.current = false;
    }

    if (!turtleOnBoatRef.current) {
      if (
        rig.dockedAtEnd ||
        turtleOnCarRef.current ||
        turtleOnJetskiRef.current ||
        turtleOnYachtRef.current
      ) {
        rig.boatProgress = 1;
        boatTravelProgressRef.current = 1;
        rig.carrier.position.set(
          THREE.MathUtils.lerp(rig.restX, rig.trackEndX, 1),
          rig.baseY,
          rig.baseZ,
        );
        return;
      }

      if (progress > rig.scene2ScrollStart + 0.008) {
        rig.dockedAtEnd = false;
        rig.boardScene2T = null;
        rig.boatProgress = 0;
        boatTravelProgressRef.current = 0;
        rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
        return;
      }

      rig.carrier.position.set(
        THREE.MathUtils.lerp(rig.restX, rig.trackEndX, rig.boatProgress),
        rig.baseY,
        rig.baseZ,
      );
      return;
    }

    if (rig.boardScene2T === null) {
      rig.boardScene2T = getBoatTravelProgress(
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

    if (rig.boatProgress >= 0.94) {
      rig.dockedAtEnd = true;
    } else {
      rig.dockedAtEnd = false;
      if (carReturnSetupDoneRef.current && rig.boatProgress < 0.5) {
        turtleReturnedFromCarRef.current = false;
      }
    }

    rig.carrier.position.set(
      THREE.MathUtils.lerp(rig.restX, rig.trackEndX, rig.boatProgress),
      rig.baseY,
      rig.baseZ,
    );
    boatTravelProgressRef.current = rig.boatProgress;
  });

  return null;
}
