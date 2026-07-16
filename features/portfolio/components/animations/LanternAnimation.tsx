"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { lanternAnimationSettings } from "@features/portfolio/config/lanternAnimationSettings";
import { findSceneObject, getObjectBounds } from "@features/portfolio/utils/sceneObjectUtils";

type LanternConfig = (typeof lanternAnimationSettings.lanterns)[number];

type SkyBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
};

type LanternRig = {
  root: THREE.Group;
  configIndex: number;
  paper: THREE.Mesh;
  topCap: THREE.Mesh;
  paperMaterial: THREE.ShaderMaterial;
  bottomRim: THREE.Mesh;
  flame: THREE.Group;
  flameOuter: THREE.Mesh;
  flameCore: THREE.Mesh;
  halo: THREE.Mesh;
  threadMesh: THREE.Mesh;
  labelSprite: THREE.Sprite;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  sway: number;
  bob: number;
};

type LanternAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

const paperVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const paperFragmentShader = /* glsl */ `
  uniform float uFlicker;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  void main() {
    float y = vUv.y;

    // Desert dusk palette — terracotta crown, honey body, cream flame glow
    vec3 topDeep = vec3(0.66, 0.30, 0.20);
    vec3 midRose = vec3(0.82, 0.44, 0.24);
    vec3 warmAmber = vec3(0.94, 0.60, 0.26);
    vec3 honeyGold = vec3(0.98, 0.78, 0.38);
    vec3 creamGlow = vec3(1.0, 0.93, 0.74);

    vec3 color = mix(topDeep, midRose, smoothstep(0.96, 0.64, y));
    color = mix(color, warmAmber, smoothstep(0.74, 0.40, y));
    color = mix(color, honeyGold, smoothstep(0.46, 0.16, y));
    color = mix(color, creamGlow, smoothstep(0.24, 0.0, y));

    // Soft inner bloom from the flame
    float bloom = pow(1.0 - y, 2.0) * uFlicker;
    color = mix(color, creamGlow, bloom * 0.42);
    color += vec3(1.0, 0.84, 0.48) * bloom * 0.22;

    float bottomHot = pow(1.0 - y, 3.0) * 0.16 * uFlicker;
    color += vec3(1.0, 0.90, 0.62) * bottomHot;

    // Gentle paper texture
    float paper =
      sin(vUv.x * 22.0 + vUv.y * 13.0) *
      sin(vUv.y * 18.0 + 1.1) *
      0.008;
    color *= 1.0 + paper;

    // Warm golden edge catch — reads against the peachy sky
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndv = max(dot(normalize(vNormalW), viewDir), 0.0);
    float fresnel = pow(1.0 - ndv, 2.6);
    color += vec3(1.0, 0.74, 0.34) * fresnel * 0.09;
    color *= mix(1.0, 0.82, pow(1.0 - ndv, 4.8) * 0.42);

    // Upper paper stays slightly deeper for silhouette depth
    color = mix(color, topDeep * 1.04, smoothstep(0.42, 0.94, y) * 0.14);

    float alpha = mix(0.74, 0.92, pow(1.0 - y, 1.2));
    alpha = mix(alpha, 0.86, smoothstep(0.14, 0.58, y));
    gl_FragColor = vec4(color, alpha);
  }
`;

function resolveSafariSand(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const { land, landBlender, floor, floorBlender } = lanternAnimationSettings;

  return (
    findSceneObject(scene, nodes, land) ??
    findSceneObject(scene, nodes, landBlender) ??
    findSceneObject(scene, nodes, floor) ??
    findSceneObject(scene, nodes, floorBlender)
  );
}

function resolveSafariMountains(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const { mountains, mountainsBlender } = lanternAnimationSettings;

  return (
    findSceneObject(scene, nodes, mountains) ??
    findSceneObject(scene, nodes, mountainsBlender)
  );
}

