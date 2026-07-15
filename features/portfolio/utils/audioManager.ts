import { audioSettings } from "@features/portfolio/config/audioSettings";

type ManagedTrack = {
  element: HTMLAudioElement;
  baseVolume: number;
  shouldPlay: boolean;
};

type AudioListener = (state: AudioManagerState) => void;

export type AudioManagerState = {
  isMuted: boolean;
  isUnlocked: boolean;
};

function createTrack(
  src: string,
  volume: number,
  loop: boolean,
  shouldPlay = true,
): ManagedTrack {
  const element = new Audio(src);
  element.loop = loop;
  element.preload = "auto";
  element.volume = volume;
  element.load();
  return { element, baseVolume: volume, shouldPlay };
}

class AudioManager {
  private tracks: ManagedTrack[] = [];
  private initialized = false;
  private isMuted = false;
  private isUnlocked = false;
  private carPassSources = new Set<string>();
  private metroPassActive = false;
  private planePassActive = false;
  private campfirePassActive = false;
  private dronePassActive = false;
  private listeners = new Set<AudioListener>();

  private readonly carPassTrackIndex = 2;
  private readonly metroPassTrackIndex = 3;
  private readonly planePassTrackIndex = 4;
  private readonly campfirePassTrackIndex = 5;
  private readonly dronePassTrackIndex = 6;
  private readonly oldDubaiTextTrackIndex = 7;
  private readonly frameTextTrackIndex = 8;
  private readonly desertTextTrackIndex = 9;
  private readonly planeTextTrackIndex = 10;
  private readonly dolphinJumpTrackIndex = 11;
  private readonly firecrackerTrackIndex = 12;

  init() {
    if (this.initialized) return;

    const { background, cars, metro, plane, campfire, drone, oldDubaiText, frameText, desertText, planeText, dolphinJump, firecracker } =
      audioSettings;
    this.tracks = [
      createTrack(background.drum, background.volume.drum, background.loop),
      createTrack(background.dubai, background.volume.dubai, background.loop),
      createTrack(cars.passBy, cars.volume, cars.loop, false),
      createTrack(metro.passBy, metro.volume, metro.loop, false),
      createTrack(plane.passBy, plane.volume, plane.loop, false),
      createTrack(campfire.passBy, campfire.volume, campfire.loop, false),
      createTrack(drone.passBy, drone.volume, drone.loop, false),
      createTrack(
        oldDubaiText.cue,
        oldDubaiText.volume,
        oldDubaiText.loop,
        false,
      ),
      createTrack(frameText.cue, frameText.volume, frameText.loop, false),
      createTrack(desertText.cue, desertText.volume, desertText.loop, false),
      createTrack(planeText.cue, planeText.volume, planeText.loop, false),
      createTrack(dolphinJump.cue, dolphinJump.volume, dolphinJump.loop, false),
      createTrack(firecracker.cue, firecracker.volume, firecracker.loop, false),
    ];

    const oldDubaiTrack = this.tracks[this.oldDubaiTextTrackIndex];
    if (oldDubaiTrack) {
      oldDubaiTrack.element.addEventListener("ended", () => {
        oldDubaiTrack.shouldPlay = false;
      });
    }

    const frameTextTrack = this.tracks[this.frameTextTrackIndex];
    if (frameTextTrack) {
      frameTextTrack.element.addEventListener("ended", () => {
        frameTextTrack.shouldPlay = false;
      });
    }

    const desertTextTrack = this.tracks[this.desertTextTrackIndex];
    if (desertTextTrack) {
      desertTextTrack.element.addEventListener("ended", () => {
        desertTextTrack.shouldPlay = false;
      });
    }

    const planeTextTrack = this.tracks[this.planeTextTrackIndex];
    if (planeTextTrack) {
      planeTextTrack.element.addEventListener("ended", () => {
        planeTextTrack.shouldPlay = false;
      });
    }

    const dolphinJumpTrack = this.tracks[this.dolphinJumpTrackIndex];
    if (dolphinJumpTrack) {
      dolphinJumpTrack.element.addEventListener("ended", () => {
        dolphinJumpTrack.shouldPlay = false;
      });
    }

    const firecrackerTrack = this.tracks[this.firecrackerTrackIndex];
    if (firecrackerTrack) {
      firecrackerTrack.element.addEventListener("ended", () => {
        firecrackerTrack.shouldPlay = false;
      });
    }

    this.initialized = true;
    this.syncPlayback();
  }

