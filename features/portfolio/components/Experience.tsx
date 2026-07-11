import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";
import { isJourneyDevMode } from "@features/portfolio/config/journeySettings";
import { sceneLinkSettings, type SceneLinkConfig } from "@features/portfolio/config/sceneLinkSettings";
import { renderSettings } from "@features/portfolio/config/renderSettings";
import { useScrollNavigation } from "@features/portfolio/hooks/useScrollNavigation";
import { usePortfolioAudio } from "@features/portfolio/hooks/usePortfolioAudio";
import { audioManager } from "@features/portfolio/utils/audioManager";
import { useInspectProtection, blockInspectContextMenu } from "@features/portfolio/hooks/useInspectProtection";
import { useIsHandheld, useIsPortrait } from "@features/portfolio/hooks/useDeviceType";
import LoaderSelector from "@features/portfolio/components/loading/LoaderSelector";
import AudioToggle from "@features/portfolio/components/ui/AudioToggle";
import MobileTiltPrompt from "@features/portfolio/components/ui/MobileTiltPrompt";
import RedirectCountdownModal from "@features/portfolio/components/ui/RedirectCountdownModal";
import {
  isIOSBrowser,
  isStandaloneDisplayMode,
} from "@features/portfolio/utils/iosStandalone";
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
const FULLSCREEN_NOTICE_MS = 2800;
const IOS_FULLSCREEN_GUIDE_MS = 9000;

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};

function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as FullscreenCapableDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
}

async function requestLandscapeFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (isFullscreenActive()) return true;
  const element = document.documentElement as FullscreenCapableElement;
  if (typeof element.requestFullscreen === "function") {
    await element.requestFullscreen();
    return isFullscreenActive();
  }
  if (typeof element.webkitRequestFullscreen === "function") {
    await element.webkitRequestFullscreen();
    return isFullscreenActive();
  }
  if (typeof element.msRequestFullscreen === "function") {
    await element.msRequestFullscreen();
    return isFullscreenActive();
  }
  return false;
}

