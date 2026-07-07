function audioSrc(path: string) {
  return encodeURI(path);
}

export const audioSettings = {
  background: {
    drum: audioSrc("/Audios/drum sound.mp3"),
    dubai: audioSrc("/Audios/dubaibgsound.mp3"),
    loop: true,
    volume: {
      drum: 0.45,
      dubai: 0.55,
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
} as const;
