"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { cameraSettings } from "@/app/config/cameraSettings";

// FixedCamera - the fixed camera component
export default function FixedCamera() {
  const camera = useRef<THREE.PerspectiveCamera>(null);

  useLayoutEffect(() => {
    if (!camera.current) return;

    const { position, lookAt, fov, near, far } = cameraSettings.manual;
    camera.current.position.set(position.x, position.y, position.z);
    camera.current.fov = fov;
    camera.current.near = near;
    camera.current.far = far;
    camera.current.lookAt(lookAt.x, lookAt.y, lookAt.z);
    camera.current.updateProjectionMatrix();
  }, []);

  const { fov, near, far } = cameraSettings.manual;

  return <PerspectiveCamera ref={camera} makeDefault fov={fov} near={near} far={far} />;
}
