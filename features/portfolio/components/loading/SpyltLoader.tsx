import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type SpyltLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

/** Peel-deck cards — bold labels on a warm rotating palette (spylt vibe). */
const CARDS = [
  { label: "Opening Desert", bg: "#d1471f", ink: "#f7ecdd" },
  { label: "Dubai Frame", bg: "#201a12", ink: "#f7ecdd" },
  { label: "Burj Al Arab", bg: "#e0932a", ink: "#201a12" },
  { label: "Atlantis", bg: "#b5341c", ink: "#f7ecdd" },
  { label: "Desert Safari", bg: "#3a2a1a", ink: "#f7ecdd" },
  { label: "Blue Waters", bg: "#c8622c", ink: "#f7ecdd" },
] as const;

/** Bold repeating marquee phrase (spylt uses "CHILL. CRACK. CHUG."). */
const MARQUEE_TEXT = "SCROLL. \u00b7 SIP. \u00b7 EXPLORE. \u00b7 CHUG A JOURNEY. \u00b7 ";
const MARQUEE_REPEAT = 6;

/**
 * SpyltLoader (loader4) - bold, energetic preloader inspired by spylt.com.
 * A peeling deck of flavor cards, a 0-100 counter set as a superscript on the
 * wordmark, a punchy marquee, and a clip-path wipe reveal on exit.
 */
export default function SpyltLoader({
  isAssetsReady,
  onComplete,
}: SpyltLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const peeledRef = useRef<boolean[]>([]);
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

    const total = CARDS.length;
    peeledRef.current = new Array(total).fill(false);

    const peelDeck = (value: number) => {
      // The last card stays until the end; earlier cards peel as we progress.
      const activeIndex = Math.min(
        total - 1,
        Math.floor((value / 100) * total),
      );
      for (let i = 0; i < activeIndex; i++) {
        if (peeledRef.current[i]) continue;
        peeledRef.current[i] = true;
        const card = cardRefs.current[i];
        if (!card) continue;
        gsap.to(card, {
          yPercent: -135,
          rotation: i % 2 === 0 ? -16 : 16,
          opacity: 0,
          duration: 0.6,
          ease: "power3.in",
        });
      }
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
      gsap.set(".spylt-loader__inner", { opacity: 1 });
      gsap.set(".spylt-loader__card", {
        opacity: 0,
        yPercent: 40,
        rotation: (i) => (i % 2 === 0 ? -6 : 6),
        scale: 0.85,
      });
      gsap.set(
        [
          ".spylt-loader__tag",
          ".spylt-loader__brand",
          ".spylt-loader__marquee",
        ],
        { opacity: 0, y: 26 },
      );

      const intro = gsap.timeline({ delay: 0.15 });
      intro
        .to(".spylt-loader__tag", {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.1,
        })
        .to(
          ".spylt-loader__card",
          {
            opacity: 1,
            yPercent: 0,
            scale: 1,
            rotation: (i) => (i % 2 === 0 ? -4 : 4),
            duration: 0.7,
            ease: "back.out(1.5)",
            stagger: 0.06,
          },
          "-=0.25",
        )
        .to(
          ".spylt-loader__brand",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.4",
        )
        .to(
          ".spylt-loader__marquee",
          { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
          "-=0.45",
        );

      gsap.to(counter, {
        value: 100,
        duration: 4,
        delay: 0.4,
        ease: "power2.inOut",
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.textContent = String(Math.floor(counter.value));
          }
          peelDeck(counter.value);
        },
        onComplete: () => {
          if (countRef.current) countRef.current.textContent = "100";
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
    <div className="spylt-loader" ref={rootRef} aria-hidden="true">
      <div className="spylt-loader__inner">
        <div className="spylt-loader__topbar">
          <span className="spylt-loader__tag">Chug a journey</span>
          <span className="spylt-loader__tag">Est. 2026</span>
        </div>

        <div className="spylt-loader__deck">
          {CARDS.map((card, i) => (
            <div
              key={card.label}
              className="spylt-loader__card"
              style={{
                background: card.bg,
                color: card.ink,
                zIndex: CARDS.length - i,
              }}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
            >
              <span className="spylt-loader__card-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="spylt-loader__card-label">{card.label}</span>
            </div>
          ))}
        </div>

        <div className="spylt-loader__footer">
          <h1 className="spylt-loader__brand">
            10 Turtle
            <sup className="spylt-loader__count">
              <span ref={countRef}>0</span>%
            </sup>
          </h1>

          <div className="spylt-loader__marquee">
            <div className="spylt-loader__marquee-track">
              {marqueeItems.map((_, i) => (
                <span key={i} className="spylt-loader__marquee-item">
                  {MARQUEE_TEXT}
                </span>
              ))}
            </div>
          </div>
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
    .to(".spylt-loader__card", {
      yPercent: -140,
      rotation: (i) => (i % 2 === 0 ? -18 : 18),
      opacity: 0,
      duration: 0.55,
      ease: "power3.in",
      stagger: 0.05,
    })
    .to(
      [".spylt-loader__tag", ".spylt-loader__brand", ".spylt-loader__marquee"],
      { opacity: 0, y: -18, duration: 0.4, ease: "power2.in" },
      "-=0.35",
    )
    // Clip-path wipe upward to reveal the scene beneath.
    .to(
      ".spylt-loader",
      {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.9,
        ease: "power4.inOut",
      },
      "-=0.1",
    );
}
