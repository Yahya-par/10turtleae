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

type BannerStyle = (typeof lanternAnimationSettings)["banner"];

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
  banner: THREE.Sprite;
  stringMesh: THREE.Mesh;
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

    // Warm amber-orange gradient — avoid harsh white/yellow
    vec3 hotBase = vec3(0.96, 0.62, 0.18);
    vec3 goldenOrange = vec3(0.92, 0.52, 0.14);
    vec3 warmOrange = vec3(0.84, 0.42, 0.12);
    vec3 burntOrange = vec3(0.72, 0.33, 0.1);
    vec3 topTerracotta = vec3(0.58, 0.26, 0.09);

    vec3 color = mix(topTerracotta, burntOrange, smoothstep(0.88, 0.58, y));
    color = mix(color, warmOrange, smoothstep(0.68, 0.38, y));
    color = mix(color, goldenOrange, smoothstep(0.48, 0.18, y));
    color = mix(color, hotBase, smoothstep(0.22, 0.0, y));

    float emissive = pow(1.0 - y, 1.6) * 0.28 * uFlicker;
    color += vec3(0.95, 0.52, 0.12) * emissive;

    float bottomHot = pow(1.0 - y, 3.5) * 0.16 * uFlicker;
    color += vec3(0.98, 0.68, 0.22) * bottomHot;

    // Subtle paper grain
    float paper =
      sin(vUv.x * 26.0 + vUv.y * 16.0) *
      sin(vUv.y * 22.0 + 1.3) *
      0.01;
    color *= 1.0 + paper;

    // Soft translucent edge glow
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 3.4);
    color += vec3(0.95, 0.55, 0.12) * fresnel * 0.08;

    color *= mix(0.88, 1.0, smoothstep(0.82, 0.28, y));

    float alpha = mix(0.62, 0.9, pow(1.0 - y, 1.7));
    alpha = mix(alpha, 0.82, smoothstep(0.18, 0.62, y));
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
 * Side-profile half-width — subtle belly in lower third, not a wide center bulge.
 */
