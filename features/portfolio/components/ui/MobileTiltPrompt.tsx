type MobileTiltPromptProps = {
  /** "intro" shows the acknowledge button; "gate" blocks until real landscape. */
  variant: "intro" | "gate";
  onAccept?: () => void;
};

/** Full-screen gate shown on handheld devices asking the user to view in landscape. */
export default function MobileTiltPrompt({
  variant,
  onAccept,
}: MobileTiltPromptProps) {
  const isIntro = variant === "intro";

  return (
    <div className="tilt-prompt" role="dialog" aria-modal="true">
      <div className="tilt-prompt__card">
        <div className="tilt-prompt__icon" aria-hidden="true">
          <svg viewBox="0 0 64 108" width="60" height="101">
            <rect
              x="3"
              y="3"
              width="58"
              height="102"
              rx="9"
              className="tilt-prompt__phone"
            />
            <rect x="12" y="16" width="40" height="70" rx="3" className="tilt-prompt__screen" />
            <circle cx="32" cy="96" r="3.5" className="tilt-prompt__home" />
          </svg>
          <span className="tilt-prompt__arrow" aria-hidden="true" />
        </div>

        {isIntro ? (
          <>
            <h2 className="tilt-prompt__title">Tilt your device</h2>
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
            <h2 className="tilt-prompt__title">Please tilt your device</h2>
            <p className="tilt-prompt__text">
              Rotate your device to landscape to continue the journey.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
