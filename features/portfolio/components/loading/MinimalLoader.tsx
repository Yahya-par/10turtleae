import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

type MinimalLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

const BRAND_TEXT = "10 TURTLE";
const LOADING_PHRASES = [
  "Initializing Experience",
  "Loading Assets",
  "Preparing Scene",
  "Building Environment",
  "Finalizing Details",
] as const;

/**
 * Minimal modern loader with circular progress indicator
 * Alternative to the desert-themed loader
 */
export default function MinimalLoader({
  isAssetsReady,
  onComplete,
}: MinimalLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const [progress, setProgress] = useState(0);
  const [phrase, setPhrase] = useState<(typeof LOADING_PHRASES)[number]>(
    LOADING_PHRASES[0],
  );
  const counterDoneRef = useRef(false);
  const exitStartedRef = useRef(false);
  const assetsReadyRef = useRef(isAssetsReady);
  const onCompleteRef = useRef(onComplete);
  const lastPhraseIndexRef = useRef(0);

  assetsReadyRef.current = isAssetsReady;
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const circle = circleRef.current;
    if (!root || !circle) return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const counter = { value: 0 };
    const circumference = 2 * Math.PI * 54; // radius = 54
    
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${circumference}`;

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

    const updatePhrase = (value: number) => {
      const index = Math.min(
        LOADING_PHRASES.length - 1,
        Math.floor((value / 100) * LOADING_PHRASES.length),
      );
      if (index === lastPhraseIndexRef.current) return;

      lastPhraseIndexRef.current = index;
      const next = LOADING_PHRASES[index];
      
      gsap.to(".minimal-loader__phrase", {
        opacity: 0,
        y: -8,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          setPhrase(next);
          gsap.fromTo(
            ".minimal-loader__phrase",
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
          );
        },
      });
    };

    const ctx = gsap.context(() => {
      // Initial setup
      gsap.set(".minimal-loader__container", { opacity: 1 });
      gsap.set(".minimal-loader__brand", { opacity: 0, scale: 0.9 });
      gsap.set(".minimal-loader__circle-container", { opacity: 0, scale: 0.85 });
      gsap.set(".minimal-loader__percentage", { opacity: 0, scale: 0.9 });
      gsap.set(".minimal-loader__phrase", { opacity: 0, y: 12 });
      gsap.set(".minimal-loader__hint", { opacity: 0, y: 16 });

      // Entrance animation
      const intro = gsap.timeline({ delay: 0.2 });
      intro
        .to(".minimal-loader__brand", {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.7)",
        })
        .to(
          ".minimal-loader__circle-container",
          {
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: "back.out(1.4)",
          },
          "-=0.4",
        )
        .to(
          ".minimal-loader__percentage",
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.3)",
          },
          "-=0.3",
        )
        .to(
          ".minimal-loader__phrase",
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.2",
        )
        .to(
          ".minimal-loader__hint",
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.2",
        );

      // Pulse animation for circle
      gsap.to(".minimal-loader__circle-glow", {
        opacity: 0.6,
        scale: 1.05,
        duration: 1.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Progress counter animation
      gsap.to(counter, {
        value: 100,
        duration: 4,
        delay: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          const value = Math.floor(counter.value);
          setProgress(value);
          
          // Update circle progress
          if (circle) {
            const offset = circumference - (value / 100) * circumference;
            circle.style.strokeDashoffset = `${offset}`;
          }
          
          updatePhrase(value);
        },
        onComplete: () => {
          counterDoneRef.current = true;
          tryExit();
        },
      });
    }, root);

    const assetsPoll = window.setInterval(() => {
      if (assetsReadyRef.current) {
        tryExit();
      }
    }, 100);

    return () => {
      window.clearInterval(assetsPoll);
      ctx.revert();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="minimal-loader" ref={rootRef} aria-hidden="true">
      <div className="minimal-loader__backdrop" />
      
      <div className="minimal-loader__container">
        <div className="minimal-loader__brand">
          <h1>{BRAND_TEXT}</h1>
        </div>

        <div className="minimal-loader__progress">
          <div className="minimal-loader__circle-container">
            <svg
              width="140"
              height="140"
              viewBox="0 0 140 140"
              className="minimal-loader__circle-svg"
            >
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="4"
              />
              {/* Glow effect */}
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="8"
                className="minimal-loader__circle-glow"
                style={{ filter: "blur(4px)" }}
              />
              {/* Progress circle */}
              <circle
                ref={circleRef}
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
                className="minimal-loader__circle-progress"
              />
            </svg>
          </div>

          <div className="minimal-loader__percentage">
            <span>{progress}%</span>
          </div>
        </div>

        <div className="minimal-loader__status">
          <p className="minimal-loader__phrase">{phrase}</p>
        </div>

        <div className="minimal-loader__hint">
          <span>Scroll to explore</span>
        </div>
      </div>
    </div>
  );
}

function runExitSequence(onComplete: () => void) {
  const exit = gsap.timeline({
    onComplete: () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      gsap.to(".minimal-loader", {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete,
      });
    },
  });

  exit
    .to(".minimal-loader__hint", {
      opacity: 0,
      y: 16,
      duration: 0.3,
      ease: "power2.in",
    })
    .to(
      ".minimal-loader__phrase",
      {
        opacity: 0,
        y: -8,
        duration: 0.3,
        ease: "power2.in",
      },
      "-=0.1",
    )
    .to(
      ".minimal-loader__percentage",
      {
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        ease: "power2.in",
      },
      "-=0.1",
    )
    .to(
      ".minimal-loader__circle-container",
      {
        opacity: 0,
        scale: 0.85,
        duration: 0.4,
        ease: "power2.in",
      },
      "-=0.2",
    )
    .to(
      ".minimal-loader__brand",
      {
        opacity: 0,
        scale: 1.1,
        duration: 0.4,
        ease: "power2.in",
      },
      "-=0.2",
    );
}
