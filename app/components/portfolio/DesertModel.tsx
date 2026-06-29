"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { extractSceneFrame, type SceneFrame } from "./cameraPath";
import MetroTrainAnimation from "./MetroTrainAnimation";
import CarAnimation from "./CarAnimation";
import CloudAnimation from "./CloudAnimation";
import AinAnimation from "./AinAnimation";

const MODEL_PATH = "/Models/Modelv1%202.glb";

type DesertModelProps = {
  onFrameReady: (frame: SceneFrame) => void;
};

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

export default function DesertModel({ onFrameReady }: DesertModelProps) {
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
      <CloudAnimation scene={scene} nodes={nodes} />
      <AinAnimation scene={scene} nodes={nodes} />
    </>
  );
}

useGLTF.preload(MODEL_PATH);
