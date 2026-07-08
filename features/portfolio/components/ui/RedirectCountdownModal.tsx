import { useEffect, useState } from "react";

type RedirectCountdownModalProps = {
  seconds: number;
  destinationLabel: string;
  onFinish: () => void;
};

export default function RedirectCountdownModal({
  seconds,
  destinationLabel,
  onFinish,
}: RedirectCountdownModalProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
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
  }, [onFinish, timeLeft]);

  return (
    <div className="redirect-modal" role="dialog" aria-modal="true" aria-live="polite">
      <div className="redirect-modal__card">
        <p className="redirect-modal__eyebrow">Navigation</p>
        <h2 className="redirect-modal__title">Redirecting to the main site</h2>
        <p className="redirect-modal__text">
          You will be redirected to {destinationLabel} in {timeLeft}s.
        </p>
        <div className="redirect-modal__timer" aria-label={`${timeLeft} seconds left`}>
          {timeLeft}
        </div>
      </div>
    </div>
  );
}
