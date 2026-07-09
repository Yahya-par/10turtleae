import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";
import { isJourneyDevMode } from "@features/portfolio/config/journeySettings";
import { sceneLinkSettings, type SceneLinkConfig } from "@features/portfolio/config/sceneLinkSettings";
import { renderSettings } from "@features/portfolio/config/renderSettings";
import { useScrollNavigation } from "@features/portfolio/hooks/useScrollNavigation";
import { usePortfolioAudio } from "@features/portfolio/hooks/usePortfolioAudio";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { useInspectProtection, blockInspectContextMenu } from "@features/portfolio/hooks/useInspectProtection";
import { useDeviceType, useIsPortrait } from "@features/portfolio/hooks/useDeviceType";
import LoaderSelector from "@features/portfolio/components/loading/LoaderSelector";
import AudioToggle from "@features/portfolio/components/ui/AudioToggle";
import MobileTiltPrompt from "@features/portfolio/components/ui/MobileTiltPrompt";
import RedirectCountdownModal from "@features/portfolio/components/ui/RedirectCountdownModal";
import Scene from "./scene/Scene";
import Overlay from "./scene/Overlay";
import CameraHud from "./camera/CameraHud";
import DesertSafariVideoOverlay from "./animations/DesertSafariVideoOverlay";

const isOrbitMode = cameraSettings.mode === "orbit";
const isScrollMode = cameraSettings.mode === "scroll";
const FINAL_CTA_ID = "finalcta001";
const REDIRECT_SECONDS = 3;
const REPEAT_REDIRECT_DELAY_MS = 1400;
const HAS_SEEN_JOURNEY_KEY = "hasSeenJourney";
const HAS_SEEN_JOURNEY_AT_KEY = "hasSeenJourneyAt";
const JOURNEY_TTL_MS = 24 * 60 * 60 * 1000;

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
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectModalMode, setRedirectModalMode] = useState<"countdown" | "repeat">("countdown");
  const repeatRedirectTimerRef = useRef<number | null>(null);
  const handleTiltAccept = useCallback(() => setIntroAcknowledged(true), []);
  const getFinalCtaUrl = useCallback(() => {
    return sceneLinkSettings.links.find((link) => link.id === FINAL_CTA_ID)?.url ?? "https://10turtle.ae";
  }, []);
  const scheduleRepeatRedirect = useCallback((url: string) => {
    if (repeatRedirectTimerRef.current) {
      window.clearTimeout(repeatRedirectTimerRef.current);
    }
    repeatRedirectTimerRef.current = window.setTimeout(() => {
      window.location.href = url;
    }, REPEAT_REDIRECT_DELAY_MS);
  }, []);

  useEffect(() => {
    if (isJourneyDevMode) return;

    const now = Date.now();
    const hasSeenJourney = localStorage.getItem(HAS_SEEN_JOURNEY_KEY) === "true";
    const lastSeenAt = Number(localStorage.getItem(HAS_SEEN_JOURNEY_AT_KEY) ?? "0");
    const isWithinCooldown = hasSeenJourney && lastSeenAt > 0 && now - lastSeenAt < JOURNEY_TTL_MS;

    if (!isWithinCooldown) return;

    setRedirectModalMode("repeat");
    setShowRedirectModal(true);
    scheduleRepeatRedirect(getFinalCtaUrl());
  }, [getFinalCtaUrl, scheduleRepeatRedirect]);

  useEffect(() => {
    return () => {
      if (!repeatRedirectTimerRef.current) return;
      window.clearTimeout(repeatRedirectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handlePageShow = () => {
      // Back-forward cache can restore the previous React state; force-hide stale modal.
      setShowRedirectModal(false);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);
  const handleTargetOpen = useCallback((target: SceneLinkConfig) => {
    if (target.id !== FINAL_CTA_ID) return true;

    if (isJourneyDevMode) {
      setRedirectModalMode("countdown");
      setShowRedirectModal(true);
      return false;
    }

    const now = Date.now();
    const hasSeenJourney = localStorage.getItem(HAS_SEEN_JOURNEY_KEY) === "true";
    const lastSeenAt = Number(localStorage.getItem(HAS_SEEN_JOURNEY_AT_KEY) ?? "0");
    const isWithinCooldown = hasSeenJourney && lastSeenAt > 0 && now - lastSeenAt < JOURNEY_TTL_MS;

    if (isWithinCooldown) {
      setRedirectModalMode("repeat");
      setShowRedirectModal(true);
      scheduleRepeatRedirect(target.url);
      return false;
    }

    localStorage.setItem(HAS_SEEN_JOURNEY_KEY, "true");
    localStorage.setItem(HAS_SEEN_JOURNEY_AT_KEY, String(now));
    setRedirectModalMode("countdown");
    setShowRedirectModal(true);
    return false;
  }, [scheduleRepeatRedirect]);
  const handleRedirectFinish = useCallback(() => {
    window.location.href = getFinalCtaUrl();
  }, [getFinalCtaUrl]);

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
          onTargetOpen={handleTargetOpen}
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
      <DesertSafariVideoOverlay
        enabled={loaderDone}
        scrollProgress={navigation.scrollProgress}
        scrollBounds={navigation.scrollBounds}
      />
      <AudioToggle isMuted={isMuted} onToggle={toggleMute} visible={loaderDone} />
      {isOrbitMode && loaderDone && isReady && <CameraHud {...orbitPose} />}
      {showIntroPrompt && (
        <MobileTiltPrompt variant="intro" onAccept={handleTiltAccept} />
      )}
      {showTiltGate && <MobileTiltPrompt variant="gate" />}
      {showRedirectModal && (
        <RedirectCountdownModal
          mode={redirectModalMode}
          seconds={REDIRECT_SECONDS}
          destinationLabel="10turtle.ae"
          onFinish={handleRedirectFinish}
        />
      )}
    </div>
  );
}
