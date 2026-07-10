import * as THREE from "three";
import { acceptEndCamelScrollSettingsUpdate } from "@features/portfolio/hooks/acceptEndCamelScrollSettingsHmr";
import { endCamelScrollSettings } from "@features/portfolio/config/endCamelScrollSettings";
import { getObjectBounds } from "@features/portfolio/utils/sceneObjectUtils";

const tempSize = new THREE.Vector3();

export function getSafariCamelSeatWorld(
  camel: THREE.Object3D,
  turtle: THREE.Object3D | null = null,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(camel);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempSize);
  const {
    saddleHeightFactor,
    saddleOffsetXFactor,
    turtleSeatOffsetX,
    turtleSeatOffsetY,
    turtleSeatOffsetZ,
  } = endCamelScrollSettings;

  const saddleY = bounds.min.y + size.y * saddleHeightFactor;
  const saddleX = center.x + size.x * saddleOffsetXFactor;

  // Place the turtle mesh bottom on the saddle, not the pivot point.
  let pivotToBottom = 0;
  if (turtle) {
    turtle.updateMatrixWorld(true);
    const turtleBounds = getObjectBounds(turtle);
    const turtleOrigin = new THREE.Vector3();
    turtle.getWorldPosition(turtleOrigin);
    pivotToBottom = turtleOrigin.y - turtleBounds.min.y;
  }

  target.set(
    saddleX + turtleSeatOffsetX,
    saddleY + pivotToBottom + turtleSeatOffsetY,
    center.z + turtleSeatOffsetZ,
  );

  return target;
}

function applyRenderOrder(root: THREE.Object3D, renderOrder: number) {
  root.renderOrder = renderOrder;
  root.traverse((child) => {
    child.renderOrder = renderOrder;
  });
}

/** Draw the rider above the safari camel carrier (only while mounted there). */
export function applySafariTurtleRenderOrder(turtle: THREE.Object3D) {
  applyRenderOrder(turtle, endCamelScrollSettings.turtleRenderOrder);
}

/** Restore default layering when the turtle leaves the safari camel. */
export function clearTurtleRenderOrder(turtle: THREE.Object3D) {
  applyRenderOrder(turtle, 0);
}

export function isTurtleSceneObject(object: THREE.Object3D) {
  return /turtlechar/i.test(object.name);
}

acceptEndCamelScrollSettingsUpdate();
