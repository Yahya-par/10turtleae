"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { decompressFrames, parseGIF, type ParsedFrame } from "gifuct-js";
import * as THREE from "three";
import { burjKhalifaVideoSettings } from "@features/portfolio/config/burjKhalifaVideoSettings";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";

type BurjKhalifaVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type GifFrame = ParsedFrame;

type GifPlayback = {
  texture: THREE.CanvasTexture;
  referenceMap: THREE.Texture;
  redrawCurrentFrame: () => void;
  tick: (deltaSeconds: number) => void;
  dispose: () => void;
};

type TexturedMaterial = THREE.Material & {
  map: THREE.Texture | null;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  depthTest: boolean;
  needsUpdate: boolean;
};

const ORIGINAL_MAP_KEY = "burjKhalifaOriginalMap";
const ORIGINAL_POSITION_KEY = "burjKhalifaOriginalPosition";

function isTexturedMaterial(
  material: THREE.Material,
): material is TexturedMaterial {
  return "map" in material;
}

function getOriginalMap(mesh: THREE.Mesh, currentMap: THREE.Texture | null) {
  const stored = mesh.userData[ORIGINAL_MAP_KEY] as THREE.Texture | undefined;
  if (stored) return stored;
  if (!currentMap) return null;
  mesh.userData[ORIGINAL_MAP_KEY] = currentMap;
  return currentMap;
}

function getOriginalPosition(mesh: THREE.Mesh) {
  const stored = mesh.userData[ORIGINAL_POSITION_KEY] as THREE.Vector3 | undefined;
  if (stored) return stored;

  const position = mesh.position.clone();
  mesh.userData[ORIGINAL_POSITION_KEY] = position;
  return position;
}

function applyPositionOffset(mesh: THREE.Mesh) {
  const base = getOriginalPosition(mesh);
  const { positionOffset } = burjKhalifaVideoSettings;

  mesh.position.set(
    base.x + positionOffset.x,
    base.y + positionOffset.y,
    base.z + positionOffset.z,
  );
}

function copyMapTransform(target: THREE.Texture, source: THREE.Texture) {
  target.flipY = source.flipY;
  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
  target.repeat.copy(source.repeat);
  target.offset.copy(source.offset);
  target.center.copy(source.center);
  target.rotation = source.rotation;
}

function applyMapTuning(texture: THREE.Texture, reference: THREE.Texture) {
  copyMapTransform(texture, reference);

  const { textureOffset, textureScale } = burjKhalifaVideoSettings;

  texture.repeat.x /= textureScale.u;
  texture.repeat.y /= textureScale.v;
  texture.offset.x += (1 - 1 / textureScale.u) * 0.5 + textureOffset.u;
  texture.offset.y += (1 - 1 / textureScale.v) * 0.5 + textureOffset.v;
}

function blitFrame(
  targetContext: CanvasRenderingContext2D,
  frame: GifFrame,
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
  mirrorX: boolean,
) {
  const scratch = document.createElement("canvas");
  scratch.width = sourceWidth;
  scratch.height = sourceHeight;
  const scratchContext = scratch.getContext("2d", { alpha: true });
  if (!scratchContext) return;

  const imageData = new ImageData(
    new Uint8ClampedArray(frame.patch),
    frame.dims.width,
    frame.dims.height,
  );
  scratchContext.clearRect(0, 0, sourceWidth, sourceHeight);
  scratchContext.putImageData(imageData, frame.dims.left, frame.dims.top);

  targetContext.clearRect(0, 0, destWidth, destHeight);
  targetContext.save();

  if (mirrorX) {
    targetContext.translate(destWidth, 0);
    targetContext.scale(-1, 1);
  }

  targetContext.drawImage(scratch, 0, 0, destWidth, destHeight);
  targetContext.restore();
}

async function createGifPlayback(
  url: string,
  referenceMap: THREE.Texture,
): Promise<GifPlayback> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `[BurjKhalifaVideoOverlay] Failed to fetch GIF (${response.status}): ${url}`,
    );
  }

  const buffer = await response.arrayBuffer();
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true) as GifFrame[];

  if (frames.length === 0) {
    throw new Error(`[BurjKhalifaVideoOverlay] GIF has no frames: ${url}`);
  }

  const sourceWidth = gif.lsd.width;
  const sourceHeight = gif.lsd.height;
  const maxEdge = burjKhalifaVideoSettings.textureMaxEdge;
  const scale = Math.min(
    1,
    maxEdge / Math.max(sourceWidth, sourceHeight),
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!context) {
    throw new Error("[BurjKhalifaVideoOverlay] Canvas 2D context unavailable");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  applyMapTuning(texture, referenceMap);

  let frameIndex = 0;
  let elapsedMs = 0;

  const renderFrame = (frame: GifFrame) => {
    blitFrame(
      context,
      frame,
      sourceWidth,
      sourceHeight,
      width,
      height,
      burjKhalifaVideoSettings.mirrorX,
    );
    texture.needsUpdate = true;
  };

  renderFrame(frames[0]!);

  return {
    texture,
    referenceMap,
    redrawCurrentFrame: () => {
      const frame = frames[frameIndex];
      if (frame) renderFrame(frame);
    },
    tick: (deltaSeconds: number) => {
      const frame = frames[frameIndex];
      if (!frame) return;

      elapsedMs += deltaSeconds * 1000;
      const delayMs = Math.max(frame.delay || 100, 20);

      if (elapsedMs < delayMs) return;

      elapsedMs = 0;
      frameIndex = (frameIndex + 1) % frames.length;
      renderFrame(frames[frameIndex]!);
    },
    dispose: () => {
      texture.dispose();
    },
  };
}

