import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { hotAirBalloonAnimationSettings } from "@features/portfolio/config/hotAirBalloonAnimationSettings";
import {
  attachAnimationCarrier,
  findSceneObject,
} from "@features/portfolio/utils/sceneObjectUtils";

type HotAirBalloonAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type BalloonRig = {
  carrier: THREE.Group;
  baseX: number;
  baseY: number;
  baseZ: number;
};

// HotAirBalloonAnimation - floats mutedhotairballoon001 up and down in a loop.
export default function HotAirBalloonAnimation({
  scene,
  nodes,
}: HotAirBalloonAnimationProps) {
  const rigRef = useRef<BalloonRig | null>(null);
  const elapsedRef = useRef(0);

  useLayoutEffect(() => {
    const balloon = findSceneObject(
      scene,
      nodes,
      hotAirBalloonAnimationSettings.objectName,
      hotAirBalloonAnimationSettings.objectBlenderName,
    );

    if (!balloon) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[HotAirBalloonAnimation] Missing asset:",
          hotAirBalloonAnimationSettings.objectName,
        );
      }
      return;
    }

    const carrier = attachAnimationCarrier(
      balloon,
      hotAirBalloonAnimationSettings.carrierName,
    );

    rigRef.current = {
      carrier,
      baseX: carrier.position.x,
      baseY: carrier.position.y,
      baseZ: carrier.position.z,
    };
    elapsedRef.current = 0;

    if (process.env.NODE_ENV === "development") {
      console.info("[HotAirBalloonAnimation] Ready:", {
        object: balloon.name,
        base: [carrier.position.x, carrier.position.y, carrier.position.z],
      });
    }

    return () => {
      rigRef.current = null;
    };
  }, [scene, nodes]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    elapsedRef.current += delta;

    const { riseHeight, cycleSeconds, swayAmount, swayFrequency } =
      hotAirBalloonAnimationSettings;

    const phase = (elapsedRef.current / Math.max(cycleSeconds, 0.1)) * Math.PI * 2;

    // Starts at the lowest point (sin(-π/2) = -1), rises, and settles back.
    const lift = ((Math.sin(phase - Math.PI / 2) + 1) / 2) * riseHeight;
    const sway = Math.sin(phase * swayFrequency) * swayAmount;

    rig.carrier.position.set(rig.baseX + sway, rig.baseY + lift, rig.baseZ);
  });

  return null;
}
