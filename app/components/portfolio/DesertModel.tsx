"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { extractSceneFrame, type SceneFrame } from "./cameraPath";

const MODEL_PATH = "/Models/Model.glb";

type DesertModelProps = {
  onFrameReady: (frame: SceneFrame) => void;
};

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

  useLayoutEffect(() => {
    prepareScene(scene);
    onFrameReady(extractSceneFrame(scene));
  }, [scene, onFrameReady]);

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_PATH);
