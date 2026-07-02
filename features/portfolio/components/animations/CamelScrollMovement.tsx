import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { camelScrollSettings } from "@features/portfolio/config/camelScrollSettings";
import {
  attachAnimationCarrier,
  attachObjectToCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";
import type { SceneFrame } from "@features/portfolio/components/camera/CameraPath";

type TurtleMount = "camel" | "transfer" | "boat";

type CamelRig = {
  carrier: THREE.Group;
  turtle: THREE.Object3D | null;
  boat: THREE.Object3D | null;
  transferCarrier: THREE.Group;
  mount: TurtleMount;
  hasTransferredToBoat: boolean;
  transferProgress: number | null;
  transferStartWorld: THREE.Vector3;
  transferEndWorld: THREE.Vector3;
  turtleLocalOnCarrier: THREE.Vector3;
  turtleQuaternionOnCarrier: THREE.Quaternion;
  turtleScaleOnCarrier: THREE.Vector3;
  turtleFootLift: number;
  baseY: number;
  baseZ: number;
  trackStartX: number;
  trackEndX: number;
  desertScrollStart: number;
  desertScrollEnd: number;
};

type CamelScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnBoatRef: RefObject<boolean>;
};

const tempVec3 = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();

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

function resolveTurtle(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const candidates: Array<[string, string | undefined]> = [
    [camelScrollSettings.turtle, camelScrollSettings.turtleBlender],
    ["turtle001", "turtle.001"],
    ["turtlechar001", "turtlechar.001"],
    ["turtle", "turtle"],
  ];

  for (const [runtimeName, blenderName] of candidates) {
    const found = resolveObject(scene, nodes, runtimeName, blenderName);
    if (found) return found;
  }

  return null;
}

function getScrollRange(sceneFrame: SceneFrame | null) {
  if (sceneFrame?.waypoints.length) {
    const xs = sceneFrame.waypoints.map((waypoint) => waypoint.position.x);
    return { min: Math.min(...xs), max: Math.max(...xs) };
  }

  if (sceneFrame?.bounds) {
    return { min: sceneFrame.bounds.min.x, max: sceneFrame.bounds.max.x };
  }

  return { min: 4, max: 19 };
}

function getDesertTrack(
  floor: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
  scrollRange: { min: number; max: number },
) {
  const floorBounds = getObjectBounds(floor);
  const { pathInset } = camelScrollSettings;

  const trackStartX = floorBounds.min.x + pathInset;
  const trackEndX = floorBounds.max.x - pathInset;
  const scrollSpan = scrollRange.max - scrollRange.min;

  const desertScrollStart =
    scrollSpan > 0
      ? (floorBounds.min.x - scrollRange.min) / scrollSpan
      : 0;
  const desertScrollEnd =
    scrollSpan > 0
      ? (floorBounds.max.x - scrollRange.min) / scrollSpan
      : 1;

  return {
    trackStartX,
    trackEndX,
    baseY: carrierY,
    baseZ: carrierZ,
    desertScrollStart: THREE.MathUtils.clamp(desertScrollStart, 0, 1),
    desertScrollEnd: THREE.MathUtils.clamp(desertScrollEnd, 0, 1),
  };
}

function getDesertProgress(
  scrollProgress: number,
  desertScrollStart: number,
  desertScrollEnd: number,
) {
  if (desertScrollEnd <= desertScrollStart) return 0;

  return THREE.MathUtils.clamp(
    (scrollProgress - desertScrollStart) / (desertScrollEnd - desertScrollStart),
    0,
    1,
  );
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function getTurtleFootLift(turtle: THREE.Object3D) {
  const size = getObjectBounds(turtle).getSize(new THREE.Vector3());
  return size.y * 0.48;
}

function getBoatSeatWorld(
  boat: THREE.Object3D,
  turtleFootLift: number,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(boat);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempScale);
  const {
    turtleBoatDeckHeightFactor,
    turtleBoatSeatOffsetX,
    turtleBoatSeatOffsetY,
    turtleBoatSeatOffsetZ,
    turtleBoatMinDeckHeightFactor,
    turtleBoatPivotLift,
  } = camelScrollSettings;

  const deckY =
    bounds.min.y +
    size.y * turtleBoatDeckHeightFactor +
    turtleFootLift +
    turtleBoatPivotLift +
    turtleBoatSeatOffsetY;
  const minDeckY = bounds.min.y + size.y * turtleBoatMinDeckHeightFactor;

  target.set(
    center.x + turtleBoatSeatOffsetX,
    Math.max(deckY, minDeckY),
    center.z + turtleBoatSeatOffsetZ,
  );
  return target;
}

