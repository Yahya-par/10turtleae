import { Canvas } from "@react-three/fiber";
import { useCallback, useState } from "react";
import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";
import { renderSettings } from "@features/portfolio/config/renderSettings";
import { useScrollNavigation } from "@features/portfolio/hooks/useScrollNavigation";
import { usePortfolioAudio } from "@features/portfolio/hooks/usePortfolioAudio";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { useInspectProtection, blockInspectContextMenu } from "@features/portfolio/hooks/useInspectProtection";
import { useDeviceType, useIsPortrait } from "@features/portfolio/hooks/useDeviceType";
import LoaderSelector from "@features/portfolio/components/loading/LoaderSelector";
import AudioToggle from "@features/portfolio/components/ui/AudioToggle";
import MobileTiltPrompt from "@features/portfolio/components/ui/MobileTiltPrompt";
import Scene from "./scene/Scene";
import Overlay from "./scene/Overlay";
import CameraHud from "./camera/CameraHud";

const isOrbitMode = cameraSettings.mode === "orbit";
const isScrollMode = cameraSettings.mode === "scroll";

// Experience - the experience component is responsible for the experience of the scene
export default function Experience() {
  useInspectProtection(true);

  const navigation = useScrollNavigation(
    cameraSettings.mode === "scroll",
  );
  const [isReady, setIsReady] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const handleLoaderComplete = useCallback(() => setLoaderDone(true), []);
  const handleCanvasPointerDown = useCallback(() => {
    void audioManager.unlock();
  }, []);
  const { isMuted, toggleMute } = usePortfolioAudio(loaderDone);
  const [orbitPose, setOrbitPose] = useState({
    position: { ...cameraSettings.orbit.position },
    lookAt: { ...cameraSettings.orbit.target },
    fov: cameraSettings.orbit.fov,
  });

  const deviceType = useDeviceType();
  const isPortrait = useIsPortrait();
  const isHandheld = deviceType !== "desktop";
  const [introAcknowledged, setIntroAcknowledged] = useState(false);
  const handleTiltAccept = useCallback(() => setIntroAcknowledged(true), []);

  // Intro card (with Okay) until acknowledged, then a "tilt to continue" gate
  // that stays until the device is physically rotated to landscape.
  const showIntroPrompt = isHandheld && isPortrait && !introAcknowledged;
  const showTiltGate = isHandheld && isPortrait && introAcknowledged;

  return (
    <div
      className={`portfolio-shell ${isOrbitMode ? "portfolio-shell--orbit" : ""} ${isScrollMode ? "portfolio-shell--scroll" : ""}`}
      onContextMenu={blockInspectContextMenu}
      onPointerDown={handleCanvasPointerDown}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        onContextMenu={blockInspectContextMenu}
        onPointerDown={handleCanvasPointerDown}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = renderSettings.exposure;
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
      {!loaderDone && (
        <LoaderSelector
          isAssetsReady={isReady}
          onComplete={handleLoaderComplete}
        />
      )}
      <Overlay
        isReady={loaderDone}
        progress={navigation.targetScrollProgress}
        scrollBounds={navigation.scrollBounds}
        mode={cameraSettings.mode}
      />
      <AudioToggle isMuted={isMuted} onToggle={toggleMute} visible={loaderDone} />
      {isOrbitMode && loaderDone && isReady && <CameraHud {...orbitPose} />}
      {showIntroPrompt && (
        <MobileTiltPrompt variant="intro" onAccept={handleTiltAccept} />
      )}
      {showTiltGate && <MobileTiltPrompt variant="gate" />}
    </div>
  );
}
