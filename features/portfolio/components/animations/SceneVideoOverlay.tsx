"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { findObjectByNamePattern, findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";

export type VideoOverlaySettings = {
  objectName: string;
  blenderObjectName: string;
  videoUrl: string;
  overlayName: string;
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

type VideoPlayback = {
  texture: THREE.VideoTexture;
  video: HTMLVideoElement;
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

const videoFragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float alphaCutoff;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(map, vUv);
    if (color.r + color.g + color.b < alphaCutoff) discard;
    gl_FragColor = color;
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

function createVideoMaterial(settings: VideoOverlaySettings) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null as THREE.Texture | null },
      alphaCutoff: { value: settings.alphaCutoff },
    },
    vertexShader: videoVertexShader,
    fragmentShader: videoFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
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
): VideoPlayback {
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

export default function SceneVideoOverlay({
  scene,
  nodes,
  settings,
  logLabel = "SceneVideoOverlay",
}: SceneVideoOverlayProps) {
  const playbackRef = useRef<VideoPlayback | null>(null);
  const overlayRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

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

    const playback = createVideoPlayback(settings.videoUrl, referenceMap);

    const material = createVideoMaterial(settings);
    copyTextureSettings(playback.texture, referenceMap);
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
    overlayRef.current = overlay;
    materialRef.current = material;
    playback.play();

    if (process.env.NODE_ENV === "development") {
      console.info(`[${logLabel}] Ready:`, {
        source: billboardMesh.name,
        overlay: overlay.name,
        scale,
        positionOffset: settings.positionOffset ?? [0, 0, 0],
      });
    }

    return () => {
      billboardMesh.visible = true;
      overlay.parent?.remove(overlay);
      material.dispose();
      playback.dispose();
      playbackRef.current = null;
      overlayRef.current = null;
      materialRef.current = null;
    };
  }, [scene, nodes, settings, logLabel]);

  useFrame(() => {
    const playback = playbackRef.current;
    if (!playback) return;
    if (playback.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playback.texture.needsUpdate = true;
    }
  });

  return null;
}
