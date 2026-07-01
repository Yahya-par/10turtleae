"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { extractSceneFrame, type SceneFrame } from "./cameraPath";
import MetroTrainAnimation from "./MetroTrainAnimation";
import CarAnimation from "./CarAnimation";
import CloudAnimation from "./CloudAnimation";
import AinAnimation from "./AinAnimation";
import CampfireSmoke from "./CampfireSmoke";
import SafariCampWind from "./SafariCampWind";
import CamelWalkAnimation from "./CamelWalkAnimation";
import SceneObjectLinks from "./SceneObjectLinks";

const MODEL_PATH = "/Models/Modelv1.glb";

type DesertModelProps = {
  onFrameReady: (frame: SceneFrame) => void;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
};

// buildNodeMap - build a map of the nodes in the scene
function buildNodeMap(scene: THREE.Object3D) {
  const nodes: Record<string, THREE.Object3D> = {};
  scene.traverse((child) => {
    if (child.name) nodes[child.name] = child;
  });
  return nodes;
}
// prepareScene is a function that prepares the scene for rendering.
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

// DesertModel is a component that renders the desert model.
export default function DesertModel({
  onFrameReady,
  sceneFrame,
  scrollProgress,
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
      <CampfireSmoke scene={scene} nodes={nodes} />
      <SafariCampWind scene={scene} nodes={nodes} />
      <CamelWalkAnimation
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
      />
      <SceneObjectLinks scene={scene} nodes={nodes} />
      <CloudAnimation scene={scene} nodes={nodes} />
      <AinAnimation scene={scene} nodes={nodes} />
    </>
  );
}

useGLTF.preload(MODEL_PATH);
