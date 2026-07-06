import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";
import {
  getInitialScrollProgress,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";

type ScrollCameraProps = {
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

// ScrollCamera - the scroll camera component
export default function ScrollCamera({
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: ScrollCameraProps) {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const range = useMemo(() => getScrollRange(sceneFrame), [sceneFrame]);

  const offsets = useMemo(() => {
    const { position, lookAt } = cameraSettings.manual;
    return {
      x: position.x - lookAt.x,
      y: position.y - lookAt.y,
      z: position.z - lookAt.z,
      lookAtY: lookAt.y,
      lookAtZ: lookAt.z,
    };
  }, []);

  useLayoutEffect(() => {
    const start = getInitialScrollProgress(sceneFrame);
    scrollProgress.current = start;
    targetScrollProgress.current = start;
  }, [range, sceneFrame, scrollProgress, targetScrollProgress]);

  useLayoutEffect(() => {
    if (!camera.current) return;

    const { fov, near, far } = cameraSettings.manual;
    camera.current.fov = fov;
    camera.current.near = near;
    camera.current.far = far;
    camera.current.updateProjectionMatrix();
  }, []);

  useFrame(() => {
    if (!camera.current) return;

    const nextProgress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );
    scrollProgress.current = nextProgress;

    const pathX = THREE.MathUtils.lerp(range.min, range.max, nextProgress);
    const lookAt = new THREE.Vector3(pathX, offsets.lookAtY, offsets.lookAtZ);
    const position = new THREE.Vector3(
      pathX + offsets.x,
      offsets.lookAtY + offsets.y,
      offsets.lookAtZ + offsets.z,
    );

    camera.current.position.copy(position);
    camera.current.lookAt(lookAt);
  });

  const { fov, near, far } = cameraSettings.manual;

  return <PerspectiveCamera ref={camera} makeDefault fov={fov} near={near} far={far} />;
}
