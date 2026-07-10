import { dismissIosInstallPrompt } from "@features/portfolio/utils/iosStandalone";

type IosInstallPromptProps = {
  onDismiss: () => void;
};

/** Guides iOS Safari users to Add to Home Screen for toolbar-free standalone mode. */
export default function IosInstallPrompt({ onDismiss }: IosInstallPromptProps) {
  const handleContinue = () => {
    dismissIosInstallPrompt();
    onDismiss();
  };

  return (
    <div className="ios-install-prompt" role="dialog" aria-modal="true">
      <div className="ios-install-prompt__card">
        <p className="ios-install-prompt__eyebrow">Best on iPhone</p>
        <h2 className="ios-install-prompt__title">Add to Home Screen</h2>
        <p className="ios-install-prompt__text">
          Safari cannot hide its toolbar in a normal tab. Install this experience to
          your home screen for a fullscreen, app-like view.
        </p>

        <ol className="ios-install-prompt__steps">
          <li>
            Tap <span className="ios-install-prompt__share">Share</span> in Safari
          </li>
          <li>Select <strong>Add to Home Screen</strong></li>
          <li>Open the app icon from your home screen</li>
        </ol>

        <button
          type="button"
          className="tilt-prompt__button ios-install-prompt__continue"
          onClick={handleContinue}
        >
          Continue in browser
        </button>
      </div>
    </div>
  );
}
