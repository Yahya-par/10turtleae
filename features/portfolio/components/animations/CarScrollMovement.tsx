"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { carScrollSettings } from "@features/portfolio/config/carScrollSettings";
import { carPassState } from "@features/portfolio/config/carPassState";
import type { CarBodyWheelSettings } from "@features/portfolio/config/carBodyAnimationSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type WheelRig = {
  wheel: THREE.Object3D;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
  spinDirection: 1 | -1;
};

type CarRig = {
  carrier: THREE.Group;
  body: THREE.Object3D;
  wheels: WheelRig[];
  restX: number;
  trackStartX: number;
  trackEndX: number;
  baseY: number;
  baseZ: number;
  carScrollStart: number;
  carScrollEnd: number;
  carProgress: number;
  lastX: number;
};

type CarScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnCarRef: RefObject<boolean>;
  turtleOnBoatRef: RefObject<boolean>;
  turtleOnJetskiRef: RefObject<boolean>;
  turtleOnYachtRef: RefObject<boolean>;
  carTravelProgressRef: RefObject<number>;
};

const tempPosition = new THREE.Vector3();
const tempCarrierOffset = new THREE.Vector3();
const tempEuler = new THREE.Euler();
const tempHubCenter = new THREE.Vector3();

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

function getRoadTrack(
  road: THREE.Object3D,
  startInset: number,
  endInset: number,
  roadOffset: { x: number; y: number; z: number },
) {
  const roadBox = getObjectBounds(road);
  const roadCenter = new THREE.Vector3();
  roadBox.getCenter(roadCenter);

  const startX = roadBox.max.x - startInset + roadOffset.x;
  const endX = roadBox.min.x + endInset + roadOffset.x;

  return {
    startX,
    endX,
    y: roadCenter.y + roadOffset.y,
    z: roadCenter.z + roadOffset.z,
    roadBox,
  };
}

function xToScrollProgress(
  worldX: number,
  scrollRange: { min: number; max: number },
) {
  const span = scrollRange.max - scrollRange.min;
  if (span <= 0) return 0;
  return THREE.MathUtils.clamp((worldX - scrollRange.min) / span, 0, 1);
}

function getCarScrollWindow(
  scene2Floor: THREE.Object3D,
  roadEndX: number,
  scrollRange: { min: number; max: number },
) {
  const scene2Bounds = getObjectBounds(scene2Floor);
  const carScrollStart = xToScrollProgress(scene2Bounds.min.x, scrollRange);
  const carScrollEnd = xToScrollProgress(roadEndX, scrollRange);

  return {
    carScrollStart,
    carScrollEnd: Math.min(carScrollStart, carScrollEnd),
  };
}

export function resolveCarScrollWindow(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
) {
  const {
    body,
    bodyBlender,
    road,
    roadBlender,
    scene2Floor,
    scene2FloorBlender,
    startInset,
    endInset,
    roadOffset,
  } = carScrollSettings;

  const roadMesh = resolveObject(scene, nodes, road, roadBlender);
  const floor2 = resolveObject(scene, nodes, scene2Floor, scene2FloorBlender);

  if (!roadMesh || !floor2) {
    return { carScrollStart: 1, carScrollEnd: 0 };
  }

  const track = getRoadTrack(roadMesh, startInset, endInset, roadOffset);
  return getCarScrollWindow(floor2, track.endX, getScrollRange(sceneFrame));
}

function getCarTravelProgress(
  scrollProgress: number,
  carScrollStart: number,
  carScrollEnd: number,
) {
  if (scrollProgress > carScrollStart) return 0;
  if (scrollProgress < carScrollEnd) return 1;

  const span = carScrollStart - carScrollEnd;
  if (span <= 0) return 0;

  return THREE.MathUtils.clamp(
    ((carScrollStart - scrollProgress) / span) * carScrollSettings.travelSpeed,
    0,
    1,
  );
}

function applyWheelOffsets(pivot: THREE.Group, config: CarBodyWheelSettings) {
  const { positionOffset, rotationOffset } = config;
  pivot.position.x += positionOffset.x;
  pivot.position.y += positionOffset.y;
  pivot.position.z += positionOffset.z;

  if (
    rotationOffset.x !== 0 ||
    rotationOffset.y !== 0 ||
    rotationOffset.z !== 0
  ) {
    tempEuler.set(rotationOffset.x, rotationOffset.y, rotationOffset.z);
    pivot.rotation.x += tempEuler.x;
    pivot.rotation.y += tempEuler.y;
    pivot.rotation.z += tempEuler.z;
  }
}

function createWheelRig(
  wheel: THREE.Object3D,
  config: CarBodyWheelSettings,
): WheelRig {
  const { spinAxis, spinSpeed, spinDirection } = config;
  return {
    wheel,
    spinAxis: new THREE.Vector3(spinAxis.x, spinAxis.y, spinAxis.z).normalize(),
    spinSpeed,
    spinDirection,
  };
}

