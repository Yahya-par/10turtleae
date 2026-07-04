import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { camelScrollSettings } from "@features/portfolio/config/camelScrollSettings";
import { carScrollSettings } from "@features/portfolio/config/carScrollSettings";
import { getCarSeatWorld, resolveCarScrollWindow } from "@features/portfolio/components/animations/CarScrollMovement";
import {
  attachAnimationCarrier,
  attachObjectToCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  scrollProgressToPathX,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type TurtleMount = "camel" | "transfer" | "boat" | "car";
type TransferMode = "idle" | "toBoat" | "toCamel" | "toCar" | "toBoatFromCar";

type CamelRig = {
  carrier: THREE.Group;
  turtle: THREE.Object3D | null;
  boat: THREE.Object3D | null;
  car: THREE.Object3D | null;
  transferCarrier: THREE.Group;
  mount: TurtleMount;
  onBoat: boolean;
  onCar: boolean;
  transferMode: TransferMode;
  transferProgress: number;
  transferStartWorld: THREE.Vector3;
  transferEndWorld: THREE.Vector3;
  turtleLocalOnCarrier: THREE.Vector3;
  turtleLocalOnCar: THREE.Vector3;
  turtleQuaternionOnCarrier: THREE.Quaternion;
  turtleScaleOnCarrier: THREE.Vector3;
  turtleFootLift: number;
  baseY: number;
  baseZ: number;
  trackStartX: number;
  trackEndX: number;
  desertScrollStart: number;
  desertScrollEnd: number;
  carScrollStart: number;
  carScrollEnd: number;
  /** Camel X locked while turtle returns from boat. */
  heldCamelX: number | null;
  /** Camel X when turtle boarded — held until turtle remounts. */
  handoffCamelX: number | null;
  /** Prevents immediate re-transfer to boat while still at the handoff. */
  suppressForwardTransfer: boolean;
  reverseScrollHold: number;
  forwardScrollHold: number;
  lastScrollProgress: number;
};

type CamelScrollMovementProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnBoatRef: RefObject<boolean>;
  boatTravelProgressRef: RefObject<number>;
  turtleOnCarRef: RefObject<boolean>;
  carTravelProgressRef: RefObject<number>;
  turtleReturnedFromCarRef: RefObject<boolean>;
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

function resolveCamelX(
  rig: CamelRig,
  targetCamelX: number,
) {
  if (rig.handoffCamelX !== null) return rig.handoffCamelX;
  if (rig.heldCamelX !== null) return rig.heldCamelX;
  return targetCamelX;
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

function computeTransferTByDistance(
  aWorldX: number,
  bWorldX: number,
  startDistance: number,
  endDistance: number,
) {
  const distanceX = Math.abs(bWorldX - aWorldX);
  if (distanceX >= startDistance) return 0;
  if (distanceX <= endDistance) return 1;

  const span = startDistance - endDistance;
  return (startDistance - distanceX) / span;
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

function mountTurtleOnCamel(rig: CamelRig, preserveWorld = false) {
  if (!rig.turtle) return;

  if (rig.turtle.parent !== rig.carrier) {
    if (preserveWorld) {
      reparentPreserveWorld(rig.turtle, rig.carrier);
    } else {
      attachObjectToCarrier(rig.carrier, rig.turtle);
    }
  }

  if (!preserveWorld) {
    rig.turtle.position.copy(rig.turtleLocalOnCarrier);
    rig.turtle.quaternion.copy(rig.turtleQuaternionOnCarrier);
    rig.turtle.scale.copy(rig.turtleScaleOnCarrier);
  }
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

function mountTurtleOnCar(rig: CamelRig) {
  if (!rig.turtle || !rig.car) return;

  if (rig.turtle.parent !== rig.car) {
    getCarSeatWorld(rig.car, 0, tempVec3);
    reparentPreserveWorld(rig.turtle, rig.car);
    rig.car.updateMatrixWorld(true);
    tempMatrix.copy(rig.car.matrixWorld).invert();
    tempVec3.applyMatrix4(tempMatrix);
    rig.turtleLocalOnCar.copy(tempVec3);
  }

  rig.turtle.position.copy(rig.turtleLocalOnCar);
  rig.mount = "car";
}

function beginForwardTransfer(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle) return;

  getTurtleWorldOnCamel(rig, rig.transferStartWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toBoat";
  rig.transferProgress = 0;
  rig.suppressForwardTransfer = false;
  rig.reverseScrollHold = 0;
  rig.forwardScrollHold = 0;
}

function beginReverseTransfer(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.boat) return;

  if (rig.handoffCamelX === null) {
    rig.handoffCamelX = rig.carrier.position.x;
  }
  getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferEndWorld);
  rig.mount = "transfer";
  rig.transferMode = "toCamel";
  rig.transferProgress = 1;
  rig.onBoat = false;
}

function beginTransferToCar(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.boat || !rig.car) return;

  getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferStartWorld);
  getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toCar";
  rig.transferProgress = 0;
  rig.onBoat = false;
}

