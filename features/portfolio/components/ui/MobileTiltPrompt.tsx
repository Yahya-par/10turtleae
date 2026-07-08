import { useEffect, useMemo, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

type MobileTiltPromptProps = {
  /** "intro" shows the acknowledge button; "gate" blocks until real landscape. */
  variant: "intro" | "gate";
  onAccept?: () => void;
};

type LottieNode = {
  [key: string]: unknown;
};

function forceLottieWhiteColors(node: unknown): void {
  if (!node || typeof node !== "object") return;
  const current = node as LottieNode;

  if ("c" in current) {
    const colorNode = current.c as LottieNode;
    if (colorNode && typeof colorNode === "object" && "k" in colorNode) {
      const colorValue = colorNode.k;
      if (Array.isArray(colorValue) && colorValue.length >= 3) {
        colorNode.k = [1, 1, 1, colorValue[3] ?? 1];
      } else if (Array.isArray(colorValue)) {
        colorNode.k = colorValue.map((frame) => {
          if (!frame || typeof frame !== "object") return frame;
          const keyframe = frame as LottieNode;
          const start = Array.isArray(keyframe.s) ? keyframe.s : null;
          const end = Array.isArray(keyframe.e) ? keyframe.e : null;
          if (start && start.length >= 3) keyframe.s = [1, 1, 1, start[3] ?? 1];
          if (end && end.length >= 3) keyframe.e = [1, 1, 1, end[3] ?? 1];
          return keyframe;
        });
      }
    }
  }

  Object.values(current).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => forceLottieWhiteColors(item));
      return;
    }
    forceLottieWhiteColors(value);
  });
}

/** Full-screen gate shown on handheld devices asking the user to view in landscape. */
export default function MobileTiltPrompt({
  variant,
  onAccept,
}: MobileTiltPromptProps) {
  const isIntro = variant === "intro";
  const [animationData, setAnimationData] = useState<object | null>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/assetjson/rotate.json")
      .then((response) => response.json())
      .then((json: unknown) => {
        if (!isMounted || !json || typeof json !== "object") return;
        setAnimationData(json as object);
      })
      .catch(() => {
        if (isMounted) setAnimationData(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const whiteAnimationData = useMemo(() => {
    if (!animationData) return null;
    const cloned = structuredClone(animationData);
    forceLottieWhiteColors(cloned);
    return cloned;
  }, [animationData]);

  useEffect(() => {
    if (!whiteAnimationData || !lottieRef.current) return;
    lottieRef.current.setDirection(-1);
    lottieRef.current.play();
  }, [whiteAnimationData]);

  return (
    <div className="tilt-prompt" role="dialog" aria-modal="true">
      <div className="tilt-prompt__card">
        <div className="tilt-prompt__icon" aria-hidden="true">
          {whiteAnimationData ? (
            <Lottie
              lottieRef={lottieRef}
              animationData={whiteAnimationData}
              loop
              autoplay
              className="tilt-prompt__icon-lottie"
            />
          ) : null}
        </div>

        {isIntro ? (
          <>
            <h2 className="tilt-prompt__title">Rotate your device</h2>
            <p className="tilt-prompt__text">
              This journey is crafted for landscape. To experience it fully, hold your
              device sideways.
            </p>
            <button
              type="button"
              className="tilt-prompt__button"
              onClick={onAccept}
            >
              Okay, got it
            </button>
          </>
        ) : (
          <>
            <h2 className="tilt-prompt__title">Please rotate your device</h2>
            <p className="tilt-prompt__text">
              Rotate your device to landscape to continue the journey.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