// Experience - the experience component is responsible for the experience of the scene
export default function Experience() {
  useInspectProtection(true);

  const navigation = useScrollNavigation(
    cameraSettings.mode === "scroll",
  );
  const [isReady, setIsReady] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const handleLoaderComplete = useCallback(() => setLoaderDone(true), []);
  const { isMuted, toggleMute } = usePortfolioAudio(loaderDone);
  const [orbitPose, setOrbitPose] = useState({
    position: { ...cameraSettings.orbit.position },
    lookAt: { ...cameraSettings.orbit.target },
    fov: cameraSettings.orbit.fov,
  });

  const isPortrait = useIsPortrait();
  const isHandheld = useIsHandheld();
  const [introAcknowledged, setIntroAcknowledged] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectModalMode, setRedirectModalMode] = useState<"countdown" | "repeat">("countdown");
  const [showFullscreenNotice, setShowFullscreenNotice] = useState(false);
  const [needsFullscreenTapRetry, setNeedsFullscreenTapRetry] = useState(false);
  const [showIosFullscreenGuide, setShowIosFullscreenGuide] = useState(false);
  const repeatRedirectTimerRef = useRef<number | null>(null);
  const fullscreenNoticeTimerRef = useRef<number | null>(null);
  const wasPortraitRef = useRef(isPortrait);
  const initialLandscapeOfferRef = useRef(false);

  useLayoutEffect(() => {
    initialLandscapeOfferRef.current = false;
    wasPortraitRef.current = isPortrait;
  }, []);

  const offerHandheldFullscreen = useCallback(() => {
    if (!isHandheld || !loaderDone || isPortrait) return;

    const shouldShowIosGuide = isIOSBrowser() && !isStandaloneDisplayMode();
    setShowIosFullscreenGuide(shouldShowIosGuide);
    setShowFullscreenNotice(true);
    setNeedsFullscreenTapRetry(!shouldShowIosGuide);

    if (fullscreenNoticeTimerRef.current) {
      window.clearTimeout(fullscreenNoticeTimerRef.current);
      fullscreenNoticeTimerRef.current = null;
    }

    void requestLandscapeFullscreen()
      .then((enteredFullscreen) => {
        if (shouldShowIosGuide) {
          fullscreenNoticeTimerRef.current = window.setTimeout(() => {
            setShowFullscreenNotice(false);
          }, IOS_FULLSCREEN_GUIDE_MS);
          return;
        }
        if (enteredFullscreen) {
          setNeedsFullscreenTapRetry(false);
          fullscreenNoticeTimerRef.current = window.setTimeout(() => {
            setShowFullscreenNotice(false);
          }, FULLSCREEN_NOTICE_MS);
          return;
        }
        setNeedsFullscreenTapRetry(true);
      })
      .catch(() => {
        setNeedsFullscreenTapRetry(!shouldShowIosGuide);
      });
  }, [isHandheld, isPortrait, loaderDone]);
  const handleCanvasPointerDown = useCallback(() => {
    void audioManager.unlock();
    if (!isHandheld || isPortrait) return;

    if (needsFullscreenTapRetry || !isFullscreenActive()) {
      void requestLandscapeFullscreen()
        .then((enteredFullscreen) => {
          if (!enteredFullscreen) {
            setNeedsFullscreenTapRetry(true);
            setShowFullscreenNotice(true);
            return;
          }
          setNeedsFullscreenTapRetry(false);
          if (fullscreenNoticeTimerRef.current) {
            window.clearTimeout(fullscreenNoticeTimerRef.current);
          }
          fullscreenNoticeTimerRef.current = window.setTimeout(() => {
            setShowFullscreenNotice(false);
          }, FULLSCREEN_NOTICE_MS);
        })
        .catch(() => {
          setNeedsFullscreenTapRetry(true);
          setShowFullscreenNotice(true);
        });
    }
  }, [isHandheld, isPortrait, needsFullscreenTapRetry]);
  const handleEnterFullscreen = useCallback(() => {
    void requestLandscapeFullscreen()
      .then((enteredFullscreen) => {
        if (!enteredFullscreen) {
          setNeedsFullscreenTapRetry(true);
          setShowFullscreenNotice(true);
          return;
        }
        setNeedsFullscreenTapRetry(false);
        if (fullscreenNoticeTimerRef.current) {
          window.clearTimeout(fullscreenNoticeTimerRef.current);
        }
        fullscreenNoticeTimerRef.current = window.setTimeout(() => {
          setShowFullscreenNotice(false);
        }, FULLSCREEN_NOTICE_MS);
      })
      .catch(() => {
        setNeedsFullscreenTapRetry(true);
        setShowFullscreenNotice(true);
      });
  }, []);
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
    return () => {
      if (!fullscreenNoticeTimerRef.current) return;
      window.clearTimeout(fullscreenNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const syncWithFullscreenState = () => {
      if (!isHandheld || !loaderDone || isPortrait) return;
      if (isFullscreenActive()) {
        setNeedsFullscreenTapRetry(false);
        return;
      }
      offerHandheldFullscreen();
    };

    document.addEventListener("fullscreenchange", syncWithFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncWithFullscreenState as EventListener);
    document.addEventListener("MSFullscreenChange", syncWithFullscreenState as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", syncWithFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncWithFullscreenState as EventListener);
      document.removeEventListener("MSFullscreenChange", syncWithFullscreenState as EventListener);
    };
  }, [isHandheld, isPortrait, loaderDone, offerHandheldFullscreen]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      setShowRedirectModal(false);
      initialLandscapeOfferRef.current = false;
      wasPortraitRef.current = window.matchMedia("(orientation: portrait)").matches;

      if (event.persisted) {
        setShowFullscreenNotice(false);
        if (
          isHandheld &&
          loaderDone &&
          !window.matchMedia("(orientation: portrait)").matches
        ) {
          offerHandheldFullscreen();
        }
      } else {
        setShowFullscreenNotice(false);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [isHandheld, loaderDone, offerHandheldFullscreen]);

  useEffect(() => {
    if (!isHandheld || !loaderDone) return;

    if (isPortrait) {
      wasPortraitRef.current = true;
      return;
    }

    const rotatedToLandscape = wasPortraitRef.current;
    wasPortraitRef.current = false;

    if (rotatedToLandscape) {
      offerHandheldFullscreen();
      return;
    }

    if (!initialLandscapeOfferRef.current) {
      initialLandscapeOfferRef.current = true;
      offerHandheldFullscreen();
    }
  }, [isHandheld, isPortrait, loaderDone, offerHandheldFullscreen]);
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
      className={`portfolio-shell ${isOrbitMode ? "portfolio-shell--orbit" : ""} ${isScrollMode ? "portfolio-shell--scroll" : ""} ${isScrollMode && isHandheld ? "portfolio-shell--handheld" : ""}`}
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
        isHandheld={isHandheld}
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
      {showFullscreenNotice && (
        <div className="fullscreen-notice" role="dialog" aria-modal="true">
          <div className="fullscreen-notice__card">
            <h2 className="fullscreen-notice__title">Entering fullscreen</h2>
            <p className="fullscreen-notice__text">
              For the best experience, view this journey in fullscreen mode.
            </p>
            {showIosFullscreenGuide && (
              <p className="fullscreen-notice__hint">
                iPhone and iPad Safari cannot hide the toolbar in a browser tab. Use Share
                {" -> "}Add to Home Screen, then open this app from your home screen.
              </p>
            )}
            {needsFullscreenTapRetry && (
              <p className="fullscreen-notice__hint">
                Tap the button below or anywhere on the scene to enter fullscreen.
              </p>
            )}
            {needsFullscreenTapRetry && (
              <button
                type="button"
                className="tilt-prompt__button fullscreen-notice__button"
                onClick={handleEnterFullscreen}
              >
                Enter Fullscreen
              </button>
            )}
            <button
              type="button"
              className="fullscreen-notice__dismiss"
              onClick={() => setShowFullscreenNotice(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
