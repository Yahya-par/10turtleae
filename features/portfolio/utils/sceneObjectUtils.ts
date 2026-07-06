import * as THREE from "three";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

export function normalizeObjectName(name: string) {
  return name.replace(/\./g, "").toLowerCase();
}

const SCENE_FLOOR_PATTERN =
  /^(Desert_Scene_Floor|Fourth_Scene_Floor|continuefloor)/i;

function lookupByName(
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

// findSceneObject - find the scene object in the scene by name
export function findSceneObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D> | undefined,
  name: string,
  ...aliases: string[]
) {
  for (const candidate of [name, ...aliases]) {
    const found = lookupByName(scene, nodes, candidate);
    if (found) return found;
  }
  return null;
}

/** First object whose name matches a regex (depth-first). */
export function findObjectByNamePattern(
  scene: THREE.Object3D,
  pattern: RegExp,
) {
  let match: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (match || !child.name) return;
    if (pattern.test(child.name)) {
      match = child;
    }
  });
  return match;
}

export function listSceneFloors(scene: THREE.Object3D) {
  const floors: THREE.Object3D[] = [];
  scene.traverse((child) => {
    if (child.name && SCENE_FLOOR_PATTERN.test(child.name)) {
      floors.push(child);
    }
  });
  return floors;
}

/** Pick the scene floor panel at the far east (opening) or west (deep) edge. */
export function findSceneFloorByExtent(
  scene: THREE.Object3D,
  edge: "min" | "max",
) {
  let best: THREE.Object3D | null = null;
  let bestX = edge === "max" ? -Infinity : Infinity;

  for (const floor of listSceneFloors(scene)) {
    const bounds = getObjectBounds(floor);
    const x = edge === "max" ? bounds.max.x : bounds.min.x;
    if ((edge === "max" && x > bestX) || (edge === "min" && x < bestX)) {
      bestX = x;
      best = floor;
    }
  }

  return best;
}

/** Scene 1 continuity panel — primary bounds reference in Modelv1. */
export function findScene1ContinuityFloor(
  scene: THREE.Object3D,
  nodes?: Record<string, THREE.Object3D>,
) {
  return (
    findSceneObject(
      scene,
      nodes,
      "continuefloor001",
      "continuefloor.001",
    ) ?? findObjectByNamePattern(scene, /continuefloor/i)
  );
}

/** Opening desert panel — tries continuity floor, then legacy names. */
export function findOpeningDesertFloor(
  scene: THREE.Object3D,
  nodes?: Record<string, THREE.Object3D>,
) {
  return (
    findScene1ContinuityFloor(scene, nodes) ??
    findSceneObject(scene, nodes, "Desert_Scene_Floor") ??
    findSceneObject(scene, nodes, "Fourth_Scene_Floor") ??
    findSceneFloorByExtent(scene, "max")
  );
}

/** Scene 2 floor panel (boat scene) — tries authored names, then panel east of opening. */
export function findScene2Floor(
  scene: THREE.Object3D,
  nodes?: Record<string, THREE.Object3D>,
) {
  const opening = findOpeningDesertFloor(scene, nodes);
  const authored =
    findSceneObject(
      scene,
      nodes,
      "Desert_Scene_Floor001",
      "Desert_Scene_Floor.001",
    ) ?? findObjectByNamePattern(scene, /Desert_Scene_Floor\.?001/i);

  if (authored) return authored;

  if (!opening) return findSceneFloorByExtent(scene, "min");

  const openingBounds = getObjectBounds(opening);
  let best: THREE.Object3D | null = null;
  let bestX = -Infinity;

  for (const floor of listSceneFloors(scene)) {
    if (floor === opening) continue;
    const bounds = getObjectBounds(floor);
    const x = bounds.max.x;
    if (x < openingBounds.min.x && x > bestX) {
      bestX = x;
      best = floor;
    }
  }

  return best;
}

