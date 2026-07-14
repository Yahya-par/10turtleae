"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { cameraSettings } from "@features/portfolio/config/cameraSettings";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import { firecrackerVideoSettings } from "@features/portfolio/config/firecrackerVideoSettings";
import { useFirecrackerVideoSettingsHmr } from "@features/portfolio/hooks/useFirecrackerVideoSettingsHmr";
import { audioManager } from "@features/portfolio/utils/audioManager";
import {
  sampleFirecrackerTextGlyphs,
  type FirecrackerTextGlyph,
} from "@features/portfolio/utils/firecrackerTextGlyphs";
import {
  findObjectByNamePattern,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type FirecrackerVideoOverlayProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

type SkyAnchor = { centerX: number; centerY: number; centerZ: number };
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

type ParticleMode = "trail" | "ember" | "text";

type Particle = {
  active: boolean;
  x: number;
  y: number;
  px: number;
  py: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  warm: number;
  mode: ParticleMode;
  homeX: number;
  homeY: number;
};

type Rocket = {
  x: number;
  y: number;
  vy: number;
  launchAt: number;
  active: boolean;
};

type BurstCore = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
};

type ScheduledGlyph = {
  glyph: FirecrackerTextGlyph;
  fireAt: number;
  fired: boolean;
};

type FirecrackerDisplay = {
  id: "marina" | "blueWaters";
  mesh: THREE.Mesh;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  scrollWindow: ScrollWindow;
  elapsed: number;
  rockets: Rocket[];
  glyphs: ScheduledGlyph[];
  particles: Particle[];
  burstCores: BurstCore[];
  wasVisible: boolean;
  audioPlayed: boolean;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sparkFragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float alphaCutoff;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(map, vUv);
    float lum = color.r + color.g + color.b;
    if (lum < alphaCutoff) discard;
    float edge = smoothstep(alphaCutoff, alphaCutoff + 0.1, lum);
    gl_FragColor = vec4(color.rgb, edge);
  }
