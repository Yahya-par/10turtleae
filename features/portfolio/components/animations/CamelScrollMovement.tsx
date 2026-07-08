import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { camelScrollSettings } from "@features/portfolio/config/camelScrollSettings";
import { carScrollSettings } from "@features/portfolio/config/carScrollSettings";
import { carPassState } from "@features/portfolio/config/carPassState";
import { jetskiScrollSettings } from "@features/portfolio/config/jetskiScrollSettings";
import { atlantisYachtScrollSettings } from "@features/portfolio/config/yachtScrollSettings";
import { getCarSeatWorld, resolveCarScrollWindow } from "@features/portfolio/components/animations/CarScrollMovement";
import { getJetskiDriverSeatWorld, resolveJetskiScrollWindow } from "@features/portfolio/components/animations/JetskiScrollMovement";
import { getYachtSeatWorld } from "@features/portfolio/components/animations/YachtScrollMovement";
import { getSafariCamelSeatWorld } from "@features/portfolio/components/animations/SafariCamelScrollMovement";
import { useEndCamelScrollSettingsHmr } from "@features/portfolio/hooks/useEndCamelScrollSettingsHmr";
import { endCamelScrollSettings } from "@features/portfolio/config/endCamelScrollSettings";
import {
  attachAnimationCarrier,
  attachObjectToCarrier,
  findObjectByNamePattern,
  findOpeningDesertFloor,
  findSceneObject,
  findScrollCarBody,
  getObjectBounds,
  resolveScene1CamelTrack,
  clampScene1WorldX,
  getScene1TravelProgress,
  setObjectWorldPosition,
} from "@features/portfolio/utils/sceneObjectUtils";
import {
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type TurtleMount = "camel" | "transfer" | "boat" | "car" | "jetski" | "yacht" | "safariCamel";
type TransferMode =
  | "idle"
  | "toBoat"
  | "toCamel"
  | "toCar"
  | "toBoatFromCar"
  | "toJetski"
  | "toCarFromJetski"
  | "toYacht"
  | "toJetskiFromYacht"
  | "toSafariCamel";

type CamelRig = {
  carrier: THREE.Group;
  turtle: THREE.Object3D | null;
  boat: THREE.Object3D | null;
  car: THREE.Object3D | null;
  jetskiDriver: THREE.Object3D | null;
  yacht: THREE.Object3D | null;
  safariCamel: THREE.Object3D | null;
  transferCarrier: THREE.Group;
  mount: TurtleMount;
  onBoat: boolean;
  onCar: boolean;
  onJetski: boolean;
  onYacht: boolean;
  onSafariCamel: boolean;
  transferMode: TransferMode;
  transferProgress: number;
  transferStartWorld: THREE.Vector3;
  transferEndWorld: THREE.Vector3;
  turtleLocalOnCarrier: THREE.Vector3;
  turtleLocalOnCar: THREE.Vector3;
  turtleLocalOnJetski: THREE.Vector3;
  turtleLocalOnYacht: THREE.Vector3;
  turtleLocalOnSafariCamel: THREE.Vector3;
  turtleQuaternionOnCarrier: THREE.Quaternion;
  turtleScaleOnCarrier: THREE.Vector3;
  turtleFootLift: number;
  baseY: number;
  baseZ: number;
  baseWorldY: number;
  baseWorldZ: number;
  startX: number;
  endX: number;
  progressAtStart: number;
  progressAtEnd: number;
  desertScrollStart: number;
  desertScrollEnd: number;
  carScrollStart: number;
  carScrollEnd: number;
  jetskiScrollStart: number;
  jetskiScrollEnd: number;
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
  turtleOnJetskiRef: RefObject<boolean>;
  jetskiTravelProgressRef: RefObject<number>;
  turtleReturnedFromJetskiRef: RefObject<boolean>;
  turtleOnYachtRef: RefObject<boolean>;
  yachtTravelProgressRef: RefObject<number>;
  turtleReturnedFromYachtRef: RefObject<boolean>;
  turtleOnSafariCamelRef: RefObject<boolean>;
  safariCamelTravelProgressRef: RefObject<number>;
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

function resolveCamelX(
  rig: CamelRig,
  targetCamelX: number,
) {
  const raw =
    rig.handoffCamelX !== null
      ? rig.handoffCamelX
      : rig.heldCamelX !== null
        ? rig.heldCamelX
        : targetCamelX;

  return clampScene1WorldX(raw, rig);
}

function getCarrierWorldX(carrier: THREE.Group) {
  carrier.updateMatrixWorld(true);
  return carrier.getWorldPosition(tempVec3).x;
}

function getHandoffMeetX(rig: Pick<CamelRig, "endX" | "startX">) {
  return clampScene1WorldX(rig.endX, rig);
}

function snapCamelToHandoff(rig: CamelRig) {
  const meetX = getHandoffMeetX(rig);
  rig.handoffCamelX = meetX;
  tempVec3.set(meetX, rig.baseWorldY, rig.baseWorldZ);
  setObjectWorldPosition(rig.carrier, tempVec3);
  rig.carrier.updateMatrixWorld(true);
}

function lockCamelAtHandoff(rig: CamelRig) {
  if (rig.handoffCamelX !== null) return;
  snapCamelToHandoff(rig);
}

/** Map scroll progress to camel world X — scene 1 entrance → scene 2 boundary only. */
function getCamelTrackWorldX(
  progress: number,
  rig: Pick<CamelRig, "startX" | "endX" | "progressAtStart" | "progressAtEnd">,
) {
  return clampScene1WorldX(
    THREE.MathUtils.lerp(
      rig.startX,
      rig.endX,
      getScene1TravelProgress(progress, rig),
    ),
    rig,
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

function mountTurtleOnJetski(rig: CamelRig) {
  if (!rig.turtle || !rig.jetskiDriver) return;

  if (rig.turtle.parent !== rig.jetskiDriver) {
    getJetskiDriverSeatWorld(rig.jetskiDriver, rig.turtleFootLift, tempVec3);
    reparentPreserveWorld(rig.turtle, rig.jetskiDriver);
    rig.jetskiDriver.updateMatrixWorld(true);
    tempMatrix.copy(rig.jetskiDriver.matrixWorld).invert();
    tempVec3.applyMatrix4(tempMatrix);
    rig.turtleLocalOnJetski.copy(tempVec3);
  }

  rig.turtle.position.copy(rig.turtleLocalOnJetski);
  rig.mount = "jetski";
}

function mountTurtleOnYacht(rig: CamelRig) {
  if (!rig.turtle || !rig.yacht) return;

  if (rig.turtle.parent !== rig.yacht) {
    getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, tempVec3);
    reparentPreserveWorld(rig.turtle, rig.yacht);
    rig.yacht.updateMatrixWorld(true);
    tempMatrix.copy(rig.yacht.matrixWorld).invert();
    tempVec3.applyMatrix4(tempMatrix);
    rig.turtleLocalOnYacht.copy(tempVec3);
  }

  rig.turtle.position.copy(rig.turtleLocalOnYacht);
  rig.mount = "yacht";
}

function resolveSafariCamelCarrier(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  safariCamel: THREE.Object3D | null,
) {
  const carrier = findSceneObject(
    scene,
    nodes,
    endCamelScrollSettings.carrierName,
  );
  if (carrier) return carrier;
  if (safariCamel?.parent?.name === endCamelScrollSettings.carrierName) {
    return safariCamel.parent;
  }
  return safariCamel;
}

function mountTurtleOnSafariCamel(
  rig: CamelRig,
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  if (!rig.turtle || !rig.safariCamel) return;

  const parent = resolveSafariCamelCarrier(scene, nodes, rig.safariCamel);
  if (!parent) return;

  if (rig.turtle.parent !== parent) {
    reparentPreserveWorld(rig.turtle, parent);
  }

  rig.safariCamel.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);
  getSafariCamelSeatWorld(rig.safariCamel, rig.turtle, tempVec3);
  tempMatrix.copy(parent.matrixWorld).invert();
  tempVec3.applyMatrix4(tempMatrix);
  rig.turtleLocalOnSafariCamel.copy(tempVec3);
  rig.turtle.position.copy(rig.turtleLocalOnSafariCamel);
  rig.mount = "safariCamel";
}

function beginForwardTransfer(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle) return;

  snapCamelToHandoff(rig);
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
    lockCamelAtHandoff(rig);
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
  carPassState.boatToCarTransfer = true;
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

function beginTransferToJetski(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.car || !rig.jetskiDriver) return;

  getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferStartWorld);
  getJetskiDriverSeatWorld(rig.jetskiDriver, rig.turtleFootLift, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toJetski";
  rig.transferProgress = 0;
  rig.onCar = false;
  rig.onJetski = false;
}

function beginTransferToYacht(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.jetskiDriver || !rig.yacht) return;

  getJetskiDriverSeatWorld(rig.jetskiDriver, rig.turtleFootLift, rig.transferStartWorld);
  getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toYacht";
  rig.transferProgress = 0;
  rig.onJetski = false;
  rig.onYacht = false;
}