function getTurtleWorldOnCamel(rig: CamelRig, target = new THREE.Vector3()) {
  rig.carrier.updateMatrixWorld(true);
  return target
    .copy(rig.turtleLocalOnCarrier)
    .applyMatrix4(rig.carrier.matrixWorld);
}

function computeTransferT(camelWorldX: number, boatWorldX: number) {
  const distanceX = Math.abs(boatWorldX - camelWorldX);
  const { transferStartDistanceX, transferEndDistanceX } = camelScrollSettings;

  if (distanceX >= transferStartDistanceX) return 0;
  if (distanceX <= transferEndDistanceX) return 1;

  const span = transferStartDistanceX - transferEndDistanceX;
  return (transferStartDistanceX - distanceX) / span;
}

function computeArcWorldPosition(
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  arcHeight: number,
  target = new THREE.Vector3(),
) {
  target.lerpVectors(start, end, t);
  target.y += Math.sin(t * Math.PI) * arcHeight;
  return target;
}

function reparentPreserveWorld(
  object: THREE.Object3D,
  newParent: THREE.Object3D,
) {
  object.updateMatrixWorld(true);
  newParent.updateMatrixWorld(true);
  newParent.attach(object);
}

function detachToTransferCarrier(
  turtle: THREE.Object3D,
  transferCarrier: THREE.Group,
  scene: THREE.Object3D,
) {
  turtle.updateMatrixWorld(true);
  turtle.getWorldPosition(tempVec3);
  turtle.getWorldQuaternion(tempQuat);
  turtle.getWorldScale(tempScale);

  if (turtle.parent) turtle.parent.remove(turtle);
  if (!transferCarrier.parent) scene.add(transferCarrier);

  transferCarrier.position.copy(tempVec3);
  transferCarrier.quaternion.copy(tempQuat);
  transferCarrier.scale.copy(tempScale);
  transferCarrier.add(turtle);
  turtle.position.set(0, 0, 0);
  turtle.rotation.set(0, 0, 0);
  turtle.scale.set(1, 1, 1);
}

function mountTurtleOnCamel(rig: CamelRig) {
  if (!rig.turtle) return;

  if (rig.turtle.parent !== rig.carrier) {
    attachObjectToCarrier(rig.carrier, rig.turtle);
  }
  rig.turtle.position.copy(rig.turtleLocalOnCarrier);
  rig.turtle.quaternion.copy(rig.turtleQuaternionOnCarrier);
  rig.turtle.scale.copy(rig.turtleScaleOnCarrier);
  rig.mount = "camel";
}

function mountTurtleOnBoat(rig: CamelRig) {
  if (!rig.turtle || !rig.boat) return;

  getBoatSeatWorld(rig.boat, rig.turtleFootLift, tempVec3);

  if (rig.turtle.parent !== rig.boat) {
    reparentPreserveWorld(rig.turtle, rig.boat);
  }

  rig.boat.updateMatrixWorld(true);
  tempMatrix.copy(rig.boat.matrixWorld).invert();
  tempVec3.applyMatrix4(tempMatrix);
  rig.turtle.position.copy(tempVec3);
  rig.mount = "boat";
}

function beginTurtleTransfer(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle) return;

  getTurtleWorldOnCamel(rig, rig.transferStartWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferProgress = 0;
}

function updateTurtleTransferArc(rig: CamelRig) {
  if (!rig.turtle || !rig.boat || rig.transferProgress === null) return;

  const { transferArcHeight } = camelScrollSettings;
  const easedT = easeInOutCubic(rig.transferProgress);

  getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferEndWorld);
  computeArcWorldPosition(
    rig.transferStartWorld,
    rig.transferEndWorld,
    easedT,
    transferArcHeight,
    tempVec3,
  );
  rig.transferCarrier.position.copy(tempVec3);
}

function buildRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): CamelRig | null {
  scene.updateMatrixWorld(true);

  const camel = resolveObject(
    scene,
    nodes,
    camelScrollSettings.camel,
    camelScrollSettings.camelBlender,
  );
  const floor = findSceneObject(
    scene,
    nodes,
    camelScrollSettings.openingFloor,
  );

  if (!camel || !floor) return null;

  const carrier = attachAnimationCarrier(camel, camelScrollSettings.carrierName);

  const turtle = resolveTurtle(scene, nodes);
  if (turtle) {
    attachObjectToCarrier(carrier, turtle);
  }

  for (let index = 0; index < camelScrollSettings.legs.length; index += 1) {
    const leg = resolveObject(
      scene,
      nodes,
      camelScrollSettings.legs[index],
      camelScrollSettings.legsBlender[index],
    );
    if (leg) {
      attachObjectToCarrier(carrier, leg);
    }
  }

  const boat = resolveObject(
    scene,
    nodes,
    camelScrollSettings.boat,
    camelScrollSettings.boatBlender,
  );

  const transferCarrier = new THREE.Group();
  transferCarrier.name = "TurtleTransferCarrier";

  const turtleLocalOnCarrier = turtle
    ? turtle.position.clone()
    : new THREE.Vector3();
  const turtleQuaternionOnCarrier = turtle
    ? turtle.quaternion.clone()
    : new THREE.Quaternion();
  const turtleScaleOnCarrier = turtle
    ? turtle.scale.clone()
    : new THREE.Vector3(1, 1, 1);

  const turtleFootLift = turtle ? getTurtleFootLift(turtle) : 0.25;

  const track = getDesertTrack(
    floor,
    carrier.position.y,
    carrier.position.z,
    getScrollRange(sceneFrame),
  );

  if (process.env.NODE_ENV === "development") {
    console.info("[CamelScrollMovement] Ready:", {
      track: [track.trackStartX, track.trackEndX],
      desertScroll: [track.desertScrollStart, track.desertScrollEnd],
      turtle: turtle?.name ?? null,
      boat: boat?.name ?? null,
    });
  }

  return {
    carrier,
    turtle,
    boat,
    transferCarrier,
    mount: "camel",
    hasTransferredToBoat: false,
    transferProgress: null,
    transferStartWorld: new THREE.Vector3(),
    transferEndWorld: new THREE.Vector3(),
    turtleLocalOnCarrier,
    turtleQuaternionOnCarrier,
    turtleScaleOnCarrier,
    turtleFootLift,
    baseY: track.baseY,
    baseZ: track.baseZ,
    trackStartX: track.trackStartX,
    trackEndX: track.trackEndX,
    desertScrollStart: track.desertScrollStart,
    desertScrollEnd: track.desertScrollEnd,
  };
}

export default function CamelScrollMovement({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnBoatRef,
}: CamelScrollMovementProps) {
  const rigRef = useRef<CamelRig | null>(null);

  useLayoutEffect(() => {
    turtleOnBoatRef.current = false;
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    return () => {
      const rig = rigRef.current;
      if (rig?.transferCarrier.parent) {
        rig.transferCarrier.parent.remove(rig.transferCarrier);
      }
      turtleOnBoatRef.current = false;
      rigRef.current = null;
    };
  }, [scene, nodes, sceneFrame, turtleOnBoatRef]);

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

    const desertProgress = getDesertProgress(
      progress,
      rig.desertScrollStart,
      rig.desertScrollEnd,
    );

    rig.carrier.position.set(
      THREE.MathUtils.lerp(rig.trackStartX, rig.trackEndX, desertProgress),
      rig.baseY,
      rig.baseZ,
    );
    rig.carrier.updateMatrixWorld(true);

    if (!rig.turtle || !rig.boat) {
      turtleOnBoatRef.current = false;
      return;
    }

    if (rig.hasTransferredToBoat) {
      mountTurtleOnBoat(rig);
      turtleOnBoatRef.current = true;
      return;
    }

    turtleOnBoatRef.current = false;
    rig.boat.updateMatrixWorld(true);
    rig.carrier.getWorldPosition(tempVec3);
    const camelWorldX = tempVec3.x;
    rig.boat.getWorldPosition(tempVec3);
    const boatWorldX = tempVec3.x;
    const transferTriggerT = computeTransferT(camelWorldX, boatWorldX);

    if (transferTriggerT > 0 && rig.transferProgress === null) {
      beginTurtleTransfer(rig, scene);
    }

    if (rig.transferProgress === null) {
      mountTurtleOnCamel(rig);
      return;
    }

    rig.transferProgress = Math.min(
      rig.transferProgress + delta / camelScrollSettings.transferDuration,
      1,
    );
    updateTurtleTransferArc(rig);

    if (rig.transferProgress >= 1) {
      mountTurtleOnBoat(rig);
      rig.hasTransferredToBoat = true;
      rig.transferProgress = null;
      turtleOnBoatRef.current = true;
    }
  });

  return null;
}
