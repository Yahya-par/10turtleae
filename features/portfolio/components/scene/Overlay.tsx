import { useEffect, useState, type RefObject } from "react";
import type { CameraMode } from "@features/portfolio/config/cameraSettings";
import { getNormalizedScrollProgress } from "@features/portfolio/components/camera/CameraPath";
import type { ScrollProgressBounds } from "@features/portfolio/components/camera/CameraPath";

type OverlayProps = {
  isReady: boolean;
  progress: RefObject<number>;
  scrollBounds: RefObject<ScrollProgressBounds>;
  mode: CameraMode;
};

// Overlay - the overlay component is responsible for the overlay UI of the scene
export default function Overlay({ isReady, progress, scrollBounds, mode }: OverlayProps) {
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
      const normalized = getNormalizedScrollProgress(
        progress.current ?? 0,
        scrollBounds.current,
      );
      setPercent(Math.round(normalized * 100));
    }, 120);

    return () => window.clearInterval(interval);
  }, [progress, scrollBounds, mode]);

  return (
    <>
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
