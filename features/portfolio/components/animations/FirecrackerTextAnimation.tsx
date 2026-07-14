"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";
import {
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import { firecrackerAnimationSettings } from "@features/portfolio/config/firecrackerAnimationSettings";
import { useFirecrackerAnimationSettingsHmr } from "@features/portfolio/hooks/useFirecrackerAnimationSettingsHmr";
import {
  findObjectByNamePattern,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type FirecrackerTextAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

type SkyAnchor = {
  centerX: number;
  centerY: number;
  centerZ: number;
  launchY: number;
};

type ScrollWindow = { scrollStart: number; scrollEnd: number };

type AnchorConfig = {
  object: string;
  blender?: string;
  pattern?: RegExp;
  floor?: string;
  floorBlender?: string;
  floorPattern?: RegExp;
  extras?: readonly string[];
  extraPatterns?: readonly RegExp[];
};

type GlyphBurst = {
  glyphX: number;
  glyphY: number;
  glyphZ: number;
  letterIndex: number;
  hue: number;
};

type TrailParticle = {
  glyphIndex: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  size: number;
  hue: number;
  delay: number;
  cycleIndex: number;
  alive: boolean;
};

type RocketParticle = {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseZ: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  delay: number;
  cycleIndex: number;
};

type PointsLayer = {
  points: THREE.Points;
  positions: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  sizes: Float32Array;
  hues: Float32Array;
  velocities: Float32Array;
};

type SceneDisplay = {
  id: "marina" | "blueWaters";
  anchor: SkyAnchor;
  scrollWindow: ScrollWindow;
  glyphs: GlyphBurst[];
  trails: PointsLayer;
  trailParticles: TrailParticle[];
  rockets: PointsLayer;
  rocketParticles: RocketParticle[];
  elapsedTime: number;
};

let cachedGlyphs: GlyphBurst[] | null = null;

const trailVertexShader = /* glsl */ `
  attribute float aAge;
  attribute float aMaxAge;
  attribute float aSize;
  attribute float aHue;
  attribute vec3 aVelocity;
  varying float vAlpha;
  varying float vHue;
  varying vec2 vTrailDir;

  void main() {
    float life = clamp(aAge / aMaxAge, 0.0, 1.0);
    float fadeIn = smoothstep(0.0, 0.06, life);
    float fadeOut = 1.0 - smoothstep(0.55, 1.0, life);
    vAlpha = fadeIn * fadeOut;
    vHue = aHue;

    vec3 vel = aVelocity;
    float speed = length(vel);
    if (speed > 0.001) {
      vel /= speed;
    }
    vec4 velMv = modelViewMatrix * vec4(vel, 0.0);
    vTrailDir = normalize(velMv.xy + vec2(0.0001));

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float stretch = 1.0 + speed * 0.35;
    gl_PointSize = aSize * stretch * (460.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vHue;
  varying vec2 vTrailDir;

  vec3 fireworkPalette(float hue) {
    float h = fract(hue);
    if (h < 0.18) return mix(vec3(1.0, 0.88, 0.22), vec3(1.0, 1.0, 0.95), h / 0.18);
    if (h < 0.38) return mix(vec3(1.0, 0.95, 0.95), vec3(1.0, 0.18, 0.58), (h - 0.18) / 0.2);
    if (h < 0.58) return mix(vec3(1.0, 0.18, 0.58), vec3(0.22, 0.92, 0.42), (h - 0.38) / 0.2);
    if (h < 0.78) return mix(vec3(0.22, 0.92, 0.42), vec3(0.28, 0.72, 1.0), (h - 0.58) / 0.2);
    return mix(vec3(0.28, 0.72, 1.0), vec3(1.0, 0.32, 0.22), (h - 0.78) / 0.22);
  }

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float along = dot(c, vTrailDir);
    float perp = length(c - vTrailDir * along);
    float streak = exp(-perp * perp * 110.0) * exp(-along * along * 5.5);
    float core = exp(-dot(c, c) * 28.0);

    vec3 color = fireworkPalette(vHue);
    color = mix(color, vec3(1.0, 0.98, 0.92), core * 0.72);
    color += vec3(1.0) * core * 0.38;

    float alpha = (streak * 0.85 + core * 0.45) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

const rocketVertexShader = /* glsl */ `
  attribute float aAge;
  attribute float aMaxAge;
  attribute float aSize;
  varying float vAlpha;

  void main() {
    float life = clamp(aAge / aMaxAge, 0.0, 1.0);
    vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.5, 1.0, life));

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 + life * 2.2) * (400.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const rocketFragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float along = c.y;
    float perp = abs(c.x);
    float streak = exp(-perp * perp * 90.0) * smoothstep(-0.5, 0.35, along);
    float head = exp(-dot(c - vec2(0.0, 0.22), c - vec2(0.0, 0.22)) * 40.0);
    vec3 color = mix(vec3(1.0, 0.62, 0.15), vec3(1.0, 0.96, 0.82), head);
    color += vec3(1.0) * head * 0.5;
    gl_FragColor = vec4(color, (streak * 0.7 + head) * vAlpha);
  }