export type Scene1CamelTrack = {
  /** Scene 1 entrance (east, high X). */
  startX: number;
  /** Scene 1 exit / scene 2 start boundary (west, low X). */
  endX: number;
  /** Scroll progress at scene 1 entrance. */
  progressAtStart: number;
  /** Scroll progress at scene 1 exit. */
  progressAtEnd: number;
  desertScrollStart: number;
  desertScrollEnd: number;
};

/**
 * Camel travels scene 1 only: opening desert entrance → scene 2 start boundary.
 * Matches the original scroll-clamped track before asset repositioning.
 */
export function resolveScene1CamelTrack(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D> | undefined,
  sceneFrame: SceneFrame | null,
  options: {
    startInset: number;
    endInset: number;
  },
): Scene1CamelTrack | null {
  const sceneStart = findScene1ContinuityFloor(scene, nodes) ?? findOpeningDesertFloor(scene, nodes);
  if (!sceneStart) return null;

  const sceneEnd = findScene2Floor(scene, nodes);
  const startBox = getObjectBounds(sceneStart);
  const endBox = sceneEnd ? getObjectBounds(sceneEnd) : null;
  const scrollRange = getScrollRange(sceneFrame);

  const startX = startBox.max.x - options.startInset;
  const boundaryX = endBox
    ? Math.min(startBox.min.x, endBox.max.x)
    : startBox.min.x;
  const endX = boundaryX + options.endInset;

  const progressAtStart = getScrollProgressAtX(startX, scrollRange);
  const progressAtEnd = getScrollProgressAtX(endX, scrollRange);

  return {
    startX,
    endX,
    progressAtStart,
    progressAtEnd,
    desertScrollStart: Math.min(progressAtStart, progressAtEnd),
    desertScrollEnd: Math.max(progressAtStart, progressAtEnd),
  };
}

/** 0 = scene 1 entrance (east), 1 = scene 1 exit (west). */
export function getScene1TravelProgress(
  scrollProgress: number,
  track: Pick<Scene1CamelTrack, "progressAtStart" | "progressAtEnd">,
) {
  const span = track.progressAtStart - track.progressAtEnd;
  if (span <= 0) return 0;

  return THREE.MathUtils.clamp(
    (track.progressAtStart - scrollProgress) / span,
    0,
    1,
  );
}

export function getScene1WorldX(
  scrollProgress: number,
  track: Scene1CamelTrack,
) {
  const travelT = getScene1TravelProgress(scrollProgress, track);
  return THREE.MathUtils.lerp(track.startX, track.endX, travelT);
}

/** Hard clamp — camel must never leave scene 1 (forward or reverse scroll). */
export function clampScene1WorldX(
  x: number,
  track: Pick<Scene1CamelTrack, "startX" | "endX">,
) {
  const minX = Math.min(track.startX, track.endX);
  const maxX = Math.max(track.startX, track.endX);
  return THREE.MathUtils.clamp(x, minX, maxX);
}

/** Patrol bounds for scene 1 only — X clamped to opening → scene 2 boundary. */
export function getScene1PatrolBounds(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D> | undefined,
  sceneFrame: SceneFrame | null,
  pathInset: number,
  zInset = 0.4,
) {
  const track = resolveScene1CamelTrack(scene, nodes, sceneFrame, {
    startInset: pathInset,
    endInset: pathInset,
  });
  const floor = findOpeningDesertFloor(scene, nodes);
  if (!track || !floor) return null;

  const floorBounds = getObjectBounds(floor);

  return {
    minX: Math.min(track.startX, track.endX),
    maxX: Math.max(track.startX, track.endX),
    minZ: floorBounds.min.z + zInset,
    maxZ: floorBounds.max.z - zInset,
    floorTop: floorBounds.max.y,
  };
}

export type Scene1BirdFlightBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorTop: number;
};

/**
 * World-space patrol box for scene 1 birds (scroll-independent).
 * East = opening floor, west capped at scene 2 start.
 */
