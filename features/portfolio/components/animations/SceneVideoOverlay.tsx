"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { decompressFrames, parseGIF } from "gifuct-js";
import { findObjectByNamePattern, findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";

export type VideoOverlaySettings = {
  objectName: string;
  blenderObjectName: string;
  videoUrl: string;
  overlayName: string;
  /**
   * Chroma-key threshold for MP4 black backgrounds only.
   * GIFs are shown as-is (no keying). Set 0 to disable.
   */
  alphaCutoff: number;
  /** Uniform scale applied to the cloned billboard mesh (default 1). */
  scale?: number;
  /**
   * World-space nudge after cloning the source mesh.
   * X = along the diorama strip, Y = up, Z = toward/away from camera path.
   */
  positionOffset?: readonly [number, number, number];
};

type SceneVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  settings: VideoOverlaySettings;
  logLabel?: string;
};

type GifFrame = {
  dims: { top: number; left: number; width: number; height: number };
  delay: number;
  disposalType?: number;
  patch: Uint8ClampedArray;
};

type MediaPlayback = {
  texture: THREE.Texture;
  video: HTMLVideoElement | null;
  /** When true, use chroma-key shader. GIFs use a plain sample. */
  useChromaKey: boolean;
  update: (deltaMs: number) => void;
  play: () => void;
  dispose: () => void;
};

const videoVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const chromaKeyFragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float alphaCutoff;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(map, vUv);
    if (color.r + color.g + color.b < alphaCutoff) discard;
    gl_FragColor = color;
  }
`;

const plainFragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(map, vUv);
  }
`;

function resolveSourceMesh(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  settings: VideoOverlaySettings,
) {
  return (
    findSceneObject(
      scene,
      nodes,
      settings.objectName,
      settings.blenderObjectName,
    ) ??
    findObjectByNamePattern(
      scene,
      settings.objectName.includes("anotherasset")
        ? /anotherasset/i
        : /lahbbab/i,
    )
  );
}

function copyTextureSettings(
  target: THREE.Texture,
  source: THREE.Texture | null,
) {
  if (!source) return;
  target.flipY = source.flipY;
  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
  target.repeat.copy(source.repeat);
  target.offset.copy(source.offset);
  target.center.copy(source.center);
  target.rotation = source.rotation;
}

function createOverlayMaterial(
  settings: VideoOverlaySettings,
  useChromaKey: boolean,
) {
  if (useChromaKey && settings.alphaCutoff > 0) {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null as THREE.Texture | null },
        alphaCutoff: { value: settings.alphaCutoff },
      },
      vertexShader: videoVertexShader,
      fragmentShader: chromaKeyFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
  }

  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null as THREE.Texture | null },
    },
    vertexShader: videoVertexShader,
    fragmentShader: plainFragmentShader,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    toneMapped: false,
  });
}

function applyWorldPositionOffset(
  mesh: THREE.Object3D,
  offset: readonly [number, number, number],
) {
  const parent = mesh.parent;
  if (!parent) return;

  parent.updateMatrixWorld(true);

  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);
  worldPos.add(new THREE.Vector3(...offset));
  parent.worldToLocal(worldPos);
  mesh.position.copy(worldPos);
}

function createVideoPlayback(
  url: string,
  referenceMap: THREE.Texture | null,
): MediaPlayback {
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.style.display = "none";
  document.body.appendChild(video);

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  copyTextureSettings(texture, referenceMap);

  const play = () => {
    if (video.paused) {
      void video.play().catch(() => {
        // Autoplay may be blocked until the user interacts with the page.
      });
    }
  };

  video.addEventListener("loadeddata", play);
  window.addEventListener("pointerdown", play, { once: true });
  window.addEventListener("wheel", play, { once: true });

  return {
    texture,
    video,
    useChromaKey: true,
    update: () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        texture.needsUpdate = true;
      }
    },
    play,
    dispose: () => {
      video.removeEventListener("loadeddata", play);
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      texture.dispose();
    },
  };
}

/**
 * Play the GIF frames exactly as encoded — native size, no letterbox, no chroma key.
 * Transparent GIF palette indices are filled with black (matches solid black-bg source).
 */
