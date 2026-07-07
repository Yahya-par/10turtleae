"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { jetskiScrollSettings } from "@features/portfolio/config/jetskiScrollSettings";
import {
  attachAnimationCarrier,
  findAlRabScenePanel,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type JetskiRig = {
  carrier: THREE.Group;
  driver: THREE.Object3D;
  jetski: THREE.Object3D | null;
  sceneFloor: THREE.Object3D;
  restX: number;
  trackEndX: number;
  baseY: number;
  baseZ: number;
  jetskiScrollStart: number;
  jetskiScrollEnd: number;
  jetskiProgress: number;
};

type JetskiScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnJetskiRef: RefObject<boolean>;
  turtleOnCarRef: RefObject<boolean>;
  turtleOnYachtRef: RefObject<boolean>;
  jetskiTravelProgressRef: RefObject<number>;
};

const tempOffset = new THREE.Vector3();

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

function xToScrollProgress(
  worldX: number,
  scrollRange: { min: number; max: number },
) {
  const span = scrollRange.max - scrollRange.min;
  if (span <= 0) return 0;
  return THREE.MathUtils.clamp((worldX - scrollRange.min) / span, 0, 1);
}

function getJetskiScrollWindow(
  restX: number,
  trackEndX: number,
  scrollRange: { min: number; max: number },
) {
  const eastX = Math.max(restX, trackEndX);
  const westX = Math.min(restX, trackEndX);

  return {
    jetskiScrollStart: xToScrollProgress(eastX, scrollRange),
    jetskiScrollEnd: xToScrollProgress(westX, scrollRange),
  };
}

function getJetskiTrackEndX(
  sceneFloor: THREE.Object3D,
  pathInset: number,
  trackEndOffsetX: number,
) {
  const floorBounds = getObjectBounds(sceneFloor);
  return floorBounds.min.x + pathInset + trackEndOffsetX;
}

function getDriverTrackStart(
  driver: THREE.Object3D,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(driver);
  bounds.getCenter(target);
  return target;
}

export function resolveJetskiScrollWindow(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
) {
  const {
    driver,
    driverBlender,
    sceneFloor,
    sceneFloorBlender,
    pathInset,
    trackEndOffsetX,
  } = jetskiScrollSettings;

  const driverMesh = resolveObject(scene, nodes, driver, driverBlender);
  const floor =
    findAlRabScenePanel(scene, nodes) ??
    resolveObject(scene, nodes, sceneFloor, sceneFloorBlender);

  if (!driverMesh || !floor) {
    return { jetskiScrollStart: 1, jetskiScrollEnd: 0 };
  }

  const start = getDriverTrackStart(driverMesh, tempOffset);
  const trackEndX = getJetskiTrackEndX(floor, pathInset, trackEndOffsetX);

  return getJetskiScrollWindow(start.x, trackEndX, getScrollRange(sceneFrame));
}

function getJetskiTravelProgress(
  scrollProgress: number,
  jetskiScrollStart: number,
  jetskiScrollEnd: number,
) {
  const span = jetskiScrollStart - jetskiScrollEnd;
  if (span <= 0) return 0;

  return THREE.MathUtils.clamp(
    (jetskiScrollStart - scrollProgress) / span,
    0,
    1,
  );
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): JetskiRig | null {
  scene.updateMatrixWorld(true);

  const {
    driver,
    driverBlender,
    jetski,
    jetskiBlender,
    carrierName,
    carrierOffset,
    sceneFloor,
    sceneFloorBlender,
    pathInset,
    trackEndOffsetX,
  } = jetskiScrollSettings;

  const driverMesh = resolveObject(scene, nodes, driver, driverBlender);
  const jetskiMesh = resolveObject(scene, nodes, jetski, jetskiBlender);
  const floor =
    findAlRabScenePanel(scene, nodes) ??
    resolveObject(scene, nodes, sceneFloor, sceneFloorBlender);

  if (!driverMesh?.parent || !floor) {
    return null;
  }

  const carrier =
    driverMesh.parent.name === carrierName
      ? (driverMesh.parent as THREE.Group)
      : attachAnimationCarrier(driverMesh, carrierName);

  if (jetskiMesh && jetskiMesh.parent !== carrier) {
    carrier.attach(jetskiMesh);
  }

  carrier.updateMatrixWorld(true);
  const restWorld = new THREE.Vector3();
  carrier.getWorldPosition(restWorld);
  const restX = restWorld.x;
  const trackEndX = getJetskiTrackEndX(floor, pathInset, trackEndOffsetX);
  const scrollWindow = getJetskiScrollWindow(
    restX,
    trackEndX,
    getScrollRange(sceneFrame),
  );

  if (!jetskiScrollSettings.lockToModelPosition) {
    carrier.position.set(
      restX + carrierOffset.x,
      restWorld.y + carrierOffset.y,
      restWorld.z + carrierOffset.z,
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[JetskiScrollMovement] Ready:", {
      driver: driverMesh.name,
      jetski: jetskiMesh?.name ?? null,
      rest: [restX, restWorld.y, restWorld.z],
      trackEndX,
      jetskiScroll: [scrollWindow.jetskiScrollStart, scrollWindow.jetskiScrollEnd],
    });
  }

  return {
    carrier,
    driver: driverMesh,
    jetski: jetskiMesh,
    sceneFloor: floor,
    restX: restX + carrierOffset.x,
    trackEndX: trackEndX + carrierOffset.x,
    baseY: restWorld.y + carrierOffset.y,
    baseZ: restWorld.z + carrierOffset.z,
    jetskiScrollStart: scrollWindow.jetskiScrollStart,
    jetskiScrollEnd: scrollWindow.jetskiScrollEnd,
    jetskiProgress: 0,
  };
}

