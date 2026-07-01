"use client";

import { useEffect, useState, type RefObject } from "react";
import type { CameraMode } from "@/app/config/cameraSettings";

type OverlayProps = {
  isReady: boolean;
  progress: RefObject<number>;
  mode: CameraMode;
};

// Overlay - the overlay component is responsible for the overlay UI of the scene
export default function Overlay({ isReady, progress, mode }: OverlayProps) {
  const [visible, setVisible] = useState(true);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isReady) return;

    const timeout = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [isReady]);

  useEffect(() => {
    if (mode !== "scroll") return;

    const interval = window.setInterval(() => {
      setPercent(Math.round((progress.current ?? 0) * 100));
    }, 120);

    return () => window.clearInterval(interval);
  }, [progress, mode]);

  return (
    <>
      <div className={`portfolio-loader ${isReady ? "is-ready" : ""}`}>
        <div className="portfolio-loader__card">
          <span className="portfolio-loader__emoji">🏜️</span>
          <p>{isReady ? "Entering the scene..." : "Loading your world..."}</p>
        </div>
      </div>

      {mode === "orbit" && isReady && (
        <div className="portfolio-hint is-visible">
          <p>left-drag orbit · scroll zoom · right-drag pan</p>
        </div>
      )}

      {mode === "scroll" && (
        <div className={`portfolio-hint ${visible && isReady ? "is-visible" : ""}`}>
          <p>scroll / drag up &amp; down to navigate</p>
        </div>
      )}

      {mode === "scroll" && (
        <div className="portfolio-progress">
          <div className="portfolio-progress__track">
            <div
              className="portfolio-progress__fill"
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
