"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { jetskiScrollSettings } from "@features/portfolio/config/jetskiScrollSettings";
import { carPassState } from "@features/portfolio/config/carPassState";
import {
  attachAnimationCarrier,
  findAlRabScenePanel,
  findObjectByNamePattern,
  findSceneObject,
  getObjectBounds,
  setObjectWorldPosition,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  getScrollRange,
  getScrollProgressBounds,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type JetskiRig = {
  carrier: THREE.Group;
  driver: THREE.Object3D;
  jetski: THREE.Object3D | null;
  frozenJetski:
    | {
        object: THREE.Object3D;
        parent: THREE.Object3D;
        position: THREE.Vector3;
        quaternion: THREE.Quaternion;
        scale: THREE.Vector3;
      }
    | null;
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

function getJetskiDockedHandoffX(
  rig: JetskiRig,
  jetskiTravelProgressRef: RefObject<number>,
) {
  if (carPassState.jetskiDockedHandoffX !== null) {
    if (
      jetskiTravelProgressRef.current >=
      jetskiScrollSettings.handoffSnapEndProgress
    ) {
      return rig.trackEndX;
    }

    return carPassState.jetskiDockedHandoffX;
  }

  return THREE.MathUtils.lerp(
    rig.restX,
    rig.trackEndX,
    jetskiTravelProgressRef.current,
  );
}

function syncJetskiProgressFromDockX(
  rig: JetskiRig,
  dockX: number,
  jetskiTravelProgressRef: RefObject<number>,
) {
  const span = rig.trackEndX - rig.restX;
  if (Math.abs(span) <= 0.001) return;

  const progress = THREE.MathUtils.clamp((dockX - rig.restX) / span, 0, 1);
  rig.jetskiProgress = progress;
  jetskiTravelProgressRef.current = progress;
}

function parkJetskiAtHandoff(
  rig: JetskiRig,
  jetskiTravelProgressRef: RefObject<number>,
) {
  if (jetskiScrollSettings.lockToModelPosition) return;

  const dockX = getJetskiDockedHandoffX(rig, jetskiTravelProgressRef);
  setCarrierWorldPosition(rig.carrier, dockX, rig.baseY, rig.baseZ);
  syncJetskiProgressFromDockX(rig, dockX, jetskiTravelProgressRef);
}

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

function getMeshWorldBox(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const mesh = object as THREE.Mesh;

  if (mesh.isMesh && mesh.geometry) {
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }

    return mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  }

  return getObjectBounds(object);
}

function resolveJetskiWaterMesh(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const { water, waterBlender } = jetskiScrollSettings;

  return (
    resolveObject(scene, nodes, water, waterBlender) ??
    findObjectByNamePattern(scene, /^water\.?001$|^water001$/i)
  );
}

type JetskiWaterTrack = {
  restX: number;
  trackEndX: number;
  baseY: number;
  baseZ: number;
};

function resolveJetskiWaterTrack(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFloor: THREE.Object3D,
  authoredWorldY: number,
  authoredWorldZ: number,
): JetskiWaterTrack {
  const { startInset, endInset, pathInset, trackEndOffsetX, carrierOffset } =
    jetskiScrollSettings;
  const water = resolveJetskiWaterMesh(scene, nodes);

  if (water) {
    const waterBox = getMeshWorldBox(water);
    // Only drive east/west (X). Keep the authored Y/Z so the jetski + turtle
    // stay riding on the surface instead of dropping to the water center.
    return {
      restX: waterBox.max.x - startInset + carrierOffset.x,
      trackEndX: waterBox.min.x + endInset + trackEndOffsetX + carrierOffset.x,
      baseY: authoredWorldY + carrierOffset.y,
      baseZ: authoredWorldZ + carrierOffset.z,
    };
  }

  const floorBounds = getObjectBounds(sceneFloor);
  return {
    restX: floorBounds.max.x - pathInset + carrierOffset.x,
    trackEndX: floorBounds.min.x + pathInset + trackEndOffsetX + carrierOffset.x,
    baseY: authoredWorldY + carrierOffset.y,
    baseZ: authoredWorldZ + carrierOffset.z,
  };
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

function captureFrozenTransform(object: THREE.Object3D) {
  if (!object.parent) return null;
  return {
    object,
    parent: object.parent,
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
  };
}

function restoreFrozenTransform(
  frozen:
    | {
        object: THREE.Object3D;
        parent: THREE.Object3D;
        position: THREE.Vector3;
        quaternion: THREE.Quaternion;
        scale: THREE.Vector3;
      }
    | null,
) {
  if (!frozen) return;
  if (frozen.object.parent !== frozen.parent) {
    frozen.parent.add(frozen.object);
  }
  frozen.object.position.copy(frozen.position);
  frozen.object.quaternion.copy(frozen.quaternion);
  frozen.object.scale.copy(frozen.scale);
  frozen.object.updateMatrixWorld(true);
}

export function resolveJetskiTrackEndX(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  jetskiDriver?: THREE.Object3D | null,
) {
  const {
    driver,
    driverBlender,
    sceneFloor,
    sceneFloorBlender,
  } = jetskiScrollSettings;

  const driverMesh =
    jetskiDriver ??
    resolveObject(scene, nodes, driver, driverBlender);
  const floor =
    findAlRabScenePanel(scene, nodes) ??
    resolveObject(scene, nodes, sceneFloor, sceneFloorBlender);

  if (!driverMesh || !floor) {
    return null;
  }

  driverMesh.updateMatrixWorld(true);
  const carrier = driverMesh.parent;
  const worldY = new THREE.Vector3();
  if (carrier) {
    carrier.getWorldPosition(worldY);
  } else {
    driverMesh.getWorldPosition(worldY);
  }

  return resolveJetskiWaterTrack(
    scene,
    nodes,
    floor,
    worldY.y,
    worldY.z,
  ).trackEndX;
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
  } = jetskiScrollSettings;

  const driverMesh = resolveObject(scene, nodes, driver, driverBlender);
  const floor =
    findAlRabScenePanel(scene, nodes) ??
    resolveObject(scene, nodes, sceneFloor, sceneFloorBlender);

  if (!driverMesh || !floor) {
    return { jetskiScrollStart: 1, jetskiScrollEnd: 0 };
  }

  const { restX, trackEndX } = resolveJetskiWaterTrack(
    scene,
    nodes,
    floor,
    0,
    0,
  );

  return getJetskiScrollWindow(restX, trackEndX, getScrollRange(sceneFrame));
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

function getJetskiTravelProgressFromBoard(
  scrollProgress: number,
  boardScrollProgress: number,
  jetskiScrollStart: number,
  jetskiScrollEnd: number,
  sceneFrame: SceneFrame | null,
) {
  const effectiveScrollStart = Math.min(
    jetskiScrollStart,
    getScrollProgressBounds(sceneFrame).max,
  );
  const returnSpanEast = effectiveScrollStart - boardScrollProgress;

  if (scrollProgress > boardScrollProgress) {
    if (returnSpanEast <= 0.001) {
      return 1;
    }

    return THREE.MathUtils.clamp(
      1 - (scrollProgress - boardScrollProgress) / returnSpanEast,
      0,
      1,
    );
  }

  if (returnSpanEast > 0.001) {
    return 1;
  }

  const returnSpanWest = boardScrollProgress - jetskiScrollEnd;
  if (returnSpanWest <= 0.001) {
    return 1;
  }

  return THREE.MathUtils.clamp(
    (scrollProgress - jetskiScrollEnd) / returnSpanWest,
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

  if (jetskiMesh?.parent === carrier) {
    scene.attach(jetskiMesh);
  }
  const frozenJetski = jetskiMesh ? captureFrozenTransform(jetskiMesh) : null;

  carrier.updateMatrixWorld(true);
  const restWorld = new THREE.Vector3();
  carrier.getWorldPosition(restWorld);
  const track = resolveJetskiWaterTrack(
    scene,
    nodes,
    floor,
    restWorld.y,
    restWorld.z,
  );
  const scrollWindow = getJetskiScrollWindow(
    track.restX,
    track.trackEndX,
    getScrollRange(sceneFrame),
  );

  if (!jetskiScrollSettings.lockToModelPosition) {
    setCarrierWorldPosition(
      carrier,
      track.restX,
      track.baseY,
      track.baseZ,
    );
  }

  if (process.env.NODE_ENV === "development") {
    const water = resolveJetskiWaterMesh(scene, nodes);
    const waterBox = water ? getMeshWorldBox(water) : null;
    console.info("[JetskiScrollMovement] Ready:", {
      driver: driverMesh.name,
      jetski: jetskiMesh?.name ?? null,
      water: water?.name ?? null,
      waterX: waterBox ? [waterBox.min.x, waterBox.max.x] : null,
      restX: track.restX,
      trackEndX: track.trackEndX,
      jetskiScroll: [scrollWindow.jetskiScrollStart, scrollWindow.jetskiScrollEnd],
    });
  }

  return {
    carrier,
    driver: driverMesh,
    jetski: jetskiMesh,
    frozenJetski,
    sceneFloor: floor,
    restX: track.restX,
    trackEndX: track.trackEndX,
    baseY: track.baseY,
    baseZ: track.baseZ,
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
      carPassState.jetskiToYachtTransfer = false;
      carPassState.jetskiDockedHandoffX = null;
      carPassState.jetskiFromYachtTransfer = false;
      carPassState.jetskiBoardScrollProgress = null;
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

    const track = resolveJetskiWaterTrack(
      scene,
      nodes,
      rig.sceneFloor,
      rig.baseY,
      rig.baseZ,
    );
    rig.restX = track.restX;
    rig.trackEndX = track.trackEndX;
    rig.baseY = track.baseY;
    rig.baseZ = track.baseZ;
    const scrollWindow = getJetskiScrollWindow(
      rig.restX,
      rig.trackEndX,
      getScrollRange(sceneFrame),
    );
    rig.jetskiScrollStart = scrollWindow.jetskiScrollStart;
    rig.jetskiScrollEnd = scrollWindow.jetskiScrollEnd;
    restoreFrozenTransform(rig.frozenJetski);

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    if (turtleOnJetskiRef.current) {
      jetskiSessionActiveRef.current = true;
    }

    if (carPassState.jetskiToCarTransfer) {
      parkJetskiAtHandoff(rig, jetskiTravelProgressRef);
      return;
    }

    if (carPassState.carToJetskiTransfer) {
      parkJetskiAtHandoff(rig, jetskiTravelProgressRef);
      return;
    }

    if (carPassState.jetskiFromYachtTransfer) {
      parkJetskiAtHandoff(rig, jetskiTravelProgressRef);
      return;
    }

    if (carPassState.jetskiToYachtTransfer) {
      parkJetskiAtHandoff(rig, jetskiTravelProgressRef);
      return;
    }

    if (turtleOnYachtRef.current) {
      parkJetskiAtHandoff(rig, jetskiTravelProgressRef);
      return;
    }

    if (turtleOnCarRef.current && !turtleOnJetskiRef.current) {
      jetskiSessionActiveRef.current = false;
      parkJetskiAtHandoff(rig, jetskiTravelProgressRef);
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
          setCarrierWorldPosition(rig.carrier, heldX, rig.baseY, rig.baseZ);
        }
        return;
      }

      rig.jetskiProgress = 0;
      jetskiTravelProgressRef.current = 0;
      if (!jetskiScrollSettings.lockToModelPosition) {
        setCarrierWorldPosition(rig.carrier, rig.restX, rig.baseY, rig.baseZ);
      }
      return;
    }

    rig.jetskiProgress =
      carPassState.jetskiBoardScrollProgress !== null
        ? getJetskiTravelProgressFromBoard(
            progress,
            carPassState.jetskiBoardScrollProgress,
            rig.jetskiScrollStart,
            rig.jetskiScrollEnd,
            sceneFrame,
          )
        : getJetskiTravelProgress(
            progress,
            rig.jetskiScrollStart,
            rig.jetskiScrollEnd,
          );

    const routeEndX = rig.trackEndX;

    if (!jetskiScrollSettings.lockToModelPosition) {
      const nextX = THREE.MathUtils.lerp(
        rig.restX,
        routeEndX,
        rig.jetskiProgress,
      );
      setCarrierWorldPosition(rig.carrier, nextX, rig.baseY, rig.baseZ);
    }

    jetskiTravelProgressRef.current = rig.jetskiProgress;
  });

  return null;
}
