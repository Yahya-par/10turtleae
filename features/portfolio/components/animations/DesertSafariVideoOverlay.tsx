"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { decompressFrames, parseGIF } from "gifuct-js";
import { desertSafariVideoSettings } from "@features/portfolio/config/desertSafariVideoSettings";
import { desertSafariScreenAnchor } from "@features/portfolio/utils/desertSafariScreenAnchor";
import type { ScrollProgressBounds } from "@features/portfolio/components/camera/CameraPath";

type DesertSafariVideoOverlayProps = {
  scrollProgress: RefObject<number>;
  scrollBounds: RefObject<ScrollProgressBounds>;
  enabled?: boolean;
};

type GifFrame = {
  dims: { top: number; left: number; width: number; height: number };
  delay: number;
  disposalType?: number;
  patch: Uint8ClampedArray;
};

type GifPlayback = {
  update: (deltaMs: number) => void;
  dispose: () => void;
};

function keyNearBlackPixels(imageData: ImageData) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;
    if (a < 12 || (r < 5 && g < 5 && b < 5)) {
      data[i + 3] = 0;
    }
  }
}

async function createGifPlayback(
  url: string,
  canvas: HTMLCanvasElement,
): Promise<GifPlayback> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load GIF: ${response.status} ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true) as GifFrame[];
  if (!frames.length) {
    throw new Error(`GIF has no frames: ${url}`);
  }

  const gifWidth = gif.lsd?.width || frames[0].dims.width;
  const gifHeight = gif.lsd?.height || frames[0].dims.height;

  canvas.width = gifWidth;
  canvas.height = gifHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");

  const patchCanvas = document.createElement("canvas");
  const patchCtx = patchCanvas.getContext("2d");
  if (!patchCtx) throw new Error("2D patch canvas unavailable");

  let frameIndex = 0;
  let elapsed = 0;
  let needsDisposal = false;
  let frameImageData: ImageData | null = null;
  let disposed = false;

  const drawPatch = (frame: GifFrame) => {
    const { dims } = frame;
    if (
      !frameImageData ||
      frameImageData.width !== dims.width ||
      frameImageData.height !== dims.height
    ) {
      patchCanvas.width = dims.width;
      patchCanvas.height = dims.height;
      frameImageData = patchCtx.createImageData(dims.width, dims.height);
    }

    frameImageData.data.set(frame.patch);
    patchCtx.putImageData(frameImageData, 0, 0);

    if (needsDisposal) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      needsDisposal = false;
    }

    ctx.drawImage(patchCanvas, dims.left, dims.top);

    const keyed = ctx.getImageData(0, 0, canvas.width, canvas.height);
    keyNearBlackPixels(keyed);
    ctx.putImageData(keyed, 0, 0);
  };

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPatch(frames[0]);

  return {
    update: (deltaMs: number) => {
      if (disposed || frames.length <= 1) return;

      elapsed += deltaMs;
      const current = frames[frameIndex];
      const delay = Math.max(20, current?.delay || 100);
      if (elapsed < delay) return;
      elapsed -= delay;

      if (current?.disposalType === 2) needsDisposal = true;
      frameIndex = (frameIndex + 1) % frames.length;
      drawPatch(frames[frameIndex]);
    },
    dispose: () => {
      disposed = true;
    },
  };
}

function resolveVisibleProgressRange() {
  if (desertSafariScreenAnchor.rangeReady) {
    return {
      min: desertSafariScreenAnchor.visibleMin,
      max: desertSafariScreenAnchor.visibleMax,
    };
  }

  const [min, max] = desertSafariVideoSettings.visibleBetweenProgress;
  return { min, max };
}

export default function DesertSafariVideoOverlay({
  scrollProgress,
  scrollBounds,
  enabled = true,
}: DesertSafariVideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<GifPlayback | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const positionRafRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const settings = desertSafariVideoSettings;
  const { screen } = settings;

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    const tick = () => {
      const progress = scrollProgress.current ?? 0;
      const bounds = scrollBounds.current;
      const clamped = Math.min(bounds.max, Math.max(bounds.min, progress));
      const { min, max } = resolveVisibleProgressRange();
      setVisible(clamped >= min && clamped <= max);
    };

    tick();
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [enabled, scrollBounds, scrollProgress]);

  useEffect(() => {
    if (!enabled || !visible) {
      if (positionRafRef.current !== null) {
        cancelAnimationFrame(positionRafRef.current);
        positionRafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const overlay = overlayRef.current;
      if (overlay) {
        if (desertSafariScreenAnchor.ready) {
          overlay.style.visibility = "visible";
          overlay.style.left = `${desertSafariScreenAnchor.left}px`;
          overlay.style.top = `${desertSafariScreenAnchor.top}px`;
        } else {
          overlay.style.visibility = "hidden";
        }
      }
      positionRafRef.current = requestAnimationFrame(tick);
    };

    positionRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (positionRafRef.current !== null) {
        cancelAnimationFrame(positionRafRef.current);
        positionRafRef.current = null;
      }
    };
  }, [enabled, visible]);

  useEffect(() => {
    if (!enabled || !visible) {
      playbackRef.current?.dispose();
      playbackRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    void createGifPlayback(settings.videoUrl, canvas)
      .then((playback) => {
        if (cancelled) {
          playback.dispose();
          return;
        }

        playbackRef.current = playback;

        const frame = (time: number) => {
          if (!playbackRef.current) return;
          const last = lastFrameRef.current ?? time;
          playbackRef.current.update(time - last);
          lastFrameRef.current = time;
          rafRef.current = requestAnimationFrame(frame);
        };

        rafRef.current = requestAnimationFrame(frame);

        if (process.env.NODE_ENV === "development") {
          console.info("[DesertSafariVideoOverlay] Screen overlay ready:", {
            url: settings.videoUrl,
            screen,
          });
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[DesertSafariVideoOverlay] Failed:", error);
        }
      });

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameRef.current = null;
      playbackRef.current?.dispose();
      playbackRef.current = null;
    };
  }, [enabled, visible, settings, screen]);

  if (!enabled || !visible) return null;

  const width =
    typeof screen.width === "number" ? `${screen.width}px` : screen.width;

  return (
    <div
      ref={overlayRef}
      className="desert-safari-gif-overlay"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width,
        transform: screen.center ? "translate(-50%, -50%)" : undefined,
        pointerEvents: "none",
        zIndex: 12,
        visibility: "hidden",
      }}
    >
      <canvas ref={canvasRef} className="desert-safari-gif-overlay__canvas" />
    </div>
  );
}
