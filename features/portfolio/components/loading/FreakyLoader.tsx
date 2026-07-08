import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type FreakyLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

/** Marquee ticker phrase (befreaky uses a repeating availability line). */
const MARQUEE_TEXT = "DESERT PORTFOLIO — 10 TURTLE — UAE COASTLINE — EST. 2026 — ";
const MARQUEE_REPEAT = 6;

/** Digits shown per reel: 0-9 plus a duplicate 0 for a seamless odometer wrap. */
const REEL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;

/**
 * FreakyLoader (loader3) - typographic preloader inspired by befreaky.co.
 * Features a rolling odometer percentage counter, a scrolling marquee ticker,
 * a masked wordmark reveal, and a curved slide-up exit.
 */
export default function FreakyLoader({
  isAssetsReady,
  onComplete,
}: FreakyLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const counterDoneRef = useRef(false);
  const exitStartedRef = useRef(false);
  const assetsReadyRef = useRef(isAssetsReady);
  const onCompleteRef = useRef(onComplete);

  assetsReadyRef.current = isAssetsReady;
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Continuous odometer: each place spins at 1/10th the speed of the one
    // to its right. `% 10` keeps us inside the strip; the duplicate trailing
    // 0 makes the 9 -> 0 wrap seamless with no visible jump.
    const setReel = (index: number, position: number) => {
      const el = reelRefs.current[index];
      if (el) {
        el.style.transform = `translateY(-${position % 10}em)`;
      }
    };

    const renderCounter = (value: number) => {
      setReel(0, value / 100); // hundreds
      setReel(1, value / 10); // tens
      setReel(2, value); // ones
    };

    renderCounter(0);

    const tryExit = () => {
      if (
        exitStartedRef.current ||
        !counterDoneRef.current ||
        !assetsReadyRef.current
      ) {
        return;
      }
      exitStartedRef.current = true;
      runExitSequence(() => onCompleteRef.current());
    };

    const counter = { value: 0 };

    const ctx = gsap.context(() => {
      gsap.set(".freaky-loader__panel", { opacity: 1 });
      gsap.set(".freaky-loader__word-line span", { yPercent: 115 });
      gsap.set(
        [
          ".freaky-loader__mark",
          ".freaky-loader__meta",
          ".freaky-loader__counter",
          ".freaky-loader__marquee",
        ],
        { opacity: 0, y: 24 },
      );

      const intro = gsap.timeline({ delay: 0.15 });
      intro
        .to(".freaky-loader__mark", {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
        })
        .to(
          ".freaky-loader__meta",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.5",
        )
        .to(
          ".freaky-loader__word-line span",
          {
            yPercent: 0,
            duration: 1,
            ease: "expo.out",
            stagger: 0.09,
          },
          "-=0.35",
        )
        .to(
          ".freaky-loader__counter",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.7",
        )
        .to(
          ".freaky-loader__marquee",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.5",
        );

      gsap.to(counter, {
        value: 100,
        duration: 4,
        delay: 0.4,
        ease: "power2.inOut",
        onUpdate: () => {
          renderCounter(counter.value);
        },
        onComplete: () => {
          renderCounter(100);
          counterDoneRef.current = true;
          tryExit();
        },
      });
    }, root);

    const assetsPoll = window.setInterval(() => {
      if (assetsReadyRef.current) tryExit();
    }, 100);

    return () => {
      window.clearInterval(assetsPoll);
      ctx.revert();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const marqueeItems = Array.from({ length: MARQUEE_REPEAT });

  return (
    <div className="freaky-loader" ref={rootRef} aria-hidden="true">
      <div className="freaky-loader__panel">
        <div className="freaky-loader__topbar">
          <span className="freaky-loader__mark">10 Turtle&reg;</span>
          <span className="freaky-loader__meta">Desert Portfolio</span>
        </div>

        <div className="freaky-loader__center">
          <h1 className="freaky-loader__wordmark">
            <span className="freaky-loader__word-line">
              <span>Desert</span>
            </span>
            <span className="freaky-loader__word-line">
              <span>Portfolio</span>
            </span>
          </h1>
        </div>

        <div className="freaky-loader__bottom">
          <div className="freaky-loader__counter">
            <div className="freaky-loader__reels">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="freaky-loader__reel">
                  <div
                    className="freaky-loader__reel-strip"
                    ref={(el) => {
                      reelRefs.current[slot] = el;
                    }}
                  >
                    {REEL_DIGITS.map((digit, i) => (
                      <span key={i}>{digit}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <span className="freaky-loader__percent">%</span>
          </div>

          <div className="freaky-loader__marquee">
            <div className="freaky-loader__marquee-track">
              {marqueeItems.map((_, i) => (
                <span key={i} className="freaky-loader__marquee-item">
                  {MARQUEE_TEXT}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="freaky-loader__curve" aria-hidden="true" />
      </div>
    </div>
  );
}

function runExitSequence(onComplete: () => void) {
  const exit = gsap.timeline({
    onComplete: () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      onComplete();
    },
  });

  exit
    .to(".freaky-loader__word-line span", {
      yPercent: -115,
      duration: 0.6,
      ease: "power3.in",
      stagger: 0.06,
    })
    .to(
      [
        ".freaky-loader__mark",
        ".freaky-loader__meta",
        ".freaky-loader__counter",
        ".freaky-loader__marquee",
      ],
      { opacity: 0, duration: 0.4, ease: "power2.in" },
      "-=0.4",
    )
    // Curved bottom edge flattens just before the panel finishes sliding out.
    .to(
      ".freaky-loader__curve",
      { height: 0, duration: 0.7, ease: "power3.inOut" },
      "-=0.1",
    )
    .to(
      ".freaky-loader__panel",
      { yPercent: -100, duration: 0.9, ease: "power3.inOut" },
      "<",
    );
}
