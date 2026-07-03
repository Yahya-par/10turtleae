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
};

type AnimatedCar = {
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

// getCarTrack is a function that returns the start and end positions of the cars along the track.
function getCarTrack(
  sceneStart: THREE.Object3D,
  sceneEnd: THREE.Object3D,
  roadEnd: THREE.Object3D | null,
  carrierY: number,
  carrierZ: number,
) {
  const startBox = getObjectBounds(sceneStart);
  const endBox = getObjectBounds(sceneEnd);
  const roadBox = roadEnd ? getObjectBounds(roadEnd) : null;
  const { startInset, endInset } = carAnimationSettings;

  // Dubai Frame (scene 3) → Burj Al Arab (scene 7 / floor 005).
  // Start at scene entrance (max X); end at last road segment before Atlantis.
  const startX = startBox.max.x - startInset;
  const endX = roadBox
    ? roadBox.min.x + endInset
    : endBox.min.x + endInset;

  const start = new THREE.Vector3(startX, carrierY, carrierZ);
  const end = new THREE.Vector3(endX, carrierY, carrierZ);

  return { start, end, startBox, endBox, roadBox };
}

//getLoopProgress is a function that returns a number between 0 and 1 that represents the progress of the car along the track.
function getLoopProgress(
  elapsed: number,
  lapDuration: number,
  phaseOffset: number,
) {
  return ((elapsed + phaseOffset) % lapDuration) / lapDuration;
}

// CarAnimation is a component that animates the cars along the track.
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
    const sceneEnd = resolveObject(
      scene,
      nodes,
      carAnimationSettings.sceneEnd,
      carAnimationSettings.sceneEndBlender,
    );
    const roadEnd = resolveObject(
      scene,
      nodes,
      carAnimationSettings.roadEnd,
      carAnimationSettings.roadEndBlender,
    );

    if (!sceneStart || !sceneEnd) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[CarAnimation] Missing track markers:", {
          sceneStart: carAnimationSettings.sceneStart,
          sceneStartBlender: carAnimationSettings.sceneStartBlender,
          startFound: Boolean(sceneStart),
          sceneEnd: carAnimationSettings.sceneEnd,
          sceneEndBlender: carAnimationSettings.sceneEndBlender,
          endFound: Boolean(sceneEnd),
          roadEnd: carAnimationSettings.roadEnd,
          roadFound: Boolean(roadEnd),
        });
      }
      return;
    }

    const animatedCars: AnimatedCar[] = [];

    for (const carConfig of carAnimationSettings.cars) {
      const car = findSceneObject(scene, nodes, carConfig.objectName);
      if (!car) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[CarAnimation] Missing car:", carConfig.objectName);
        }
        continue;
      }

      const carrier = attachAnimationCarrier(car, carConfig.carrierName);
      animatedCars.push({
        carrier,
        lapDuration: carConfig.lapDuration,
        phaseOffset: carConfig.phaseOffset,
      });
    }

    if (!animatedCars.length) return;

    const leadCarrier = animatedCars[0].carrier;
    const { start, end, startBox, endBox, roadBox } = getCarTrack(
      sceneStart,
      sceneEnd,
      roadEnd,
      leadCarrier.position.y,
      leadCarrier.position.z,
    );

    trackRef.current = { start, end };
    carsRef.current = animatedCars;
    initializedRef.current = true;

    for (const { carrier, lapDuration, phaseOffset } of animatedCars) {
      const t = getLoopProgress(0, lapDuration, phaseOffset);
      tempPositionRef.current.copy(start).lerp(end, t);
      carrier.position.copy(tempPositionRef.current);
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[CarAnimation] Ready:", {
        cars: animatedCars.map((entry) => entry.carrier.children[0]?.name),
        start: start.toArray(),
        end: end.toArray(),
        sceneStartX: [startBox.min.x, startBox.max.x],
        sceneEndX: [endBox.min.x, endBox.max.x],
        roadEndX: roadBox ? [roadBox.min.x, roadBox.max.x] : null,
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
      carrier.position.copy(tempPositionRef.current);
    }
  });

  return null;
}