export function getScene1BirdFlightBounds(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D> | undefined,
  openingFloorName: string,
  pathInset: number,
  zInset = 0.4,
): Scene1BirdFlightBounds | null {
  const floor =
    findSceneObject(
      scene,
      nodes,
      openingFloorName,
      "continuefloor.001",
      "Desert_Scene_Floor",
    ) ?? findScene1ContinuityFloor(scene, nodes);

  if (!floor) return null;

  const floorWorld = getObjectBounds(floor);
  const minX = floorWorld.min.x + pathInset;
  const maxX = floorWorld.max.x - pathInset;

  if (minX >= maxX) return null;

  return {
    minX,
    maxX,
    minZ: floorWorld.min.z + zInset,
    maxZ: floorWorld.max.z - zInset,
    floorTop: floorWorld.max.y,
  };
}

/** Burj Al Arab / jetski scene — floor panel or landmark fallback. */
export function findAlRabScenePanel(
  scene: THREE.Object3D,
  nodes?: Record<string, THREE.Object3D>,
) {
  return (
    findSceneObject(
      scene,
      nodes,
      "Desert_Scene_Floor005",
      "Desert_Scene_Floor.005",
    ) ??
    findSceneObject(scene, nodes, "burjalarab001", "burjalarab.001") ??
    findObjectByNamePattern(scene, /burjalarab/i)
  );
}

// attachAnimationCarrier - attach the animation carrier to the object 
export function attachAnimationCarrier(
  object: THREE.Object3D,
  carrierName: string,
) {
  if (object.parent?.name === carrierName) {
    return object.parent as THREE.Group;
  }

  object.updateMatrixWorld(true);

  const parent = object.parent;
  if (!parent) {
    throw new Error(`${object.name} must have a parent in the scene graph`);
  }

  parent.updateMatrixWorld(true);

  const worldMatrix = object.matrixWorld.clone();
  const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const localMatrix = worldMatrix.premultiply(parentInverse);

  const carrier = new THREE.Group();
  carrier.name = carrierName;
  localMatrix.decompose(
    carrier.position,
    carrier.quaternion,
    carrier.scale,
  );

  parent.add(carrier);
  parent.remove(object);
  carrier.add(object);

  object.position.set(0, 0, 0);
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);

  return carrier;
}

// attachObjectToCarrier - reparent while preserving world transform
export function attachObjectToCarrier(
  carrier: THREE.Object3D,
  object: THREE.Object3D,
) {
  if (object.parent === carrier) return;

  object.updateMatrixWorld(true);
  carrier.updateMatrixWorld(true);

  const parent = object.parent;
  if (!parent) {
    throw new Error(`${object.name} must have a parent in the scene graph`);
  }

  carrier.attach(object);
}

// getObjectBounds - get the bounds of the object
export function getObjectBounds(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

/** Set object position in world space (handles non-identity parents). */
export function setObjectWorldPosition(
  object: THREE.Object3D,
  worldPosition: THREE.Vector3,
) {
  object.updateMatrixWorld(true);

  if (object.parent) {
    object.parent.updateMatrixWorld(true);
    const local = worldPosition.clone();
    object.parent.worldToLocal(local);
    object.position.copy(local);
    return;
  }

  object.position.copy(worldPosition);
}

const DIORAMA_FLOOR_PATTERN = /^Desert_Scene_Floor/;

// getDioramaFloorBounds - get the bounds of the diorama floor
export function getDioramaFloorBounds(scene: THREE.Object3D) {
  const bounds = new THREE.Box3();
  let hasFloor = false;

  scene.traverse((child) => {
    if (!child.name || !DIORAMA_FLOOR_PATTERN.test(child.name)) return;

    const childBounds = getObjectBounds(child);
    if (childBounds.isEmpty()) return;

    bounds.union(childBounds);
    hasFloor = true;
  });

  return hasFloor ? bounds : null;
}