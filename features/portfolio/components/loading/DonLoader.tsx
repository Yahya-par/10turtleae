import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type DonLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

/** Spaced wordmark — each character reveals from behind a mask. */
const WORDMARK = "10 TURTLE";

export default function DonLoader({
  isAssetsReady,
  onComplete,
}: DonLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
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

    const applyParallax = (x: number, y: number) => {
      root.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        const speed = Number(el.dataset.parallax ?? 0);
        gsap.to(el, {
          x: x * 42 * speed,
          y: y * 28 * speed,
          duration: 0.85,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    };

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const onPointerMove = (event: PointerEvent) => {
      if (exitStartedRef.current || reduceMotion) return;
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      applyParallax(x * 2, y * 2);
    };

    const counter = { value: 0 };

    const ctx = gsap.context(() => {
      gsap.set(".don-loader__content", { opacity: 1 });
      gsap.set(".don-loader__char", { yPercent: 115 });
      gsap.set(
        [".don-loader__tag", ".don-loader__count", ".don-loader__meta"],
        { opacity: 0, y: 20 },
      );
      gsap.set(".don-loader__glass-panel", {
        opacity: 0,
        y: 28,
        scale: 0.94,
      });
      gsap.set(".don-loader__divider", { scaleX: 0 });
      gsap.set(".don-loader__parallax-item", { opacity: 0 });

      const intro = gsap.timeline({ delay: 0.15 });
      intro
        .to(".don-loader__parallax-item", {
          opacity: 1,
          duration: 1.1,
          ease: "power2.out",
          stagger: 0.08,
        })
        .to(
          ".don-loader__tag",
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.08,
          },
          "-=0.85",
        )
        .to(
          ".don-loader__glass-panel",
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            ease: "power3.out",
          },
          "-=0.55",
        )
        .to(
          ".don-loader__char",
          {
            yPercent: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.05,
          },
          "-=0.65",
        )
        .to(
          ".don-loader__divider",
          { scaleX: 1, duration: 0.9, ease: "power3.inOut" },
          "-=0.7",
        )
        .to(
          ".don-loader__count",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.7",
        )
        .to(
          ".don-loader__meta",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.5",
        );

      gsap.to(".don-loader__sun", {
        y: -12,
        duration: 5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        paused: reduceMotion,
      });

      gsap.to(".don-loader__orb--1", {
        y: -18,
        x: 10,
        duration: 6.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        paused: reduceMotion,
      });

      gsap.to(".don-loader__orb--2", {
        y: 14,
        x: -8,
        duration: 5.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 0.4,
        paused: reduceMotion,
      });

      gsap.to(".don-loader__dunes--back", {
        x: 16,
        duration: 9,
        ease: "none",
        repeat: -1,
        yoyo: true,
        paused: reduceMotion,
      });

      gsap.to(".don-loader__dunes--front", {
        x: -12,
        duration: 7,
        ease: "none",
        repeat: -1,
        yoyo: true,
        paused: reduceMotion,
      });

      gsap.to(counter, {
        value: 100,
        duration: 4,
        delay: 0.4,
        ease: "power2.inOut",
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.textContent = String(
              Math.floor(counter.value),
            ).padStart(3, "0");
          }
        },
        onComplete: () => {
          if (countRef.current) countRef.current.textContent = "100";
          counterDoneRef.current = true;
          tryExit();
        },
      });
    }, root);

    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove);
    }

    const assetsPoll = window.setInterval(() => {
      if (assetsReadyRef.current) tryExit();
    }, 100);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.clearInterval(assetsPoll);
      ctx.revert();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="don-loader" ref={rootRef} aria-hidden="true">
      <div className="don-loader__half don-loader__half--top">
        <div className="don-loader__parallax don-loader__parallax--top">
          <div
            className="don-loader__sun don-loader__parallax-item"
            data-parallax="0.04"
          />
          <svg
            className="don-loader__dunes don-loader__dunes--back don-loader__parallax-item"
            data-parallax="0.07"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,80 C240,20 480,100 720,60 C960,20 1200,90 1440,50 L1440,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      <div className="don-loader__half don-loader__half--bottom">
        <div className="don-loader__parallax don-loader__parallax--bottom">
          <svg
            className="don-loader__dunes don-loader__dunes--front don-loader__parallax-item"
            data-parallax="0.11"
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,70 C200,30 400,85 600,45 C800,10 1100,75 1440,40 L1440,100 L0,100 Z"
              fill="currentColor"
            />
          </svg>
          <div
            className="don-loader__orb don-loader__orb--1 don-loader__parallax-item"
            data-parallax="0.15"
          />
          <div
            className="don-loader__orb don-loader__orb--2 don-loader__parallax-item"
            data-parallax="0.09"
          />
        </div>
      </div>

      <div className="don-loader__grain" aria-hidden="true" />

      <div className="don-loader__content">
        <div className="don-loader__topbar">
          <span className="don-loader__tag don-loader__glass-pill">10-TRTL</span>
          <span className="don-loader__tag don-loader__glass-pill">
            Desert Portfolio
          </span>
        </div>

        <div className="don-loader__center">
          <div className="don-loader__glass-panel" data-parallax="0.025">
            <h1 className="don-loader__wordmark">
              {WORDMARK.split("").map((char, i) =>
                char === " " ? (
                  <span key={i} className="don-loader__space" />
                ) : (
                  <span key={i} className="don-loader__char-mask">
                    <span className="don-loader__char">{char}</span>
                  </span>
                ),
              )}
            </h1>

            <div className="don-loader__divider" />

            <div className="don-loader__count">
              <span ref={countRef}>000</span>
              <i>%</i>
            </div>
          </div>
        </div>

        <div className="don-loader__footer">
          <span className="don-loader__meta don-loader__glass-pill">
            Born explorers
          </span>
          <span className="don-loader__meta don-loader__glass-pill">
            Desert Showcase — 2026
          </span>
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
      onComplete();
    },
  });

  exit
    .to(".don-loader__char", {
      yPercent: -115,
      duration: 0.6,
      ease: "power3.in",
      stagger: 0.04,
    })
    .to(
      [
        ".don-loader__tag",
        ".don-loader__count",
        ".don-loader__meta",
        ".don-loader__divider",
        ".don-loader__glass-panel",
        ".don-loader__parallax-item",
        ".don-loader__grain",
      ],
      { opacity: 0, duration: 0.4, ease: "power2.in" },
      "-=0.4",
    )
    .to(
      ".don-loader__half--top",
      { yPercent: -100, duration: 0.9, ease: "power4.inOut" },
      "-=0.1",
    )
    .to(
      ".don-loader__half--bottom",
      { yPercent: 100, duration: 0.9, ease: "power4.inOut" },
      "<",
    );
}
