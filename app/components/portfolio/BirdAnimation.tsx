"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { birdAnimationSettings } from "@/app/config/birdAnimationSettings";
import { findSceneObject, getObjectBounds } from "./sceneObjectUtils";

type FlightBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorTop: number;
};

type BirdConfig = (typeof birdAnimationSettings.birds)[number];

type BirdRig = {
  root: THREE.Group;
  orient: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  lapDuration: number;
  phaseOffset: number;
  heightOffset: number;
  z: number;
  bobAmplitude: number;
  bobSpeed: number;
  zDrift: number;
  flapSpeed: number;
};

type BirdAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

function getFlapAngle(
  elapsed: number,
  flapSpeed: number,
  phaseOffset: number,
  upAngle: number,
  downAngle: number,
  downstrokePortion: number,
) {
  const cycle =
    ((elapsed * flapSpeed + phaseOffset) % (Math.PI * 2)) / (Math.PI * 2);

  if (cycle < downstrokePortion) {
    const t = cycle / downstrokePortion;
    return THREE.MathUtils.lerp(upAngle, downAngle, t * t);
  }

  const t = (cycle - downstrokePortion) / (1 - downstrokePortion);
  const eased = 1 - (1 - t) ** 2;
  return THREE.MathUtils.lerp(downAngle, upAngle, eased);
}

function getFlightBounds(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
): FlightBounds | null {
  const floor = findSceneObject(
    scene,
    nodes,
    birdAnimationSettings.openingFloor,
  );
  if (!floor) return null;

  const bounds = getObjectBounds(floor);
  const { pathInset } = birdAnimationSettings;

  return {
    minX: bounds.min.x + pathInset,
    maxX: bounds.max.x - pathInset,
    minZ: bounds.min.z + 0.4,
    maxZ: bounds.max.z - 0.4,
    floorTop: bounds.max.y,
  };
}

/** Smooth 0→1→0 patrol — eases in and out at each turn. */
function getPatrolProgress(
  elapsed: number,
  lapDuration: number,
  phaseOffset: number,
) {
  const angle = ((elapsed + phaseOffset) / lapDuration) * Math.PI * 2;
  return (Math.sin(angle) + 1) * 0.5;
}

/** One half of the simple gull V — pivots from the center notch. */
function createHalfWingGeometry(mirror: boolean) {
  const shape = new THREE.Shape();
  const sx = mirror ? -1 : 1;

  shape.moveTo(0, -0.03);
  shape.bezierCurveTo(sx * 0.1, 0.13, sx * 0.36, 0.08, sx * 0.4, 0.01);
  shape.bezierCurveTo(sx * 0.2, 0.04, sx * 0.06, 0, 0, -0.03);

  return new THREE.ShapeGeometry(shape, 8);
}

function createBirdRig(index: number, config: BirdConfig): BirdRig {
  const root = new THREE.Group();
  root.name = `Bird_${index + 1}`;
  root.scale.setScalar(config.scale);

  const orient = new THREE.Group();
  const leftWingPivot = new THREE.Group();
  const rightWingPivot = new THREE.Group();

  const material = new THREE.MeshBasicMaterial({
    color: birdAnimationSettings.birdColor,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const leftWing = new THREE.Mesh(createHalfWingGeometry(false), material);
  const rightWing = new THREE.Mesh(createHalfWingGeometry(true), material);

  leftWingPivot.add(leftWing);
  rightWingPivot.add(rightWing);
  orient.add(leftWingPivot, rightWingPivot);
  root.add(orient);

  return {
    root,
    orient,
    leftWingPivot,
    rightWingPivot,
    lapDuration: config.lapDuration,
    phaseOffset: config.phaseOffset,
    heightOffset: config.heightOffset,
    z: config.z,
    bobAmplitude: config.bobAmplitude,
    bobSpeed: config.bobSpeed,
    zDrift: config.zDrift,
    flapSpeed: config.flapSpeed,
  };
}

function faceCamera(orient: THREE.Group, camera: THREE.Camera) {
  const world = new THREE.Vector3();
  orient.getWorldPosition(world);
  const dx = camera.position.x - world.x;
  const dz = camera.position.z - world.z;
  orient.rotation.set(0, Math.atan2(dx, dz), 0);
}

function updateBirdFlight(
  bird: BirdRig,
  bounds: FlightBounds,
  elapsed: number,
) {
  const progress = getPatrolProgress(
    elapsed,
    bird.lapDuration,
    bird.phaseOffset,
  );
  const x = THREE.MathUtils.lerp(bounds.minX, bounds.maxX, progress);

  const bob =
    Math.sin(elapsed * bird.bobSpeed + bird.phaseOffset * 0.65) *
    bird.bobAmplitude;
  const zWobble =
    Math.sin(elapsed * 0.38 + bird.phaseOffset * 1.15) * bird.zDrift;

  const y = bounds.floorTop + bird.heightOffset + bob;
  const z = THREE.MathUtils.clamp(
    bird.z + zWobble,
    bounds.minZ,
    bounds.maxZ,
  );

  bird.root.position.set(x, y, z);
}

export default function BirdAnimation({ scene, nodes }: BirdAnimationProps) {
  const birdsRef = useRef<BirdRig[]>([]);
  const boundsRef = useRef<FlightBounds | null>(null);
  const flockRef = useRef<THREE.Group | null>(null);
  const elapsedRef = useRef(0);

  useLayoutEffect(() => {
    const existingFlock = scene.getObjectByName("Scene1BirdFlock");
    existingFlock?.removeFromParent();

    const bounds = getFlightBounds(scene, nodes);
    if (!bounds) {
      birdsRef.current = [];
      boundsRef.current = null;
      if (process.env.NODE_ENV === "development") {
        console.warn("[BirdAnimation] Missing scene 1 floor:", {
          openingFloor: birdAnimationSettings.openingFloor,
        });
      }
      return;
    }

    const flock = new THREE.Group();
    flock.name = "Scene1BirdFlock";
    scene.add(flock);
    flockRef.current = flock;

    const birds = birdAnimationSettings.birds.map((config, index) => {
      const rig = createBirdRig(index, config);
      flock.add(rig.root);
      return rig;
    });

    birdsRef.current = birds;
    boundsRef.current = bounds;

    if (process.env.NODE_ENV === "development") {
      console.info("[BirdAnimation] Ready:", {
        count: birds.length,
        bounds,
      });
    }

    return () => {
      flock.removeFromParent();
      flockRef.current = null;
      birdsRef.current = [];
      boundsRef.current = null;
    };
  }, [scene, nodes]);

  useFrame((state, delta) => {
    const bounds = boundsRef.current;
    const birds = birdsRef.current;
    if (!bounds || !birds.length) return;

    elapsedRef.current += delta;
    const elapsed = elapsedRef.current;
    const { wingUpAngle, wingDownAngle, downstrokePortion } =
      birdAnimationSettings;

    for (const bird of birds) {
      if (!bird.leftWingPivot || !bird.rightWingPivot || !bird.orient || !bird.root) {
        continue;
      }

      updateBirdFlight(bird, bounds, elapsed);
      faceCamera(bird.orient, state.camera);

      const flapAngle = getFlapAngle(
        elapsed,
        bird.flapSpeed,
        bird.phaseOffset,
        wingUpAngle,
        wingDownAngle,
        downstrokePortion,
      );
      bird.leftWingPivot.rotation.z = flapAngle;
      bird.rightWingPivot.rotation.z = -flapAngle;
    }
  });

  return null;
}
