"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { metroTrainSettings } from "@/app/config/metroTrainSettings";

type MetroBounds = {
  start: THREE.Vector3;
  end: THREE.Vector3;
};

type MetroTrainAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

// normalizeObjectName - normalize the name of the object
function normalizeObjectName(name: string) {
  return name.replace(/\./g, "").toLowerCase();
}

// findMetroObject - find the metro object in the scene
function findMetroObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D> | undefined,
  name: string,
) {
  const fromNodes = nodes?.[name];
  if (fromNodes) return fromNodes;

  const fromScene = scene.getObjectByName(name);
  if (fromScene) return fromScene;

  const normalized = normalizeObjectName(name);
  let match: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (match || !child.name) return;
    if (
      child.name === name ||
      normalizeObjectName(child.name) === normalized
    ) {
      match = child;
    }
  });
  return match;
}

// attachTrainCarrier is a function that attaches the train carrier to the train.
function attachTrainCarrier(train: THREE.Object3D) {
  if (train.parent?.name === "MetroTrainCarrier") {
    return train.parent as THREE.Group;
  }

  train.updateMatrixWorld(true);

  const parent = train.parent;
  if (!parent) {
    throw new Error("Metro train must have a parent in the scene graph");
  }

  parent.updateMatrixWorld(true);

  const worldMatrix = train.matrixWorld.clone();
  const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const localMatrix = worldMatrix.premultiply(parentInverse);

  const carrier = new THREE.Group();
  carrier.name = "MetroTrainCarrier";
  localMatrix.decompose(
    carrier.position,
    carrier.quaternion,
    carrier.scale,
  );

  parent.add(carrier);
  parent.remove(train);
  carrier.add(train);

  train.position.set(0, 0, 0);
  train.rotation.set(0, 0, 0);
  train.scale.set(1, 1, 1);

  return carrier;
}

function getTrainHalfLength(train: THREE.Object3D) {
  train.updateMatrixWorld(true);
  const trainBox = new THREE.Box3().setFromObject(train);
  return (trainBox.max.x - trainBox.min.x) / 2;
}

// getTrackEndpoints is a function that returns the start and end positions of the train along the track.
function getTrackEndpoints(
  leftStation: THREE.Object3D,
  rightStation: THREE.Object3D,
  train: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
) {
  leftStation.updateMatrixWorld(true);
  rightStation.updateMatrixWorld(true);

  const leftBox = new THREE.Box3().setFromObject(leftStation);
  const rightBox = new THREE.Box3().setFromObject(rightStation);
  const { startInset, endInset } = metroTrainSettings;
  const trainHalfLength = getTrainHalfLength(train);

  const start = new THREE.Vector3(
    leftBox.min.x + startInset + trainHalfLength,
    carrierY,
    carrierZ,
  );
  const end = new THREE.Vector3(
    rightBox.max.x - endInset - trainHalfLength,
    carrierY,
    carrierZ,
  );

  return { start, end, leftBox, rightBox };
}

function getBridgeTrackEndpoints(
  bridge: THREE.Object3D,
  train: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
) {
  bridge.updateMatrixWorld(true);

  const bridgeBox = new THREE.Box3().setFromObject(bridge);
  const bridgeInset = metroTrainSettings.bridgeInset;
  const trainHalfLength = getTrainHalfLength(train);

  const start = new THREE.Vector3(
    bridgeBox.min.x + bridgeInset + trainHalfLength,
    carrierY,
    carrierZ,
  );
  const end = new THREE.Vector3(
    bridgeBox.max.x - bridgeInset - trainHalfLength,
    carrierY,
    carrierZ,
  );

  return { start, end, bridgeBox };
}

// getPingPongProgress is a function that returns a number between 0 and 1 that represents the progress of the train along the track.
function getPingPongProgress(
  elapsed: number,
  legDuration: number,
  pause: number,
): number {
  const legTime = legDuration + pause;
  const cycleTime = legTime * 2;
  const cyclePosition = elapsed % cycleTime;

  if (cyclePosition < legTime) {
    const moving = cyclePosition <= legDuration;
    return moving ? cyclePosition / legDuration : 1;
  }

  const returnPosition = cyclePosition - legTime;
  const moving = returnPosition <= legDuration;
  return moving ? 1 - returnPosition / legDuration : 0;
}

// MetroTrainAnimation is a component that animates the metro train along the track.
export default function MetroTrainAnimation({
  scene,
  nodes,
}: MetroTrainAnimationProps) {
  const carrierRef = useRef<THREE.Group | null>(null);
  const boundsRef = useRef<MetroBounds | null>(null);
  const elapsedRef = useRef(0);
  const tempPositionRef = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const train = findMetroObject(scene, nodes, metroTrainSettings.train);
    const leftStation = findMetroObject(
      scene,
      nodes,
      metroTrainSettings.stationLeft,
    );
    const rightStation = findMetroObject(
      scene,
      nodes,
      metroTrainSettings.stationRight,
    );
    const bridge = findMetroObject(scene, nodes, metroTrainSettings.bridge);

    if (!train || (!leftStation || !rightStation) && !bridge) {
      if (process.env.NODE_ENV === "development") {
        const metroLike: string[] = [];
        scene.traverse((child) => {
          if (/metro|station|train/i.test(child.name)) {
            metroLike.push(child.name);
          }
        });
        console.warn("[MetroTrainAnimation] Missing metro assets:", {
          train: metroTrainSettings.train,
          trainFound: Boolean(train),
          leftStation: metroTrainSettings.stationLeft,
          leftFound: Boolean(leftStation),
          rightStation: metroTrainSettings.stationRight,
          rightFound: Boolean(rightStation),
          bridge: metroTrainSettings.bridge,
          bridgeFound: Boolean(bridge),
          metroLike,
        });
      }
      return;
    }

    if (carrierRef.current) return;

    const carrier = attachTrainCarrier(train);
    const fallbackToBridge = !leftStation || !rightStation;
    const { start, end, leftBox, rightBox, bridgeBox } = fallbackToBridge
      ? {
          ...getBridgeTrackEndpoints(
            bridge as THREE.Object3D,
            train,
            carrier.position.y,
            carrier.position.z,
          ),
          leftBox: null,
          rightBox: null,
        }
      : {
          ...getTrackEndpoints(
            leftStation as THREE.Object3D,
            rightStation as THREE.Object3D,
            train,
            carrier.position.y,
            carrier.position.z,
          ),
          bridgeBox: null,
        };

    carrierRef.current = carrier;
    boundsRef.current = { start, end };
    carrier.position.copy(start);

    if (process.env.NODE_ENV === "development") {
      console.info("[MetroTrainAnimation] Ready:", {
        train: train.name,
        start: start.toArray(),
        end: end.toArray(),
        mode: fallbackToBridge ? "bridge-fallback" : "station-to-station",
        leftStationX: leftBox ? [leftBox.min.x, leftBox.max.x] : null,
        rightStationX: rightBox ? [rightBox.min.x, rightBox.max.x] : null,
        bridgeX: bridgeBox ? [bridgeBox.min.x, bridgeBox.max.x] : null,
      });
    }
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const carrier = carrierRef.current;
    const bounds = boundsRef.current;
    if (!carrier || !bounds) return;

    elapsedRef.current += delta;

    const t = getPingPongProgress(
      elapsedRef.current,
      metroTrainSettings.legDuration,
      metroTrainSettings.pauseAtStation,
    );

    tempPositionRef.current.copy(bounds.start).lerp(bounds.end, t);
    carrier.position.copy(tempPositionRef.current);
  });

  return null;
}
