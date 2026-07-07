"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { carScrollSettings } from "@features/portfolio/config/carScrollSettings";
import { jetskiScrollSettings } from "@features/portfolio/config/jetskiScrollSettings";
import { assetNames } from "@features/portfolio/config/assetNames";
import type { CarBodyWheelSettings } from "@features/portfolio/config/carBodyAnimationSettings";
import {
  attachAnimationCarrier,
  findAlRabScenePanel,
  findScrollCarRoadMesh,
  findSceneObject,
  findScrollCarBody,
  getObjectBounds,
  measureCarBodyCarrierExtents,
  resolveCarCarrierTrack,
  resolveCarRoadTrack,
  resolveScene3CarStartX,
  type CarRoadTrack,
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
  roadMesh: THREE.Object3D | null;
  restX: number;
  trackEndX: number;
  baseY: number;
  baseZ: number;
  carScrollStart: number;
  carScrollEnd: number;
  carProgress: number;
  dockedAtEnd: boolean;
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

function getRoadTrack(road: THREE.Object3D): CarRoadTrack {
  return resolveCarRoadTrack(road, {
    roadOffset: carScrollSettings.roadOffset,
  });
}

function resolveCarrierTrack(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  carrier: THREE.Group,
  bodyMesh: THREE.Object3D,
  roadMesh: THREE.Object3D | null,
) {
  const { startInset, endInset } = carScrollSettings;
  const extents = measureCarBodyCarrierExtents(carrier);

  if (roadMesh) {
    const roadTrack = getRoadTrack(roadMesh);
    return {
      ...resolveCarCarrierTrack(roadTrack, extents, { startInset, endInset }),
      roadTrack,
    };
  }

  const scene3Start = resolveScene3CarStartX(scene, nodes, startInset);
  const fallbackEndX = resolveCarTrackEndX(scene, nodes, roadMesh, null, extents);

  if (scene3Start === null || fallbackEndX === null) {
    return null;
  }

  const roadTrack: CarRoadTrack = {
    roadEastX: scene3Start + startInset,
    roadWestX: fallbackEndX - endInset - extents.westExtent,
    y: carrier.position.y,
    z: carrier.position.z,
    roadBox: new THREE.Box3(),
  };

  return {
    ...resolveCarCarrierTrack(roadTrack, extents, { startInset, endInset }),
    roadTrack,
  };
}

function resolveCarTrackEndX(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  roadMesh: THREE.Object3D | null,
  roadTrack: CarRoadTrack | null,
  extents?: { westExtent: number },
) {
  if (roadTrack) {
    return (
      roadTrack.roadWestX +
      carScrollSettings.endInset +
      (extents?.westExtent ?? 0)
    );
  }

  const { endInset, pathInset } = carScrollSettings;

  if (roadMesh) {
    const track = getRoadTrack(roadMesh);
    return track.roadWestX + endInset + (extents?.westExtent ?? 0);
  }

  const jetskiDriver =
    findSceneObject(
      scene,
      nodes,
      jetskiScrollSettings.driver,
      jetskiScrollSettings.driverBlender,
    ) ?? null;

  if (jetskiDriver) {
    jetskiDriver.updateMatrixWorld(true);
    const jetskiBounds = getObjectBounds(jetskiDriver);
    return jetskiBounds.max.x + 1.5 + (extents?.westExtent ?? 0);
  }

  const floor =
    findAlRabScenePanel(scene, nodes) ??
    findSceneObject(
      scene,
      nodes,
      jetskiScrollSettings.sceneFloor,
      jetskiScrollSettings.sceneFloorBlender,
    );

  if (floor) {
    return getObjectBounds(floor).min.x + pathInset + (extents?.westExtent ?? 0);
  }

  const alRab = findSceneObject(
    scene,
    nodes,
    assetNames.scenes.alRabLandmark,
    "burjalarab.001",
  );

  if (alRab) {
    return getObjectBounds(alRab).min.x + pathInset + (extents?.westExtent ?? 0);
  }

  return null;
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
  restX: number,
  roadEndX: number,
  scrollRange: { min: number; max: number },
) {
  const eastX = Math.max(restX, roadEndX);
  const westX = Math.min(restX, roadEndX);

  return {
    carScrollStart: xToScrollProgress(eastX, scrollRange),
    carScrollEnd: xToScrollProgress(westX, scrollRange),
  };
}

export function resolveCarScrollWindow(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
) {
  const bodyMesh = findScrollCarBody(scene, nodes);
  const roadMesh = findScrollCarRoadMesh(scene, nodes);

  if (!bodyMesh?.parent) {
    return { carScrollStart: 1, carScrollEnd: 0 };
  }

  const carrier =
    bodyMesh.parent instanceof THREE.Group
      ? bodyMesh.parent
      : attachAnimationCarrier(bodyMesh, carScrollSettings.carrierName);
  const carrierTrack = resolveCarrierTrack(
    scene,
    nodes,
    carrier,
    bodyMesh,
    roadMesh,
  );

  if (!carrierTrack) {
    return { carScrollStart: 1, carScrollEnd: 0 };
  }

  return getCarScrollWindow(
    carrierTrack.restX,
    carrierTrack.trackEndX,
    getScrollRange(sceneFrame),
  );
}

function getCarTravelProgress(
  scrollProgress: number,
  carScrollStart: number,
  carScrollEnd: number,
) {
  const span = carScrollStart - carScrollEnd;
  if (span <= 0) return 0;

  return THREE.MathUtils.clamp(
    (carScrollStart - scrollProgress) / span,
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
    carrierName,
    wheels: wheelSettings,
    carrierOffset,
  } = carScrollSettings;

  const bodyMesh = findScrollCarBody(scene, nodes);
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
  const roadMesh = findScrollCarRoadMesh(scene, nodes);

  if (!bodyMesh?.parent) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CarScrollMovement] Setup failed:", {
        body: bodyMesh?.name ?? null,
        road: roadMesh?.name ?? null,
      });
    }
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

  const carrierTrack = resolveCarrierTrack(
    scene,
    nodes,
    carrier,
    bodyMesh,
    roadMesh,
  );

  if (!carrierTrack) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CarScrollMovement] Setup failed: no carrier track", {
        body: bodyMesh.name,
        road: roadMesh?.name ?? null,
      });
    }
    return null;
  }

  const { restX, trackEndX, roadTrack } = carrierTrack;
  const scrollWindow = getCarScrollWindow(
    restX,
    trackEndX,
    getScrollRange(sceneFrame),
  );

  carrier.updateMatrixWorld(true);
  const authoredWorld = new THREE.Vector3();
  carrier.getWorldPosition(authoredWorld);
  const baseY = roadTrack.y + carrierOffset.y;
  const baseZ = roadTrack.z + carrierOffset.z;

  carrier.position.set(
    restX + carrierOffset.x,
    baseY,
    baseZ,
  );

  if (process.env.NODE_ENV === "development") {
    const extents = measureCarBodyCarrierExtents(carrier);
    console.info("[CarScrollMovement] Ready:", {
      body: bodyMesh.name,
      wheels: wheels.map((entry) => entry.wheel.name),
      road: roadMesh?.name ?? "(fallback)",
      roadX: [roadTrack.roadWestX, roadTrack.roadEastX],
      extents,
      restX,
      trackEndX,
      carScroll: [scrollWindow.carScrollStart, scrollWindow.carScrollEnd],
    });
  }

  return {
    carrier,
    body: bodyMesh,
    wheels,
    roadMesh,
    restX: restX + carrierOffset.x,
    trackEndX: trackEndX + carrierOffset.x,
    baseY,
    baseZ,
    carScrollStart: scrollWindow.carScrollStart,
    carScrollEnd: scrollWindow.carScrollEnd,
    carProgress: 0,
    dockedAtEnd: false,
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

  useLayoutEffect(() => {
    if (!sceneFrame) {
      rigRef.current = null;
      carTravelProgressRef.current = 0;
      return;
    }
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    carTravelProgressRef.current = 0;
    return () => {
      rigRef.current = null;
      carTravelProgressRef.current = 0;
    };
  }, [scene, nodes, sceneFrame, carTravelProgressRef]);

  useFrame((_, delta) => {
    if (!sceneFrame) return;

    let rig = rigRef.current;
    if (!rig) {
      rig = buildRig(scene, nodes, sceneFrame);
      if (!rig) return;
      rigRef.current = rig;
    }

    const restX = rig.restX - carScrollSettings.carrierOffset.x;
    const trackEndX =
      rig.trackEndX - carScrollSettings.carrierOffset.x;
    const scrollWindow = getCarScrollWindow(
      restX,
      trackEndX,
      getScrollRange(sceneFrame),
    );
    if (!carSessionActiveRef.current) {
      rig.carScrollStart = scrollWindow.carScrollStart;
      rig.carScrollEnd = scrollWindow.carScrollEnd;
    }

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    if (
      turtleOnCarRef.current ||
      carTravelProgressRef.current > 0.01 ||
      rig.dockedAtEnd
    ) {
      carSessionActiveRef.current = true;
    }

    if (turtleOnBoatRef.current && !turtleOnCarRef.current) {
      carSessionActiveRef.current = false;
      rig.carProgress = 0;
      rig.dockedAtEnd = false;
      carTravelProgressRef.current = 0;
      rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
      rig.lastX = rig.restX;
      return;
    }

    const parkAtJetskiHandoff =
      !turtleOnCarRef.current &&
      !turtleOnBoatRef.current &&
      (turtleOnJetskiRef.current || turtleOnYachtRef.current);

    if (parkAtJetskiHandoff) {
      carSessionActiveRef.current = false;
      rig.carProgress = 1;
      rig.dockedAtEnd = true;
      carTravelProgressRef.current = 1;
      rig.carrier.position.set(rig.trackEndX, rig.baseY, rig.baseZ);
      rig.lastX = rig.trackEndX;
      return;
    }

    if (!carSessionActiveRef.current) {
      rig.carProgress = 0;
      rig.dockedAtEnd = false;
      carTravelProgressRef.current = 0;
      rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
      rig.lastX = rig.restX;
      return;
    }

    rig.carProgress = getCarTravelProgress(
      progress,
      rig.carScrollStart,
      rig.carScrollEnd,
    );

    if (rig.carProgress >= 0.94) {
      rig.dockedAtEnd = true;
    } else {
      rig.dockedAtEnd = false;
    }

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