function centerWheelOnPivot(pivot: THREE.Group, wheel: THREE.Object3D) {
  getObjectBounds(wheel).getCenter(tempHubCenter);
  pivot.worldToLocal(tempHubCenter);
  wheel.position.sub(tempHubCenter);
  pivot.position.add(tempHubCenter);
}

function mountWheelOnCarrier(
  carrier: THREE.Group,
  wheel: THREE.Object3D,
  config: CarBodyWheelSettings,
): WheelRig {
  wheel.updateMatrixWorld(true);
  carrier.updateMatrixWorld(true);

  const pivot = new THREE.Group();
  pivot.name = config.pivotName;
  carrier.add(pivot);
  pivot.attach(wheel);

  centerWheelOnPivot(pivot, wheel);
  applyWheelOffsets(pivot, config);

  return createWheelRig(wheel, config);
}

function findWheelRig(
  carrier: THREE.Group,
  pivotName: string,
  config: CarBodyWheelSettings,
) {
  const pivot = carrier.getObjectByName(pivotName);
  if (!pivot || !(pivot instanceof THREE.Group) || !pivot.children.length) {
    return null;
  }

  return createWheelRig(pivot.children[0], config);
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): CarRig | null {
  scene.updateMatrixWorld(true);

  const {
    body,
    bodyBlender,
    carrierName,
    wheels: wheelSettings,
    road,
    roadBlender,
    scene2Floor,
    scene2FloorBlender,
    startInset,
    endInset,
    roadOffset,
    carrierOffset,
  } = carScrollSettings;

  const bodyMesh = resolveObject(scene, nodes, body, bodyBlender);
  const frontWheel = resolveObject(
    scene,
    nodes,
    wheelSettings.front.runtimeName,
    wheelSettings.front.blenderName,
  );
  const backWheel = resolveObject(
    scene,
    nodes,
    wheelSettings.back.runtimeName,
    wheelSettings.back.blenderName,
  );
  const roadMesh = resolveObject(scene, nodes, road, roadBlender);
  const floor2 = resolveObject(scene, nodes, scene2Floor, scene2FloorBlender);

  if (!bodyMesh?.parent || !roadMesh || !floor2) {
    return null;
  }

  const carrier =
    bodyMesh.parent.name === carrierName
      ? (bodyMesh.parent as THREE.Group)
      : attachAnimationCarrier(bodyMesh, carrierName);

  const wheels: WheelRig[] = [];

  if (frontWheel && frontWheel.parent?.name !== wheelSettings.front.pivotName) {
    wheels.push(
      mountWheelOnCarrier(carrier, frontWheel, wheelSettings.front),
    );
  } else {
    const frontRig = findWheelRig(
      carrier,
      wheelSettings.front.pivotName,
      wheelSettings.front,
    );
    if (frontRig) wheels.push(frontRig);
  }

  if (backWheel && backWheel.parent?.name !== wheelSettings.back.pivotName) {
    wheels.push(mountWheelOnCarrier(carrier, backWheel, wheelSettings.back));
  } else {
    const backRig = findWheelRig(
      carrier,
      wheelSettings.back.pivotName,
      wheelSettings.back,
    );
    if (backRig) wheels.push(backRig);
  }

  const track = getRoadTrack(roadMesh, startInset, endInset, roadOffset);
  const scrollWindow = getCarScrollWindow(
    floor2,
    track.endX,
    getScrollRange(sceneFrame),
  );

  const floor2Bounds = getObjectBounds(floor2);
  const dockX = floor2Bounds.min.x + carScrollSettings.pathInset;
  const restX = THREE.MathUtils.clamp(dockX, track.endX, track.startX);
  const trackStartX = track.startX;
  const trackEndX = track.endX;

  carrier.position.set(
    restX + carrierOffset.x,
    track.y + carrierOffset.y,
    track.z + carrierOffset.z,
  );

  if (process.env.NODE_ENV === "development") {
    console.info("[CarScrollMovement] Ready:", {
      body: bodyMesh.name,
      wheels: wheels.map((entry) => entry.wheel.name),
      restX,
      trackStartX,
      trackEndX,
      carScroll: [scrollWindow.carScrollStart, scrollWindow.carScrollEnd],
    });
  }

  return {
    carrier,
    body: bodyMesh,
    wheels,
    restX: restX + carrierOffset.x,
    trackStartX: trackStartX + carrierOffset.x,
    trackEndX: trackEndX + carrierOffset.x,
    baseY: track.y + carrierOffset.y,
    baseZ: track.z + carrierOffset.z,
    carScrollStart: scrollWindow.carScrollStart,
    carScrollEnd: scrollWindow.carScrollEnd,
    carProgress: 0,
    lastX: carrier.position.x,
  };
}

