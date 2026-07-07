import { useEffect, useState, useCallback } from "react";
import {
  audioManager,
  type AudioManagerState,
} from "@features/portfolio/utils/audioManager";

export function usePortfolioAudio(active: boolean) {
  const [state, setState] = useState<AudioManagerState>(() =>
    audioManager.getState(),
  );

  useEffect(() => {
    if (!active) return;

    audioManager.init();

    const unlockAndPlay = () => {
      void audioManager.unlock();
    };

    window.addEventListener("pointerdown", unlockAndPlay, { passive: true });
    window.addEventListener("wheel", unlockAndPlay, { passive: true });
    window.addEventListener("keydown", unlockAndPlay);

    void audioManager.unlock();

    const unsubscribe = audioManager.subscribe(setState);

    return () => {
      window.removeEventListener("pointerdown", unlockAndPlay);
      window.removeEventListener("wheel", unlockAndPlay);
      window.removeEventListener("keydown", unlockAndPlay);
      unsubscribe();
      audioManager.dispose();
    };
  }, [active]);

  const toggleMute = useCallback(() => {
    audioManager.toggleMuted();
  }, []);

  return {
    isMuted: state.isMuted,
    isUnlocked: state.isUnlocked,
    toggleMute,
  };
}