  dispose() {
    for (const track of this.tracks) {
      track.element.pause();
      track.element.currentTime = 0;
      track.element.src = "";
    }

    this.tracks = [];
    this.initialized = false;
    this.isUnlocked = false;
    this.carPassSources.clear();
    this.metroPassActive = false;
    this.planePassActive = false;
    this.campfirePassActive = false;
    this.dronePassActive = false;
  }

  subscribe(listener: AudioListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): AudioManagerState {
    return {
      isMuted: this.isMuted,
      isUnlocked: this.isUnlocked,
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    this.syncPlayback();
    this.notify();
  }

  toggleMuted() {
    this.setMuted(!this.isMuted);
    void this.unlock();
  }

  async unlock() {
    if (!this.initialized) return;

    const results = await Promise.all(
      this.tracks
        .filter((track) => track.shouldPlay)
        .map(async (track) => {
          try {
            if (track.element.paused) {
              await track.element.play();
            }
            return true;
          } catch {
            return false;
          }
        }),
    );

    if (results.some(Boolean)) {
      this.isUnlocked = true;
    }

    this.syncPlayback();
    this.notify();
  }

  tick() {
    if (!this.initialized || this.isMuted) return;
    this.syncPlayback();
  }

  setCarPassActive(source: string, active: boolean) {
    const isActive = this.carPassSources.has(source);
    if (active === isActive) return;

    if (active) {
      this.carPassSources.add(source);
    } else {
      this.carPassSources.delete(source);
    }

    this.syncCarPassSound();
  }

  private syncCarPassSound() {
    const track = this.tracks[this.carPassTrackIndex];
    if (!track) return;

    const shouldPlay = this.carPassSources.size > 0;

    if (!shouldPlay) {
      if (track.shouldPlay) {
        track.shouldPlay = false;
        track.element.pause();
        track.element.currentTime = 0;
      }
      return;
    }

    const startingPass = !track.shouldPlay;
    track.shouldPlay = true;
    track.element.loop = audioSettings.cars.loop;

    if (startingPass) {
      track.element.currentTime = 0;
    }

    this.syncPlayback();
  }

  setMetroPassActive(active: boolean) {
    if (this.metroPassActive === active) return;

    this.metroPassActive = active;
    this.syncMetroPassSound();
  }

  private syncMetroPassSound() {
    const track = this.tracks[this.metroPassTrackIndex];
    if (!track) return;

    if (!this.metroPassActive) {
      if (track.shouldPlay) {
        track.shouldPlay = false;
        track.element.pause();
        track.element.currentTime = 0;
      }
      return;
    }

    const startingPass = !track.shouldPlay;
    track.shouldPlay = true;
    track.element.loop = audioSettings.metro.loop;

    if (startingPass) {
      track.element.currentTime = 0;
    }

    this.syncPlayback();
  }

  setPlanePassActive(active: boolean) {
    if (this.planePassActive === active) return;

    this.planePassActive = active;
    this.syncPlanePassSound();
  }

  private syncPlanePassSound() {
    const track = this.tracks[this.planePassTrackIndex];
    if (!track) return;

    if (!this.planePassActive) {
      if (track.shouldPlay) {
        track.shouldPlay = false;
        track.element.pause();
        track.element.currentTime = 0;
      }
      return;
    }

    const startingPass = !track.shouldPlay;
    track.shouldPlay = true;
    track.element.loop = audioSettings.plane.loop;

    if (startingPass) {
      track.element.currentTime = 0;
    }

    this.syncPlayback();
  }

  setCampfirePassActive(active: boolean) {
    if (this.campfirePassActive === active) return;

    this.campfirePassActive = active;
    this.syncCampfirePassSound();
  }

  private syncCampfirePassSound() {
    const track = this.tracks[this.campfirePassTrackIndex];
    if (!track) return;

    if (!this.campfirePassActive) {
      if (track.shouldPlay) {
        track.shouldPlay = false;
        track.element.pause();
        track.element.currentTime = 0;
      }
      return;
    }

    const startingPass = !track.shouldPlay;
    track.shouldPlay = true;
    track.element.loop = audioSettings.campfire.loop;

    if (startingPass) {
      track.element.currentTime = 0;
    }

    this.syncPlayback();
  }

  setDronePassActive(active: boolean) {
    if (this.dronePassActive === active) return;

    this.dronePassActive = active;
    this.syncDronePassSound();
  }

  private syncDronePassSound() {
    const track = this.tracks[this.dronePassTrackIndex];
    if (!track) return;

    if (!this.dronePassActive) {
      if (track.shouldPlay) {
        track.shouldPlay = false;
        track.element.pause();
        track.element.currentTime = 0;
      }
      return;
    }

    const startingPass = !track.shouldPlay;
    track.shouldPlay = true;
    track.element.loop = audioSettings.drone.loop;

    if (startingPass) {
      track.element.currentTime = 0;
    }

    this.syncPlayback();
  }

  setBackgroundCarsActive(active: boolean) {
    this.setCarPassActive("rangeRover", active);
  }

  playOldDubaiTextCue() {
    const track = this.tracks[this.oldDubaiTextTrackIndex];
    if (!track) return;

    track.shouldPlay = true;
    track.element.loop = audioSettings.oldDubaiText.loop;
    track.element.currentTime = 0;
    this.syncPlayback();
  }

  playFrameTextCue() {
    const track = this.tracks[this.frameTextTrackIndex];
    if (!track) return;

    track.shouldPlay = true;
    track.element.loop = audioSettings.frameText.loop;
    track.element.currentTime = 0;
    this.syncPlayback();
  }

  playDesertTextCue() {
    const track = this.tracks[this.desertTextTrackIndex];
    if (!track) return;

    track.shouldPlay = true;
    track.element.loop = audioSettings.desertText.loop;
    track.element.currentTime = 0;
    this.syncPlayback();
  }

  playPlaneTextCue() {
    const track = this.tracks[this.planeTextTrackIndex];
    if (!track) return;

    track.shouldPlay = true;
    track.element.loop = audioSettings.planeText.loop;
    track.element.currentTime = 0;
    this.syncPlayback();
  }

  playDolphinJumpCue() {
    const track = this.tracks[this.dolphinJumpTrackIndex];
    if (!track) return;

    track.shouldPlay = true;
    track.element.loop = audioSettings.dolphinJump.loop;
    track.element.currentTime = 0;
    this.syncPlayback();
  }

  playFirecrackerCue() {
    const track = this.tracks[this.firecrackerTrackIndex];
    if (!track) return;

    track.shouldPlay = true;
    track.element.loop = audioSettings.firecracker.loop;
    track.element.currentTime = 0;
    this.syncPlayback();
  }

  private syncPlayback() {
    if (!this.initialized) return;

    for (const track of this.tracks) {
      track.element.volume = this.isMuted ? 0 : track.baseVolume;
      track.element.muted = this.isMuted;

      if (!track.shouldPlay || this.isMuted) {
        continue;
      }

      if (track.element.paused) {
        void track.element.play().catch(() => {
          // Browsers block autoplay until a user gesture unlocks audio.
        });
      }
    }
  }
}

export const audioManager = new AudioManager();