`;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function warmColor(warm: number, alpha: number) {
  const w = THREE.MathUtils.clamp(warm, 0, 1);
  // Rich golden-orange peony (matches classic firework photo).
  const r = 255;
  const g = Math.round(120 + w * 90);
  const b = Math.round(20 + w * 40);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const primary =
    findSceneObject(scene, nodes, config.object, config.blender) ??
    (config.pattern ? findObjectByNamePattern(scene, config.pattern) : null) ??
    (config.floor
      ? findSceneObject(scene, nodes, config.floor, config.floorBlender)
      : null) ??
    (config.floorPattern
      ? findObjectByNamePattern(scene, config.floorPattern)
      : null);

  if (primary) return primary;

  for (const extra of config.extras ?? []) {
    const found = findSceneObject(scene, nodes, extra);
    if (found) return found;
  }

  for (const pattern of config.extraPatterns ?? []) {
    const found = findObjectByNamePattern(scene, pattern);
    if (found) return found;
  }

  return null;
}

function boundsToSkyAnchor(bounds: THREE.Box3): SkyAnchor {
  const { skyDepthZ, skyOffsetY } = firecrackerVideoSettings;
  return {
    centerX: (bounds.min.x + bounds.max.x) * 0.5,
    centerY: bounds.max.y + skyOffsetY,
    centerZ: (bounds.min.z + bounds.max.z) * 0.5 + skyDepthZ,
  };
}

function createFallbackAnchor(
  id: "marina" | "blueWaters",
  cameraX: number,
): SkyAnchor {
  const lookAt = cameraSettings.manual.lookAt;
  const { skyDepthZ, skyOffsetY } = firecrackerVideoSettings;
  return {
    centerX: cameraX + (id === "marina" ? -0.4 : 0.6),
    centerY: lookAt.y + skyOffsetY,
    centerZ: lookAt.z + skyDepthZ,
  };
}

function createParticlePool(): Particle[] {
  const { maxParticles } = firecrackerVideoSettings;
  return Array.from({ length: maxParticles }, () => ({
    active: false,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    ox: 0,
    oy: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 1,
    warm: 0.8,
    mode: "ember" as ParticleMode,
    homeX: 0,
    homeY: 0,
  }));
}

function acquireParticle(pool: Particle[]): Particle | null {
  const free = pool.find((p) => !p.active);
  if (free) return free;
  return pool.reduce<Particle | null>((oldest, p) => {
    if (!p.active || p.mode === "text") return oldest;
    if (!oldest || p.life / p.maxLife > oldest.life / oldest.maxLife) {
      return p;
    }
    return oldest;
  }, null);
}

function spawnTrailParticle(
  pool: Particle[],
  x: number,
  y: number,
  vx: number,
  vy: number,
) {
  const p = acquireParticle(pool);
  if (!p) return;

  p.active = true;
  p.x = x;
  p.y = y;
  p.px = x - vx * 0.016;
  p.py = y - vy * 0.016;
  p.ox = x;
  p.oy = y;
  p.vx = randomBetween(-2, 2);
  p.vy = Math.max(vy * 0.12, 12) + randomBetween(0, 12);
  p.life = 0;
  p.maxLife = randomBetween(0.25, 0.55);
  p.size = randomBetween(0.6, 1.2);
  p.warm = randomBetween(0.55, 0.85);
  p.mode = "trail";
}

/**
 * Classic peony burst — dense radial golden streaks from a bright core.
 */
function spawnPeonyBurst(
  pool: Particle[],
  cores: BurstCore[],
  x: number,
  y: number,
) {
  const {
    burstSparks,
    burstSpeed,
    burstLifeMin,
    burstLifeMax,
  } = firecrackerVideoSettings;

  cores.push({
    x,
    y,
    life: 0,
    maxLife: 0.72,
  });

  for (let i = 0; i < burstSparks; i += 1) {
    const p = acquireParticle(pool);
    if (!p) break;

    // Even sphere of streaks + tiny jitter (photo look).
    const angle =
      (i / burstSparks) * Math.PI * 2 + randomBetween(-0.03, 0.03);
    const impulse = burstSpeed * randomBetween(0.78, 1.08);
    p.active = true;
    p.x = x;
    p.y = y;
    p.px = x;
    p.py = y;
    p.ox = x;
    p.oy = y;
    p.vx = Math.cos(angle) * impulse;
    p.vy = Math.sin(angle) * impulse;
    p.life = 0;
    p.maxLife = randomBetween(burstLifeMin, burstLifeMax);
    p.size = randomBetween(0.55, 1.05);
    p.warm = randomBetween(0.82, 1);
    p.mode = "ember";
  }
}

function spawnTextPin(
  pool: Particle[],
  x: number,
  y: number,
  lifeBudget: number,
) {
  const p = acquireParticle(pool);
  if (!p) return;

  const { textPinSize } = firecrackerVideoSettings;
  p.active = true;
  p.x = x;
  p.y = y;
  p.px = x;
  p.py = y;
  p.ox = x;
  p.oy = y;
  p.vx = 0;
  p.vy = 0;
  p.life = 0;
  p.maxLife = Math.max(0.6, lifeBudget);
  p.size = textPinSize * randomBetween(0.9, 1.15);
  p.warm = randomBetween(0.82, 1);
  p.mode = "text";
  p.homeX = x;
  p.homeY = y;
}

function spawnGlyphLight(
  pool: Particle[],
  glyph: FirecrackerTextGlyph,
  phaseTime: number,
) {
  const {
    textRevealDuration,
    textHoldDuration,
    textFadeDuration,
  } = firecrackerVideoSettings;
  // Live until hold ends, then fade with the fireworks.
  const lifeBudget =
    textRevealDuration - phaseTime + textHoldDuration + textFadeDuration;
  spawnTextPin(pool, glyph.x, glyph.y, lifeBudget);
}

function scheduleGlyphs(glyphs: FirecrackerTextGlyph[]): ScheduledGlyph[] {
  const { textRevealDuration, letterStagger, text } = firecrackerVideoSettings;
  const letterCount = text.length;

  return glyphs.map((glyph) => {
    const letterDelay =
      (glyph.letterIndex / Math.max(letterCount - 1, 1)) *
      letterStagger *
      textRevealDuration;
    const withinLetter = randomBetween(0, textRevealDuration * 0.22);
    return {
      glyph,
      fireAt: letterDelay + withinLetter,
      fired: false,
    };
  });
}

function createRockets(canvasWidth: number, canvasHeight: number): Rocket[] {
  const { rocketCount, launchDuration } = firecrackerVideoSettings;
  const baseY = canvasHeight * 0.97;

  return Array.from({ length: rocketCount }, (_, index) => ({
    x: randomBetween(canvasWidth * 0.1, canvasWidth * 0.9),
    y: baseY,
    vy: randomBetween(canvasHeight * 0.52, canvasHeight * 0.68) / launchDuration,
    launchAt: (index / rocketCount) * launchDuration * 0.88,
    active: false,
  }));
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle) {
  const lifeT = THREE.MathUtils.clamp(particle.life / particle.maxLife, 0, 1);

  if (particle.mode === "text") {
    const { textFadeDuration } = firecrackerVideoSettings;
    const fadeIn = THREE.MathUtils.clamp(particle.life / 0.3, 0, 1);
    const fadeOut = THREE.MathUtils.clamp(
      (particle.maxLife - particle.life) / Math.max(0.05, textFadeDuration),
      0,
      1,
    );
    const flicker =
      0.92 + Math.sin(particle.life * 8 + particle.x * 0.15) * 0.05;
    const alpha = fadeIn * fadeOut * flicker;
    if (alpha < 0.02) return;

    const radius = particle.size;
    const glow = context.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      radius * 2.4,
    );
    glow.addColorStop(0, `rgba(255, 252, 240, ${alpha})`);
    glow.addColorStop(0.3, `rgba(255, 220, 140, ${0.85 * alpha})`);
    glow.addColorStop(0.65, `rgba(255, 170, 60, ${0.35 * alpha})`);
    glow.addColorStop(1, "rgba(255, 120, 30, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(particle.x, particle.y, radius * 2.4, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const alpha =
    particle.mode === "trail"
      ? (1 - lifeT) * 0.9
      : (1 - lifeT) * (1 - lifeT * 0.35);

  if (particle.mode === "ember") {
    // Thin golden-orange radial streak from burst center → tip (classic peony).
    const tipAlpha = Math.max(0, alpha);
    const fade = 1 - lifeT;
    const gradient = context.createLinearGradient(
      particle.ox,
      particle.oy,
      particle.x,
      particle.y,
    );
    gradient.addColorStop(0, `rgba(255, 160, 70, ${0.08 * tipAlpha})`);
    gradient.addColorStop(0.25, warmColor(particle.warm, 0.55 * tipAlpha * fade));
    gradient.addColorStop(0.7, warmColor(particle.warm, tipAlpha));
    gradient.addColorStop(1, `rgba(255, 236, 190, ${tipAlpha})`);

    context.strokeStyle = gradient;
    context.lineWidth = Math.max(0.55, particle.size * 0.7);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(particle.ox, particle.oy);
    context.lineTo(particle.x, particle.y);
    context.stroke();

    // Bright tip — like individual sparks in the photo.
    context.fillStyle = `rgba(255, 250, 230, ${tipAlpha})`;
    context.beginPath();
    context.arc(particle.x, particle.y, Math.max(0.6, particle.size * 0.45), 0, Math.PI * 2);
    context.fill();
    return;
  }

  const dx = particle.x - particle.px;
  const dy = particle.y - particle.py;
  const dist = Math.hypot(dx, dy);

  if (dist > 0.35) {
    context.strokeStyle = warmColor(particle.warm, alpha);
    context.lineWidth = particle.size * 1.3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(particle.px, particle.py);
    context.lineTo(particle.x, particle.y);
    context.stroke();
  }

  context.fillStyle = warmColor(Math.min(particle.warm + 0.15, 1), alpha);
  context.beginPath();
  context.arc(particle.x, particle.y, particle.size * 0.85, 0, Math.PI * 2);
  context.fill();
}

function drawBurstCore(context: CanvasRenderingContext2D, core: BurstCore) {
  const t = THREE.MathUtils.clamp(core.life / core.maxLife, 0, 1);
  const alpha = (1 - t) * (1 - t * 0.35);
  const radius = 10 + t * 28;
  const glow = context.createRadialGradient(
    core.x,
    core.y,
    0,
    core.x,
    core.y,
    radius,
  );
  // Soft white / pale-pink core like the reference peony.
  glow.addColorStop(0, `rgba(255, 252, 248, ${alpha})`);
  glow.addColorStop(0.2, `rgba(255, 230, 210, ${0.95 * alpha})`);
  glow.addColorStop(0.45, `rgba(255, 170, 110, ${0.55 * alpha})`);
  glow.addColorStop(0.75, `rgba(255, 120, 40, ${0.2 * alpha})`);
  glow.addColorStop(1, "rgba(255, 90, 20, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(core.x, core.y, radius, 0, Math.PI * 2);
  context.fill();
}

function updateParticles(pool: Particle[], delta: number) {
  const { burstGravity, burstDrag } = firecrackerVideoSettings;

  for (const particle of pool) {
    if (!particle.active) continue;

    if (particle.mode === "text") {
      particle.life += delta;
      if (particle.life >= particle.maxLife) {
        particle.active = false;
        continue;
      }
      particle.px = particle.x;
      particle.py = particle.y;
      particle.x += (particle.homeX - particle.x) * Math.min(1, delta * 8);
      particle.y += (particle.homeY - particle.y) * Math.min(1, delta * 8);
      continue;
    }

    particle.life += delta;
    if (particle.life >= particle.maxLife) {
      particle.active = false;
      continue;
    }

    particle.px = particle.x;
    particle.py = particle.y;
    // Delay gravity so the peony stays a round sphere first, then softens.
    const lifeT = particle.life / particle.maxLife;
    const gravityScale =
      particle.mode === "ember" ? Math.max(0, (lifeT - 0.25) * 1.35) : 1;
    particle.vy += burstGravity * gravityScale * delta;
    particle.vx *= burstDrag;
    particle.vy *= burstDrag;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
  }
}

function clearCanvas(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvasWidth, canvasHeight);
}

function resetDisplay(display: FirecrackerDisplay, glyphs: FirecrackerTextGlyph[]) {
  const [canvasWidth, canvasHeight] = firecrackerVideoSettings.canvasSize;
  clearCanvas(display.context, canvasWidth, canvasHeight);
  display.texture.needsUpdate = true;
  display.elapsed = 0;
  display.rockets = createRockets(canvasWidth, canvasHeight);
  display.glyphs = scheduleGlyphs(glyphs);
  display.burstCores = [];
  display.audioPlayed = false;
  for (const particle of display.particles) {
    particle.active = false;
  }
}

function updateDisplay(display: FirecrackerDisplay, delta: number) {
  const {
    canvasSize,
    cycleDuration,
    holdDuration,
    textRevealStart,
    launchDuration,
  } = firecrackerVideoSettings;
  const [canvasWidth, canvasHeight] = canvasSize;

  display.elapsed += delta;
  const totalCycle = cycleDuration + holdDuration;
  if (display.elapsed >= totalCycle) {
    resetDisplay(display, getGlyphs());
  }

  const cycleTime = display.elapsed % totalCycle;
  const phaseTime = cycleTime - textRevealStart;
  const textActive = phaseTime >= 0;

  // Full clear each frame — no black fade trails left behind on the sky.
  clearCanvas(display.context, canvasWidth, canvasHeight);

  const burstLineY = canvasHeight * firecrackerVideoSettings.textBandTop;

  for (const rocket of display.rockets) {
    if (
      !rocket.active &&
      cycleTime >= rocket.launchAt &&
      cycleTime < launchDuration + 0.5
    ) {
      rocket.active = true;
    }
    if (!rocket.active) continue;

    rocket.y -= rocket.vy * delta;

    spawnTrailParticle(display.particles, rocket.x, rocket.y, 0, -rocket.vy);
    spawnTrailParticle(
      display.particles,
      rocket.x,
      rocket.y + randomBetween(2, 5),
      0,
      randomBetween(20, 40),
    );

    if (rocket.y <= burstLineY) {
      if (!display.audioPlayed) {
        display.audioPlayed = true;
        audioManager.playFirecrackerCue();
      }
      spawnPeonyBurst(
        display.particles,
        display.burstCores,
        rocket.x,
        rocket.y,
      );
      rocket.active = false;
    }
  }

  if (textActive) {
    for (const entry of display.glyphs) {
      if (entry.fired || phaseTime < entry.fireAt) continue;
      entry.fired = true;
      spawnGlyphLight(display.particles, entry.glyph, phaseTime);
    }
  } else {
    for (const particle of display.particles) {
      if (particle.mode === "text") particle.active = false;
    }
  }

  updateParticles(display.particles, delta);

  for (let i = display.burstCores.length - 1; i >= 0; i -= 1) {
    const core = display.burstCores[i];
    core.life += delta;
    if (core.life >= core.maxLife) {
      display.burstCores.splice(i, 1);
    }
  }

  for (const particle of display.particles) {
    if (particle.active && particle.mode !== "text") {
      drawParticle(display.context, particle);
    }
  }
  // Bright core drawn on top of streaks (like the reference photo).
  for (const core of display.burstCores) {
    drawBurstCore(display.context, core);
  }
  for (const particle of display.particles) {
    if (particle.active && particle.mode === "text") {
      drawParticle(display.context, particle);
    }
  }

  display.texture.needsUpdate = true;
}

function createDisplay(
  id: "marina" | "blueWaters",
  anchor: SkyAnchor,
  scrollWindow: ScrollWindow,
): FirecrackerDisplay {
  const {
    canvasSize,
    planeWidth,
    planeHeight,
    alphaCutoff,
    depthTest,
    renderOrder,
  } = firecrackerVideoSettings;
  const [canvasWidth, canvasHeight] = canvasSize;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create firecracker canvas context");
  }
  clearCanvas(context, canvasWidth, canvasHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      alphaCutoff: { value: alphaCutoff },
    },
    vertexShader,
    fragmentShader: sparkFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `FirecrackerSky_${id}`;
  mesh.position.set(anchor.centerX, anchor.centerY, anchor.centerZ);
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  mesh.visible = false;

  const glyphs = getGlyphs();

  return {
    id,
    mesh,
    canvas,
    context,
    texture,
    scrollWindow,
    elapsed: 0,
    rockets: createRockets(canvasWidth, canvasHeight),
    glyphs: scheduleGlyphs(glyphs),
    particles: createParticlePool(),
    burstCores: [],
    wasVisible: false,
    audioPlayed: false,
  };
}

function disposeDisplay(display: FirecrackerDisplay) {
  display.mesh.removeFromParent();
  display.mesh.geometry.dispose();
  (display.mesh.material as THREE.Material).dispose();
  display.texture.dispose();
}

function applyWorldNudge(
  anchor: SkyAnchor,
  nudge: readonly [number, number, number],
): SkyAnchor {
  return {
    centerX: anchor.centerX + nudge[0],
    centerY: anchor.centerY + nudge[1],
    centerZ: anchor.centerZ + nudge[2],
  };
}

function resolveSkyAnchor(
  id: "marina" | "blueWaters",
  object: THREE.Object3D | null,
  cameraX: number,
): SkyAnchor {
  const manual =
    id === "marina"
      ? firecrackerVideoSettings.marinaManualPosition
      : firecrackerVideoSettings.blueWatersManualPosition;

  if (manual) {
    return { centerX: manual.x, centerY: manual.y, centerZ: manual.z };
  }

  const nudge =
    id === "marina"
      ? firecrackerVideoSettings.marinaWorldNudge
      : firecrackerVideoSettings.blueWatersWorldNudge;

  const anchor = object
    ? boundsToSkyAnchor(getObjectBounds(object))
    : createFallbackAnchor(id, cameraX);

  return applyWorldNudge(anchor, nudge);
}

function resolveScrollWindowForObject(
  object: THREE.Object3D | null,
  sceneFrame: SceneFrame | null,
  fallback: ScrollWindow,
): ScrollWindow {
  if (!object || !sceneFrame) return fallback;

  const bounds = getObjectBounds(object);
  const range = getScrollRange(sceneFrame);
  const atMax = getScrollProgressAtX(bounds.max.x, range);
  const atMin = getScrollProgressAtX(bounds.min.x, range);
  const high = Math.max(atMax, atMin);
  const low = Math.min(atMax, atMin);
  const pad = firecrackerVideoSettings.scrollWindowPadding;

  const scrollStart = THREE.MathUtils.clamp(high - pad, 0, 1);
  const scrollEnd = THREE.MathUtils.clamp(low + pad, 0, 1);

  // Reject windows that are inverted / too wide (would spill into safari).
  if (scrollStart <= scrollEnd || scrollStart - scrollEnd > 0.12) {
    return fallback;
  }

  return { scrollStart, scrollEnd };
}

function buildDisplay(
  id: "marina" | "blueWaters",
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  config: AnchorConfig,
  fallbackWindow: ScrollWindow,
  sceneFrame: SceneFrame | null,
  cameraX: number,
): FirecrackerDisplay {
  const object = resolveAnchorObject(scene, nodes, config);
  const scrollWindow = resolveScrollWindowForObject(
    object,
    sceneFrame,
    fallbackWindow,
  );
  const anchor = resolveSkyAnchor(id, object, cameraX);
  const display = createDisplay(id, anchor, scrollWindow);
  scene.add(display.mesh);
  return display;
}

let cachedGlyphs: FirecrackerTextGlyph[] | null = null;

function getGlyphs() {
  if (!cachedGlyphs) {
    const {
      canvasSize,
      text,
      textSampleGap,
      textFontFamily,
      textFontWeight,
      textLetterSpacing,
      textStrokeWidth,
      textFontScale,
      glyphSparkCount,
      textBandTop,
      textBandHeight,
    } = firecrackerVideoSettings;
    const [canvasWidth, canvasHeight] = canvasSize;
    const textCanvasHeight = Math.round(canvasHeight * textBandHeight);
    const textOffsetY = Math.round(canvasHeight * textBandTop);

    cachedGlyphs = sampleFirecrackerTextGlyphs({
      text,
      textCanvasSize: [canvasWidth, textCanvasHeight],
      textSampleGap,
      textFontFamily,
      textFontWeight,
      textLetterSpacing,
      textStrokeWidth,
      textFontScale,
      glyphSparkCount,
    }).map((glyph) => ({
      ...glyph,
      y: glyph.y + textOffsetY,
    }));
  }
  return cachedGlyphs;
}

export default function FirecrackerVideoOverlay({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: FirecrackerVideoOverlayProps) {
  const displaysRef = useRef<FirecrackerDisplay[]>([]);
  const settingsRevision = useFirecrackerVideoSettingsHmr();
  const settingsVersion = JSON.stringify(firecrackerVideoSettings);
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    cachedGlyphs = null;

    for (const display of displaysRef.current) {
      disposeDisplay(display);
    }
    displaysRef.current = [];

    const cameraX = camera.position.x;

    displaysRef.current = [
      buildDisplay(
        "marina",
        scene,
        nodes,
        firecrackerVideoSettings.marinaAnchor,
        firecrackerVideoSettings.marinaScrollWindow,
        sceneFrame,
        cameraX,
      ),
      buildDisplay(
        "blueWaters",
        scene,
        nodes,
        firecrackerVideoSettings.blueWatersAnchor,
        firecrackerVideoSettings.blueWatersScrollWindow,
        sceneFrame,
        cameraX,
      ),
    ];

    if (process.env.NODE_ENV === "development") {
      console.info("[FirecrackerVideoOverlay] Ready:", {
        cameraX,
        displays: displaysRef.current.map((d) => ({
          id: d.id,
          position: d.mesh.position.toArray(),
          scrollWindow: d.scrollWindow,
          glyphs: d.glyphs.length,
          particles: d.particles.length,
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
    const clampedDelta = Math.min(delta, 0.05);

    for (const display of displays) {
      const visible =
        progress <= firecrackerVideoSettings.maxScrollProgress &&
        isInScrollWindow(
          progress,
          display.scrollWindow.scrollStart,
          display.scrollWindow.scrollEnd,
        );

      display.mesh.visible = visible;
      if (visible) {
        display.mesh.quaternion.copy(camera.quaternion);
      }

      if (!visible) {
        if (display.wasVisible) {
          resetDisplay(display, getGlyphs());
          const [w, h] = firecrackerVideoSettings.canvasSize;
          clearCanvas(display.context, w, h);
          display.texture.needsUpdate = true;
        }
        display.wasVisible = false;
        continue;
      }

      if (!display.wasVisible) {
        resetDisplay(display, getGlyphs());
        if (process.env.NODE_ENV === "development") {
          console.info("[FirecrackerVideoOverlay] Visible:", {
            id: display.id,
            progress: Number(progress.toFixed(4)),
            position: display.mesh.position.toArray(),
            scrollWindow: display.scrollWindow,
          });
        }
      }
      display.wasVisible = true;

      updateDisplay(display, clampedDelta);
    }
  });

  return null;
}
