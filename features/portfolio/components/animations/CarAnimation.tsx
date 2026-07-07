import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { carAnimationSettings } from "@features/portfolio/config/carAnimationSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type CarTrack = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  roadMinX: number;
  roadMaxX: number;
};

type AnimatedCar = {
  id: string;
  mesh: THREE.Object3D;
  carrier: THREE.Group;
  lapDuration: number;
  phaseOffset: number;
};

type CarAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

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

function getCarTrack(
  sceneStart: THREE.Object3D,
  road: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
) {
  const startBox = getObjectBounds(sceneStart);
  const roadBox = getObjectBounds(road);
  const { startInset, endInset } = carAnimationSettings;

  const roadMinX = roadBox.min.x + endInset;
  const roadMaxX = roadBox.max.x - endInset;
  const entranceX = startBox.max.x - startInset;

  const startX = THREE.MathUtils.clamp(entranceX, roadMinX, roadMaxX);
  /** West end of the road — cars travel east → west (high X → low X). */
  const endX = roadMinX;

  const start = new THREE.Vector3(startX, carrierY, carrierZ);
  const end = new THREE.Vector3(endX, carrierY, carrierZ);

  return { start, end, roadMinX, roadMaxX, startBox, roadBox };
}

function getLoopProgress(
  elapsed: number,
  lapDuration: number,
  phaseOffset: number,
) {
  return ((elapsed + phaseOffset) % lapDuration) / lapDuration;
}

export default function CarAnimation({ scene, nodes }: CarAnimationProps) {
  const carsRef = useRef<AnimatedCar[]>([]);
  const trackRef = useRef<CarTrack | null>(null);
  const elapsedRef = useRef(0);
  const tempPositionRef = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    if (initializedRef.current) return;

    scene.updateMatrixWorld(true);

    const sceneStart = resolveObject(
      scene,
      nodes,
      carAnimationSettings.sceneStart,
      carAnimationSettings.sceneStartBlender,
    );
    const road = resolveObject(
      scene,
      nodes,
      carAnimationSettings.road,
      carAnimationSettings.roadBlender,
    );

    if (!sceneStart || !road) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[CarAnimation] Missing track markers:", {
          sceneStart: carAnimationSettings.sceneStart,
          startFound: Boolean(sceneStart),
          road: carAnimationSettings.road,
          roadFound: Boolean(road),
        });
      }
      return;
    }

    const animatedCars: AnimatedCar[] = [];

    for (const carConfig of carAnimationSettings.cars) {
      const car = resolveObject(
        scene,
        nodes,
        carConfig.objectName,
        carConfig.objectBlender,
      );
      if (!car) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[CarAnimation] Missing car:", carConfig.objectName);
        }
        continue;
      }

      const carrier = attachAnimationCarrier(car, carConfig.carrierName);
      animatedCars.push({
        id: carConfig.id,
        mesh: car,
        carrier,
        lapDuration: carConfig.lapDuration,
        phaseOffset: carConfig.phaseOffset,
      });
    }

    if (!animatedCars.length) return;

    const leadCarrier = animatedCars[0].carrier;
    const { start, end, roadMinX, roadMaxX, startBox, roadBox } = getCarTrack(
      sceneStart,
      road,
      leadCarrier.position.y,
      leadCarrier.position.z,
    );

    trackRef.current = { start, end, roadMinX, roadMaxX };
    carsRef.current = animatedCars;
    initializedRef.current = true;

    for (const { carrier, lapDuration, phaseOffset } of animatedCars) {
      const t = getLoopProgress(0, lapDuration, phaseOffset);
      tempPositionRef.current.copy(start).lerp(end, t);
      carrier.position.copy(tempPositionRef.current);
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[CarAnimation] Ready:", {
        cars: animatedCars.map((entry) => entry.mesh.name),
        start: start.toArray(),
        end: end.toArray(),
        sceneStartX: [startBox.min.x, startBox.max.x],
        roadX: [roadBox.min.x, roadBox.max.x],
        clampedX: [roadMinX, roadMaxX],
      });
    }
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const track = trackRef.current;
    const cars = carsRef.current;
    if (!track || !cars.length) return;

    elapsedRef.current += delta;

    for (const { carrier, lapDuration, phaseOffset } of cars) {
      const t = getLoopProgress(
        elapsedRef.current,
        lapDuration,
        phaseOffset,
      );
      tempPositionRef.current.copy(track.start).lerp(track.end, t);
      tempPositionRef.current.x = THREE.MathUtils.clamp(
        tempPositionRef.current.x,
        track.roadMinX,
        track.roadMaxX,
      );
      carrier.position.copy(tempPositionRef.current);
    }
  });

  return null;
}
