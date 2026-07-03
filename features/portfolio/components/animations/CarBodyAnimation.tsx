import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
  carBodyAnimationSettings,
  type CarBodyWheelSettings,
} from "@features/portfolio/config/carBodyAnimationSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type CarBodyAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type WheelRig = {
  wheel: THREE.Object3D;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
  spinDirection: 1 | -1;
};

type CarRig = {
  carrier: THREE.Group;
  wheels: WheelRig[];
  lastX: number;
};

const tempPosition = new THREE.Vector3();
const tempCarrierOffset = new THREE.Vector3();
const tempEuler = new THREE.Euler();

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

function getLoopProgress(
  elapsed: number,
  lapDuration: number,
  phaseOffset: number,
) {
  return ((elapsed + phaseOffset) % lapDuration) / lapDuration;
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
    start: new THREE.Vector3(
      startX,
      roadCenter.y + roadOffset.y,
      roadCenter.z + roadOffset.z,
    ),
    end: new THREE.Vector3(
      endX,
      roadCenter.y + roadOffset.y,
      roadCenter.z + roadOffset.z,
    ),
    roadBox,
  };
}

function applyWheelOffsets(
  pivot: THREE.Group,
  config: CarBodyWheelSettings,
) {
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
  const hubCenter = new THREE.Vector3();
  getObjectBounds(wheel).getCenter(hubCenter);
  pivot.worldToLocal(hubCenter);
  wheel.position.sub(hubCenter);
  pivot.position.add(hubCenter);
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
): CarRig | null {
  const { wheels: wheelSettings, carrierName } = carBodyAnimationSettings;

  scene.updateMatrixWorld(true);

  const body = resolveObject(
    scene,
    nodes,
    carBodyAnimationSettings.body,
    carBodyAnimationSettings.bodyBlender,
  );
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

  if (!body?.parent) {
    return null;
  }

  const carrier =
    body.parent.name === carrierName
      ? (body.parent as THREE.Group)
      : attachAnimationCarrier(body, carrierName);

  const wheels: WheelRig[] = [];

  if (frontWheel && frontWheel.parent?.name !== wheelSettings.front.pivotName) {
    wheels.push(mountWheelOnCarrier(carrier, frontWheel, wheelSettings.front));
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

  return {
    carrier,
    wheels,
    lastX: carrier.position.x,
  };
}

export default function CarBodyAnimation({
  scene,
  nodes,
}: CarBodyAnimationProps) {
  const rigRef = useRef<CarRig | null>(null);
  const roadRef = useRef<THREE.Object3D | null>(null);
  const elapsedRef = useRef(0);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const { track } = carBodyAnimationSettings;
    const road = resolveObject(scene, nodes, track.road, track.roadBlender);

    if (!rigRef.current) {
      rigRef.current = buildRig(scene, nodes);
    }

    if (!road || !rigRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[CarBodyAnimation] Setup failed:", {
          road: track.road,
          roadBlender: track.roadBlender,
          roadFound: road?.name ?? null,
          body: resolveObject(
            scene,
            nodes,
            carBodyAnimationSettings.body,
            carBodyAnimationSettings.bodyBlender,
          )?.name ?? null,
        });
      }
      return;
    }

    roadRef.current = road;
    rigRef.current.carrier.visible = true;

    if (process.env.NODE_ENV === "development") {
      const { start, end, roadBox } = getRoadTrack(
        road,
        track.startInset,
        track.endInset,
        track.roadOffset,
      );
      console.info("[CarBodyAnimation] Ready:", {
        body: rigRef.current.carrier.children.find((child) =>
          child.name.toLowerCase().includes("carboady"),
        )?.name,
        wheels: rigRef.current.wheels.map((entry) => entry.wheel.name),
        road: road.name,
        roadX: [roadBox.min.x, roadBox.max.x],
        start: start.toArray(),
        end: end.toArray(),
        roadOffset: track.roadOffset,
        carrierOffset: carBodyAnimationSettings.carrierOffset,
      });
    }
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const road = roadRef.current;
    const rig = rigRef.current;
    if (!road || !rig) return;

    const { track, lapDuration, phaseOffset, carrierOffset } =
      carBodyAnimationSettings;
    const { start, end } = getRoadTrack(
      road,
      track.startInset,
      track.endInset,
      track.roadOffset,
    );

    elapsedRef.current += delta;

    const t = getLoopProgress(elapsedRef.current, lapDuration, phaseOffset);
    tempPosition
      .copy(start)
      .lerp(end, t)
      .add(
        tempCarrierOffset.set(
          carrierOffset.x,
          carrierOffset.y,
          carrierOffset.z,
        ),
      );
    rig.carrier.position.copy(tempPosition);

    const deltaX = Math.abs(tempPosition.x - rig.lastX);
    for (const wheelRig of rig.wheels) {
      const spin = deltaX * wheelRig.spinSpeed * wheelRig.spinDirection;
      wheelRig.wheel.rotateOnAxis(wheelRig.spinAxis, -spin);
    }

    rig.lastX = tempPosition.x;
  });

  return null;
}
