"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { cameraSettings } from "@/app/config/cameraSettings";

type OrbitCameraProps = {
  onPoseChange: (pose: {
    position: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
    fov: number;
  }) => void;
};

// OrbitCamera - the orbit camera component
export default function OrbitCamera({ onPoseChange }: OrbitCameraProps) {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const controls = useRef<OrbitControlsType>(null);
  const lookAtPoint = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!camera.current) return;

    const { position, target, fov, near, far } = cameraSettings.orbit;
    camera.current.position.set(position.x, position.y, position.z);
    camera.current.fov = fov;
    camera.current.near = near;
    camera.current.far = far;
    camera.current.lookAt(target.x, target.y, target.z);
    camera.current.updateProjectionMatrix();

    if (controls.current) {
      controls.current.target.set(target.x, target.y, target.z);
      controls.current.update();
    }
  }, []);

  useFrame(() => {
    if (!camera.current || !controls.current) return;

    lookAtPoint.current.copy(controls.current.target);
    onPoseChange({
      position: {
        x: camera.current.position.x,
        y: camera.current.position.y,
        z: camera.current.position.z,
      },
      lookAt: {
        x: lookAtPoint.current.x,
        y: lookAtPoint.current.y,
        z: lookAtPoint.current.z,
      },
      fov: camera.current.fov,
    });
  });

  const {
    minDistance,
    maxDistance,
    enableDamping,
    dampingFactor,
  } = cameraSettings.orbit;

  return (
    <>
      <PerspectiveCamera ref={camera} makeDefault />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={enableDamping}
        dampingFactor={dampingFactor}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />
    </>
  );
}