function beginTransferToJetskiFromYacht(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.jetskiDriver || !rig.yacht) return;

  getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, rig.transferStartWorld);
  getJetskiDriverSeatWorld(rig.jetskiDriver, rig.turtleFootLift, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toJetskiFromYacht";
  rig.transferProgress = 0;
  rig.onYacht = false;
  rig.onJetski = false;
}

function beginTransferToCarFromJetski(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.car || !rig.jetskiDriver) return;

  getJetskiDriverSeatWorld(rig.jetskiDriver, rig.turtleFootLift, rig.transferStartWorld);
  getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toCarFromJetski";
  rig.transferProgress = 0;
  rig.onJetski = false;
  rig.onCar = false;
}

function beginTransferToSafariCamel(rig: CamelRig, scene: THREE.Object3D) {
  if (!rig.turtle || !rig.yacht || !rig.safariCamel) return;

  getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, rig.transferStartWorld);
  getSafariCamelSeatWorld(rig.safariCamel, rig.turtle, rig.transferEndWorld);
  detachToTransferCarrier(rig.turtle, rig.transferCarrier, scene);
  rig.transferCarrier.position.copy(rig.transferStartWorld);
  rig.mount = "transfer";
  rig.transferMode = "toSafariCamel";
  rig.transferProgress = 0;
  rig.onYacht = false;
  rig.onSafariCamel = false;
  carPassState.yachtToSafariCamelTransfer = true;
  carPassState.yachtDockedAtEnd = true;
}

