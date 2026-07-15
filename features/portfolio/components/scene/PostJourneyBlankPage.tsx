import { useEffect, useRef, type RefObject } from "react";
import {
  type ScrollProgressBounds,
} from "@features/portfolio/components/camera/CameraPath";
import {
  postJourneyScrollSettings,
  type PostJourneyTransition,
} from "@features/portfolio/config/postJourneyScrollSettings";
import { markJourneySeen } from "@features/portfolio/utils/journeyStorage";

type PostJourneyBlankPageProps = {
  enabled: boolean;
  scrollProgress: RefObject<number>;
  scrollBounds: RefObject<ScrollProgressBounds>;
  /** When true, plays the reveal regardless of scroll (e.g. final CTA click). */
  forceRevealRef?: RefObject<boolean>;
};

/** Radius % that covers the viewport corner when centered (~√2/2 + pad). */
const IRIS_FULL_RADIUS_PERCENT = 75;

/** How close to the journey end (progress units) counts as "arrived". */
const AUTO_TRIGGER_EPSILON = 0.004;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function applyBlankPageStyle(
  panel: HTMLDivElement,
  canvas: HTMLCanvasElement | null,
  transition: PostJourneyTransition,
  postT: number,
) {
  const active = postT > 0.001;

  panel.style.transform = "none";
  panel.style.opacity = "1";
  panel.style.clipPath = "none";

  if (transition === "fade") {
    panel.style.opacity = String(postT);
  } else if (transition === "blurFade") {
    panel.style.opacity = String(postT);
    if (canvas) {
      if (active) {
        const blur = postT * postJourneyScrollSettings.blurMaxPx;
        const brightness =
          1 - postT * (1 - postJourneyScrollSettings.blurDimTo);
        canvas.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`;
      } else {
        canvas.style.filter = "";
      }
    }
  } else if (transition === "wipe") {
    panel.style.clipPath = `inset(0 ${(1 - postT) * 100}% 0 0)`;
  } else if (transition === "iris") {
    const radius = postT * IRIS_FULL_RADIUS_PERCENT;
    panel.style.clipPath = `circle(${radius}% at 50% 50%)`;
  } else {
    const offset = (1 - postT) * 100;
    panel.style.transform =
      transition === "vertical"
        ? `translate3d(0, ${offset}%, 0)`
        : `translate3d(${offset}%, 0, 0)`;
  }

  panel.style.pointerEvents = active ? "auto" : "none";
  panel.classList.toggle("is-active", active);
  panel.setAttribute("aria-hidden", active ? "false" : "true");
}

function initialClipPath(transition: PostJourneyTransition) {
  if (transition === "wipe") return "inset(0 100% 0 0)";
  if (transition === "iris") return "circle(0% at 50% 50%)";
  return "none";
}

/**
 * Reveals a blank full-viewport page after the 3D model scroll ends.
 * Style is controlled by `postJourneyScrollSettings.transition`.
 */
export default function PostJourneyBlankPage({
  enabled,
  scrollProgress,
  scrollBounds,
  forceRevealRef,
}: PostJourneyBlankPageProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTRef = useRef(-1);
  const autoTRef = useRef(0);
  const lastTimeRef = useRef(0);
  const redirectedRef = useRef(false);
  const transition = postJourneyScrollSettings.transition;

  useEffect(() => {
    if (!enabled || !postJourneyScrollSettings.enabled) return;

    if (transition === "blurFade" && !canvasRef.current) {
      // Canvas is a sibling inside the same portfolio shell.
      canvasRef.current =
        panelRef.current?.parentElement?.querySelector("canvas") ?? null;
    }

    lastTimeRef.current = performance.now();

    let frameId = 0;
    const tick = () => {
      const panel = panelRef.current;
      if (panel) {
        // Play toward 1 while parked at the journey end (or forced by the
        // final CTA); reverse otherwise.
        const bounds = scrollBounds.current;
        const modelMin = bounds.modelMin ?? bounds.min;
        const atEnd =
          forceRevealRef?.current === true ||
          (scrollProgress.current ?? 0) <= modelMin + AUTO_TRIGGER_EPSILON;

        const now = performance.now();
        const dt = Math.min(now - lastTimeRef.current, 100);
        lastTimeRef.current = now;

        const step = dt / Math.max(postJourneyScrollSettings.autoDurationMs, 1);
        autoTRef.current = Math.min(
          1,
          Math.max(0, autoTRef.current + (atEnd ? step : -step)),
        );
        const postT = easeInOutCubic(autoTRef.current);

        if (Math.abs(postT - lastTRef.current) > 0.0005) {
          lastTRef.current = postT;
          applyBlankPageStyle(panel, canvasRef.current, transition, postT);
        }

        // Hand off to the external site the moment the reveal completes, so
        // the website appears as the natural continuation of the transition.
        const { redirectUrl } = postJourneyScrollSettings;
        if (
          redirectUrl &&
          !redirectedRef.current &&
          autoTRef.current >= 1 &&
          atEnd
        ) {
          redirectedRef.current = true;
          // The journey counts as "seen" only once this final transition
          // actually fires the redirect (not on the CTA click).
          markJourneySeen();
          window.location.assign(redirectUrl);
        }
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
      if (canvasRef.current) {
        canvasRef.current.style.filter = "";
      }
    };
  }, [enabled, forceRevealRef, scrollBounds, scrollProgress, transition]);

  if (!enabled || !postJourneyScrollSettings.enabled) return null;

  const usesOpacityReveal = transition === "fade" || transition === "blurFade";
  const { redirectUrl } = postJourneyScrollSettings;

  return (
    <div
      ref={panelRef}
      className={`post-journey-blank post-journey-blank--${transition}`}
      style={{
        background: postJourneyScrollSettings.background,
        opacity: usesOpacityReveal ? 0 : 1,
        transform: "none",
        clipPath: initialClipPath(transition),
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {redirectUrl && postJourneyScrollSettings.redirectPreviewSrc ? (
        // Snapshot of the destination site (it blocks iframes via
        // X-Frame-Options), shown through the transition so the iris opens
        // onto the website and the redirect at 100% lands on the same view.
        <img
          src={postJourneyScrollSettings.redirectPreviewSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
            pointerEvents: "none",
          }}
          draggable={false}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
