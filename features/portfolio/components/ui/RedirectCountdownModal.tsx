import { useEffect, useState } from "react";

type RedirectCountdownModalProps = {
  mode: "countdown" | "repeat";
  seconds?: number;
  destinationLabel: string;
  onFinish: () => void;
};

export default function RedirectCountdownModal({
  mode,
  seconds = 3,
  destinationLabel,
  onFinish,
}: RedirectCountdownModalProps) {
  const isCountdownMode = mode === "countdown";
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (!isCountdownMode) return;
    setTimeLeft(seconds);
  }, [isCountdownMode, seconds]);

  useEffect(() => {
    if (!isCountdownMode) return;
    if (timeLeft <= 0) {
      onFinish();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isCountdownMode, onFinish, timeLeft]);

  return (
    <div className="redirect-modal" role="dialog" aria-modal="true" aria-live="polite">
      <div className="redirect-modal__card">
        <p className="redirect-modal__eyebrow">Navigation</p>
        {isCountdownMode ? (
          <>
            <h2 className="redirect-modal__title">Redirecting to the main site</h2>
            <p className="redirect-modal__text">
              You will be redirected to {destinationLabel} in {timeLeft}s.
            </p>
            <div
              className="redirect-modal__timer"
              aria-label={`${timeLeft} seconds left`}
            >
              {timeLeft}
            </div>
          </>
        ) : (
          <>
            <h2 className="redirect-modal__title">You already experienced this journey today</h2>
            <p className="redirect-modal__text">
              You have already experienced this journey once in a day. Redirecting
              you to the main site for your better experience.
            </p>
            <p className="redirect-modal__text">
              Redirecting to {destinationLabel}...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
