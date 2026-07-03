import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";

type PortfolioLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

const MORPH_SEQUENCE = [
  "10 000000",
  "10 000000",
  "10 T00000",
  "10 TU0000",
  "10 TUR000",
  "10 TURT00",
  "10 TURTL00",
  "10 TURTLE00",
  "10 TURTLE0",
  "10 TURTLE",
] as const;

const LOADER_DESTINATIONS = [
  "Opening Desert",
  "Dubai Frame",
  "Burj Al Arab",
  "Atlantis",
  "Desert Safari",
  "Abu Dhabi Mosque",
  "Dubai Marina",
  "Blue Waters",
] as const;

const MORPH_FRAME_DURATION = 0.1;

export default function PortfolioLoader({
  isAssetsReady,
  onComplete,
}: PortfolioLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLParagraphElement>(null);
  const [digits, setDigits] = useState("000");
  const [destination, setDestination] = useState<(typeof LOADER_DESTINATIONS)[number]>(
    LOADER_DESTINATIONS[0],
  );
  const counterDoneRef = useRef(false);
  const exitStartedRef = useRef(false);
  const assetsReadyRef = useRef(isAssetsReady);
  const onCompleteRef = useRef(onComplete);
  const lastDestinationIndexRef = useRef(0);

  assetsReadyRef.current = isAssetsReady;
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const setViewportHeight = () => {
      root.style.setProperty("--loader-vh", `${window.innerHeight * 0.01}px`);
    };
    setViewportHeight();
    window.addEventListener("resize", setViewportHeight);

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const counter = { value: 0 };
    const isDesktop = window.matchMedia("(min-width: 992px)").matches;

    const tryExit = () => {
      if (
        exitStartedRef.current ||
        !counterDoneRef.current ||
        !assetsReadyRef.current
      ) {
        return;
      }
      exitStartedRef.current = true;
      runExitSequence(isDesktop, morphRef, () => onCompleteRef.current());
    };

    const updateDestination = (value: number) => {
      const index = Math.min(
        LOADER_DESTINATIONS.length - 1,
        Math.floor((value / 100) * LOADER_DESTINATIONS.length),
      );
      if (index === lastDestinationIndexRef.current) return;

      lastDestinationIndexRef.current = index;
      const next = LOADER_DESTINATIONS[index];
      const el = destinationRef.current;
      if (!el) {
        setDestination(next);
        return;
      }

      gsap.to(el, {
        opacity: 0,
        y: 6,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => {
          setDestination(next);
          gsap.fromTo(
            el,
            { opacity: 0, y: -6 },
            { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" },
          );
        },
      });
    };

    const ctx = gsap.context(() => {
      gsap.set(".sp-loader__wrapper", { opacity: 1 });
      gsap.set(".sp-loader__header", { opacity: 0, y: -12 });
      gsap.set(".sp-loader__label", { opacity: 0, y: 16 });
      gsap.set(".sp-loader__footer", { opacity: 0, y: 12 });
      gsap.set(".sp-loader__ghost", { opacity: 0, scale: 0.92 });
      gsap.set(".sp-loader__digit", { opacity: 0, y: 24, scale: 0.88 });
      gsap.set(".loader__percent", { opacity: 0, y: 24 });
      gsap.set(".loader__arrow", { opacity: 0, x: -8 });

      const intro = gsap.timeline({ delay: 0.15 });
      intro
        .to(".sp-loader__header", { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" })
        .to(".sp-loader__label", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.35")
        .to(
          ".sp-loader__ghost",
          { opacity: 0.07, scale: 1, duration: 1.1, ease: "power2.out", stagger: 0.12 },
          "-=0.4",
        )
        .to(
          ".sp-loader__digit",
          { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)", stagger: 0.08 },
          "-=0.7",
        )
        .to(".loader__percent", { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.35")
        .to(".loader__arrow", { opacity: 1, x: 0, duration: 0.45, ease: "power2.out" }, "-=0.3")
        .to(".sp-loader__footer", { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25");

      gsap.to(".loader__arrow", {
        x: 10,
        duration: 0.9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 1.2,
      });

      gsap.to(".sp-loader__ghost--1", {
        y: -14,
        duration: 4.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".sp-loader__ghost--2", {
        y: 12,
        duration: 5.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 0.4,
      });

      gsap.to(".sp-loader__dune--back", {
        x: 18,
        duration: 8,
        ease: "none",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".sp-loader__dune--front", {
        x: -12,
        duration: 6,
        ease: "none",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(counter, {
        value: 100,
        duration: 4,
        delay: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          const value = Math.floor(counter.value);
          setDigits(value.toString().padStart(3, "0"));
          if (progressRef.current) {
            progressRef.current.style.transform = `scaleX(${value / 100})`;
          }
          updateDestination(value);
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
      window.removeEventListener("resize", setViewportHeight);
      window.clearInterval(assetsPoll);
      ctx.revert();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="sp-loader" ref={rootRef} aria-hidden="true">
      <div className="sp-loader__backdrop" aria-hidden="true">
        <div className="sp-loader__sky" />
        <div className="sp-loader__horizon">
          <svg
            className="sp-loader__dune sp-loader__dune--back"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,80 C240,20 480,100 720,60 C960,20 1200,90 1440,50 L1440,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
          <svg
            className="sp-loader__dune sp-loader__dune--front"
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,70 C200,30 400,85 600,45 C800,10 1100,75 1440,40 L1440,100 L0,100 Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="sp-loader__grain" />
      </div>

      <header className="sp-loader__header">
        <div className="sp-loader__mark">
          <span className="sp-loader__mark-title">Desert Portfolio</span>
          <span className="sp-loader__mark-divider" aria-hidden="true">
            ·
          </span>
          <span className="sp-loader__mark-brand">10 Turtle</span>
        </div>
        <div className="sp-loader__progress" aria-hidden="true">
          <div className="sp-loader__progress-track">
            <div ref={progressRef} className="sp-loader__progress-fill" />
          </div>
        </div>
      </header>

      <div className="sp-loader__wrapper loader__wrapper">
        <div className="sp-loader__label loader__label">
          <h2>Preparing your journey</h2>
          <p ref={destinationRef} className="sp-loader__destination">
            {destination}
          </p>
        </div>

        <div className="sp-loader__ghost sp-loader__ghost--1" aria-hidden="true">
          <p>1</p>
        </div>
        <div className="sp-loader__ghost sp-loader__ghost--2" aria-hidden="true">
          <p>0</p>
        </div>

        <div className="sp-loader__slash loader__slash">
          <p>/</p>
        </div>

        {digits.split("").map((digit, index) => (
          <div
            key={index}
            className={`sp-loader__digit number__${index + 1}`}
          >
            <p>{digit}</p>
          </div>
        ))}

        <div className="sp-loader__percent loader__percent">
          <p>%</p>
        </div>

        <div className="sp-loader__morph loader__morph">
          <p ref={morphRef}>{MORPH_SEQUENCE[0]}</p>
        </div>

        <div className="sp-loader__brand loader__logo">
          <span>10 Turtle</span>
        </div>

        <div className="sp-loader__arrow loader__arrow">
          <p>&gt;</p>
        </div>
      </div>

      <footer className="sp-loader__footer">
        <span>Scroll to explore the UAE coastline</span>
      </footer>
    </div>
  );
}

function setMorphFrame(
  morphRef: RefObject<HTMLParagraphElement | null>,
  index: number,
) {
  const frame = MORPH_SEQUENCE[Math.min(index, MORPH_SEQUENCE.length - 1)];
  if (morphRef.current) {
    morphRef.current.textContent = frame;
  }
}

function runExitSequence(
  isDesktop: boolean,
  morphRef: RefObject<HTMLParagraphElement | null>,
  onComplete: () => void,
) {
  const morphDuration = MORPH_SEQUENCE.length * MORPH_FRAME_DURATION;

  const exit = gsap.timeline({
    onComplete: () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      gsap.to(".sp-loader", {
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        onComplete,
      });
    },
  });

  exit
    .to(".loader__arrow", { opacity: 0, duration: 0.2 })
    .to(".loader__percent", { opacity: 0, duration: 0.2 }, "<")
    .to(".sp-loader__digit", { opacity: 0, duration: 0.2 }, "<")
    .to(".loader__slash", { opacity: 0, duration: 0.2 }, "<")
    .to(".loader__logo", { opacity: 0, duration: 0.2 }, "<")
    .to(".loader__label", { opacity: 0, y: 8, duration: 0.25 }, "<")
    .to(".sp-loader__footer", { opacity: 0, y: 8, duration: 0.25 }, "<")
    .to(".sp-loader__header", { opacity: 0, y: -8, duration: 0.25 }, "<")
    .to(".sp-loader__ghost", { opacity: 0, duration: 0.25 }, "<")
    .to(".loader__morph", { opacity: 1, duration: 0 }, ">+0.15");

  if (!isDesktop) {
    exit.to(".loader__morph", { gridColumn: "1 / -1", duration: 0 }, "<");
  }

  exit.to(
    {},
    {
      duration: morphDuration,
      onUpdate() {
        const index = Math.min(
          MORPH_SEQUENCE.length - 1,
          Math.floor(this.progress() * MORPH_SEQUENCE.length),
        );
        setMorphFrame(morphRef, index);
      },
    },
    isDesktop ? ">+0.2" : ">+0.1",
  );
}
