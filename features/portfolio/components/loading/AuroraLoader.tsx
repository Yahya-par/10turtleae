import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

type AuroraLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

const PHRASES = [
  "Warming up",
  "Loading assets",
  "Building the scene",
  "Composing light",
  "Almost there",
] as const;

const RING_TEXT = "LOADING \u00b7 10 TURTLE \u00b7 DESERT PORTFOLIO \u00b7 ";
/** Repeated to fill the circular textPath so it reads continuously. */
const RING_TEXT_FULL = RING_TEXT.repeat(3);

/** Vertical shutter panels revealed in sequence on exit. */
const PANELS = 6;

const PROGRESS_RADIUS = 70;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

/**
 * AuroraLoader (loader5) - cinematic Awwwards-style preloader.
 * Combines an SVG stroke-draw progress ring, a rotating circular text badge,
 * a masked cycling status word, a live counter, and a column-shutter reveal.
 */
export default function AuroraLoader({
  isAssetsReady,
  onComplete,
}: AuroraLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);
  const [phrase, setPhrase] = useState<(typeof PHRASES)[number]>(PHRASES[0]);
  const lastPhraseRef = useRef(0);
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

    const progress = progressRef.current;
    if (progress) {
      progress.style.strokeDasharray = `${PROGRESS_CIRCUMFERENCE}`;
      progress.style.strokeDashoffset = `${PROGRESS_CIRCUMFERENCE}`;
    }

    const updatePhrase = (value: number) => {
      const index = Math.min(
        PHRASES.length - 1,
        Math.floor((value / 100) * PHRASES.length),
      );
      if (index === lastPhraseRef.current) return;
      lastPhraseRef.current = index;
      const next = PHRASES[index];

      gsap.to(".aurora-loader__word-inner", {
        yPercent: -110,
        duration: 0.28,
        ease: "power2.in",
        onComplete: () => {
          setPhrase(next);
          gsap.fromTo(
            ".aurora-loader__word-inner",
            { yPercent: 110 },
            { yPercent: 0, duration: 0.4, ease: "power3.out" },
          );
        },
      });
    };

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
      gsap.set(".aurora-loader__content", { opacity: 1 });
      gsap.set(".aurora-loader__badge", { opacity: 0, scale: 0.8 });
      gsap.set(".aurora-loader__count", { opacity: 0, y: 18 });
      gsap.set(".aurora-loader__word", { opacity: 0, y: 18 });
      gsap.set(".aurora-loader__footer", { opacity: 0, y: 14 });

      const intro = gsap.timeline({ delay: 0.15 });
      intro
        .to(".aurora-loader__badge", {
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
        })
        .to(
          ".aurora-loader__count",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.6",
        )
        .to(
          ".aurora-loader__word",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.4",
        )
        .to(
          ".aurora-loader__footer",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.4",
        );

      gsap.to(counter, {
        value: 100,
        duration: 4,
        delay: 0.4,
        ease: "power2.inOut",
        onUpdate: () => {
          const value = counter.value;
          if (countRef.current) {
            countRef.current.textContent = String(Math.floor(value)).padStart(
              2,
              "0",
            );
          }
          if (progress) {
            progress.style.strokeDashoffset = `${
              PROGRESS_CIRCUMFERENCE * (1 - value / 100)
            }`;
          }
          updatePhrase(value);
        },
        onComplete: () => {
          if (countRef.current) countRef.current.textContent = "100";
          if (progress) progress.style.strokeDashoffset = "0";
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

  return (
    <div className="aurora-loader" ref={rootRef} aria-hidden="true">
      <div className="aurora-loader__panels">
        {Array.from({ length: PANELS }).map((_, i) => (
          <div key={i} className="aurora-loader__panel" />
        ))}
      </div>

      <div className="aurora-loader__content">
        <div className="aurora-loader__badge">
          <svg
            className="aurora-loader__ring"
            viewBox="0 0 240 240"
            aria-hidden="true"
          >
            <defs>
              <path
                id="aurora-ring-path"
                d="M120,120 m-96,0 a96,96 0 1,1 192,0 a96,96 0 1,1 -192,0"
                fill="none"
              />
            </defs>
            <text className="aurora-loader__ring-text">
              <textPath href="#aurora-ring-path" startOffset="0">
                {RING_TEXT_FULL}
              </textPath>
            </text>
          </svg>

          <svg
            className="aurora-loader__progress"
            viewBox="0 0 240 240"
            aria-hidden="true"
          >
            <circle
              cx="120"
              cy="120"
              r={PROGRESS_RADIUS}
              fill="none"
              stroke="rgba(61, 50, 41, 0.12)"
              strokeWidth="2"
            />
            <circle
              ref={progressRef}
              cx="120"
              cy="120"
              r={PROGRESS_RADIUS}
              fill="none"
              stroke="var(--aurora-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform="rotate(-90 120 120)"
              className="aurora-loader__progress-arc"
            />
          </svg>

          <div className="aurora-loader__count">
            <span ref={countRef}>00</span>
            <i>%</i>
          </div>
        </div>

        <div className="aurora-loader__word">
          <span className="aurora-loader__word-mask">
            <span className="aurora-loader__word-inner">{phrase}</span>
          </span>
        </div>
      </div>

      <footer className="aurora-loader__footer">
        <span>10 Turtle</span>
        <span>Desert Portfolio</span>
      </footer>
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
    .to(".aurora-loader__content", {
      opacity: 0,
      scale: 0.92,
      duration: 0.5,
      ease: "power2.in",
    })
    .to(
      ".aurora-loader__footer",
      { opacity: 0, duration: 0.35, ease: "power2.in" },
      "<",
    )
    // Column-shutter reveal: panels lift away left-to-right.
    .to(
      ".aurora-loader__panel",
      {
        yPercent: -100,
        duration: 0.85,
        ease: "power4.inOut",
        stagger: 0.08,
      },
      "-=0.15",
    );
}
