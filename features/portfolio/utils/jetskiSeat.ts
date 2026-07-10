import * as THREE from "three";
import { acceptJetskiScrollSettingsUpdate } from "@features/portfolio/hooks/acceptJetskiScrollSettingsHmr";
import { jetskiScrollSettings } from "@features/portfolio/config/jetskiScrollSettings";
import { getObjectBounds } from "@features/portfolio/utils/sceneObjectUtils";

const tempSize = new THREE.Vector3();

export function getJetskiDriverSeatWorld(
  driver: THREE.Object3D,
  _turtleFootLift: number,
  target = new THREE.Vector3(),
) {
  const bounds = getObjectBounds(driver);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(tempSize);
  const {
    turtleSeatHeightFactor,
    turtleSeatOffsetX,
    turtleSeatOffsetY,
    turtleSeatOffsetZ,
  } = jetskiScrollSettings;

  target.set(
    center.x + turtleSeatOffsetX,
    bounds.min.y + size.y * turtleSeatHeightFactor + turtleSeatOffsetY,
    center.z + turtleSeatOffsetZ,
  );

  return target;
}

acceptJetskiScrollSettingsUpdate();