function getHalfExtentAt(t: number) {
  const base = 0.262;
  const belly = 0.302;
  const top = 0.252;

  if (t <= 0.08) {
    return THREE.MathUtils.lerp(base * 0.98, base, t / 0.08);
  }
  if (t <= 0.34) {
    return THREE.MathUtils.lerp(base, belly, (t - 0.08) / 0.26);
  }
  if (t <= 0.8) {
    return THREE.MathUtils.lerp(belly, top, (t - 0.34) / 0.46);
  }
  return THREE.MathUtils.lerp(top, top, (t - 0.8) / 0.2);
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

/** Rounded-rectangle pillow body — soft corners, wide open base. */
function createLanternBodyGeometry(height: number) {
  const { radialSegments, heightSegments } = lanternAnimationSettings;
  const bottomTrim = 0.04;

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
  const shape = new THREE.Shape();

  for (let ir = 0; ir <= radialSegments; ir += 1) {
    const theta = (ir / radialSegments) * Math.PI * 2;
    const { x, z } = sampleCrossSection(theta, halfW, halfW);
    if (ir === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape, radialSegments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height, 0);

  const topUvs = new Float32Array(geometry.attributes.position.count * 2);
  for (let i = 0; i < topUvs.length; i += 2) {
    topUvs[i] = 0.5;
    topUvs[i + 1] = 1;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(topUvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function createLanternBottomRimGeometry() {
  const { radialSegments } = lanternAnimationSettings;
  const halfW = getHalfExtentAt(0.04);
  const innerScale = 0.72;
  const y = 0.018;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let ir = 0; ir <= radialSegments; ir += 1) {
    const theta = (ir / radialSegments) * Math.PI * 2;
    const outer = sampleCrossSection(theta, halfW, halfW);
    const inner = sampleCrossSection(theta, halfW * innerScale, halfW * innerScale);
    positions.push(outer.x, y, outer.z, inner.x, y * 0.35, inner.z);
  }

  for (let ir = 0; ir < radialSegments; ir += 1) {
    const o0 = ir * 2;
    const i0 = o0 + 1;
    const o1 = ((ir + 1) % radialSegments) * 2;
    const i1 = o1 + 1;
    indices.push(o0, o1, i0, i0, o1, i1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function measureVerticalLabelHeight(
  context: CanvasRenderingContext2D,
  label: string,
  fontSize: number,
) {
  const letterSpacing = fontSize * 1.08;
  const chars = label.replace(/\s+/g, "").split("");
  return chars.length * letterSpacing;
}

function createVerticalBannerTexture(label: string, style: BannerStyle) {
  const canvas = document.createElement("canvas");
  const width = 384;
  const height = 1024;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("[LanternAnimation] Failed to create banner canvas context");
  }

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, style.background);
  gradient.addColorStop(0.55, style.background);
  gradient.addColorStop(1, style.backgroundDark);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const trimInset = 16;
  context.strokeStyle = style.trimColor;
  context.lineWidth = 8;
  context.strokeRect(trimInset, trimInset, width - trimInset * 2, height - trimInset * 2);

  context.fillStyle = style.textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const compactLabel = label.replace(/\s+/g, "");
  let fontSize = Math.floor(width * 0.58);
  do {
    context.font = `700 ${fontSize}px ${style.textFontFamily}`;
    fontSize -= 1;
  } while (
    fontSize > 22 &&
    measureVerticalLabelHeight(context, compactLabel, fontSize) >
      height * 0.84
  );

  context.font = `700 ${fontSize}px ${style.textFontFamily}`;

  const letterSpacing = fontSize * 1.06;
  const chars = compactLabel.split("");
  const totalHeight = chars.length * letterSpacing;
  let y = height * 0.5 - totalHeight * 0.5 + letterSpacing * 0.5;

  for (const char of chars) {
    context.fillText(char, width * 0.5, y);
    y += letterSpacing;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createLanternBannerRig(
  config: LanternConfig,
  lanternWorldHeight: number,
) {
  const style = lanternAnimationSettings.banner;
  const hang = new THREE.Group();
  hang.position.y = -lanternWorldHeight * 0.5 - style.gapBelowLantern;
  hang.frustumCulled = false;

  const stringMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(style.stringRadius, style.stringRadius, style.stringLength, 8),
    new THREE.MeshBasicMaterial({
      color: style.stringColor,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  stringMesh.position.y = -style.stringLength * 0.5;
  stringMesh.frustumCulled = false;
  stringMesh.renderOrder = style.renderOrder;

  const bannerTexture = createVerticalBannerTexture(config.service, style);
  const banner = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: bannerTexture,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  banner.center.set(0.5, 1);
  banner.position.y = -style.stringLength;
  banner.scale.set(style.width, style.height, 1);
  banner.frustumCulled = false;
  banner.renderOrder = style.renderOrder;

  hang.add(stringMesh, banner);

  return { hang, banner, stringMesh };
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

  const root = new THREE.Group();
  const uniform = config.scale * sizeScale;
  const lanternWorldHeight = bodyHeight * uniform * heightScale;

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
  flame.position.y = bodyHeight * 0.038;
  flame.frustumCulled = false;

  const flameOuter = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 10, 10),
    new THREE.MeshBasicMaterial({
      color: flameColor,
      transparent: true,
      opacity: 0.62,
      toneMapped: false,
    }),
  );
  flameOuter.scale.set(1, 1.3, 1);

  flameOuter.renderOrder = 14;

  const flameCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.024, 8, 8),
    new THREE.MeshBasicMaterial({
      color: flameCoreColor,
      transparent: true,
      opacity: 0.82,
      toneMapped: false,
    }),
  );
  flameCore.scale.set(1, 1.15, 1);

  flameCore.renderOrder = 15;

  flame.add(flameOuter, flameCore);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 16),
    new THREE.MeshBasicMaterial({
      color: haloColor,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  halo.position.y = bodyHeight * 0.44;
  halo.scale.set(0.56, 0.72, 0.52);

  halo.frustumCulled = false;
  halo.renderOrder = 11;

  lanternScaled.add(paper, topCap, bottomRim, flame, halo);

  const { hang, banner, stringMesh } = createLanternBannerRig(config, lanternWorldHeight);

  root.frustumCulled = false;
  root.add(lanternScaled, hang);

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
    banner,
    stringMesh,
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
  flameOuterMaterial.opacity = 0.56 + flicker * 0.08;

  const flameCoreMaterial = rig.flameCore.material as THREE.MeshBasicMaterial;
  flameCoreMaterial.opacity = 0.78 + flicker * 0.06;

  const haloMaterial = rig.halo.material as THREE.MeshBasicMaterial;
  haloMaterial.opacity = 0.032 + flicker * 0.02;
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
  rig.stringMesh.geometry.dispose();
  (rig.stringMesh.material as THREE.Material).dispose();
  const bannerMaterial = rig.banner.material as THREE.SpriteMaterial;
  bannerMaterial.map?.dispose();
  bannerMaterial.dispose();
}

export default function LanternAnimation({ scene, nodes }: LanternAnimationProps) {
  const lanternsRef = useRef<LanternRig[]>([]);
  const flockRef = useRef<THREE.Group | null>(null);
  const boundsRef = useRef<SkyBounds | null>(null);
  const elapsedRef = useRef(0);

  const settingsVersion = JSON.stringify({
    lanterns: lanternAnimationSettings.lanterns,
    banner: lanternAnimationSettings.banner,
    skyMinOffset: lanternAnimationSettings.skyMinOffset,
    skyMaxOffset: lanternAnimationSettings.skyMaxOffset,
    pathInset: lanternAnimationSettings.pathInset,
    sizeScale: lanternAnimationSettings.sizeScale,
    bodyHeight: lanternAnimationSettings.bodyHeight,
    heightScale: lanternAnimationSettings.heightScale,
    widthScale: lanternAnimationSettings.widthScale,
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
