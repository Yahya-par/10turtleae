"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import normalizeWheel from "normalize-wheel";

const BASE_SCROLL_SPEED = 0.0085;
const LERP_FACTOR = 0.1;

export function useScrollNavigation(enabled: boolean) {
  const scrollProgress = useRef(0);
  const targetScrollProgress = useRef(0);
  const mousePositionOffset = useRef(new THREE.Vector3());
  const mouseRotationOffset = useRef(new THREE.Euler());
  const isDragging = useRef(false);
  const lastTouchY = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const normalized = normalizeWheel(event);
      targetScrollProgress.current += Math.sign(normalized.pixelY)
        * BASE_SCROLL_SPEED
        * Math.min(Math.abs(normalized.pixelY) / 100, 1);
      targetScrollProgress.current = THREE.MathUtils.clamp(
        targetScrollProgress.current,
        0,
        1,
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = (event.clientY / window.innerHeight) * 2 - 1;

      mousePositionOffset.current.x = mouseX * 0.05;
      mousePositionOffset.current.y = mouseY * 0.05;
      mouseRotationOffset.current.x = mouseY * 0.05;
      mouseRotationOffset.current.y = mouseX * 0.05;

      if (isDragging.current) {
        targetScrollProgress.current += Math.sign(event.movementY) * BASE_SCROLL_SPEED * 0.2;
        targetScrollProgress.current = THREE.MathUtils.clamp(
          targetScrollProgress.current,
          0,
          1,
        );
      }
    };

    const handleMouseDown = () => {
      isDragging.current = true;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      isDragging.current = true;
      lastTouchY.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging.current || lastTouchY.current === null) return;
      const deltaY = event.touches[0].clientY - lastTouchY.current;
      targetScrollProgress.current += Math.sign(deltaY) * BASE_SCROLL_SPEED * 0.3;
      targetScrollProgress.current = THREE.MathUtils.clamp(
        targetScrollProgress.current,
        0,
        1,
      );
      lastTouchY.current = event.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      isDragging.current = false;
      lastTouchY.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled]);

  return {
    scrollProgress,
    targetScrollProgress,
    mousePositionOffset,
    mouseRotationOffset,
    lerpFactor: LERP_FACTOR,
  };
}