function getSkyBounds(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
): SkyBounds | null {
  const sand = resolveSafariSand(scene, nodes);
  if (!sand) return null;

  const sandBounds = getObjectBounds(sand);
  const mountains = resolveSafariMountains(scene, nodes);
  const mountainBounds = mountains ? getObjectBounds(mountains) : null;

  const { pathInset, skyMinOffset, skyMaxOffset } = lanternAnimationSettings;

  const minX = sandBounds.min.x + pathInset;
  const maxX = sandBounds.max.x - pathInset;

  const peakY = mountainBounds
    ? THREE.MathUtils.lerp(mountainBounds.min.y, mountainBounds.max.y, 0.68)
    : sandBounds.max.y + 3.2;

  const minY = peakY + skyMinOffset;
  const maxY = peakY + skyMaxOffset;

  let minZ: number;
  let maxZ: number;

  if (mountainBounds) {
    const mountainFrontZ = Math.max(mountainBounds.min.z, mountainBounds.max.z);
    const towardCameraZ = sandBounds.max.z - pathInset * 0.1;

    minZ = mountainFrontZ + 0.25;
    maxZ = Math.max(minZ + 1.0, towardCameraZ);
  } else {
    minZ = sandBounds.min.z + pathInset;
    maxZ = sandBounds.max.z - pathInset * 0.25;
  }

  return { minX, maxX, minZ, maxZ, minY, maxY };
}

/**
 * Soft barrel silhouette traced from the reference kongming lantern:
 * continuous convex sides, widest mid-upper, gentle taper to a round open base.
 * `t` is 0 at the bottom opening, 1 at the top rim.
 */
function getHalfExtentAt(t: number) {
  // [height, half-width] — rounded vase, not a trapezoid taper
  const keys: Array<[number, number]> = [
    [0.0, 0.186],
    [0.06, 0.208],
    [0.16, 0.252],
    [0.28, 0.292],
    [0.42, 0.322],
    [0.55, 0.338],
    [0.68, 0.334],
    [0.8, 0.318],
    [0.9, 0.302],
    [1.0, 0.29],
  ];

  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];

  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, w0] = keys[i];
    const [t1, w1] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const u = (t - t0) / (t1 - t0);
      const s = u * u * (3 - 2 * u);
      return THREE.MathUtils.lerp(w0, w1, s);
    }
  }
  return keys[keys.length - 1][1];
}

function superellipseXZ(
  theta: number,
  halfW: number,
  halfD: number,
  exponent: number,
) {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const power = 2 / exponent;
  return {
    x: halfW * Math.sign(cos) * Math.pow(Math.abs(cos), power),
    z: halfD * Math.sign(sin) * Math.pow(Math.abs(sin), power),
  };
}

function sampleCrossSection(
  theta: number,
  halfW: number,
  halfD: number,
) {
  const { shapeExponent, depthScale, sideBow } = lanternAnimationSettings;
  const hd = halfD * depthScale;
  let { x, z } = superellipseXZ(theta, halfW, hd, shapeExponent);

  const bow = 1 + sideBow * (0.55 + 0.45 * Math.pow(Math.cos(theta * 2), 2));
  x *= bow;
  z *= bow;

  return { x, z };
}