function isWithinSceneBounds(mesh: THREE.Mesh) {
  const { minX, maxX } = burjKhalifaVideoSettings.sceneBounds;
  const world = new THREE.Vector3();
  mesh.getWorldPosition(world);
  return world.x >= minX && world.x <= maxX;
}

function buildSetupKey() {
  const {
    objectName,
    blenderObjectName,
    mediaUrl,
    textureMaxEdge,
    sceneBounds,
  } = burjKhalifaVideoSettings;

  return [
    objectName,
    blenderObjectName,
    mediaUrl,
    textureMaxEdge,
    sceneBounds.minX,
    sceneBounds.maxX,
  ].join("|");
}

function buildTuningKey() {
  const { positionOffset, textureOffset, textureScale, mirrorX } =
    burjKhalifaVideoSettings;

  return [
    positionOffset.x,
    positionOffset.y,
    positionOffset.z,
    textureOffset.u,
    textureOffset.v,
    textureScale.u,
    textureScale.v,
    mirrorX,
  ].join("|");
}

export default function BurjKhalifaVideoOverlay({
  scene,
  nodes,
}: BurjKhalifaVideoOverlayProps) {
  const playbackRef = useRef<GifPlayback | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const setupKey = buildSetupKey();
  const tuningKey = buildTuningKey();

  useLayoutEffect(() => {
    let cancelled = false;

    scene.updateMatrixWorld(true);

    const burjMesh = findSceneObject(
      scene,
      nodes,
      burjKhalifaVideoSettings.objectName,
    ) ?? findSceneObject(scene, nodes, burjKhalifaVideoSettings.blenderObjectName);

    if (!burjMesh || !(burjMesh as THREE.Mesh).isMesh) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[BurjKhalifaVideoOverlay] Missing asset:",
          burjKhalifaVideoSettings.objectName,
        );
      }
      return;
    }

    const mesh = burjMesh as THREE.Mesh;

    if (!isWithinSceneBounds(mesh)) {
      if (process.env.NODE_ENV === "development") {
        const world = new THREE.Vector3();
        mesh.getWorldPosition(world);
        console.warn("[BurjKhalifaVideoOverlay] Mesh outside scene 6 bounds:", {
          mesh: mesh.name,
          worldX: world.x,
        });
      }
      return;
    }

    meshRef.current = mesh;
    getOriginalPosition(mesh);
    applyPositionOffset(mesh);

    const sourceMaterial = (
      Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    ) as THREE.Material;

    if (!isTexturedMaterial(sourceMaterial)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[BurjKhalifaVideoOverlay] Mesh has no textured material:",
          mesh.name,
        );
      }
      return;
    }

    const originalMap = getOriginalMap(mesh, sourceMaterial.map);
    if (!originalMap) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[BurjKhalifaVideoOverlay] Mesh has no base map:",
          mesh.name,
        );
      }
      return;
    }

    const savedTransparent = sourceMaterial.transparent;
    const savedOpacity = sourceMaterial.opacity;
    const savedDepthWrite = sourceMaterial.depthWrite;
    const savedDepthTest = sourceMaterial.depthTest;

    void createGifPlayback(burjKhalifaVideoSettings.mediaUrl, originalMap)
      .then((playback) => {
        if (cancelled) {
          playback.dispose();
          return;
        }

        sourceMaterial.map = playback.texture;
        sourceMaterial.transparent = true;
        sourceMaterial.opacity = 1;
        sourceMaterial.depthWrite = savedDepthWrite;
        sourceMaterial.depthTest = savedDepthTest;
        sourceMaterial.needsUpdate = true;
        playbackRef.current = playback;

        if (process.env.NODE_ENV === "development") {
          const world = new THREE.Vector3();
          mesh.getWorldPosition(world);
          console.info("[BurjKhalifaVideoOverlay] Ready:", {
            mesh: mesh.name,
            scene: burjKhalifaVideoSettings.sceneLabel,
            worldX: +world.x.toFixed(2),
            media: burjKhalifaVideoSettings.mediaUrl,
            tuning: buildTuningKey(),
          });
        }
      })
      .catch((error: unknown) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[BurjKhalifaVideoOverlay] Setup failed:", error);
        }
      });

    return () => {
      cancelled = true;
      sourceMaterial.map = originalMap;
      sourceMaterial.transparent = savedTransparent;
      sourceMaterial.opacity = savedOpacity;
      sourceMaterial.depthWrite = savedDepthWrite;
      sourceMaterial.depthTest = savedDepthTest;
      sourceMaterial.needsUpdate = true;

      const basePosition = mesh.userData[ORIGINAL_POSITION_KEY] as
        | THREE.Vector3
        | undefined;
      if (basePosition) mesh.position.copy(basePosition);

      playbackRef.current?.dispose();
      playbackRef.current = null;
      meshRef.current = null;
    };
  }, [scene, nodes, setupKey]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (mesh) applyPositionOffset(mesh);

    const playback = playbackRef.current;
    if (!playback) return;

    applyMapTuning(playback.texture, playback.referenceMap);
    playback.redrawCurrentFrame();
  }, [tuningKey]);

  useFrame((_, delta) => {
    playbackRef.current?.tick(delta);
  });

  return null;
}