export default function CarScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnCarRef,
  turtleOnBoatRef,
  turtleOnJetskiRef,
  turtleOnYachtRef,
  carTravelProgressRef,
}: CarScrollMovementProps) {
  const rigRef = useRef<CarRig | null>(null);
  const carSessionActiveRef = useRef(false);
  const idleElapsedRef = useRef(0);
  const carParkedRef = useRef(false);

  useLayoutEffect(() => {
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    carTravelProgressRef.current = 0;
    return () => {
      rigRef.current = null;
      carTravelProgressRef.current = 0;
      carParkedRef.current = false;
      carPassState.scrollCarParked = true;
    };
  }, [scene, nodes, sceneFrame, carTravelProgressRef]);

  useFrame((_, delta) => {
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

    if (turtleOnCarRef.current) {
      carSessionActiveRef.current = true;
    }

    if (turtleOnBoatRef.current && !turtleOnCarRef.current) {
      carSessionActiveRef.current = false;
      rig.carProgress = 0;
      carTravelProgressRef.current = 0;
      rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
      rig.lastX = rig.restX;
      carParkedRef.current = true;
      carPassState.scrollCarParked = true;
      return;
    }

    const atJetskiHandoff = carTravelProgressRef.current >= 0.94;
    const parkAtJetskiHandoff =
      !turtleOnCarRef.current &&
      !turtleOnBoatRef.current &&
      (turtleOnJetskiRef.current ||
        turtleOnYachtRef.current ||
        atJetskiHandoff);

    if (parkAtJetskiHandoff) {
      carSessionActiveRef.current = false;
      rig.carProgress = 1;
      carTravelProgressRef.current = 1;
      rig.carrier.position.set(rig.trackEndX, rig.baseY, rig.baseZ);
      rig.lastX = rig.trackEndX;
      carParkedRef.current = true;
      carPassState.scrollCarParked = true;
      return;
    }

    if (!turtleOnCarRef.current && !carSessionActiveRef.current) {
      carParkedRef.current = false;
      carPassState.scrollCarParked = false;
      const lapDuration = carScrollSettings.lapDuration;
      const prevElapsed = idleElapsedRef.current;
      idleElapsedRef.current += delta;
      const lapT =
        (idleElapsedRef.current % lapDuration) / lapDuration;
      const prevLapT = (prevElapsed % lapDuration) / lapDuration;
      const nextX = THREE.MathUtils.lerp(
        rig.trackStartX,
        rig.trackEndX,
        lapT,
      );

      rig.carProgress = lapT;
      carTravelProgressRef.current = 0;
      rig.carrier.position.set(nextX, rig.baseY, rig.baseZ);

      const wrapped = lapT < prevLapT;
      const deltaX = wrapped ? 0 : Math.abs(nextX - rig.lastX);
      for (const wheelRig of rig.wheels) {
        const spin = deltaX * wheelRig.spinSpeed * wheelRig.spinDirection;
        wheelRig.wheel.rotateOnAxis(wheelRig.spinAxis, -spin);
      }

      rig.lastX = nextX;
      return;
    }

    carParkedRef.current = false;
    carPassState.scrollCarParked = false;
    idleElapsedRef.current = 0;

    rig.carProgress = getCarTravelProgress(
      progress,
      rig.carScrollStart,
      rig.carScrollEnd,
    );

    const nextX = THREE.MathUtils.lerp(
      rig.restX,
      rig.trackEndX,
      rig.carProgress,
    );

    rig.carrier.position.set(nextX, rig.baseY, rig.baseZ);
    carTravelProgressRef.current = rig.carProgress;

    const deltaX = Math.abs(nextX - rig.lastX);
    for (const wheelRig of rig.wheels) {
      const spin = deltaX * wheelRig.spinSpeed * wheelRig.spinDirection;
      wheelRig.wheel.rotateOnAxis(wheelRig.spinAxis, -spin);
    }

    rig.lastX = nextX;
  });

  return null;
}

export function getCarBodyMeshBounds(carBody: THREE.Object3D) {
  carBody.updateWorldMatrix(true, false);
  const mesh = carBody as THREE.Mesh;

  if (mesh.isMesh && mesh.geometry) {
    const { geometry } = mesh;
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    return geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  }

  return getObjectBounds(carBody);
}

export function getCarSeatWorld(
  carBody: THREE.Object3D,
  _turtleFootLift: number,
  target = new THREE.Vector3(),
) {
  const bounds = getCarBodyMeshBounds(carBody);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempCarrierOffset);
  const {
    turtleCarRoofInset,
    turtleCarSeatOffsetX,
    turtleCarSeatOffsetY,
    turtleCarSeatOffsetZ,
  } = carScrollSettings;

  target.set(
    center.x + turtleCarSeatOffsetX,
    bounds.max.y - size.y * turtleCarRoofInset + turtleCarSeatOffsetY,
    center.z + turtleCarSeatOffsetZ,
  );

  return target;
}
