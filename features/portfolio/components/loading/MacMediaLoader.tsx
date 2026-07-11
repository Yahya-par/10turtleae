import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  macMediaLoaderImages,
  macMediaLoaderServices,
  macMediaLoaderSettings,
} from "../../config/macMediaLoaderSettings";

type MacMediaLoaderProps = {
  isAssetsReady: boolean;
  onComplete: () => void;
};

function encodeAssetPath(path: string) {
  return encodeURI(path);
}

export default function MacMediaLoader({
  isAssetsReady,
  onComplete,
}: MacMediaLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const crosshairHRef = useRef<HTMLDivElement>(null);
  const crosshairVRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const riderRef = useRef<HTMLDivElement>(null);
  const serviceViewportRef = useRef<HTMLDivElement>(null);
  const serviceTrackRef = useRef<HTMLUListElement>(null);
  const [activeServiceDomIndex, setActiveServiceDomIndex] = useState(0);
  const counterDoneRef = useRef(false);
  const exitStartedRef = useRef(false);
  const assetsReadyRef = useRef(isAssetsReady);
  const onCompleteRef = useRef(onComplete);
  const displayImageIndexRef = useRef(0);
  const displayedProgressRef = useRef(0);
  const progressStartRef = useRef(0);
  const progressRafRef = useRef<number | null>(null);
  const cursorTargetRef = useRef({ x: 0, y: 0 });
  const cursorCurrentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  assetsReadyRef.current = isAssetsReady;
  onCompleteRef.current = onComplete;

  const updateLoadUi = (percent: number) => {
    const clamped = Math.min(100, Math.max(0, percent));
    const rounded = Math.round(clamped);

    if (countRef.current) {
      countRef.current.textContent = rounded.toString().padStart(2, "0");
    }
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${clamped}%`;
    }
    if (riderRef.current) {
      riderRef.current.style.left = `${clamped}%`;
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

  const loopedServices = [
    ...macMediaLoaderServices,
    ...macMediaLoaderServices,
  ];

  useLayoutEffect(() => {
    const root = rootRef.current;
    const serviceTrack = serviceTrackRef.current;
    const serviceViewport = serviceViewportRef.current;
    if (!root || !serviceTrack || !serviceViewport) return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const isTouch =
      window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const showCrosshair = !isTouch && !reduceMotion;

    if (showCrosshair) {
      root.classList.add("mac-loader--crosshair");
    }

    macMediaLoaderImages.forEach((path) => {
      const img = new Image();
      img.src = encodeAssetPath(path);
    });

    const turtleImg = new Image();
    turtleImg.src = encodeAssetPath("/Images/Turtle.png");

    const { counterDuration } = macMediaLoaderSettings;
    const preReadyMax = 97;
    const primaryMax = 88;
    progressStartRef.current = performance.now();
    let lastProgressTime = progressStartRef.current;

    const getTargetProgress = (elapsed: number, assetsReady: boolean) => {
      if (assetsReady) return 100;

      if (elapsed <= counterDuration) {
        const normalized = elapsed / counterDuration;
        const eased = 1 - (1 - normalized) ** 2.6;
        return primaryMax * eased;
      }

      const overtime = elapsed - counterDuration;
      const overtimeEased = 1 - Math.exp(-overtime / 3.2);
      return Math.min(
        preReadyMax,
        primaryMax + (preReadyMax - primaryMax) * overtimeEased,
      );
    };

    const tickProgress = (now: number) => {
      if (exitStartedRef.current) return;

      const dt = Math.max(0, (now - lastProgressTime) / 1000);
      lastProgressTime = now;
      const elapsed = (now - progressStartRef.current) / 1000;
      const target = getTargetProgress(elapsed, assetsReadyRef.current);
      const blendSpeed = assetsReadyRef.current ? 14 : 4.5;
      const blend = 1 - Math.exp(-dt * blendSpeed);

      displayedProgressRef.current +=
        (target - displayedProgressRef.current) * blend;

      updateLoadUi(displayedProgressRef.current);

      if (displayedProgressRef.current >= 99.5 && assetsReadyRef.current) {
        displayedProgressRef.current = 100;
        updateLoadUi(100);
        counterDoneRef.current = true;
        window.setTimeout(() => tryExit(), 280);
        return;
      }

      progressRafRef.current = window.requestAnimationFrame(tickProgress);
    };

    progressRafRef.current = window.requestAnimationFrame(tickProgress);

    const measureServiceRow = () => {
      const items = serviceTrack.querySelectorAll<HTMLElement>(
        ".mac-loader__service",
      );
      const styles = window.getComputedStyle(serviceTrack);
      const gap = Number.parseFloat(styles.rowGap || styles.gap || "0") || 0;
      let maxHeight = 0;

      items.forEach((item) => {
        maxHeight = Math.max(maxHeight, item.offsetHeight);
      });

      return Math.max(maxHeight, 80) + gap;
    };

    const updateActiveServiceFromScroll = () => {
      const viewportRect = serviceViewport.getBoundingClientRect();
      const viewportCenter = viewportRect.top + viewportRect.height * 0.5;
      const items = serviceTrack.querySelectorAll<HTMLElement>(
        ".mac-loader__service",
      );

      let closestDomIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height * 0.5;
        const distance = Math.abs(itemCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestDomIndex = index;
        }
      });

      setActiveServiceDomIndex(closestDomIndex);
    };

    const crossfadeImage = (nextIndex: number) => {
      const currentIndex = displayImageIndexRef.current;
      if (nextIndex === currentIndex) return;

      const outgoing = root.querySelector<HTMLElement>(
        `.mac-loader__image[data-index="${currentIndex}"]`,
      );
      const incoming = root.querySelector<HTMLElement>(
        `.mac-loader__image[data-index="${nextIndex}"]`,
      );
      if (!incoming) return;

      gsap.killTweensOf([outgoing, incoming].filter(Boolean));

      if (outgoing && outgoing !== incoming) {
        gsap.to(outgoing, {
          opacity: 0,
          scale: 1.04,
          duration: 0.45,
          ease: "power2.inOut",
        });
      }

      gsap.fromTo(
        incoming,
        { opacity: 0, scale: 0.96 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.55,
          ease: "power2.out",
          onStart: () => {
            displayImageIndexRef.current = nextIndex;
          },
        },
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      if (exitStartedRef.current || !showCrosshair) return;
      cursorTargetRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const tickCrosshair = () => {
      const hLine = crosshairHRef.current;
      const vLine = crosshairVRef.current;
      if (!hLine || !vLine || !showCrosshair) return;

      const lerp = macMediaLoaderSettings.crosshairLerp;
      const current = cursorCurrentRef.current;
      const target = cursorTargetRef.current;

      current.x += (target.x - current.x) * (1 - lerp);
      current.y += (target.y - current.y) * (1 - lerp);

      hLine.style.transform = `translate3d(0, ${current.y}px, 0)`;
      vLine.style.transform = `translate3d(${current.x}px, 0, 0)`;
    };

    const serviceCount = macMediaLoaderServices.length;
    const rowHeight = measureServiceRow();
    serviceViewport.style.setProperty("--mac-service-row", `${rowHeight}px`);

    const ctx = gsap.context(() => {
      gsap.set(".mac-loader__inner", { opacity: 1 });
      gsap.set(serviceTrack, { y: 0 });
      gsap.set(".mac-loader__image", { opacity: 0, scale: 0.96 });
      gsap.set('.mac-loader__image[data-index="0"]', { opacity: 1, scale: 1 });
      gsap.set(
        [
          ".mac-loader__brand",
          ".mac-loader__count-wrap",
          ".mac-loader__label",
          ".mac-loader__services",
          ".mac-loader__preview",
          ".mac-loader__progress-bar",
        ],
        { opacity: 0, y: 18 },
      );
      gsap.set(".mac-loader__crosshair-line", { opacity: 0 });

      const intro = gsap.timeline({ delay: 0.1 });
      intro
        .to(".mac-loader__progress-bar", {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
        })
        .to(
          ".mac-loader__brand",
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
          },
          "-=0.3",
        )
        .to(
          ".mac-loader__count-wrap",
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
          "-=0.35",
        )
        .to(
          ".mac-loader__label",
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
          "-=0.4",
        )
        .to(
          ".mac-loader__services",
          { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" },
          "-=0.35",
        )
        .to(
          ".mac-loader__preview",
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
          "-=0.5",
        );

      if (showCrosshair) {
        intro.to(
          ".mac-loader__crosshair-line",
          { opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.45",
        );
      }

      if (!reduceMotion) {
        const serviceLoop = gsap.timeline({ repeat: -1, delay: 0.5 });
        for (let step = 1; step <= serviceCount; step += 1) {
          serviceLoop
            .to({}, { duration: macMediaLoaderSettings.serviceHoldSeconds })
            .to(serviceTrack, {
              y: -rowHeight * step,
              duration: macMediaLoaderSettings.serviceScrollSeconds,
              ease: "power2.inOut",
              onUpdate: updateActiveServiceFromScroll,
              onComplete: updateActiveServiceFromScroll,
            });
        }
        serviceLoop.eventCallback("onRepeat", () => {
          gsap.set(serviceTrack, { y: 0 });
          setActiveServiceDomIndex(0);
        });

        let imageIndex = 0;
        const imageLoop = gsap.timeline({ repeat: -1, delay: 0.8 });
        imageLoop
          .to({}, { duration: macMediaLoaderSettings.imageCycleSeconds })
          .call(() => {
            imageIndex = (imageIndex + 1) % macMediaLoaderImages.length;
            crossfadeImage(imageIndex);
          });
      }
    }, root);

    updateActiveServiceFromScroll();

    if (showCrosshair) {
      cursorTargetRef.current = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5,
      };
      cursorCurrentRef.current = { ...cursorTargetRef.current };
      window.addEventListener("pointermove", onPointerMove);

      const loop = () => {
        tickCrosshair();
        rafRef.current = window.requestAnimationFrame(loop);
      };
      rafRef.current = window.requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (progressRafRef.current !== null) {
        window.cancelAnimationFrame(progressRafRef.current);
      }
      ctx.revert();
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="mac-loader" ref={rootRef} aria-hidden="true">
      <div className="mac-loader__crosshair" aria-hidden="true">
        <div
          ref={crosshairHRef}
          className="mac-loader__crosshair-line mac-loader__crosshair-line--h"
        />
        <div
          ref={crosshairVRef}
          className="mac-loader__crosshair-line mac-loader__crosshair-line--v"
        />
      </div>

      <div className="mac-loader__inner">
        <div className="mac-loader__progress-bar" aria-hidden="true">
          <div className="mac-loader__progress-track">
            <div ref={progressFillRef} className="mac-loader__progress-fill" />
            <div className="mac-loader__road-line" aria-hidden="true" />
            <div ref={riderRef} className="mac-loader__road-rider">
              <div className="mac-loader__car">
                <svg
                  className="mac-loader__car-body"
                  viewBox="0 0 120 52"
                  aria-hidden="true"
                >
                  <path
                    d="M8 36h8l7-12h22l8-8h24l10 8h14c3 0 6 2.5 6 6v8H8v-2z"
                    fill="#b86a42"
                  />
                  <path
                    d="M15 36h90v6c0 2.2-1.8 4-4 4H19c-2.2 0-4-1.8-4-4v-6z"
                    fill="#9a5a36"
                  />
                  <path
                    d="M43 16h34l6 10H43z"
                    fill="rgba(142,202,230,0.55)"
                  />
                  <path
                    d="M8 38h104"
                    stroke="rgba(61,50,41,0.25)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <img
                  className="mac-loader__car-turtle"
                  src={encodeAssetPath("/Images/Turtle.png")}
                  alt=""
                  draggable={false}
                />
                <span className="mac-loader__car-wheel mac-loader__car-wheel--rear" />
                <span className="mac-loader__car-wheel mac-loader__car-wheel--front" />
              </div>
            </div>
          </div>
        </div>

        <header className="mac-loader__header">
          <span className="mac-loader__brand">10 Turtle</span>
          <div className="mac-loader__count-wrap">
            <span ref={countRef} className="mac-loader__count">
              00
            </span>
            <span className="mac-loader__count-suffix">%</span>
          </div>
        </header>

        <div className="mac-loader__body">
          <div className="mac-loader__services">
            <p className="mac-loader__label">Services</p>
            <div
              ref={serviceViewportRef}
              className="mac-loader__service-viewport"
            >
              <ul ref={serviceTrackRef} className="mac-loader__service-track">
                {loopedServices.map((service, index) => (
                  <li
                    key={`${service}-${index}`}
                    className={`mac-loader__service${
                      index === activeServiceDomIndex
                        ? " mac-loader__service--active"
                        : ""
                    }`}
                  >
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mac-loader__preview">
            <div className="mac-loader__preview-frame">
              {macMediaLoaderImages.map((image, index) => (
                <img
                  key={image}
                  className="mac-loader__image"
                  data-index={index}
                  src={encodeAssetPath(image)}
                  alt=""
                  draggable={false}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function runExitSequence(onComplete: () => void) {
  gsap
    .timeline({
      onComplete: () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        onComplete();
      },
    })
    .to(".mac-loader__crosshair-line", {
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
    })
    .to(
      ".mac-loader__progress-bar",
      { opacity: 0, y: -8, duration: 0.3, ease: "power2.in" },
      "<",
    )
    .to(
      ".mac-loader__inner",
      {
        opacity: 0,
        y: -12,
        duration: 0.45,
        ease: "power2.inOut",
      },
      "<0.05",
    )
    .to(
      ".mac-loader",
      {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.7,
        ease: "power3.inOut",
      },
      "-=0.15",
    );
}
