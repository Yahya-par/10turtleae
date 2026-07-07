import { useFrame } from "@react-three/fiber";
import { audioManager } from "@features/portfolio/utils/audioManager";

export default function AudioRuntime() {
  useFrame(() => {
    audioManager.tick();
  });

  return null;
}
