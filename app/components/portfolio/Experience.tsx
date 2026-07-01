"use client";

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import { cameraSettings } from "@/app/config/cameraSettings";
import { rendererSettings } from "@/app/config/rendererSettings";
import { useScrollNavigation } from "@/app/hooks/useScrollNavigation";
import { useInspectProtection, blockInspectContextMenu } from "@/app/hooks/useInspectProtection";
import Scene from "./Scene";
import Overlay from "./Overlay";
import CameraHud from "./CameraHud";

const isOrbitMode = cameraSettings.mode === "orbit";
const isScrollMode = cameraSettings.mode === "scroll";

// Experience - the experience component is responsible for the experience of the scene
export default function Experience() {
  useInspectProtection(true);

  const navigation = useScrollNavigation(
    cameraSettings.mode === "scroll",
  );
  const [isReady, setIsReady] = useState(false);
  const [orbitPose, setOrbitPose] = useState({
    position: { ...cameraSettings.orbit.position },
    lookAt: { ...cameraSettings.orbit.target },
    fov: cameraSettings.orbit.fov,
  });

  return (
    <div
      className={`portfolio-shell ${isOrbitMode ? "portfolio-shell--orbit" : ""} ${isScrollMode ? "portfolio-shell--scroll" : ""}`}
      onContextMenu={blockInspectContextMenu}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        onContextMenu={blockInspectContextMenu}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = rendererSettings.exposure;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.domElement.oncontextmenu = (event) => {
            event.preventDefault();
            return false;
          };
        }}
      >
        <Scene
          {...navigation}
          onReady={() => setIsReady(true)}
          onOrbitPoseChange={setOrbitPose}
        />
      </Canvas>
      <Overlay
        isReady={isReady}
        progress={navigation.targetScrollProgress}
        mode={cameraSettings.mode}
      />
      {isOrbitMode && isReady && <CameraHud {...orbitPose} />}
    </div>
  );
}
