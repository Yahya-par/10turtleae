"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { decompressFrames, parseGIF } from "gifuct-js";
import { desertSafariVideoSettings } from "@features/portfolio/config/desertSafariVideoSettings";
import { assetNames } from "@features/portfolio/config/assetNames";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";

type DesertSafariVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type GifFrame = {
  dims: { top: number; left: number; width: number; height: number };
  delay: number;
  disposalType?: number;
  patch: Uint8ClampedArray;
};

type GifPlayback = {
  texture: THREE.CanvasTexture;
  update: (deltaMs: number) => void;
  dispose: () => void;
};

function resolveAnchorPosition(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const settings = desertSafariVideoSettings;

  if (settings.useAbsolutePosition) {
    return new THREE.Vector3(...settings.position);
  }

  const camp =
    findSceneObject(
      scene,
      nodes,
      assetNames.safari.camp,
      assetNames.safari.campBlender,
    ) ??
    findSceneObject(
      scene,
      nodes,
      assetNames.campfire.object,
      assetNames.campfire.blenderName,
    );

  if (camp) {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(camp);
    const center = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(
      center.x + settings.campOffset[0],
      center.y + settings.campOffset[1],
      center.z + settings.campOffset[2],
    );
  }

  return new THREE.Vector3(...settings.fallbackPosition);
}

async function createGifPlayback(url: string): Promise<GifPlayback> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load GIF: ${response.status} ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true) as GifFrame[];
  if (!frames.length) {
    throw new Error(`GIF has no frames: ${url}`);
  }

  const gifWidth = gif.lsd?.width || frames[0].dims.width;
  const gifHeight = gif.lsd?.height || frames[0].dims.height;

  // Size canvas BEFORE creating the texture so WebGL gets a real image.
  const canvas = document.createElement("canvas");
  canvas.width = gifWidth;
  canvas.height = gifHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  const patchCanvas = document.createElement("canvas");
  const patchCtx = patchCanvas.getContext("2d");
  if (!patchCtx) throw new Error("2D patch canvas unavailable");

  let frameIndex = 0;
  let elapsed = 0;
  let needsDisposal = false;
  let frameImageData: ImageData | null = null;
  let disposed = false;

  const makeOpaquePatch = (patch: Uint8ClampedArray) => {
    const opaque = new Uint8ClampedArray(patch.length);
    for (let i = 0; i < patch.length; i += 4) {
      const a = patch[i + 3] ?? 255;
      if (a < 128) {
        opaque[i] = 0;
        opaque[i + 1] = 0;
        opaque[i + 2] = 0;
        opaque[i + 3] = 255;
      } else {
        opaque[i] = patch[i] ?? 0;
        opaque[i + 1] = patch[i + 1] ?? 0;
        opaque[i + 2] = patch[i + 2] ?? 0;
        opaque[i + 3] = 255;
      }
    }
    return opaque;
  };

  const drawPatch = (frame: GifFrame) => {
    const { dims } = frame;
    if (
      !frameImageData ||
      frameImageData.width !== dims.width ||
      frameImageData.height !== dims.height
    ) {
      patchCanvas.width = dims.width;
      patchCanvas.height = dims.height;
      frameImageData = patchCtx.createImageData(dims.width, dims.height);
    }

    frameImageData.data.set(makeOpaquePatch(frame.patch));
    patchCtx.putImageData(frameImageData, 0, 0);

    if (needsDisposal) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      needsDisposal = false;
    }

    ctx.drawImage(patchCanvas, dims.left, dims.top);
  };

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPatch(frames[0]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;
  texture.needsUpdate = true;

  return {
    texture,
    update: (deltaMs: number) => {
      if (disposed || frames.length <= 1) return;

      elapsed += deltaMs;
      const current = frames[frameIndex];
      const delay = Math.max(20, current?.delay || 100);
      if (elapsed < delay) return;
      elapsed -= delay;

      if (current?.disposalType === 2) needsDisposal = true;
      frameIndex = (frameIndex + 1) % frames.length;
      drawPatch(frames[frameIndex]);
      texture.needsUpdate = true;
    },
    dispose: () => {
      disposed = true;
      texture.dispose();
    },
  };
}

export default function DesertSafariVideoOverlay({
  scene,
  nodes,
}: DesertSafariVideoOverlayProps) {
  const playbackRef = useRef<GifPlayback | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const settings = desertSafariVideoSettings;

  useLayoutEffect(() => {
    let cancelled = false;
    let geometry: THREE.PlaneGeometry | null = null;
    let material: THREE.MeshBasicMaterial | null = null;
    let mesh: THREE.Mesh | null = null;

    void createGifPlayback(settings.videoUrl)
      .then((playback) => {
        if (cancelled) {
          playback.dispose();
          return;
        }

        geometry = new THREE.PlaneGeometry(settings.width, settings.height);
        material = new THREE.MeshBasicMaterial({
          map: playback.texture,
          side: THREE.DoubleSide,
          toneMapped: false,
          transparent: false,
          depthWrite: true,
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.name = settings.overlayName;
        mesh.renderOrder = 10;
        mesh.frustumCulled = false;
        mesh.position.copy(resolveAnchorPosition(scene, nodes));

        scene.add(mesh);
        meshRef.current = mesh;
        playbackRef.current = playback;

        if (process.env.NODE_ENV === "development") {
          console.info("[DesertSafariVideoOverlay] Ready:", {
            url: settings.videoUrl,
            position: mesh.position.toArray(),
            size: [settings.width, settings.height],
          });
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[DesertSafariVideoOverlay] Failed:", error);
        }
      });

    return () => {
      cancelled = true;
      if (mesh) scene.remove(mesh);
      geometry?.dispose();
      material?.dispose();
      playbackRef.current?.dispose();
      playbackRef.current = null;
      meshRef.current = null;
    };
  }, [scene, nodes, settings]);

  useFrame((state, delta) => {
    playbackRef.current?.update(delta * 1000);

    const mesh = meshRef.current;
    if (!mesh || !settings.faceCamera) return;

    const cam = state.camera.position;
    const dx = cam.x - mesh.position.x;
    const dz = cam.z - mesh.position.z;
    mesh.rotation.y = Math.atan2(dx, dz);
  });

  return null;
}