function beginTransferToBoatFromCar(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.boat || !rig.car) return;

  getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferStartWorld);
  getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toBoatFromCar";
  rig.transferProgress = 0;
  rig.onCar = false;
  rig.onBoat = false;
}

function isTurtleInCarPhase(
  rig: CamelRig,
  turtleOnCarRef: RefObject<boolean>,
  carTravelProgressRef: RefObject<number>,
) {
  const parentIsCar = Boolean(rig.turtle && rig.car && rig.turtle.parent === rig.car);
  return (
    rig.onCar ||
    rig.mount === "car" ||
    parentIsCar ||
    turtleOnCarRef.current ||
    carTravelProgressRef.current > 0.01 ||
    rig.transferMode === "toBoatFromCar" ||
    rig.transferMode === "toCar"
  );
}

function updateTurtleTransferArc(rig: CamelRig, transferT: number) {
  if (!rig.turtle) return;

  const arcHeight =
    rig.transferMode === "toCar" || rig.transferMode === "toBoatFromCar"
      ? carScrollSettings.transferArcHeight
      : camelScrollSettings.transferArcHeight;
  const easedT = easeInOutCubic(transferT);

  if (rig.transferMode === "toBoat") {
    if (!rig.boat) return;
    getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferEndWorld);
    getTurtleWorldOnCamel(rig, rig.transferStartWorld);
  } else if (rig.transferMode === "toCamel") {
    if (!rig.boat) return;
    getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferEndWorld);
    getTurtleWorldOnCamel(rig, rig.transferStartWorld);
  } else if (rig.transferMode === "toBoatFromCar") {
    if (!rig.boat || !rig.car) return;
    getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferStartWorld);
    getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferEndWorld);
  } else if (rig.transferMode === "toCar") {
    if (!rig.boat || !rig.car) return;
    getBoatSeatWorld(rig.boat, rig.turtleFootLift, rig.transferStartWorld);
    getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferEndWorld);
  }

  computeArcWorldPosition(
    rig.transferStartWorld,
    rig.transferEndWorld,
    easedT,
    arcHeight,
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

  const car = resolveObject(
    scene,
    nodes,
    carScrollSettings.body,
    carScrollSettings.bodyBlender,
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
  const carScroll = resolveCarScrollWindow(scene, nodes, sceneFrame);

  if (process.env.NODE_ENV === "development") {
    console.info("[CamelScrollMovement] Ready:", {
      track: [track.trackStartX, track.trackEndX],
      desertScroll: [track.desertScrollStart, track.desertScrollEnd],
      turtle: turtle?.name ?? null,
      boat: boat?.name ?? null,
      car: car?.name ?? null,
    });
  }

  return {
    carrier,
    turtle,
    boat,
    car,
    transferCarrier,
    mount: "camel",
    onBoat: false,
    onCar: false,
    transferMode: "idle",
    transferProgress: 0,
    transferStartWorld: new THREE.Vector3(),
    transferEndWorld: new THREE.Vector3(),
    turtleLocalOnCarrier,
    turtleLocalOnCar: new THREE.Vector3(),
    turtleQuaternionOnCarrier,
    turtleScaleOnCarrier,
    turtleFootLift,
    baseY: track.baseY,
    baseZ: track.baseZ,
    trackStartX: track.trackStartX,
    trackEndX: track.trackEndX,
    desertScrollStart: track.desertScrollStart,
    desertScrollEnd: track.desertScrollEnd,
    carScrollStart: carScroll.carScrollStart,
    carScrollEnd: carScroll.carScrollEnd,
    heldCamelX: null,
    handoffCamelX: null,
    suppressForwardTransfer: false,
    reverseScrollHold: 0,
    forwardScrollHold: 0,
    lastScrollProgress: 0,
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
  boatTravelProgressRef,
  turtleOnCarRef,
  carTravelProgressRef,
  turtleReturnedFromCarRef,
}: CamelScrollMovementProps) {
  const rigRef = useRef<CamelRig | null>(null);

  useLayoutEffect(() => {
    turtleOnBoatRef.current = false;
    turtleOnCarRef.current = false;
    turtleReturnedFromCarRef.current = false;
    boatTravelProgressRef.current = 0;
    carTravelProgressRef.current = 0;
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    return () => {
      const rig = rigRef.current;
      if (rig?.transferCarrier.parent) {
        rig.transferCarrier.parent.remove(rig.transferCarrier);
      }
      turtleOnBoatRef.current = false;
      turtleOnCarRef.current = false;
      turtleReturnedFromCarRef.current = false;
      boatTravelProgressRef.current = 0;
      carTravelProgressRef.current = 0;
      rigRef.current = null;
    };
  }, [
    scene,
    nodes,
    sceneFrame,
    turtleOnBoatRef,
    boatTravelProgressRef,
    turtleOnCarRef,
    carTravelProgressRef,
  ]);

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
    const {
      scrollIntentThreshold,
      reverseTransferScrollHold,
      forwardTransferScrollHold,
    } = camelScrollSettings;

    const progressDelta = progress - rig.lastScrollProgress;
    const scrollingBack = progressDelta > scrollIntentThreshold;
    const scrollingForwardToScene2 = progressDelta < -scrollIntentThreshold;

    if (scrollingBack) {
      rig.reverseScrollHold += delta;
      rig.forwardScrollHold = 0;
    } else if (scrollingForwardToScene2) {
      rig.forwardScrollHold += delta;
      rig.reverseScrollHold = 0;
    } else {
      rig.reverseScrollHold = Math.max(0, rig.reverseScrollHold - delta * 2);
      rig.forwardScrollHold = Math.max(0, rig.forwardScrollHold - delta * 2);
    }

    const inDesertWindow =
      progress >= rig.desertScrollStart && progress <= rig.desertScrollEnd;
    let targetCamelX: number;
    if (inDesertWindow) {
      targetCamelX = scrollProgressToPathX(progress, sceneFrame);
    } else if (progress < rig.desertScrollStart) {
      targetCamelX = rig.trackStartX;
    } else {
      targetCamelX = rig.trackEndX;
    }
    const camelLocked =
      rig.handoffCamelX !== null || rig.heldCamelX !== null;
    const camelX = camelLocked
      ? resolveCamelX(rig, targetCamelX)
      : targetCamelX;

    rig.carrier.position.set(camelX, rig.baseY, rig.baseZ);
    rig.carrier.updateMatrixWorld(true);

    if (!rig.turtle) {
      turtleOnBoatRef.current = false;
      turtleOnCarRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.boat) {
      rig.boat.updateMatrixWorld(true);
    }
    if (rig.car) {
      rig.car.updateMatrixWorld(true);
    }

    const boatHasMoved = boatTravelProgressRef.current > 0.03;
    const boatAtDock = boatTravelProgressRef.current >= 0.94;
    const transferStep = delta / camelScrollSettings.transferDuration;
    const carTransferStep = delta / carScrollSettings.transferDuration;

    if (rig.transferMode === "toBoatFromCar") {
      rig.transferProgress = Math.min(
        rig.transferProgress + carTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnBoat(rig);
        rig.onBoat = true;
        rig.onCar = false;
        rig.transferMode = "idle";
        turtleOnBoatRef.current = true;
        turtleOnCarRef.current = false;
        turtleReturnedFromCarRef.current = true;
        carTravelProgressRef.current = 0;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnBoatRef.current = false;
        turtleOnCarRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.transferMode === "toCar") {
      rig.transferProgress = Math.min(
        rig.transferProgress + carTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnCar(rig);
        rig.onCar = true;
        rig.onBoat = false;
        rig.transferMode = "idle";
        turtleOnCarRef.current = true;
        turtleOnBoatRef.current = false;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnBoatRef.current = false;
        turtleOnCarRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    const turtleInCarPhase = isTurtleInCarPhase(
      rig,
      turtleOnCarRef,
      carTravelProgressRef,
    );

    if (turtleInCarPhase && rig.transferMode === "idle") {
      mountTurtleOnCar(rig);
      rig.onCar = true;
      rig.onBoat = false;

      const atCarDock = carTravelProgressRef.current <= 0.05;
      const shouldReturnToBoat =
        rig.boat &&
        atCarDock &&
        rig.reverseScrollHold >= carScrollSettings.reverseTransferScrollHold;

      if (shouldReturnToBoat) {
        beginTransferToBoatFromCar(rig, scene);
        turtleOnCarRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      turtleOnCarRef.current = true;
      turtleOnBoatRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    if (!rig.boat) {
      turtleOnBoatRef.current = false;
      turtleOnCarRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    rig.carrier.getWorldPosition(tempVec3);
    const camelWorldX = tempVec3.x;
    rig.boat.getWorldPosition(tempVec3);
    const boatWorldX = tempVec3.x;

    const transferTriggerT = computeTransferTByDistance(
      camelWorldX,
      boatWorldX,
      camelScrollSettings.transferStartDistanceX,
      camelScrollSettings.transferEndDistanceX,
    );

    if (rig.mount === "boat" && !rig.onBoat && transferTriggerT > 0 && !boatHasMoved) {
      rig.onBoat = true;
    }
    if (rig.mount === "camel" && rig.onBoat && rig.transferMode === "idle") {
      rig.onBoat = false;
    }

    const mayTransferBoatToCar =
      !scrollingBack &&
      rig.forwardScrollHold >= forwardTransferScrollHold &&
      !turtleReturnedFromCarRef.current &&
      !isTurtleInCarPhase(rig, turtleOnCarRef, carTravelProgressRef);

    if (
      rig.onBoat &&
      boatHasMoved &&
      rig.transferMode === "idle" &&
      boatAtDock &&
      rig.car &&
      mayTransferBoatToCar
    ) {
      beginTransferToCar(rig, scene);
      turtleOnBoatRef.current = false;
      turtleOnCarRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    if (
      rig.onBoat &&
      boatHasMoved &&
      rig.transferMode === "idle" &&
      !isTurtleInCarPhase(rig, turtleOnCarRef, carTravelProgressRef)
    ) {
      if (rig.handoffCamelX === null) {
        rig.handoffCamelX = rig.carrier.position.x;
      }
      mountTurtleOnBoat(rig);
      turtleOnBoatRef.current = true;
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.suppressForwardTransfer && rig.forwardScrollHold >= forwardTransferScrollHold) {
      rig.suppressForwardTransfer = false;
    }

    if (
      rig.transferMode === "idle" &&
      rig.mount === "transfer" &&
      rig.turtle.parent === rig.transferCarrier
    ) {
      mountTurtleOnCamel(rig, true);
    }

    if (
      rig.transferMode === "idle" &&
      !rig.onBoat &&
      transferTriggerT > 0 &&
      !rig.suppressForwardTransfer
    ) {
      beginForwardTransfer(rig, scene);
    }

    if (
      rig.transferMode === "idle" &&
      rig.onBoat &&
      !boatHasMoved &&
      rig.reverseScrollHold >= reverseTransferScrollHold
    ) {
      beginReverseTransfer(rig, scene);
      turtleOnBoatRef.current = false;
    }

    if (rig.transferMode === "toBoat") {
      if (transferTriggerT <= 0) {
        if (rig.heldCamelX === null) {
          rig.heldCamelX = rig.carrier.position.x;
        }
        rig.transferMode = "toCamel";
      } else {
        rig.transferProgress = Math.min(rig.transferProgress + transferStep, 1);
        updateTurtleTransferArc(rig, rig.transferProgress);

        if (rig.transferProgress >= 1) {
          mountTurtleOnBoat(rig);
          rig.onBoat = true;
          rig.transferMode = "idle";
          rig.handoffCamelX = rig.carrier.position.x;
          turtleOnBoatRef.current = true;
        }
        rig.lastScrollProgress = progress;
        return;
      }
    }

    if (rig.transferMode === "toCamel") {
      rig.transferProgress = Math.max(rig.transferProgress - transferStep, 0);
      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress <= 0) {
        mountTurtleOnCamel(rig, true);
        rig.onBoat = false;
        rig.transferMode = "idle";
        rig.suppressForwardTransfer = true;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
        rig.handoffCamelX = null;
        rig.heldCamelX = null;
        turtleOnBoatRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.onBoat) {
      if (rig.handoffCamelX === null) {
        rig.handoffCamelX = rig.carrier.position.x;
      }
      mountTurtleOnBoat(rig);
      turtleOnBoatRef.current = true;
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.mount === "boat") {
      mountTurtleOnBoat(rig);
      rig.onBoat = true;
      turtleOnBoatRef.current = true;
      turtleOnCarRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.mount === "car") {
      mountTurtleOnCar(rig);
      rig.onCar = true;
      turtleOnCarRef.current = true;
      turtleOnBoatRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.mount !== "camel") {
      mountTurtleOnCamel(rig);
    }
    turtleOnBoatRef.current = false;
    turtleOnCarRef.current = false;

    rig.lastScrollProgress = progress;
  });

  return null;
}