export function getJetskiDriverSeatWorld(
  driver: THREE.Object3D,
  _turtleFootLift: number,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(driver);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempOffset);
  const {
    turtleSeatHeightFactor,
    turtleSeatOffsetX,
    turtleSeatOffsetY,
    turtleSeatOffsetZ,
  } = jetskiScrollSettings;

  target.set(
    center.x + turtleSeatOffsetX,
    bounds.min.y + size.y * turtleSeatHeightFactor + turtleSeatOffsetY,
    center.z + turtleSeatOffsetZ,
  );

  return target;
}

export default function JetskiScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnJetskiRef,
  turtleOnCarRef,
  turtleOnYachtRef,
  jetskiTravelProgressRef,
}: JetskiScrollMovementProps) {
  const rigRef = useRef<JetskiRig | null>(null);
  const jetskiSessionActiveRef = useRef(false);

  useLayoutEffect(() => {
    if (!sceneFrame) {
      rigRef.current = null;
      jetskiTravelProgressRef.current = 0;
      return;
    }
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    jetskiTravelProgressRef.current = 0;
    return () => {
      rigRef.current = null;
      jetskiTravelProgressRef.current = 0;
    };
  }, [scene, nodes, sceneFrame, jetskiTravelProgressRef]);

  useFrame(() => {
    if (!sceneFrame) return;

    let rig = rigRef.current;
    if (!rig) {
      rig = buildRig(scene, nodes, sceneFrame);
      if (!rig) return;
      rigRef.current = rig;
    }

    const trackEndX = getJetskiTrackEndX(
      rig.sceneFloor,
      jetskiScrollSettings.pathInset,
      jetskiScrollSettings.trackEndOffsetX,
    );
    rig.trackEndX = trackEndX + jetskiScrollSettings.carrierOffset.x;
    const scrollWindow = getJetskiScrollWindow(
      rig.restX,
      rig.trackEndX,
      getScrollRange(sceneFrame),
    );
    rig.jetskiScrollStart = scrollWindow.jetskiScrollStart;
    rig.jetskiScrollEnd = scrollWindow.jetskiScrollEnd;

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    if (turtleOnJetskiRef.current) {
      jetskiSessionActiveRef.current = true;
    }

    if (turtleOnYachtRef.current) {
      rig.jetskiProgress = 1;
      jetskiTravelProgressRef.current = 1;
      if (!jetskiScrollSettings.lockToModelPosition) {
        rig.carrier.position.set(rig.trackEndX, rig.baseY, rig.baseZ);
      }
      return;
    }

    if (turtleOnCarRef.current && !turtleOnJetskiRef.current) {
      jetskiSessionActiveRef.current = false;
      rig.jetskiProgress = 0;
      jetskiTravelProgressRef.current = 0;
      if (!jetskiScrollSettings.lockToModelPosition) {
        rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
      }
      return;
    }

    if (!turtleOnJetskiRef.current) {
      if (jetskiSessionActiveRef.current) {
        if (!jetskiScrollSettings.lockToModelPosition) {
          const heldProgress = jetskiTravelProgressRef.current;
          const heldX = THREE.MathUtils.lerp(
            rig.restX,
            rig.trackEndX,
            heldProgress,
          );
          rig.carrier.position.set(heldX, rig.baseY, rig.baseZ);
        }
        return;
      }

      rig.jetskiProgress = 0;
      jetskiTravelProgressRef.current = 0;
      if (!jetskiScrollSettings.lockToModelPosition) {
        rig.carrier.position.set(rig.restX, rig.baseY, rig.baseZ);
      }
      return;
    }

    rig.jetskiProgress = getJetskiTravelProgress(
      progress,
      rig.jetskiScrollStart,
      rig.jetskiScrollEnd,
    );

    if (!jetskiScrollSettings.lockToModelPosition) {
      const nextX = THREE.MathUtils.lerp(
        rig.restX,
        rig.trackEndX,
        rig.jetskiProgress,
      );
      rig.carrier.position.set(nextX, rig.baseY, rig.baseZ);
    }

    jetskiTravelProgressRef.current = rig.jetskiProgress;
  });

  return null;
}
