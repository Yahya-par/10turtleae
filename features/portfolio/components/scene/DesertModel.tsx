import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { extractSceneFrame, type SceneFrame } from "@features/portfolio/components/camera/CameraPath";
import MetroTrainAnimation from "../animations/MetroTrainAnimation";
import CarAnimation from "../animations/CarAnimation";
import CloudAnimation from "../animations/CloudAnimation";
import AinAnimation from "../animations/AinAnimation";
import CampfireSmoke from "../animations/CampfireSmoke";
import SafariCampWind from "../animations/SafariCampWind";
import CamelWalkAnimation from "../animations/CamelWalkAnimation";
import SceneObjectLinks from "./SceneObjectLinks";
import CamelScrollMovement from "../animations/CamelScrollMovement";
import BirdAnimation from "../animations/BirdAnimation";
import CarBodyAnimation from "../animations/CarBodyAnimation";
import YachtScrollMovement from "../animations/YachtScrollMovement";

const MODEL_PATH = "/Models/Modelv1.glb";

type DesertModelProps = {
  onFrameReady: (frame: SceneFrame) => void;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

// buildNodeMap - build a map of the nodes in the scene
function buildNodeMap(scene: THREE.Object3D) {
  const nodes: Record<string, THREE.Object3D> = {};
  scene.traverse((child) => {
    if (child.name) nodes[child.name] = child;
  });
  return nodes;
}

function prepareScene(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((material) => {
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    });
  });
}

export default function DesertModel({
  onFrameReady,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: DesertModelProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const nodes = useMemo(() => buildNodeMap(scene), [scene]);

  useLayoutEffect(() => {
    prepareScene(scene);
    onFrameReady(extractSceneFrame(scene));
  }, [scene, onFrameReady]);

  return (
    <>
      <primitive object={scene} />
      <MetroTrainAnimation scene={scene} nodes={nodes} />
      <CarAnimation scene={scene} nodes={nodes} />
      <CamelScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <CarBodyAnimation scene={scene} nodes={nodes} />
      // YachtScrollMovement component - yacht scroll movement takes these props: scene, nodes, sceneFrame, scrollProgress, targetScrollProgress, lerpFactor
      <YachtScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <CampfireSmoke scene={scene} nodes={nodes} />
      <SafariCampWind scene={scene} nodes={nodes} />
      <CamelWalkAnimation
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <SceneObjectLinks scene={scene} nodes={nodes} />
      <CloudAnimation scene={scene} nodes={nodes} />
      <BirdAnimation scene={scene} nodes={nodes} />
      <AinAnimation scene={scene} nodes={nodes} />
    </>
  );
}

useGLTF.preload(MODEL_PATH);
