import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";

export type CameraWaypoint = {
  position: THREE.Vector3;
};

export type SceneFrame = {
  waypoints: CameraWaypoint[];
  bounds: THREE.Box3;
  lookAtCenter: THREE.Vector3;
  cameraZ: number;
};

const MIN_CAMERA_DISTANCE = 8;
const MAX_COORD = 500;
const SCENE_MESH_PATTERN =
  /^(Plane|Sand_Dunes|Cloud|Desert_Scene_Floor|Floor_Img|Backdrop)/;

const FALLBACK_BOUNDS = new THREE.Box3(
  new THREE.Vector3(4, 0, -12),
  new THREE.Vector3(19, 11, 6),
);

const tempVertex = new THREE.Vector3();

// isSceneMesh - check if the mesh is a scene mesh
function isSceneMesh(name: string) {
  return SCENE_MESH_PATTERN.test(name);
}

// expandBoundsFromMesh - expand the bounds of the scene from a mesh
function expandBoundsFromMesh(bounds: THREE.Box3, mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute("position");
  if (!position) return;

  mesh.updateWorldMatrix(true, false);

  for (let index = 0; index < position.count; index += 1) {
    tempVertex.fromBufferAttribute(position, index);
    tempVertex.applyMatrix4(mesh.matrixWorld);

    if (
      !Number.isFinite(tempVertex.x) ||
      !Number.isFinite(tempVertex.y) ||
      !Number.isFinite(tempVertex.z)
    ) {
      continue;
    }

    if (
      Math.abs(tempVertex.x) > MAX_COORD ||
      Math.abs(tempVertex.y) > MAX_COORD ||
      Math.abs(tempVertex.z) > MAX_COORD
    ) {
      continue;
    }

    bounds.expandByPoint(tempVertex);
  }
}

// sanitizeBounds - sanitize the bounds of the scene
function sanitizeBounds(bounds: THREE.Box3) {
  if (bounds.isEmpty()) {
    return FALLBACK_BOUNDS.clone();
  }

  const size = bounds.getSize(new THREE.Vector3());
  if (
    !Number.isFinite(size.x) ||
    !Number.isFinite(size.y) ||
    !Number.isFinite(size.z) ||
    size.x > MAX_COORD ||
    size.y > MAX_COORD ||
    size.z > MAX_COORD
  ) {
    return FALLBACK_BOUNDS.clone();
  }

  return bounds;
}

// extractSceneFrame - extract the scene frame from the root object
export function extractSceneFrame(root: THREE.Object3D): SceneFrame {
  const bounds = new THREE.Box3();
  const waypoints: CameraWaypoint[] = [];

  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (child.name.startsWith("Empty.")) {
      child.visible = false;

      const position = new THREE.Vector3();
      child.getWorldPosition(position);
      waypoints.push({ position });
      return;
    }

    if ((child as THREE.Mesh).isMesh && isSceneMesh(child.name)) {
      expandBoundsFromMesh(bounds, child as THREE.Mesh);
    }
  });

  const safeBounds = sanitizeBounds(bounds);
  const lookAtCenter = safeBounds.getCenter(new THREE.Vector3());
  const size = safeBounds.getSize(new THREE.Vector3());
  const cameraZ = lookAtCenter.z + Math.max(size.z * 1.6, MIN_CAMERA_DISTANCE);

  return {
    waypoints: waypoints.sort((a, b) => a.position.x - b.position.x),
    bounds: safeBounds,
    lookAtCenter,
    cameraZ,
  };
}

// createDioramaCurve - create a diorama curve from the scene frame
export function createDioramaCurve(frame: SceneFrame) {
  const { waypoints, lookAtCenter, cameraZ, bounds } = frame;
  const size = bounds.getSize(new THREE.Vector3());
  const cameraY = lookAtCenter.y + Math.min(size.y * 0.12, 1.2);

  if (waypoints.length < 2) {
    const halfWidth = Math.max(size.x * 0.45, 6);
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(lookAtCenter.x - halfWidth, cameraY, cameraZ),
        new THREE.Vector3(lookAtCenter.x + halfWidth, cameraY, cameraZ),
      ],
      false,
      "centripetal",
    );
  }

  const points = waypoints.map((waypoint) =>
    new THREE.Vector3(
      waypoint.position.x,
      THREE.MathUtils.lerp(cameraY, waypoint.position.y, 0.2),
      cameraZ,
    ),
  );

  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

