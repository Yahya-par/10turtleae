"use client";

import { useProgress } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useState } from "react";
import { cameraSettings } from "@/app/config/cameraSettings";
import FixedCamera from "./FixedCamera";
import OrbitCamera from "./OrbitCamera";
import ScrollCamera from "./ScrollCamera";
import DesertModel from "./DesertModel";
import type { SceneFrame } from "./cameraPath";
import type { useScrollNavigation } from "@/app/hooks/useScrollNavigation";

type SceneProps = ReturnType<typeof useScrollNavigation> & {
  onReady: () => void;
  onOrbitPoseChange: (pose: {
    position: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
    fov: number;
  }) => void;
};

function LoadingTracker({ onReady }: { onReady: () => void }) {
  const { active } = useProgress();

  useEffect(() => {
    if (!active) onReady();
  }, [active, onReady]);

  return null;
}

export default function Scene({
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  onReady,
  onOrbitPoseChange,
}: SceneProps) {
  const [sceneFrame, setSceneFrame] = useState<SceneFrame | null>(null);
  const mode = cameraSettings.mode;

  const handleFrameReady = useCallback((frame: SceneFrame) => {
    setSceneFrame(frame);
  }, []);

  return (
    <>
      <color attach="background" args={["#e8d9c0"]} />
      <fog attach="fog" args={["#e8d9c0", 40, 85]} />
      <ambientLight intensity={0.35} color="#fff5eb" />
      <hemisphereLight args={["#fff8ee", "#c4a574", 0.55]} />
      <directionalLight
        castShadow
        position={[18, 24, -4]}
        color="#ffe8c8"
        intensity={2.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-6}
        shadow-camera-near={4}
        shadow-camera-far={50}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-10, 8, -18]} color="#dceeff" intensity={0.45} />

      {mode === "orbit" && <OrbitCamera onPoseChange={onOrbitPoseChange} />}

      {mode === "manual" && <FixedCamera />}

      {mode === "scroll" && (
        <ScrollCamera
          sceneFrame={sceneFrame}
          scrollProgress={scrollProgress}
          targetScrollProgress={targetScrollProgress}
          lerpFactor={lerpFactor}
        />
      )}

      <Suspense fallback={null}>
        <LoadingTracker onReady={onReady} />
        <DesertModel onFrameReady={handleFrameReady} />
      </Suspense>
    </>
  );
}
