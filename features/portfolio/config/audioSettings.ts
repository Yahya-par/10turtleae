function audioSrc(path: string) {
  return encodeURI(path);
}

export const audioSettings = {
  background: {
    drum: audioSrc("/Audios/drum sound.mp3"),
    dubai: audioSrc("/Audios/dubaibgsound.mp3"),
    loop: true,
    volume: {
      drum: 0.35,
      dubai: 0.35,
    },
  },
  cars: {
    /** Car1001, RR001, and scroll car — plays when visible on screen */
    passBy: audioSrc("/Audios/trimmedcarmovingsound.mp3"),
    loop: false,
    volume: 0.7,
  },
  metro: {
    /** Metro001 — plays when the metro train is visible on screen */
    passBy: audioSrc("/Audios/trainsound.mp3"),
    loop: true,
    volume: 0.7,
  },
  plane: {
    /** planewithtext001 — plays when the plane is visible on screen */
    passBy: audioSrc("/Audios/planeaudio.mp3"),
    loop: true,
    volume: 0.7,
  },
  campfire: {
    /** campfire001 — plays when the campfire is visible on screen */
    passBy: audioSrc("/Audios/campfiresound.mp3"),
    loop: true,
    volume: 0.7,
  },
  drone: {
    /** drone001 — plays when the drone is visible on screen */
    passBy: audioSrc("/Audios/dronesound.mp3"),
    loop: true,
    volume: 0.2,
  },
  oldDubaiText: {
    /** olddubaitext001 — plays once when the Old Dubai text enters view */
    cue: audioSrc("/Audios/olddubaitext.mp3"),
    loop: false,
    volume: 1.00,
  },
  frameText: {
    /** frametext001 — plays once when the Dubai Frame text enters view */
    cue: audioSrc("/Audios/frametext.mp3"),
    loop: false,
    volume: 1.0,
  },
  desertText: {
    /** SafariCamp001 — plays once when the safari camp enters view */
    cue: audioSrc("/Audios/plane text.mp3"),
    loop: false,
    volume: 1.0,
  },
  planeText: {
    /** planewithtext001 — plays once when the plane text enters view */
    cue: audioSrc("/Audios/plane text.mp3"),
    loop: false,
    volume: 1.0,
  },
} as const;