/** Rounded kongming body — soft barrel sides, open oval base, arched top. */
function createLanternBodyGeometry(height: number) {
  const { radialSegments, heightSegments } = lanternAnimationSettings;
  const bottomTrim = 0;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ringStart: number[] = [];

  for (let iy = 0; iy <= heightSegments; iy += 1) {
    const t = bottomTrim + (iy / heightSegments) * (1 - bottomTrim);
    const y = t * height;
    const halfW = getHalfExtentAt(t);
    ringStart[iy] = positions.length / 3;

    for (let ir = 0; ir < radialSegments; ir += 1) {
      const theta = (ir / radialSegments) * Math.PI * 2;
      const { x, z } = sampleCrossSection(theta, halfW, halfW);
      positions.push(x, y, z);
      uvs.push(ir / radialSegments, t);
    }
  }

  for (let iy = 0; iy < heightSegments; iy += 1) {
    const rowA = ringStart[iy];
    const rowB = ringStart[iy + 1];
    for (let ir = 0; ir < radialSegments; ir += 1) {
      const next = (ir + 1) % radialSegments;
      const a = rowA + ir;
      const b = rowA + next;
      const c = rowB + ir;
      const d = rowB + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createLanternTopCapGeometry(height: number) {
  const { radialSegments } = lanternAnimationSettings;
  const halfW = getHalfExtentAt(1);
  const domeHeight = height * 0.055;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Soft arched top like the reference
  positions.push(0, height + domeHeight, 0);
  uvs.push(0.5, 1);

  const rings = 8;
  for (let ring = 1; ring <= rings; ring += 1) {
    const rt = ring / rings;
    // Cosine dome — fuller round top, not a flat lid
    const y = height + domeHeight * Math.cos((rt * Math.PI) / 2);

    for (let ir = 0; ir < radialSegments; ir += 1) {
      const theta = (ir / radialSegments) * Math.PI * 2;
      const { x, z } = sampleCrossSection(theta, halfW * rt, halfW * rt);
      positions.push(x, y, z);
      uvs.push(0.5, 1);
    }
  }

  for (let ir = 0; ir < radialSegments; ir += 1) {
    const next = (ir + 1) % radialSegments;
    indices.push(0, 1 + ir, 1 + next);
  }

  for (let ring = 0; ring < rings - 1; ring += 1) {
    const rowA = 1 + ring * radialSegments;
    const rowB = 1 + (ring + 1) * radialSegments;
    for (let ir = 0; ir < radialSegments; ir += 1) {
      const next = (ir + 1) % radialSegments;
      const a = rowA + ir;
      const b = rowA + next;
      const c = rowB + ir;
      const d = rowB + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Thin oval rim + short inner lip so the base reads as an open hole. */
function createLanternBottomRimGeometry() {
  const { radialSegments } = lanternAnimationSettings;
  const halfW = getHalfExtentAt(0);
  const tube = 0.007;
  const lipDepth = 0.028;
  const positions: number[] = [];
  const indices: number[] = [];

  // Outer rim ring (y ≈ 0) and inner lip dropping slightly inside
  for (let ir = 0; ir <= radialSegments; ir += 1) {
    const theta = (ir / radialSegments) * Math.PI * 2;
    const outer = sampleCrossSection(theta, halfW + tube, halfW + tube);
    const mid = sampleCrossSection(theta, halfW, halfW);
    const inner = sampleCrossSection(theta, halfW * 0.82, halfW * 0.82);
    const base = ir * 3;
    positions.push(
      outer.x, tube * 0.6, outer.z,
      mid.x, 0, mid.z,
      inner.x, -lipDepth, inner.z,
    );
    if (ir < radialSegments) {
      const next = (ir + 1) * 3;
      // outer → mid band
      indices.push(base, next, base + 1, base + 1, next, next + 1);
      // mid → inner lip
      indices.push(base + 1, next + 1, base + 2, base + 2, next + 1, next + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPaperMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: paperVertexShader,
    fragmentShader: paperFragmentShader,
    uniforms: {
      uFlicker: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function splitLabelToLines(label: string): [string, string] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["", ""];
  if (words.length === 1) return [words[0], ""];
  if (words.length === 2) return [words[0], words[1]];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

function createLanternLabelSprite(label: string) {
  const style = lanternAnimationSettings.hangingLabel;
  const canvas = document.createElement("canvas");
  const width = 1024;
  const height = 320;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("[LanternAnimation] Failed to create label canvas context");
  }

  context.clearRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;

  const text = label.trim();
  const fontSize = style.fontSize;
  context.font = `700 ${fontSize}px ${style.fontFamily}`;

  const y = height * 0.53;
  const textGradient = context.createLinearGradient(0, y - fontSize, 0, y + fontSize * 0.35);
  textGradient.addColorStop(0, "#fff9de");
  textGradient.addColorStop(0.55, style.textColor);
  textGradient.addColorStop(1, "#f7c76e");

  // Warm outer glow
  context.shadowColor = style.glowColor;
  context.shadowBlur = Math.max(14, Math.floor(fontSize * 0.28));
  context.lineWidth = Math.max(4, Math.floor(fontSize * 0.08));
  context.strokeStyle = style.strokeColor;
  context.strokeText(text, width * 0.5, y);

  // Main fill
  context.fillStyle = textGradient;
  context.fillText(text, width * 0.5, y);

  // Subtle glitter specks around letters
  context.shadowBlur = 0;
  context.globalAlpha = 0.8;
  for (let i = 0; i < 26; i += 1) {
    const x = width * 0.18 + Math.random() * width * 0.64;
    const yy = y - fontSize * 0.8 + Math.random() * fontSize * 1.2;
    const r = 1 + Math.random() * 2.2;
    context.fillStyle = i % 2 === 0 ? "#fff8dc" : "#ffd587";
    context.beginPath();
    context.arc(x, yy, r, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  sprite.frustumCulled = false;
  sprite.renderOrder = 16;

  return sprite;
}

function createLanternRig(config: LanternConfig, configIndex: number): LanternRig {
  const {
    bodyHeight,
    flameColor,
    flameCoreColor,
    haloColor,
    rimColor,
    sizeScale,
    heightScale,
    widthScale,
  } = lanternAnimationSettings;
  const labelStyle = lanternAnimationSettings.hangingLabel;

  const root = new THREE.Group();
  const uniform = config.scale * sizeScale;

  const lanternScaled = new THREE.Group();
  lanternScaled.scale.set(uniform * widthScale, uniform * heightScale, uniform * widthScale);
  lanternScaled.frustumCulled = false;

  const paperMaterial = createPaperMaterial();
  const paper = new THREE.Mesh(createLanternBodyGeometry(bodyHeight), paperMaterial);
  paper.castShadow = false;
  paper.receiveShadow = false;
  paper.frustumCulled = false;
  paper.renderOrder = 12;

  const topCap = new THREE.Mesh(
    createLanternTopCapGeometry(bodyHeight),
    paperMaterial,
  );
  topCap.castShadow = false;
  topCap.receiveShadow = false;
  topCap.frustumCulled = false;
  topCap.renderOrder = 12;

  const bottomRim = new THREE.Mesh(
    createLanternBottomRimGeometry(),
    new THREE.MeshBasicMaterial({
      color: rimColor,
      transparent: true,
      opacity: 0.92,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );

  bottomRim.frustumCulled = false;
  bottomRim.renderOrder = 13;

  const flame = new THREE.Group();
  flame.position.y = bodyHeight * 0.022;
  flame.frustumCulled = false;

  // Soft warm bloom around the flame dot
  const flameOuter = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 12, 12),
    new THREE.MeshBasicMaterial({
      color: flameColor,
      transparent: true,
      opacity: 0.64,
      toneMapped: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flameOuter.scale.set(1.15, 0.85, 1.15);
  flameOuter.renderOrder = 14;

  // Bright white-yellow core — matches the reference flame speck
  const flameCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 10, 10),
    new THREE.MeshBasicMaterial({
      color: flameCoreColor,
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  flameCore.renderOrder = 15;

  flame.add(flameOuter, flameCore);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 16),
    new THREE.MeshBasicMaterial({
      color: haloColor,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  halo.position.y = bodyHeight * 0.4;
  halo.scale.set(0.52, 0.82, 0.52);

  halo.frustumCulled = false;
  halo.renderOrder = 11;

  const halfWAtBody = getHalfExtentAt(0.58);
  const threadAnchorY = -labelStyle.gapBelowLantern;
  const threadLength = labelStyle.threadLength;
  const labelSprite = createLanternLabelSprite(config.label);
  labelSprite.position.set(0, threadAnchorY - threadLength - labelStyle.textYOffset, 0);
  labelSprite.scale.set(
    halfWAtBody * 2 * labelStyle.widthScale,
    bodyHeight * labelStyle.heightScale,
    1,
  );

  const threadMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      labelStyle.threadRadius,
      labelStyle.threadRadius,
      threadLength,
      8,
    ),
    new THREE.MeshBasicMaterial({
      color: labelStyle.threadColor,
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  threadMesh.position.set(0, threadAnchorY - threadLength * 0.5, 0);
  threadMesh.renderOrder = 15;
  threadMesh.frustumCulled = false;

  lanternScaled.add(paper, topCap, bottomRim, flame, halo, threadMesh, labelSprite);

  root.frustumCulled = false;
  root.add(lanternScaled);

  return {
    root,
    configIndex,
    paper,
    topCap,
    paperMaterial,
    bottomRim,
    flame,
    flameOuter,
    flameCore,
    halo,
    threadMesh,
    labelSprite,
    baseX: 0,
    baseY: 0,
    baseZ: 0,
    phase: config.phase,
    sway: config.sway,
    bob: config.bob,
  };
}

function getFlicker(elapsed: number, phase: number) {
  return (
    0.94 +
    Math.sin(elapsed * 8.5 + phase) * 0.04 +
    Math.sin(elapsed * 15.5 + phase * 1.5) * 0.03 +
    Math.sin(elapsed * 24.0 + phase * 2.0) * 0.02
  );
}

function syncLanternBasePosition(
  rig: LanternRig,
  bounds: SkyBounds,
  config: LanternConfig,
) {
  rig.baseX = THREE.MathUtils.lerp(bounds.minX, bounds.maxX, config.u);
  rig.baseZ = THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, config.v);
  rig.baseY = THREE.MathUtils.lerp(bounds.minY, bounds.maxY, config.h);
  rig.sway = config.sway;
  rig.bob = config.bob;
  rig.phase = config.phase;
}

function placeLantern(rig: LanternRig, bounds: SkyBounds, config: LanternConfig) {
  syncLanternBasePosition(rig, bounds, config);
  rig.root.position.set(rig.baseX, rig.baseY, rig.baseZ);
}

function updateLantern(
  rig: LanternRig,
  elapsed: number,
  bounds: SkyBounds | null,
) {
  if (bounds) {
    const config = lanternAnimationSettings.lanterns[rig.configIndex];
    if (config) syncLanternBasePosition(rig, bounds, config);
  }

  const flicker = getFlicker(elapsed, rig.phase);
  const swayX = Math.sin(elapsed * 0.55 + rig.phase) * rig.sway;
  const swayZ = Math.cos(elapsed * 0.42 + rig.phase * 1.2) * rig.sway * 0.7;
  const bob = Math.sin(elapsed * 0.85 + rig.phase * 0.8) * rig.bob;
  const x = rig.baseX + swayX;
  const y = rig.baseY + bob;
  const z = rig.baseZ + swayZ;

  rig.root.position.set(x, y, z);

  rig.paperMaterial.uniforms.uFlicker.value = flicker;

  const flameOuterMaterial = rig.flameOuter.material as THREE.MeshBasicMaterial;
  flameOuterMaterial.opacity = 0.56 + flicker * 0.1;

  const flameCoreMaterial = rig.flameCore.material as THREE.MeshBasicMaterial;
  flameCoreMaterial.opacity = 0.84 + flicker * 0.07;

  const haloMaterial = rig.halo.material as THREE.MeshBasicMaterial;
  haloMaterial.opacity = 0.055 + flicker * 0.028;
}

function disposeLantern(rig: LanternRig) {
  rig.paper.geometry.dispose();
  rig.topCap.geometry.dispose();
  rig.paperMaterial.dispose();
  rig.bottomRim.geometry.dispose();
  (rig.bottomRim.material as THREE.Material).dispose();
  rig.flameOuter.geometry.dispose();
  (rig.flameOuter.material as THREE.Material).dispose();
  rig.flameCore.geometry.dispose();
  (rig.flameCore.material as THREE.Material).dispose();
  rig.halo.geometry.dispose();
  (rig.halo.material as THREE.Material).dispose();
  rig.threadMesh.geometry.dispose();
  (rig.threadMesh.material as THREE.Material).dispose();

  const labelMaterial = rig.labelSprite.material as THREE.SpriteMaterial;
  labelMaterial.map?.dispose();
  labelMaterial.dispose();
}

export default function LanternAnimation({ scene, nodes }: LanternAnimationProps) {
  const lanternsRef = useRef<LanternRig[]>([]);
  const flockRef = useRef<THREE.Group | null>(null);
  const boundsRef = useRef<SkyBounds | null>(null);
  const elapsedRef = useRef(0);

  const settingsVersion = JSON.stringify({
    lanterns: lanternAnimationSettings.lanterns,
    skyMinOffset: lanternAnimationSettings.skyMinOffset,
    skyMaxOffset: lanternAnimationSettings.skyMaxOffset,
    pathInset: lanternAnimationSettings.pathInset,
    sizeScale: lanternAnimationSettings.sizeScale,
    bodyHeight: lanternAnimationSettings.bodyHeight,
    heightScale: lanternAnimationSettings.heightScale,
    widthScale: lanternAnimationSettings.widthScale,
    shapeExponent: lanternAnimationSettings.shapeExponent,
    depthScale: lanternAnimationSettings.depthScale,
    sideBow: lanternAnimationSettings.sideBow,
    hangingLabel: lanternAnimationSettings.hangingLabel,
    flameColor: lanternAnimationSettings.flameColor,
    flameCoreColor: lanternAnimationSettings.flameCoreColor,
    haloColor: lanternAnimationSettings.haloColor,
    rimColor: lanternAnimationSettings.rimColor,
  });

  useLayoutEffect(() => {
    const existing = scene.getObjectByName("SafariLanternFlock");
    existing?.removeFromParent();

    const bounds = getSkyBounds(scene, nodes);
    boundsRef.current = bounds;
    if (!bounds) {
      lanternsRef.current = [];
      if (process.env.NODE_ENV === "development") {
        console.warn("[LanternAnimation] Missing safari sand surface:", {
          land: lanternAnimationSettings.land,
          floor: lanternAnimationSettings.floor,
        });
      }
      return;
    }

    const flock = new THREE.Group();
    flock.name = "SafariLanternFlock";
    scene.add(flock);
    flockRef.current = flock;

    const lanterns = lanternAnimationSettings.lanterns.map((config, index) => {
      const rig = createLanternRig(config, index);
      placeLantern(rig, bounds, config);
      flock.add(rig.root);
      return rig;
    });

    lanternsRef.current = lanterns;

    if (process.env.NODE_ENV === "development") {
      console.info("[LanternAnimation] Ready:", {
        count: lanterns.length,
        bounds,
      });
    }

    return () => {
      flock.removeFromParent();
      flockRef.current = null;
      for (const lantern of lanterns) {
        disposeLantern(lantern);
      }
      lanternsRef.current = [];
    };
  }, [scene, nodes, settingsVersion]);

  useFrame((_, delta) => {
    const lanterns = lanternsRef.current;
    if (!lanterns.length) return;

    elapsedRef.current += delta;
    const elapsed = elapsedRef.current;
    const bounds = boundsRef.current;

    for (const lantern of lanterns) {
      updateLantern(lantern, elapsed, bounds);
    }
  });

  return null;
}
