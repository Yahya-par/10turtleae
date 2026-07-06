"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { burjKhalifaVideoSettings } from "@features/portfolio/config/burjKhalifaVideoSettings";
import { findSceneObject } from "@features/portfolio/utils/sceneObjectUtils";

type BurjKhalifaVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
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

function resolveBurjMesh(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  return (
    findSceneObject(scene, nodes, burjKhalifaVideoSettings.objectName) ??
    findSceneObject(scene, nodes, burjKhalifaVideoSettings.blenderObjectName)
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

function createVideoMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null as THREE.Texture | null },
      alphaCutoff: { value: burjKhalifaVideoSettings.alphaCutoff },
    },
    vertexShader: videoVertexShader,
    fragmentShader: videoFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
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

export default function BurjKhalifaVideoOverlay({
  scene,
  nodes,
}: BurjKhalifaVideoOverlayProps) {
  const playbackRef = useRef<VideoPlayback | null>(null);
  const overlayRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const sourceMesh = resolveBurjMesh(scene, nodes);
    if (!sourceMesh || !(sourceMesh as THREE.Mesh).isMesh) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[BurjKhalifaVideoOverlay] Missing asset:",
          burjKhalifaVideoSettings.objectName,
        );
      }
      return;
    }

    const burjMesh = sourceMesh as THREE.Mesh;
    const sourceMaterial = (
      Array.isArray(burjMesh.material) ? burjMesh.material[0] : burjMesh.material
    ) as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
    const referenceMap = sourceMaterial?.map ?? null;

    const playback = createVideoPlayback(
      burjKhalifaVideoSettings.videoUrl,
      referenceMap,
    );

    const material = createVideoMaterial();
    copyTextureSettings(playback.texture, referenceMap);
    material.uniforms.map.value = playback.texture;

    const overlay = burjMesh.clone();
    overlay.name = burjKhalifaVideoSettings.overlayName;
    overlay.material = material;
    overlay.renderOrder = 2;

    burjMesh.parent?.add(overlay);
    burjMesh.visible = false;

    playbackRef.current = playback;
    overlayRef.current = overlay;
    materialRef.current = material;
    playback.play();

    if (process.env.NODE_ENV === "development") {
      console.info("[BurjKhalifaVideoOverlay] Ready:", {
        source: burjMesh.name,
        overlay: overlay.name,
      });
    }

    return () => {
      burjMesh.visible = true;
      overlay.parent?.remove(overlay);
      material.dispose();
      playback.dispose();
      playbackRef.current = null;
      overlayRef.current = null;
      materialRef.current = null;
    };
  }, [scene, nodes]);

  useFrame(() => {
    const playback = playbackRef.current;
    if (!playback) return;
    if (playback.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playback.texture.needsUpdate = true;
    }
  });

  return null;
}
