import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { assetNames } from "@features/portfolio/config/assetNames";
import { carPassState } from "@features/portfolio/config/carPassState";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type CarPassTarget = {
  source: "sedan" | "scrollCar" | "rangeRover";
  object: THREE.Object3D;
  skipWhenParked?: boolean;
};

type CarPassAudioProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

function addTarget(
  targets: CarPassTarget[],
  source: CarPassTarget["source"],
  object: THREE.Object3D | null,
  skipWhenParked = false,
) {
  if (!object) return;

  targets.push({
    source,
    object,
    skipWhenParked,
  });
}

export default function CarPassAudio({ scene, nodes }: CarPassAudioProps) {
  const targetsRef = useRef<CarPassTarget[]>([]);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const targets: CarPassTarget[] = [];

    const sedan = findSceneObject(scene, nodes, assetNames.cars.sedan);
    const sedanCarrier = findSceneObject(scene, nodes, "CarCarrier001");
    const rangeRover = findSceneObject(scene, nodes, assetNames.cars.rangeRover);
    const rangeRoverCarrier = findSceneObject(scene, nodes, "CarCarrier002");
    const scrollCarrier = findSceneObject(scene, nodes, "CarScrollCarrier001");

    addTarget(targets, "sedan", sedanCarrier ?? sedan);
    addTarget(
      targets,
      "rangeRover",
      rangeRoverCarrier ?? rangeRover,
    );
    addTarget(targets, "scrollCar", scrollCarrier, true);

    targetsRef.current = targets;

    if (process.env.NODE_ENV === "development") {
      console.info(
        "[CarPassAudio] Targets:",
        targets.map((target) => `${target.source}:${target.object.name}`),
      );
    }

    return () => {
      targetsRef.current = [];
      audioManager.setCarPassActive("sedan", false);
      audioManager.setCarPassActive("scrollCar", false);
      audioManager.setCarPassActive("rangeRover", false);
    };
  }, [scene, nodes]);

  useFrame(({ camera }) => {
    const targets = targetsRef.current;
    const visibleSources = new Set<CarPassTarget["source"]>();

    for (const target of targets) {
      if (target.skipWhenParked && carPassState.scrollCarParked) {
        continue;
      }

      if (isCarVisibleOnScreen(target.object, camera)) {
        visibleSources.add(target.source);
      }
    }

    audioManager.setCarPassActive("sedan", visibleSources.has("sedan"));
    audioManager.setCarPassActive("scrollCar", visibleSources.has("scrollCar"));
    audioManager.setCarPassActive(
      "rangeRover",
      visibleSources.has("rangeRover"),
    );
  });

  return null;
}
