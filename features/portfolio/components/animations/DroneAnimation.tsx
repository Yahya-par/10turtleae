import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
  droneAnimationSettings,
  getDroneSpeed,
} from "@features/portfolio/config/droneAnimationSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type DroneAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type DroneRig = {
  carrier: THREE.Group;
  startX: number;
  endX: number;
  fixedY: number;
  fixedZ: number;
};

const tempCenter = new THREE.Vector3();

function resolveDroneRig(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
): DroneRig | null {
  const drone = findSceneObject(
    scene,
    nodes,
    droneAnimationSettings.droneName,
    droneAnimationSettings.droneBlenderName,
    ...droneAnimationSettings.droneAliases,
  );
  const road = findSceneObject(
    scene,
    nodes,
    droneAnimationSettings.roadName,
    droneAnimationSettings.roadBlenderName,
  );

  if (!drone || !road) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[DroneAnimation] Missing object(s):", {
        droneFound: Boolean(drone),
        roadFound: Boolean(road),
        droneName: droneAnimationSettings.droneName,
        roadName: droneAnimationSettings.roadName,
      });
    }
    return null;
  }

  const carrier = attachAnimationCarrier(drone, droneAnimationSettings.carrierName);
  scene.updateMatrixWorld(true);

  const roadBounds = getObjectBounds(road);
  const roadCenterWorld = roadBounds.getCenter(tempCenter).clone();

  const parent = carrier.parent;
  const roadCenterLocal = parent
    ? parent.worldToLocal(roadCenterWorld)
    : roadCenterWorld;

  const endX = roadCenterLocal.x;
  const startX = Math.min(
    carrier.position.x,
    endX - droneAnimationSettings.startGapFromRoad,
  );

  return {
    carrier,
    startX,
    endX,
    fixedY: carrier.position.y,
    fixedZ: carrier.position.z,
  };
}

export default function DroneAnimation({ scene, nodes }: DroneAnimationProps) {
  const rigRef = useRef<DroneRig | null>(null);

  useLayoutEffect(() => {
    const rig = resolveDroneRig(scene, nodes);
    rigRef.current = rig;

    if (!rig) return;

    rig.carrier.position.set(rig.startX, rig.fixedY, rig.fixedZ);
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    rig.carrier.position.x += getDroneSpeed() * delta;
    rig.carrier.position.y = rig.fixedY;
    rig.carrier.position.z = rig.fixedZ;

    if (rig.carrier.position.x >= rig.endX) {
      rig.carrier.position.x = rig.startX;
    }
  });

  return null;
}
