import * as THREE from "three";
import { getObjectBounds } from "@features/portfolio/utils/sceneObjectUtils";

const projectedPoint = new THREE.Vector3();
const boxCorners = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];

function isProjectedPointOnScreen(point: THREE.Vector3) {
  if (point.z <= -1 || point.z >= 1) return false;

  return Math.abs(point.x) <= 1.02 && Math.abs(point.y) <= 1.02;
}

function fillBoxCorners(bounds: THREE.Box3) {
  const { min, max } = bounds;

  boxCorners[0].set(min.x, min.y, min.z);
  boxCorners[1].set(min.x, min.y, max.z);
  boxCorners[2].set(min.x, max.y, min.z);
  boxCorners[3].set(min.x, max.y, max.z);
  boxCorners[4].set(max.x, min.y, min.z);
  boxCorners[5].set(max.x, min.y, max.z);
  boxCorners[6].set(max.x, max.y, min.z);
  boxCorners[7].set(max.x, max.y, max.z);
}

export function isCarVisibleOnScreen(
  object: THREE.Object3D,
  camera: THREE.Camera,
) {
  camera.updateMatrixWorld(true);
  object.updateMatrixWorld(true);

  const bounds = getObjectBounds(object);
  if (bounds.isEmpty()) return false;

  fillBoxCorners(bounds);

  for (const corner of boxCorners) {
    corner.project(camera);
    if (isProjectedPointOnScreen(corner)) return true;
  }

  bounds.getCenter(projectedPoint);
  projectedPoint.project(camera);
  return isProjectedPointOnScreen(projectedPoint);
}
