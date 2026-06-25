import * as THREE from "three";

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

function isSceneMesh(name: string) {
  return SCENE_MESH_PATTERN.test(name);
}

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

export function getDioramaPose(
  curve: THREE.CatmullRomCurve3,
  lookAtCenter: THREE.Vector3,
  progress: number,
) {
  const position = curve.getPoint(progress);
  const lookAt = new THREE.Vector3(position.x, lookAtCenter.y, lookAtCenter.z);

  return { position, lookAt };
}