function isTurtleInCarPhase(
  rig: CamelRig,
  turtleOnCarRef: RefObject<boolean>,
  carTravelProgressRef: RefObject<number>,
  turtleOnJetskiRef: RefObject<boolean>,
  jetskiTravelProgressRef: RefObject<number>,
  turtleOnYachtRef: RefObject<boolean>,
  yachtTravelProgressRef: RefObject<number>,
  turtleOnSafariCamelRef: RefObject<boolean>,
) {
  if (
    isTurtleInYachtPhase(rig, turtleOnYachtRef, yachtTravelProgressRef, turtleOnSafariCamelRef) ||
    isTurtleInJetskiPhase(
      rig,
      turtleOnJetskiRef,
      jetskiTravelProgressRef,
      turtleOnYachtRef,
      yachtTravelProgressRef,
      turtleOnSafariCamelRef,
    )
  ) {
    return false;
  }

  const parentIsCar = Boolean(rig.turtle && rig.car && rig.turtle.parent === rig.car);
  return (
    rig.onCar ||
    rig.mount === "car" ||
    parentIsCar ||
    turtleOnCarRef.current ||
    carTravelProgressRef.current > 0.01 ||
    rig.transferMode === "toBoatFromCar" ||
    rig.transferMode === "toCar" ||
    rig.transferMode === "toJetski" ||
    rig.transferMode === "toCarFromJetski"
  );
}

function isTurtleInJetskiPhase(
  rig: CamelRig,
  turtleOnJetskiRef: RefObject<boolean>,
  jetskiTravelProgressRef: RefObject<number>,
  turtleOnYachtRef: RefObject<boolean>,
  yachtTravelProgressRef: RefObject<number>,
  turtleOnSafariCamelRef: RefObject<boolean>,
) {
  if (isTurtleInYachtPhase(rig, turtleOnYachtRef, yachtTravelProgressRef, turtleOnSafariCamelRef)) {
    return false;
  }

  const parentIsJetski = Boolean(
    rig.turtle && rig.jetskiDriver && rig.turtle.parent === rig.jetskiDriver,
  );
  return (
    rig.onJetski ||
    rig.mount === "jetski" ||
    parentIsJetski ||
    turtleOnJetskiRef.current ||
    jetskiTravelProgressRef.current > 0.01 ||
    rig.transferMode === "toCarFromJetski" ||
    rig.transferMode === "toYacht"
  );
}

function isTurtleInYachtPhase(
  rig: CamelRig,
  turtleOnYachtRef: RefObject<boolean>,
  yachtTravelProgressRef: RefObject<number>,
  turtleOnSafariCamelRef: RefObject<boolean>,
) {
  const parentIsYacht = Boolean(
    rig.turtle && rig.yacht && rig.turtle.parent === rig.yacht,
  );
  return (
    (rig.onYacht ||
      rig.mount === "yacht" ||
      parentIsYacht ||
      turtleOnYachtRef.current ||
      rig.transferMode === "toJetskiFromYacht") &&
    !turtleOnSafariCamelRef.current &&
    rig.mount !== "safariCamel" &&
    !rig.onSafariCamel
  );
}

function isTurtleInSafariCamelPhase(
  rig: CamelRig,
  turtleOnSafariCamelRef: RefObject<boolean>,
) {
  const carrier = rig.safariCamel?.parent;
  const parentIsSafariCamel = Boolean(
    rig.turtle &&
      carrier &&
      (rig.turtle.parent === carrier || rig.turtle.parent === rig.safariCamel),
  );
  return (
    rig.onSafariCamel ||
    rig.mount === "safariCamel" ||
    parentIsSafariCamel ||
    turtleOnSafariCamelRef.current ||
    rig.transferMode === "toSafariCamel"
  );
}

function getTransferArcHeight(mode: TransferMode) {
  if (mode === "toCar" || mode === "toBoatFromCar") {
    return carScrollSettings.transferArcHeight;
  }
  if (mode === "toJetski" || mode === "toCarFromJetski") {
    return jetskiScrollSettings.transferArcHeight;
  }
  if (mode === "toYacht" || mode === "toJetskiFromYacht") {
    return atlantisYachtScrollSettings.transferArcHeight ?? 0.9;
  }
  if (mode === "toSafariCamel") {
    return endCamelScrollSettings.transferArcHeight;
  }
  return camelScrollSettings.transferArcHeight;
}

