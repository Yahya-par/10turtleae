import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { dolphinTextAnimationSettings } from "@features/portfolio/config/dolphinTextAnimationSettings";
import { audioManager } from "@features/portfolio/utils/audioManager";
import {
  findObjectByNamePattern,
  findSceneObject,
} from "@features/portfolio/utils/sceneObjectUtils";
import { isCarVisibleOnScreen } from "@features/portfolio/utils/visibilityUtils";

type DolphinTextAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type BasePose = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

const _pos = new THREE.Vector3();
const _qPitch = new THREE.Quaternion();
const _pitchAxis = new THREE.Vector3(0, 0, 1);

function sampleBreachPosition(
  progress: number,
  base: THREE.Vector3,
  out: THREE.Vector3,
) {
  const { jumpHeight, jumpTravel, submergeDepth } =
    dolphinTextAnimationSettings;

  const travel = progress * progress * (3 - 2 * progress);
  const lift = Math.sin(progress * Math.PI) * jumpHeight;

  out.set(
    base.x + jumpTravel.x * travel,
    base.y - submergeDepth + jumpTravel.y * travel + lift,
    base.z + jumpTravel.z * travel,
  );
}

export default function DolphinTextAnimation({
  scene,
  nodes,
}: DolphinTextAnimationProps) {
  const textRef = useRef<THREE.Object3D | null>(null);
  const baseRef = useRef<BasePose | null>(null);
  const elapsedRef = useRef(0);
  const prevCycleTimeRef = useRef<number>(dolphinTextAnimationSettings.jumpDuration);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const text =
      findSceneObject(
        scene,
        nodes,
        dolphinTextAnimationSettings.objectName,
        dolphinTextAnimationSettings.blenderObjectName,
      ) ?? findObjectByNamePattern(scene, /^dolphintext\.?001$/i);

    if (!text) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[DolphinTextAnimation] Missing asset:",
          dolphinTextAnimationSettings.objectName,
        );
      }
      return;
    }

    // Lock transform parts we never want mutated by orientation hacks.
    text.matrixAutoUpdate = true;

    textRef.current = text;
    baseRef.current = {
      position: text.position.clone(),
      quaternion: text.quaternion.clone(),
      scale: text.scale.clone(),
    };
    elapsedRef.current = 0;
    prevCycleTimeRef.current = dolphinTextAnimationSettings.jumpDuration;

    text.position.set(
      baseRef.current.position.x,
      baseRef.current.position.y - dolphinTextAnimationSettings.submergeDepth,
      baseRef.current.position.z,
    );
    text.quaternion.copy(baseRef.current.quaternion);
    text.scale.copy(baseRef.current.scale);

    if (process.env.NODE_ENV === "development") {
      console.info("[DolphinTextAnimation] Ready:", {
        object: text.name,
        base: baseRef.current.position.toArray(),
        scale: baseRef.current.scale.toArray(),
      });
    }

    return () => {
      const current = textRef.current;
      const base = baseRef.current;
      if (current && base) {
        current.position.copy(base.position);
        current.quaternion.copy(base.quaternion);
        current.scale.copy(base.scale);
      }
    };
  }, [scene, nodes]);

  useFrame(({ camera }, delta) => {
    const text = textRef.current;
    const base = baseRef.current;
    if (!text || !base) return;

    const { jumpDuration, jumpRest, pitchAmount, submergeDepth } =
      dolphinTextAnimationSettings;

    // Always re-apply authored scale — prevents stretch / needle artifacts.
    text.scale.copy(base.scale);

    const prevCycleTime = prevCycleTimeRef.current;
    elapsedRef.current += delta;
    const cycle = jumpDuration + jumpRest;
    const cycleTime = elapsedRef.current % cycle;

    const wasResting = prevCycleTime >= jumpDuration;
    const isJumping = cycleTime < jumpDuration;
    if (
      wasResting &&
      isJumping &&
      isCarVisibleOnScreen(text, camera)
    ) {
      audioManager.playDolphinJumpCue();
    }
    prevCycleTimeRef.current = cycleTime;

    // ——— Rest underwater ———
    if (cycleTime > jumpDuration) {
      text.position.set(
        base.position.x,
        base.position.y - submergeDepth,
        base.position.z,
      );
      text.quaternion.copy(base.quaternion);
      return;
    }

    const progress = THREE.MathUtils.clamp(cycleTime / jumpDuration, 0, 1);
    sampleBreachPosition(progress, base.position, _pos);
    text.position.copy(_pos);

    // Tip in the jump plane (world Z). Positive cos at exit = nose-up for +X travel.
    const pitch = Math.cos(progress * Math.PI) * pitchAmount;
    _qPitch.setFromAxisAngle(_pitchAxis, pitch);
    text.quaternion.copy(base.quaternion).premultiply(_qPitch);
  });

  return null;
}