export function getScrollRange(sceneFrame: SceneFrame | null) {
  if (sceneFrame?.waypoints.length) {
    const xs = sceneFrame.waypoints.map((waypoint) => waypoint.position.x);
    const waypointMin = Math.min(...xs);
    const waypointMax = Math.max(...xs);

    if (sceneFrame.bounds) {
      // Clamp waypoint-derived range to real mesh bounds to avoid
      // long empty pre/post-roll caused by outlier Empty waypoints.
      const clampedMin = Math.max(waypointMin, sceneFrame.bounds.min.x);
      const clampedMax = Math.min(waypointMax, sceneFrame.bounds.max.x);

      if (clampedMax > clampedMin) {
        return { min: clampedMin, max: clampedMax };
      }
    }

    return { min: waypointMin, max: waypointMax };
  }

  if (sceneFrame?.bounds) {
    return { min: sceneFrame.bounds.min.x, max: sceneFrame.bounds.max.x };
  }

  return { min: 4, max: 19 };
}

export function getScrollProgressAtX(
  x: number,
  range: { min: number; max: number },
) {
  if (range.max <= range.min) return 0;
  return THREE.MathUtils.clamp((x - range.min) / (range.max - range.min), 0, 1);
}

export type ScrollProgressBounds = {
  min: number;
  max: number;
};

/** Resolves scroll stop limits from cameraSettings + scene waypoint range. */
export function getScrollProgressBounds(
  sceneFrame: SceneFrame | null,
): ScrollProgressBounds {
  const { bounds } = cameraSettings.scroll;
  const range = getScrollRange(sceneFrame);

  let min = bounds.minProgress;
  let max = bounds.maxProgress;

  if (bounds.leftX !== null) {
    min = getScrollProgressAtX(bounds.leftX, range);
  }
  if (bounds.rightX !== null) {
    max = getScrollProgressAtX(bounds.rightX, range);
  }

  const clampedMin = THREE.MathUtils.clamp(min, 0, 1);
  const clampedMax = THREE.MathUtils.clamp(max, 0, 1);

  return {
    min: Math.min(clampedMin, clampedMax),
    max: Math.max(clampedMin, clampedMax),
  };
}

/** Remap bounded progress (min–max) to 0–1 for UI such as the progress bar. */
export function getNormalizedScrollProgress(
  progress: number,
  bounds: ScrollProgressBounds,
) {
  const span = bounds.max - bounds.min;
  if (span <= 0) return 0;
  return THREE.MathUtils.clamp((progress - bounds.min) / span, 0, 1);
}

/** World X that matches ScrollCamera lookAt for a given scroll progress. */
export function scrollProgressToPathX(
  progress: number,
  sceneFrame: SceneFrame | null,
) {
  const range = getScrollRange(sceneFrame);
  return THREE.MathUtils.lerp(range.min, range.max, progress);
}

/** Opening-scene scroll progress (scene 1 / camel start). */
export function getInitialScrollProgress(sceneFrame: SceneFrame | null) {
  const range = getScrollRange(sceneFrame);
  const bounds = getScrollProgressBounds(sceneFrame);
  const { lookAt } = cameraSettings.manual;
  if (range.max <= range.min) return bounds.max;

  const progress = (lookAt.x - range.min) / (range.max - range.min);
  return THREE.MathUtils.clamp(progress, bounds.min, bounds.max);
}

// getDioramaPose - get the diorama pose from the curve and the look at center
export function getDioramaPose(
  curve: THREE.CatmullRomCurve3,
  lookAtCenter: THREE.Vector3,
  progress: number,
) {
  const position = curve.getPoint(progress);
  const lookAt = new THREE.Vector3(position.x, lookAtCenter.y, lookAtCenter.z);

  return { position, lookAt };
}