function updateTurtleTransferArc(rig: CamelRig, transferT: number) {
  if (!rig.turtle) return;

  const arcHeight = getTransferArcHeight(rig.transferMode);
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
  } else if (rig.transferMode === "toJetski") {
    if (!rig.car || !rig.jetskiDriver) return;
    getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferStartWorld);
    getJetskiDriverSeatWorld(
      rig.jetskiDriver,
      rig.turtleFootLift,
      rig.transferEndWorld,
    );
  } else if (rig.transferMode === "toCarFromJetski") {
    if (!rig.car || !rig.jetskiDriver) return;
    getJetskiDriverSeatWorld(
      rig.jetskiDriver,
      rig.turtleFootLift,
      rig.transferStartWorld,
    );
    getCarSeatWorld(rig.car, rig.turtleFootLift, rig.transferEndWorld);
  } else if (rig.transferMode === "toYacht") {
    if (!rig.jetskiDriver || !rig.yacht) return;
    getJetskiDriverSeatWorld(
      rig.jetskiDriver,
      rig.turtleFootLift,
      rig.transferStartWorld,
    );
    getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, rig.transferEndWorld);
  } else if (rig.transferMode === "toJetskiFromYacht") {
    if (!rig.jetskiDriver || !rig.yacht) return;
    getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, rig.transferStartWorld);
    getJetskiDriverSeatWorld(
      rig.jetskiDriver,
      rig.turtleFootLift,
      rig.transferEndWorld,
    );
  } else if (rig.transferMode === "toSafariCamel") {
    if (!rig.yacht || !rig.safariCamel) return;
    getYachtSeatWorld(rig.yacht, atlantisYachtScrollSettings, rig.transferStartWorld);
    getSafariCamelSeatWorld(rig.safariCamel, rig.turtle, rig.transferEndWorld);
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
  const floor = findOpeningDesertFloor(scene, nodes);
  const boat = resolveObject(
    scene,
    nodes,
    camelScrollSettings.boat,
    camelScrollSettings.boatBlender,
  );
  const scene1Track = resolveScene1CamelTrack(
    scene,
    nodes,
    sceneFrame,
    {
      startInset: camelScrollSettings.startInset,
      endInset: camelScrollSettings.endInset,
      camelBoatMeetGap: camelScrollSettings.camelBoatMeetGap,
    },
    boat,
  );

  if (!camel || !floor || !scene1Track) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CamelScrollMovement] Setup failed:", {
        camel: camel?.name ?? null,
        floor: floor?.name ?? null,
        scene1Track: scene1Track !== null,
        openingFloor: camelScrollSettings.openingFloor,
      });
    }
    return null;
  }

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

  const car = findScrollCarBody(scene, nodes);

  const jetskiDriver =
    resolveObject(
      scene,
      nodes,
      jetskiScrollSettings.driver,
      jetskiScrollSettings.driverBlender,
    ) ?? findObjectByNamePattern(scene, /jetskidriver/i);

  const yachtNumber =
    atlantisYachtScrollSettings.yacht.match(/(\d+)/)?.[1] ?? "003";
  const yacht =
    resolveObject(
      scene,
      nodes,
      atlantisYachtScrollSettings.yacht,
      atlantisYachtScrollSettings.yachtBlender,
    ) ?? findObjectByNamePattern(scene, new RegExp(`yacht\\.?${yachtNumber}`, "i"));

  const safariCamel =
    resolveObject(
      scene,
      nodes,
      endCamelScrollSettings.body,
      endCamelScrollSettings.bodyBlender,
    ) ?? findObjectByNamePattern(scene, /camel\.?002/i);

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

  carrier.updateMatrixWorld(true);
  const carrierWorld = new THREE.Vector3();
  carrier.getWorldPosition(carrierWorld);
  const carScroll = resolveCarScrollWindow(scene, nodes, sceneFrame);
  const jetskiScroll = resolveJetskiScrollWindow(scene, nodes, sceneFrame);

  if (process.env.NODE_ENV === "development") {
    console.info("[CamelScrollMovement] Ready:", {
      scene1: [scene1Track.startX, scene1Track.endX],
      desertScroll: [scene1Track.desertScrollStart, scene1Track.desertScrollEnd],
      turtle: turtle?.name ?? null,
      boat: boat?.name ?? null,
      car: car?.name ?? null,
      jetskiDriver: jetskiDriver?.name ?? null,
      yacht: yacht?.name ?? null,
      safariCamel: safariCamel?.name ?? null,
    });
  }

  return {
    carrier,
    turtle,
    boat,
    car,
    jetskiDriver,
    yacht,
    safariCamel,
    transferCarrier,
    mount: "camel",
    onBoat: false,
    onCar: false,
    onJetski: false,
    onYacht: false,
    onSafariCamel: false,
    transferMode: "idle",
    transferProgress: 0,
    transferStartWorld: new THREE.Vector3(),
    transferEndWorld: new THREE.Vector3(),
    turtleLocalOnCarrier,
    turtleLocalOnCar: new THREE.Vector3(),
    turtleLocalOnJetski: new THREE.Vector3(),
    turtleLocalOnYacht: new THREE.Vector3(),
    turtleLocalOnSafariCamel: new THREE.Vector3(),
    turtleQuaternionOnCarrier,
    turtleScaleOnCarrier,
    turtleFootLift,
    baseY: carrier.position.y,
    baseZ: carrier.position.z,
    baseWorldY: carrierWorld.y,
    baseWorldZ: carrierWorld.z,
    startX: scene1Track.startX,
    endX: scene1Track.endX,
    progressAtStart: scene1Track.progressAtStart,
    progressAtEnd: scene1Track.progressAtEnd,
    desertScrollStart: scene1Track.desertScrollStart,
    desertScrollEnd: scene1Track.desertScrollEnd,
    carScrollStart: carScroll.carScrollStart,
    carScrollEnd: carScroll.carScrollEnd,
    jetskiScrollStart: jetskiScroll.jetskiScrollStart,
    jetskiScrollEnd: jetskiScroll.jetskiScrollEnd,
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
  turtleOnJetskiRef,
  jetskiTravelProgressRef,
  turtleReturnedFromJetskiRef,
  turtleOnYachtRef,
  yachtTravelProgressRef,
  turtleReturnedFromYachtRef,
  turtleOnSafariCamelRef,
  safariCamelTravelProgressRef,
}: CamelScrollMovementProps) {
  const rigRef = useRef<CamelRig | null>(null);
  const settingsRevision = useEndCamelScrollSettingsHmr();

  useLayoutEffect(() => {
    turtleOnBoatRef.current = false;
    turtleOnCarRef.current = false;
    turtleOnJetskiRef.current = false;
    turtleReturnedFromCarRef.current = false;
    turtleReturnedFromJetskiRef.current = false;
    turtleOnYachtRef.current = false;
    turtleReturnedFromYachtRef.current = false;
    turtleOnSafariCamelRef.current = false;
    boatTravelProgressRef.current = 0;
    carTravelProgressRef.current = 0;
    jetskiTravelProgressRef.current = 0;
    yachtTravelProgressRef.current = 0;
    safariCamelTravelProgressRef.current = 0;
    rigRef.current = buildRig(scene, nodes, sceneFrame);
    return () => {
      const rig = rigRef.current;
      if (rig?.transferCarrier.parent) {
        rig.transferCarrier.parent.remove(rig.transferCarrier);
      }
      turtleOnBoatRef.current = false;
      turtleOnCarRef.current = false;
      turtleOnJetskiRef.current = false;
      turtleReturnedFromCarRef.current = false;
      turtleReturnedFromJetskiRef.current = false;
      turtleOnYachtRef.current = false;
      turtleReturnedFromYachtRef.current = false;
      turtleOnSafariCamelRef.current = false;
      boatTravelProgressRef.current = 0;
      carTravelProgressRef.current = 0;
      jetskiTravelProgressRef.current = 0;
      yachtTravelProgressRef.current = 0;
      safariCamelTravelProgressRef.current = 0;
      carPassState.yachtToSafariCamelTransfer = false;
      carPassState.yachtDockedAtEnd = false;
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
    turtleReturnedFromCarRef,
    turtleOnJetskiRef,
    jetskiTravelProgressRef,
    turtleReturnedFromJetskiRef,
    turtleOnYachtRef,
    yachtTravelProgressRef,
    turtleReturnedFromYachtRef,
    turtleOnSafariCamelRef,
    safariCamelTravelProgressRef,
  ]);

  useFrame((_, delta) => {
    void settingsRevision;
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

    const scene1Track = resolveScene1CamelTrack(
      scene,
      nodes,
      sceneFrame,
      {
        startInset: camelScrollSettings.startInset,
        endInset: camelScrollSettings.endInset,
        camelBoatMeetGap: camelScrollSettings.camelBoatMeetGap,
      },
      rig.boat,
    );
    if (scene1Track) {
      rig.startX = scene1Track.startX;
      rig.endX = scene1Track.endX;
      rig.progressAtStart = scene1Track.progressAtStart;
      rig.progressAtEnd = scene1Track.progressAtEnd;
      rig.desertScrollStart = scene1Track.desertScrollStart;
      rig.desertScrollEnd = scene1Track.desertScrollEnd;
    }

    if (sceneFrame) {
      if (!rig.boat) {
        rig.boat =
          resolveObject(
            scene,
            nodes,
            camelScrollSettings.boat,
            camelScrollSettings.boatBlender,
          ) ?? rig.boat;
      }
      if (!rig.car) {
        rig.car = findScrollCarBody(scene, nodes) ?? rig.car;
      }
      if (!rig.jetskiDriver) {
        rig.jetskiDriver =
          resolveObject(
            scene,
            nodes,
            jetskiScrollSettings.driver,
            jetskiScrollSettings.driverBlender,
          ) ?? rig.jetskiDriver;
      }
      if (!rig.yacht) {
        rig.yacht =
          resolveObject(
            scene,
            nodes,
            atlantisYachtScrollSettings.yacht,
            atlantisYachtScrollSettings.yachtBlender,
          ) ?? rig.yacht;
      }

      const carScroll = resolveCarScrollWindow(scene, nodes, sceneFrame);
      rig.carScrollStart = carScroll.carScrollStart;
      rig.carScrollEnd = carScroll.carScrollEnd;

      const jetskiScroll = resolveJetskiScrollWindow(scene, nodes, sceneFrame);
      rig.jetskiScrollStart = jetskiScroll.jetskiScrollStart;
      rig.jetskiScrollEnd = jetskiScroll.jetskiScrollEnd;
    }

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

    const targetCamelX = getCamelTrackWorldX(progress, rig);
    const camelLocked =
      rig.handoffCamelX !== null || rig.heldCamelX !== null;
    const camelX = camelLocked
      ? resolveCamelX(rig, targetCamelX)
      : targetCamelX;

    tempVec3.set(camelX, rig.baseWorldY, rig.baseWorldZ);
    setObjectWorldPosition(rig.carrier, tempVec3);
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
    if (rig.jetskiDriver) {
      rig.jetskiDriver.updateMatrixWorld(true);
    }
    if (rig.yacht) {
      rig.yacht.updateMatrixWorld(true);
    }

    const boatHasMoved = boatTravelProgressRef.current > 0.03;
    const boatAtDock = boatTravelProgressRef.current >= 0.94;
    const boatAtHandoff = boatTravelProgressRef.current <= 0.05;
    const transferStep = delta / camelScrollSettings.transferDuration;
    const carTransferStep = delta / carScrollSettings.transferDuration;
    const jetskiTransferStep = delta / jetskiScrollSettings.transferDuration;
    const yachtTransferStep =
      delta / (atlantisYachtScrollSettings.transferDuration ?? 1.85);
    const safariCamelTransferStep =
      delta / endCamelScrollSettings.transferDuration;

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
        carPassState.boatToCarTransfer = false;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnBoatRef.current = false;
        turtleOnCarRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.transferMode === "toJetski") {
      rig.transferProgress = Math.min(
        rig.transferProgress + jetskiTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnJetski(rig);
        rig.onJetski = true;
        rig.onCar = false;
        rig.transferMode = "idle";
        turtleOnJetskiRef.current = true;
        turtleOnCarRef.current = false;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnJetskiRef.current = false;
        turtleOnCarRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.transferMode === "toCarFromJetski") {
      rig.transferProgress = Math.min(
        rig.transferProgress + jetskiTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnCar(rig);
        rig.onCar = true;
        rig.onJetski = false;
        rig.transferMode = "idle";
        turtleOnCarRef.current = true;
        turtleOnJetskiRef.current = false;
        turtleReturnedFromJetskiRef.current = true;
        jetskiTravelProgressRef.current = 0;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnCarRef.current = false;
        turtleOnJetskiRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.transferMode === "toYacht") {
      rig.transferProgress = Math.min(
        rig.transferProgress + yachtTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnYacht(rig);
        rig.onYacht = true;
        rig.onJetski = false;
        rig.transferMode = "idle";
        turtleOnYachtRef.current = true;
        turtleOnJetskiRef.current = false;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnYachtRef.current = false;
        turtleOnJetskiRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.transferMode === "toJetskiFromYacht") {
      rig.transferProgress = Math.min(
        rig.transferProgress + yachtTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnJetski(rig);
        rig.onJetski = true;
        rig.onYacht = false;
        rig.transferMode = "idle";
        turtleOnJetskiRef.current = true;
        turtleOnYachtRef.current = false;
        turtleReturnedFromYachtRef.current = true;
        yachtTravelProgressRef.current = 0;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnJetskiRef.current = false;
        turtleOnYachtRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.transferMode === "toSafariCamel") {
      rig.transferProgress = Math.min(
        rig.transferProgress + safariCamelTransferStep,
        1,
      );

      updateTurtleTransferArc(rig, rig.transferProgress);

      if (rig.transferProgress >= 1) {
        mountTurtleOnSafariCamel(rig, scene, nodes);
        rig.onSafariCamel = true;
        rig.onYacht = false;
        rig.transferMode = "idle";
        turtleOnSafariCamelRef.current = true;
        turtleOnYachtRef.current = false;
        carPassState.yachtToSafariCamelTransfer = false;
        rig.reverseScrollHold = 0;
        rig.forwardScrollHold = 0;
      } else {
        turtleOnSafariCamelRef.current = false;
        turtleOnYachtRef.current = false;
      }
      rig.lastScrollProgress = progress;
      return;
    }

    const turtleInSafariCamelPhase = isTurtleInSafariCamelPhase(
      rig,
      turtleOnSafariCamelRef,
    );

    if (turtleInSafariCamelPhase && rig.transferMode === "idle") {
      if (!rig.safariCamel) {
        rig.safariCamel =
          resolveObject(
            scene,
            nodes,
            endCamelScrollSettings.body,
            endCamelScrollSettings.bodyBlender,
          ) ?? findObjectByNamePattern(scene, /camel\.?002/i);
      }
      mountTurtleOnSafariCamel(rig, scene, nodes);
      rig.onSafariCamel = true;
      rig.onYacht = false;
      rig.onJetski = false;
      rig.onCar = false;
      rig.onBoat = false;
      turtleOnSafariCamelRef.current = true;
      turtleOnYachtRef.current = false;
      turtleOnJetskiRef.current = false;
      turtleOnCarRef.current = false;
      turtleOnBoatRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    const turtleInJetskiPhase = isTurtleInJetskiPhase(
      rig,
      turtleOnJetskiRef,
      jetskiTravelProgressRef,
      turtleOnYachtRef,
      yachtTravelProgressRef,
      turtleOnSafariCamelRef,
    );

    if (turtleInJetskiPhase && rig.transferMode === "idle") {
      mountTurtleOnJetski(rig);
      rig.onJetski = true;
      rig.onCar = false;
      rig.onYacht = false;

      const atJetskiStart = jetskiTravelProgressRef.current <= 0.05;
      const atJetskiEnd = jetskiTravelProgressRef.current >= 0.94;
      const shouldReturnToCar =
        rig.car &&
        atJetskiStart &&
        rig.reverseScrollHold >= jetskiScrollSettings.reverseTransferScrollHold;

      if (shouldReturnToCar) {
        beginTransferToCarFromJetski(rig, scene);
        turtleOnJetskiRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      if (
        turtleReturnedFromYachtRef.current &&
        (rig.forwardScrollHold >= forwardTransferScrollHold || atJetskiStart)
      ) {
        turtleReturnedFromYachtRef.current = false;
      }

      const mayTransferJetskiToYacht =
        !scrollingBack &&
        rig.forwardScrollHold >= forwardTransferScrollHold &&
        !turtleReturnedFromYachtRef.current;

      if (atJetskiEnd && mayTransferJetskiToYacht && rig.yacht) {
        beginTransferToYacht(rig, scene);
        turtleOnJetskiRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      turtleOnJetskiRef.current = true;
      turtleOnCarRef.current = false;
      turtleOnBoatRef.current = false;
      turtleOnYachtRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    const turtleInYachtPhase = isTurtleInYachtPhase(
      rig,
      turtleOnYachtRef,
      yachtTravelProgressRef,
      turtleOnSafariCamelRef,
    );

    if (turtleInYachtPhase && rig.transferMode === "idle") {
      mountTurtleOnYacht(rig);
      rig.onYacht = true;
      rig.onJetski = false;
      rig.onCar = false;

      const atYachtStart = yachtTravelProgressRef.current <= 0.05;
      const atYachtEnd = yachtTravelProgressRef.current >= 0.94;
      const shouldReturnToJetski =
        rig.jetskiDriver &&
        atYachtStart &&
        rig.reverseScrollHold >=
          (atlantisYachtScrollSettings.reverseTransferScrollHold ?? 0.15);

      if (shouldReturnToJetski) {
        beginTransferToJetskiFromYacht(rig, scene);
        turtleOnYachtRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      const mayTransferYachtToSafariCamel =
        !scrollingBack &&
        rig.forwardScrollHold >= forwardTransferScrollHold;

      if (!rig.safariCamel) {
        rig.safariCamel =
          resolveObject(
            scene,
            nodes,
            endCamelScrollSettings.body,
            endCamelScrollSettings.bodyBlender,
          ) ?? findObjectByNamePattern(scene, /camel\.?002/i);
      }

      if (atYachtEnd && mayTransferYachtToSafariCamel && rig.safariCamel) {
        beginTransferToSafariCamel(rig, scene);
        turtleOnYachtRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      turtleOnYachtRef.current = true;
      turtleOnJetskiRef.current = false;
      turtleOnCarRef.current = false;
      turtleOnBoatRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    const turtleInCarPhase = isTurtleInCarPhase(
      rig,
      turtleOnCarRef,
      carTravelProgressRef,
      turtleOnJetskiRef,
      jetskiTravelProgressRef,
      turtleOnYachtRef,
      yachtTravelProgressRef,
      turtleOnSafariCamelRef,
    );

    if (turtleInCarPhase && rig.transferMode === "idle") {
      mountTurtleOnCar(rig);
      rig.onCar = true;
      rig.onBoat = false;
      rig.onJetski = false;
      rig.onYacht = false;

      const atCarStart = carTravelProgressRef.current <= 0.05;
      const atCarEnd = carTravelProgressRef.current >= 0.94;

      if (
        turtleReturnedFromJetskiRef.current &&
        (rig.forwardScrollHold >= forwardTransferScrollHold || atCarStart)
      ) {
        turtleReturnedFromJetskiRef.current = false;
      }

      const mayTransferCarToJetski =
        !scrollingBack &&
        rig.forwardScrollHold >= forwardTransferScrollHold &&
        !turtleReturnedFromJetskiRef.current;

      if (atCarEnd && mayTransferCarToJetski && rig.jetskiDriver) {
        beginTransferToJetski(rig, scene);
        turtleOnCarRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      const shouldReturnToBoat =
        rig.boat &&
        atCarStart &&
        rig.reverseScrollHold >= carScrollSettings.reverseTransferScrollHold;

      if (shouldReturnToBoat) {
        beginTransferToBoatFromCar(rig, scene);
        turtleOnCarRef.current = false;
        rig.lastScrollProgress = progress;
        return;
      }

      turtleOnCarRef.current = true;
      turtleOnBoatRef.current = false;
      turtleOnJetskiRef.current = false;
      turtleOnYachtRef.current = false;
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
    const scene1TravelT = getScene1TravelProgress(progress, rig);
    const atScene1Handoff = scene1TravelT >= 0.9;

    if (rig.mount === "boat" && !rig.onBoat && transferTriggerT > 0 && !boatHasMoved) {
      rig.onBoat = true;
    }
    if (rig.mount === "camel" && rig.onBoat && rig.transferMode === "idle") {
      rig.onBoat = false;
    }

    if (
      turtleReturnedFromCarRef.current &&
      (rig.forwardScrollHold >= forwardTransferScrollHold || boatAtHandoff)
    ) {
      turtleReturnedFromCarRef.current = false;
    }

    const mayTransferBoatToCar =
      !scrollingBack &&
      rig.forwardScrollHold >= forwardTransferScrollHold &&
      !turtleReturnedFromCarRef.current &&
      !turtleReturnedFromJetskiRef.current &&
      !turtleReturnedFromYachtRef.current &&
      !isTurtleInYachtPhase(rig, turtleOnYachtRef, yachtTravelProgressRef, turtleOnSafariCamelRef) &&
      !isTurtleInJetskiPhase(
        rig,
        turtleOnJetskiRef,
        jetskiTravelProgressRef,
        turtleOnYachtRef,
        yachtTravelProgressRef,
        turtleOnSafariCamelRef,
      ) &&
      !isTurtleInCarPhase(
        rig,
        turtleOnCarRef,
        carTravelProgressRef,
        turtleOnJetskiRef,
        jetskiTravelProgressRef,
        turtleOnYachtRef,
        yachtTravelProgressRef,
        turtleOnSafariCamelRef,
      );

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
      !isTurtleInYachtPhase(rig, turtleOnYachtRef, yachtTravelProgressRef, turtleOnSafariCamelRef) &&
      !isTurtleInCarPhase(
        rig,
        turtleOnCarRef,
        carTravelProgressRef,
        turtleOnJetskiRef,
        jetskiTravelProgressRef,
        turtleOnYachtRef,
        yachtTravelProgressRef,
        turtleOnSafariCamelRef,
      )
    ) {
      if (rig.handoffCamelX === null) {
        lockCamelAtHandoff(rig);
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
      !rig.onBoat &&
      rig.turtle.parent === rig.transferCarrier
    ) {
      mountTurtleOnCamel(rig, true);
    }

    if (
      rig.transferMode === "idle" &&
      !rig.onBoat &&
      !rig.suppressForwardTransfer &&
      (transferTriggerT > 0 ||
        (atScene1Handoff &&
          !scrollingBack &&
          rig.forwardScrollHold >= forwardTransferScrollHold * 0.35))
    ) {
      beginForwardTransfer(rig, scene);
    }

    if (
      rig.transferMode === "idle" &&
      rig.onBoat &&
      boatAtHandoff &&
      scrollingBack &&
      rig.reverseScrollHold >= reverseTransferScrollHold
    ) {
      beginReverseTransfer(rig, scene);
      turtleOnBoatRef.current = false;
    }

    if (rig.transferMode === "toBoat") {
      const shouldReverseArc =
        scrollingBack &&
        rig.reverseScrollHold >= reverseTransferScrollHold * 0.35;

      if (shouldReverseArc && rig.transferProgress < 0.08) {
        if (rig.heldCamelX === null) {
          rig.heldCamelX =
            rig.handoffCamelX ?? getHandoffMeetX(rig);
        }
        rig.transferMode = "toCamel";
      } else {
        rig.transferProgress = Math.min(rig.transferProgress + transferStep, 1);
        updateTurtleTransferArc(rig, rig.transferProgress);

        if (rig.transferProgress >= 1) {
          mountTurtleOnBoat(rig);
          rig.onBoat = true;
          rig.transferMode = "idle";
          if (rig.handoffCamelX === null) {
            lockCamelAtHandoff(rig);
          }
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
        lockCamelAtHandoff(rig);
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

    if (rig.mount === "jetski") {
      mountTurtleOnJetski(rig);
      rig.onJetski = true;
      turtleOnJetskiRef.current = true;
      turtleOnCarRef.current = false;
      turtleOnBoatRef.current = false;
      turtleOnYachtRef.current = false;
      rig.lastScrollProgress = progress;
      return;
    }

    if (rig.mount === "yacht") {
      mountTurtleOnYacht(rig);
      rig.onYacht = true;
      turtleOnYachtRef.current = true;
      turtleOnJetskiRef.current = false;
      turtleOnCarRef.current = false;
      turtleOnBoatRef.current = false;
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
    if (!rig.onCar && carTravelProgressRef.current <= 0.01) {
      turtleOnBoatRef.current = false;
      turtleOnCarRef.current = false;
    }

    rig.lastScrollProgress = progress;
  });

  return null;
}
