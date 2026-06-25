"use client";

import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { cameraSettings } from "@/app/config/cameraSettings";
import {
  createDioramaCurve,
  getDioramaPose,
  type SceneFrame,
} from "./cameraPath";

type CameraRigProps = {
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  mousePositionOffset: RefObject<THREE.Vector3>;
  mouseRotationOffset: RefObject<THREE.Euler>;
  lerpFactor: number;
};

function getManualPose() {
  const { position, lookAt } = cameraSettings.manual;
  return {
    position: new THREE.Vector3(position.x, position.y, position.z),
    lookAt: new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z),
  };
}

export default function CameraRig({
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  mousePositionOffset,
  mouseRotationOffset,
  lerpFactor,
}: CameraRigProps) {
  const cameraGroup = useRef<THREE.Group>(null);
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const lookAtTarget = useMemo(() => new THREE.Vector3(), []);
  const curve = useMemo(
    () => (sceneFrame ? createDioramaCurve(sceneFrame) : null),
    [sceneFrame],
  );

  const applyCameraPose = (progress: number, immediate = false) => {
    if (!cameraGroup.current) return;

    let position: THREE.Vector3;
    let lookAt: THREE.Vector3;

    if (cameraSettings.mode === "manual" || !curve || !sceneFrame) {
      ({ position, lookAt } = getManualPose());
    } else {
      ({ position, lookAt } = getDioramaPose(
        curve,
        sceneFrame.lookAtCenter,
        progress,
      ));
    }

    if (immediate) {
      cameraGroup.current.position.copy(position);
      cameraGroup.current.lookAt(lookAt);
      return;
    }

    cameraGroup.current.position.lerp(position, 0.1);
    lookAtTarget.copy(lookAt);
    cameraGroup.current.lookAt(lookAtTarget);
  };

  useLayoutEffect(() => {
    applyCameraPose(scrollProgress.current, true);
  }, [curve, sceneFrame, scrollProgress, targetScrollProgress]);

  useFrame(() => {
    if (!cameraGroup.current || !camera.current) return;

    if (cameraSettings.mode === "scroll" && curve && sceneFrame) {
      const nextProgress = THREE.MathUtils.lerp(
        scrollProgress.current,
        targetScrollProgress.current,
        lerpFactor,
      );
      scrollProgress.current = nextProgress;
      applyCameraPose(nextProgress);
    } else {
      applyCameraPose(0, true);
    }

    camera.current.position.x = THREE.MathUtils.lerp(
      camera.current.position.x,
      mousePositionOffset.current.x * 0.4,
      0.1,
    );
    camera.current.position.y = THREE.MathUtils.lerp(
      camera.current.position.y,
      -mousePositionOffset.current.y * 0.4,
      0.1,
    );
    camera.current.position.z = 0;

    camera.current.rotation.x = THREE.MathUtils.lerp(
      camera.current.rotation.x,
      -mouseRotationOffset.current.x * 0.35,
      0.1,
    );
    camera.current.rotation.y = THREE.MathUtils.lerp(
      camera.current.rotation.y,
      -mouseRotationOffset.current.y * 0.35,
      0.1,
    );
  });

  const { fov, near, far } = cameraSettings.manual;

  return (
    <group ref={cameraGroup}>
      <PerspectiveCamera
        ref={camera}
        makeDefault
        fov={fov}
        near={near}
        far={far}
      />
    </group>
  );
}