function createGifPlayback(
  url: string,
  referenceMap: THREE.Texture | null,
): MediaPlayback {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  copyTextureSettings(texture, referenceMap);

  const patchCanvas = document.createElement("canvas");
  const patchCtx = patchCanvas.getContext("2d");

  let disposed = false;
  let frames: GifFrame[] = [];
  let frameIndex = 0;
  let elapsed = 0;
  let needsDisposal = false;
  let frameImageData: ImageData | null = null;

  const makeOpaquePatch = (patch: Uint8ClampedArray) => {
    // Force every pixel opaque; replace transparent samples with black so
    // the GIF looks like the source file (black background, full costume).
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
    if (!ctx || !patchCtx) return;

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
    texture.needsUpdate = true;
  };

  void fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load GIF: ${response.status} ${url}`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      if (disposed || !ctx) return;

      const gif = parseGIF(buffer);
      const decoded = decompressFrames(gif, true) as GifFrame[];
      if (!decoded.length) return;

      frames = decoded;
      canvas.width = gif.lsd?.width || frames[0].dims.width;
      canvas.height = gif.lsd?.height || frames[0].dims.height;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frameIndex = 0;
      elapsed = 0;
      drawPatch(frames[0]);
    })
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[SceneVideoOverlay] GIF load failed:", url, error);
      }
    });

  return {
    texture,
    video: null,
    useChromaKey: false,
    update: (deltaMs: number) => {
      if (!frames.length) return;

      elapsed += deltaMs;
      const current = frames[frameIndex];
      const delay = Math.max(20, current?.delay || 100);
      if (elapsed < delay) return;
      elapsed -= delay;

      if (current?.disposalType === 2) needsDisposal = true;
      frameIndex = (frameIndex + 1) % frames.length;
      drawPatch(frames[frameIndex]);
    },
    play: () => {},
    dispose: () => {
      disposed = true;
      frames = [];
      texture.dispose();
    },
  };
}

function createMediaPlayback(
  url: string,
  referenceMap: THREE.Texture | null,
): MediaPlayback {
  const normalizedUrl = url.toLowerCase().split("?")[0] ?? url.toLowerCase();
  const isVideo =
    normalizedUrl.endsWith(".mp4") ||
    normalizedUrl.endsWith(".webm") ||
    normalizedUrl.endsWith(".ogg") ||
    normalizedUrl.endsWith(".mov");

  if (isVideo) return createVideoPlayback(url, referenceMap);
  if (normalizedUrl.endsWith(".gif")) return createGifPlayback(url, referenceMap);

  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  copyTextureSettings(texture, referenceMap);

  return {
    texture,
    video: null,
    useChromaKey: false,
    update: () => {},
    play: () => {},
    dispose: () => {
      texture.dispose();
    },
  };
}

export default function SceneVideoOverlay({
  scene,
  nodes,
  settings,
  logLabel = "SceneVideoOverlay",
}: SceneVideoOverlayProps) {
  const playbackRef = useRef<MediaPlayback | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const sourceMesh = resolveSourceMesh(scene, nodes, settings);
    if (!sourceMesh || !(sourceMesh as THREE.Mesh).isMesh) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[${logLabel}] Missing asset:`, settings.objectName);
      }
      return;
    }

    const billboardMesh = sourceMesh as THREE.Mesh;
    const sourceMaterial = (
      Array.isArray(billboardMesh.material)
        ? billboardMesh.material[0]
        : billboardMesh.material
    ) as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
    const referenceMap = sourceMaterial?.map ?? null;

    const playback = createMediaPlayback(settings.videoUrl, referenceMap);
    const material = createOverlayMaterial(settings, playback.useChromaKey);
    material.uniforms.map.value = playback.texture;

    const overlay = billboardMesh.clone();
    overlay.name = settings.overlayName;
    overlay.material = material;
    overlay.renderOrder = 2;

    const scale = settings.scale ?? 1;
    if (scale !== 1) {
      overlay.scale.multiplyScalar(scale);
    }

    billboardMesh.parent?.add(overlay);

    if (settings.positionOffset) {
      applyWorldPositionOffset(overlay, settings.positionOffset);
    }
    billboardMesh.visible = false;

    playbackRef.current = playback;
    playback.play();

    if (process.env.NODE_ENV === "development") {
      console.info(`[${logLabel}] Ready:`, {
        source: billboardMesh.name,
        overlay: overlay.name,
        scale,
        positionOffset: settings.positionOffset ?? [0, 0, 0],
        media: settings.videoUrl,
        chromaKey: playback.useChromaKey,
      });
    }

    return () => {
      billboardMesh.visible = true;
      overlay.parent?.remove(overlay);
      material.dispose();
      playback.dispose();
      playbackRef.current = null;
    };
  }, [scene, nodes, settings, logLabel]);

  useFrame((_, delta) => {
    playbackRef.current?.update(delta * 1000);
  });

  return null;
}
