import * as THREE from "three";

export function normalizeObjectName(name: string) {
  return name.replace(/\./g, "").toLowerCase();
}

export function findSceneObject(
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

export function getObjectBounds(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}