`;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomSphereDirection(target = new THREE.Vector3()) {
  const theta = randomBetween(0, Math.PI * 2);
  const phi = Math.acos(randomBetween(-1, 1));
  target.set(
    Math.sin(phi) * Math.cos(theta),
    Math.abs(Math.sin(phi) * Math.sin(theta)) * randomBetween(0.35, 1),
    Math.cos(phi) * randomBetween(0.4, 1),
  );
  return target.normalize();
}

function limitGlyphs(points: GlyphBurst[], maxPoints: number) {
  if (points.length <= maxPoints) return points;
  const limited: GlyphBurst[] = [];
  const step = points.length / maxPoints;
  for (let i = 0; i < maxPoints; i += 1) {
    limited.push(points[Math.floor(i * step)]);
  }
  return limited;
}

function getLetterIndex(glyphX: number, textWidth: number) {
  const letters = firecrackerAnimationSettings.text.length;
  const normalized = THREE.MathUtils.clamp(
    (0.5 - glyphX / textWidth) * letters,
    0,
    letters - 0.001,
  );
  return Math.floor(normalized);
}

function pickBurstHue(letterIndex: number) {
  const bands = [0.05, 0.28, 0.48, 0.68, 0.88];
  const base = bands[letterIndex % bands.length];
  return base + randomBetween(-0.04, 0.04);
}

function createGlyphs(): GlyphBurst[] {
  if (typeof document === "undefined") {
    const { glyphBurstCount, textWidth } = firecrackerAnimationSettings;
    return Array.from({ length: glyphBurstCount }, (_, index) => {
      const progress = glyphBurstCount <= 1 ? 0.5 : index / (glyphBurstCount - 1);
      const glyphX = (0.5 - progress) * textWidth;
      const letterIndex = getLetterIndex(glyphX, textWidth);
      return {
        glyphX,
        glyphY: 0,
        glyphZ: 0,
        letterIndex,
        hue: pickBurstHue(letterIndex),
      };
    });
  }

  const {
    glyphBurstCount,
    text,
    textCanvasSize,
    textDepth,
    textFontFamily,
    textFontWeight,
    textHeight,
    textLetterSpacing,
    textSampleGap,
    textWidth,
  } = firecrackerAnimationSettings;
  const [canvasWidth, canvasHeight] = textCanvasSize;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) return [];

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let fontSize = Math.floor(canvasHeight * 0.74);
  const buildFont = (size: number) =>
    `${textFontWeight} ${size}px ${textFontFamily}`;
  do {
    context.font = buildFont(fontSize);
    fontSize -= 4;
  } while (
    fontSize > 32 &&
    context.measureText(text).width > canvasWidth * 0.92
  );

  context.font = buildFont(fontSize);
  if (textLetterSpacing > 0) {
    context.letterSpacing = `${textLetterSpacing}px`;
  }
  context.fillText(text, canvasWidth * 0.5, canvasHeight * 0.52);

  const { data } = context.getImageData(0, 0, canvasWidth, canvasHeight);
  const glyphs: GlyphBurst[] = [];

  for (let y = 0; y < canvasHeight; y += textSampleGap) {
    for (let x = 0; x < canvasWidth; x += textSampleGap) {
      const alpha = data[(y * canvasWidth + x) * 4 + 3];
      if (alpha < 32) continue;

      const glyphX = (0.5 - x / canvasWidth) * textWidth;
      const letterIndex = getLetterIndex(glyphX, textWidth);
      glyphs.push({
        glyphX,
        glyphY: (0.5 - y / canvasHeight) * textHeight,
        glyphZ: randomBetween(-textDepth * 0.5, textDepth * 0.5),
        letterIndex,
        hue: pickBurstHue(letterIndex),
      });
    }
  }

  return limitGlyphs(glyphs, glyphBurstCount);
}

function getGlyphs() {
  if (!cachedGlyphs) cachedGlyphs = createGlyphs();
  return cachedGlyphs;
}

function xToScroll(x: number, scrollRange: { min: number; max: number }) {
  const span = scrollRange.max - scrollRange.min;
  return span > 0 ? (x - scrollRange.min) / span : 0;
}

function isInScrollWindow(
  scrollValue: number,
  scrollStart: number,
  scrollEnd: number,
) {
  if (scrollEnd < scrollStart) {
    return scrollValue <= scrollStart && scrollValue >= scrollEnd;
  }
  return scrollValue >= scrollStart && scrollValue <= scrollEnd;
}

function resolveAnchorObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  config: AnchorConfig,
) {
  return (
    findSceneObject(scene, nodes, config.object, config.blender) ??
    (config.pattern ? findObjectByNamePattern(scene, config.pattern) : null) ??
    (config.floor
      ? findSceneObject(scene, nodes, config.floor, config.floorBlender)
      : null) ??
    (config.floorPattern
      ? findObjectByNamePattern(scene, config.floorPattern)
      : null) ??
    config.extras?.map((e) => findSceneObject(scene, nodes, e)).find(Boolean) ??
    config.extraPatterns
      ?.map((p) => findObjectByNamePattern(scene, p))
      .find(Boolean) ??
    null
  );
}

function boundsToSkyAnchor(bounds: THREE.Box3): SkyAnchor {
  const { skyOffsetY, skyDepthZ, launchHeight } = firecrackerAnimationSettings;
  return {
    centerX: (bounds.min.x + bounds.max.x) * 0.5,
    centerY: bounds.max.y + skyOffsetY,
    centerZ: (bounds.min.z + bounds.max.z) * 0.5 + skyDepthZ,
    launchY: bounds.max.y + launchHeight,
  };
}

function createFallbackAnchor(
  sceneFrame: SceneFrame | null,
  progress: number,
): SkyAnchor {
  const range = getScrollRange(sceneFrame);
  const lookAt = cameraSettings.manual.lookAt;
  return {
    centerX: THREE.MathUtils.lerp(range.min, range.max, progress),
    centerY: lookAt.y + 2.4,
    centerZ: lookAt.z + firecrackerAnimationSettings.skyDepthZ,
    launchY: lookAt.y + firecrackerAnimationSettings.launchHeight,
  };
}

function resolveScrollWindowForBounds(
  bounds: THREE.Box3,
  sceneFrame: SceneFrame | null,
): ScrollWindow {
  const { scrollFallback, scrollPadding } = firecrackerAnimationSettings;
  if (!sceneFrame) return scrollFallback;

  const scrollRange = getScrollRange(sceneFrame);
  const scrollStart = THREE.MathUtils.clamp(
    xToScroll(bounds.max.x, scrollRange),
    0,
    1,
  );
  const scrollEnd = THREE.MathUtils.clamp(
    xToScroll(bounds.min.x, scrollRange),
    0,
    1,
  );
  if (!Number.isFinite(scrollStart) || !Number.isFinite(scrollEnd)) {
    return scrollFallback;
  }
  return {
    scrollStart: THREE.MathUtils.clamp(scrollStart + scrollPadding, 0, 1),
    scrollEnd: THREE.MathUtils.clamp(scrollEnd - scrollPadding, 0, 1),
  };
}

function glyphWorldPos(glyph: GlyphBurst, anchor: SkyAnchor) {
  return {
    x: anchor.centerX + glyph.glyphX,
    y: anchor.centerY + glyph.glyphY,
    z: anchor.centerZ + glyph.glyphZ,
  };
}

function createPointsLayer(
  count: number,
  vertexShader: string,
  fragmentShader: string,
  withVelocity: boolean,
  name: string,
  renderOrder: number,
): PointsLayer {
  const positions = new Float32Array(count * 3);
  const ages = new Float32Array(count);
  const maxAges = new Float32Array(count);
  const sizes = new Float32Array(count);
  const hues = new Float32Array(count);
  const velocities = new Float32Array(count * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
  geometry.setAttribute("aMaxAge", new THREE.BufferAttribute(maxAges, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  if (withVelocity) {
    geometry.setAttribute("aHue", new THREE.BufferAttribute(hues, 1));
    geometry.setAttribute("aVelocity", new THREE.BufferAttribute(velocities, 3));
  }

  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: firecrackerAnimationSettings.depthTest,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.frustumCulled = false;
  points.renderOrder = renderOrder;

  return { points, positions, ages, maxAges, sizes, hues, velocities };
}

function writeTrail(
  index: number,
  particle: TrailParticle,
  layer: PointsLayer,
) {
  const offset = index * 3;
  layer.positions[offset] = particle.x;
  layer.positions[offset + 1] = particle.y;
  layer.positions[offset + 2] = particle.z;
  layer.ages[index] = particle.alive ? particle.age : 0;
  layer.maxAges[index] = particle.maxAge;
  layer.sizes[index] = particle.size;
  layer.hues[index] = particle.hue;
  layer.velocities[offset] = particle.vx;
  layer.velocities[offset + 1] = particle.vy;
  layer.velocities[offset + 2] = particle.vz;
}

function writeRocket(
  index: number,
  particle: RocketParticle,
  layer: PointsLayer,
) {
  const offset = index * 3;
  layer.positions[offset] = particle.x;
  layer.positions[offset + 1] = particle.y;
  layer.positions[offset + 2] = particle.z;
  layer.ages[index] = particle.age;
  layer.maxAges[index] = particle.maxAge;
  layer.sizes[index] = particle.size;
}

const tempDir = new THREE.Vector3();

function spawnTrailBurst(
  particle: TrailParticle,
  glyph: GlyphBurst,
  anchor: SkyAnchor,
  cycleTime: number,
) {
  const {
    burstSpeedMax,
    burstSpeedMin,
    letterStagger,
    trailLifeMax,
    trailLifeMin,
    trailMaxSize,
    trailMinSize,
  } = firecrackerAnimationSettings;

  const world = glyphWorldPos(glyph, anchor);
  const speed = randomBetween(burstSpeedMin, burstSpeedMax);
  const dir = randomSphereDirection(tempDir);

  particle.glyphIndex = 0;
  particle.x = world.x;
  particle.y = world.y;
  particle.z = world.z;
  particle.vx = dir.x * speed;
  particle.vy = dir.y * speed;
  particle.vz = dir.z * speed * 0.45;
  particle.age = 0;
  particle.maxAge = randomBetween(trailLifeMin, trailLifeMax);
  particle.size = randomBetween(trailMinSize, trailMaxSize);
  particle.hue = glyph.hue;
  particle.delay =
    glyph.letterIndex * letterStagger + randomBetween(0, letterStagger * 0.35);
  particle.cycleIndex = -1;
  particle.alive = cycleTime >= particle.delay;
}

function spawnRocket(
  particle: RocketParticle,
  anchor: SkyAnchor,
  glyph?: GlyphBurst,
) {
  const {
    launchSpread,
    letterStagger,
    rocketMaxSize,
    rocketMinSize,
  } = firecrackerAnimationSettings;

  particle.baseX =
    anchor.centerX +
    (glyph ? glyph.glyphX * 0.05 : 0) +
    randomBetween(-launchSpread, launchSpread);
  particle.baseZ =
    anchor.centerZ + randomBetween(-launchSpread * 0.4, launchSpread * 0.4);
  particle.x = particle.baseX;
  particle.y = anchor.launchY + randomBetween(-0.06, 0.04);
  particle.z = particle.baseZ;
  particle.vy = randomBetween(3.2, 5.4);
  particle.age = 0;
  particle.maxAge = randomBetween(0.45, 0.75);
  particle.size = randomBetween(rocketMinSize, rocketMaxSize);
  particle.delay = glyph
    ? glyph.letterIndex * letterStagger * 0.75 + randomBetween(0, 0.15)
    : randomBetween(0, 0.35);
  particle.cycleIndex = -1;
}

function createSceneDisplay(
  id: "marina" | "blueWaters",
  anchor: SkyAnchor,
  scrollWindow: ScrollWindow,
): SceneDisplay {
  const {
    glyphBurstCount,
    renderOrder,
    rocketCount,
    trailsPerBurst,
  } = firecrackerAnimationSettings;
  const glyphs = getGlyphs();
  const trailCount = glyphs.length * trailsPerBurst;

  const trailParticles: TrailParticle[] = Array.from(
    { length: trailCount },
    () => ({
      glyphIndex: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      maxAge: 1,
      size: 0.1,
      hue: 0,
      delay: 0,
      cycleIndex: -1,
      alive: false,
    }),
  );

  const trails = createPointsLayer(
    trailCount,
    trailVertexShader,
    trailFragmentShader,
    true,
    `FirecrackerTrails_${id}`,
    renderOrder,
  );

  for (let i = 0; i < trailCount; i += 1) {
    const glyph = glyphs[i % glyphs.length];
    const particle = trailParticles[i];
    spawnTrailBurst(particle, glyph, anchor, 999);
    particle.alive = false;
    writeTrail(i, particle, trails);
  }

  const rocketParticles: RocketParticle[] = Array.from(
    { length: rocketCount },
    () => ({
      x: 0,
      y: 0,
      z: 0,
      baseX: 0,
      baseZ: 0,
      vy: 0,
      age: 0,
      maxAge: 1,
      size: 0.1,
      delay: 0,
      cycleIndex: -1,
    }),
  );

  const rockets = createPointsLayer(
    rocketCount,
    rocketVertexShader,
    rocketFragmentShader,
    false,
    `FirecrackerRockets_${id}`,
    renderOrder - 1,
  );

  for (let i = 0; i < rocketCount; i += 1) {
    spawnRocket(rocketParticles[i], anchor, glyphs[i % glyphs.length]);
    writeRocket(i, rocketParticles[i], rockets);
  }

  return {
    id,
    anchor,
    scrollWindow,
    glyphs,
    trails,
    trailParticles,
    rockets,
    rocketParticles,
    elapsedTime: 0,
  };
}

function disposeDisplay(display: SceneDisplay) {
  display.trails.points.removeFromParent();
  display.trails.points.geometry.dispose();
  (display.trails.points.material as THREE.Material).dispose();
  display.rockets.points.removeFromParent();
  display.rockets.points.geometry.dispose();
  (display.rockets.points.material as THREE.Material).dispose();
}

function buildSceneDisplay(
  id: "marina" | "blueWaters",
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
  config: AnchorConfig,
  fallbackProgress: number,
): SceneDisplay | null {
  const object = resolveAnchorObject(scene, nodes, config);
  const anchor = object
    ? boundsToSkyAnchor(getObjectBounds(object))
    : createFallbackAnchor(sceneFrame, fallbackProgress);
  const bounds = object
    ? getObjectBounds(object)
    : new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(anchor.centerX, anchor.centerY, anchor.centerZ),
        new THREE.Vector3(8, 4, 4),
      );

  const display = createSceneDisplay(
    id,
    anchor,
    resolveScrollWindowForBounds(bounds, sceneFrame),
  );
  scene.add(display.rockets.points);
  scene.add(display.trails.points);
  return display;
}

function updateTrails(
  display: SceneDisplay,
  delta: number,
  cycleLength: number,
) {
  const { burstDrag, burstGravity, burstDuration, launchDuration, willowFall } =
    firecrackerAnimationSettings;
  const burstStart = launchDuration;
  const burstEnd = burstStart + burstDuration;

  for (let i = 0; i < display.trailParticles.length; i += 1) {
    const particle = display.trailParticles[i];
    const glyph = display.glyphs[i % display.glyphs.length];
    const cycleTime = (display.elapsedTime + particle.delay) % cycleLength;
    const cycleIndex = Math.floor(
      (display.elapsedTime + particle.delay) / cycleLength,
    );

    if (particle.cycleIndex !== cycleIndex) {
      particle.cycleIndex = cycleIndex;
      spawnTrailBurst(particle, glyph, display.anchor, cycleTime);
      particle.alive = false;
    }

    if (cycleTime < particle.delay) {
      particle.alive = false;
      writeTrail(i, particle, display.trails);
      continue;
    }

    if (!particle.alive && cycleTime >= particle.delay) {
      particle.alive = true;
      const world = glyphWorldPos(glyph, display.anchor);
      const speed = randomBetween(
        firecrackerAnimationSettings.burstSpeedMin,
        firecrackerAnimationSettings.burstSpeedMax,
      );
      const dir = randomSphereDirection(tempDir);
      particle.x = world.x;
      particle.y = world.y;
      particle.z = world.z;
      particle.vx = dir.x * speed;
      particle.vy = dir.y * speed;
      particle.vz = dir.z * speed * 0.45;
      particle.age = 0;
      particle.maxAge = randomBetween(
        firecrackerAnimationSettings.trailLifeMin,
        firecrackerAnimationSettings.trailLifeMax,
      );
    }

    if (particle.alive) {
      particle.age += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.z += particle.vz * delta;
      particle.vy -= burstGravity * delta;
      particle.vx *= burstDrag;
      particle.vz *= burstDrag;

      if (cycleTime > burstEnd) {
        particle.vy -= willowFall * delta;
      }

      if (particle.age >= particle.maxAge) {
        particle.alive = false;
      }
    }

    writeTrail(i, particle, display.trails);
  }
}

function updateRockets(display: SceneDisplay, delta: number, cycleLength: number) {
  for (let i = 0; i < display.rocketParticles.length; i += 1) {
    const particle = display.rocketParticles[i];
    const glyph = display.glyphs[i % display.glyphs.length];
    const cycleTime = (display.elapsedTime + particle.delay) % cycleLength;
    const cycleIndex = Math.floor(
      (display.elapsedTime + particle.delay) / cycleLength,
    );

    if (particle.cycleIndex !== cycleIndex) {
      particle.cycleIndex = cycleIndex;
      spawnRocket(particle, display.anchor, glyph);
    }

    if (cycleTime < particle.delay) {
      particle.age = 0;
      writeRocket(i, particle, display.rockets);
      continue;
    }

    particle.age += delta;
    particle.x = particle.baseX + Math.sin(cycleTime * 18 + i) * 0.02;
    particle.y += particle.vy * delta;
    particle.z = particle.baseZ;

    if (particle.age >= particle.maxAge) {
      spawnRocket(particle, display.anchor, glyph);
    }

    writeRocket(i, particle, display.rockets);
  }
}

function markLayerDirty(layer: PointsLayer) {
  const geo = layer.points.geometry;
  (geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  (geo.getAttribute("aAge") as THREE.BufferAttribute).needsUpdate = true;
  (geo.getAttribute("aMaxAge") as THREE.BufferAttribute).needsUpdate = true;
  (geo.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
  if (geo.getAttribute("aHue")) {
    (geo.getAttribute("aHue") as THREE.BufferAttribute).needsUpdate = true;
  }
  if (geo.getAttribute("aVelocity")) {
    (geo.getAttribute("aVelocity") as THREE.BufferAttribute).needsUpdate = true;
  }
}

export default function FirecrackerTextAnimation({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: FirecrackerTextAnimationProps) {
  const displaysRef = useRef<SceneDisplay[]>([]);
  const settingsRevision = useFirecrackerAnimationSettingsHmr();
  const settingsVersion = JSON.stringify(firecrackerAnimationSettings);

  useLayoutEffect(() => {
    cachedGlyphs = null;

    for (const display of displaysRef.current) {
      disposeDisplay(display);
    }
    displaysRef.current = [];

    const marina = buildSceneDisplay(
      "marina",
      scene,
      nodes,
      sceneFrame,
      firecrackerAnimationSettings.marinaAnchor,
      0.14,
    );
    const blueWaters = buildSceneDisplay(
      "blueWaters",
      scene,
      nodes,
      sceneFrame,
      firecrackerAnimationSettings.blueWatersAnchor,
      0.05,
    );

    displaysRef.current = [marina, blueWaters].filter(
      (d): d is SceneDisplay => Boolean(d),
    );

    if (process.env.NODE_ENV === "development") {
      console.info("[FirecrackerTextAnimation] Ready:", {
        displays: displaysRef.current.map((d) => ({
          id: d.id,
          anchor: d.anchor,
          trailCount: d.trailParticles.length,
          glyphBursts: d.glyphs.length,
        })),
      });
    }

    return () => {
      for (const display of displaysRef.current) {
        disposeDisplay(display);
      }
      displaysRef.current = [];
    };
  }, [scene, nodes, sceneFrame, settingsVersion, settingsRevision]);

  useFrame((_, delta) => {
    const displays = displaysRef.current;
    if (!displays.length) return;

    const progress = THREE.MathUtils.lerp(
      scrollProgress.current,
      targetScrollProgress.current,
      lerpFactor,
    );

    const { burstDuration, cyclePause, holdDuration, launchDuration } =
      firecrackerAnimationSettings;
    const cycleLength =
      launchDuration + burstDuration + holdDuration + cyclePause;

    for (const display of displays) {
      const visible = isInScrollWindow(
        progress,
        display.scrollWindow.scrollStart,
        display.scrollWindow.scrollEnd,
      );

      display.trails.points.visible = visible;
      display.rockets.points.visible = visible;
      if (!visible) continue;

      display.elapsedTime += delta;
      updateRockets(display, delta, cycleLength);
      updateTrails(display, delta, cycleLength);
      markLayerDirty(display.rockets);
      markLayerDirty(display.trails);
    }
  });

  return null;
}
