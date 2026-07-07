import { audioManager } from "@features/portfolio/utils/audioManager";

type AudioToggleProps = {
  isMuted: boolean;
  onToggle: () => void;
  visible?: boolean;
};

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function MutedSpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m16 9 5 6" />
      <path d="m21 9-5 6" />
    </svg>
  );
}

export default function AudioToggle({
  isMuted,
  onToggle,
  visible = true,
}: AudioToggleProps) {
  if (!visible) return null;

  const handleClick = () => {
    onToggle();
    void audioManager.unlock();
  };

  return (
    <button
      type="button"
      className="portfolio-audio-toggle"
      onClick={handleClick}
      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
      aria-pressed={isMuted}
      title={isMuted ? "Unmute audio" : "Mute audio"}
    >
      {isMuted ? <MutedSpeakerIcon /> : <SpeakerIcon />}
    </button>
  );
}
