import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { campfireSmokeSettings } from "@features/portfolio/config/campfireSmokeSettings";
import { useCampfireSmokeSettingsHmr } from "@features/portfolio/hooks/useCampfireSmokeSettingsHmr";
import {
  getObjectBounds,
  normalizeObjectName,
} from "@features/portfolio/utils/sceneObjectUtils";

type CampfireSmokeProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type Particle = {
  age: number;
  maxAge: number;
  size: number;
  glyphX: number;
  glyphY: number;
  glyphZ: number;
  x: number;
  y: number;
  z: number;
  delay: number;
  phase: number;
  sway: number;
};

type SmokeSystem = {
  points: THREE.Points;
  particles: Particle[];
  targets: THREE.Vector3[];
  positions: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  sizes: Float32Array;
  elapsedTime: number;
};

type PlumeParticle = {
  age: number;
  maxAge: number;
  size: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

type PlumeSmokeSystem = {
  points: THREE.Points;
  particles: PlumeParticle[];
  positions: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  sizes: Float32Array;
};

type MountedSmokeSystems = {
  plume: PlumeSmokeSystem;
  text: SmokeSystem;
};

let cachedTextTargets: THREE.Vector3[] | null = null;

// vertexShader - the vertex shader for the smoke system is responsible for the position and size of the smoke particles
const vertexShader = /* glsl */ `
  attribute float aAge;
  attribute float aMaxAge;
  attribute float aSize;
  uniform float uMaxOpacity;
  varying float vAlpha;

  void main() {
    float life = clamp(aAge / aMaxAge, 0.0, 1.0);
    float fadeIn = smoothstep(0.0, 0.1, life);
    float fadeOut = 1.0 - smoothstep(0.4, 1.0, life);
    vAlpha = uMaxOpacity * fadeIn * fadeOut;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (420.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// fragmentShader - the fragment shader for the smoke system is responsible for the color and opacity of the smoke particles
const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float soft = smoothstep(0.5, 0.06, dist);
    gl_FragColor = vec4(0.86, 0.86, 0.86, soft * vAlpha);
  }
`;

// randomBetween - generate a random number between two numbers
function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function limitTextTargets(points: THREE.Vector3[], maxPoints: number) {
  if (points.length <= maxPoints) return points;

  const limited: THREE.Vector3[] = [];
  const step = points.length / maxPoints;

  for (let i = 0; i < maxPoints; i += 1) {
    limited.push(points[Math.floor(i * step)]);
  }

  return limited;
}

function createFallbackTextTargets() {
  const { particleCount, textWidth } = campfireSmokeSettings;

  return Array.from({ length: particleCount }, (_, index) => {
    const progress = particleCount <= 1 ? 0.5 : index / (particleCount - 1);
    return new THREE.Vector3(
      (progress - 0.5) * textWidth,
      0,
      randomBetween(-0.03, 0.03),
    );
  });
}

function createTextTargets() {
  if (typeof document === "undefined") {
    return createFallbackTextTargets();
  }

  const {
    particleCount,
    text,
    textCanvasSize,
    textDepth,
    textFontFamily,
    textFontWeight,
    textHeight,
    textLetterSpacing,
    textSampleGap,
    textWidth,
  } = campfireSmokeSettings;
  const [canvasWidth, canvasHeight] = textCanvasSize;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return createFallbackTextTargets();
  }

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let fontSize = Math.floor(canvasHeight * 0.72);
  const buildFont = (size: number) =>
    `${textFontWeight} ${size}px ${textFontFamily}`;
  do {
    context.font = buildFont(fontSize);
    fontSize -= 4;
  } while (
    fontSize > 32 &&
    context.measureText(text).width > canvasWidth * 0.9
  );

  context.font = buildFont(fontSize);
  if (textLetterSpacing > 0) {
    context.letterSpacing = `${textLetterSpacing}px`;
  }
  context.fillText(text, canvasWidth * 0.5, canvasHeight * 0.53);

  const { data } = context.getImageData(0, 0, canvasWidth, canvasHeight);
  const points: THREE.Vector3[] = [];

  for (let y = 0; y < canvasHeight; y += textSampleGap) {
    for (let x = 0; x < canvasWidth; x += textSampleGap) {
      const alpha = data[(y * canvasWidth + x) * 4 + 3];
      if (alpha < 32) continue;

      points.push(
        new THREE.Vector3(
          (0.5 - x / canvasWidth) * textWidth,
          (0.5 - y / canvasHeight) * textHeight,
          randomBetween(-textDepth * 0.5, textDepth * 0.5),
        ),
      );
    }
  }

  if (points.length === 0) {
    return createFallbackTextTargets();
  }

  return limitTextTargets(points, particleCount);
}

function getTextTargets() {
  if (!cachedTextTargets) {
    cachedTextTargets = createTextTargets();
  }

  return cachedTextTargets;
}

function createPointsMaterial(maxOpacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMaxOpacity: { value: maxOpacity },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: campfireSmokeSettings.depthTest,
    blending: THREE.NormalBlending,
  });
}

// spawnParticle - initialize a particle
function spawnParticle(particle: Particle, target: THREE.Vector3) {
  const {
    cycleDuration,
    cycleStagger,
    textLift,
    textStartScale,
    minSize,
    maxSize,
    emitSpread,
  } = campfireSmokeSettings;

  particle.age = 0;
  particle.maxAge = cycleDuration;
  particle.size = randomBetween(minSize, maxSize);
  particle.glyphX = target.x;
  particle.glyphY = target.y;
  particle.glyphZ = target.z;
  particle.x =
    particle.glyphX * textStartScale + randomBetween(-emitSpread, emitSpread);
  particle.y =
    textLift +
    particle.glyphY * textStartScale +
    randomBetween(-emitSpread * 0.4, emitSpread * 0.4);
  particle.z =
    particle.glyphZ * textStartScale + randomBetween(-emitSpread, emitSpread);
  particle.delay = randomBetween(0, cycleStagger);
  particle.phase = randomBetween(0, Math.PI * 2);
  particle.sway = randomBetween(0.004, 0.016);
}

// createSmokeSystem - create a new smoke system
function createSmokeSystem(): SmokeSystem {
  const { maxOpacity, renderOrder } = campfireSmokeSettings;
  const targets = getTextTargets();
  const particleCount = targets.length;
  const particles: Particle[] = Array.from({ length: particleCount }, () => ({
    age: 0,
    maxAge: 1,
    size: 0.1,
    glyphX: 0,
    glyphY: 0,
    glyphZ: 0,
    x: 0,
    y: 0,
    z: 0,
    delay: 0,
    phase: 0,
    sway: 0.04,
  }));

  const positions = new Float32Array(particleCount * 3);
  const ages = new Float32Array(particleCount);
  const maxAges = new Float32Array(particleCount);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const particle = particles[i];
    spawnParticle(particle, targets[i % targets.length]);
    writeParticle(i, particle, positions, ages, maxAges, sizes);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
  geometry.setAttribute("aMaxAge", new THREE.BufferAttribute(maxAges, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = createPointsMaterial(maxOpacity);

  const points = new THREE.Points(geometry, material);
  points.name = "CampfireSmokeText";
  points.frustumCulled = false;
  points.renderOrder = renderOrder;

  return {
    points,
    particles,
    targets,
    positions,
    ages,
    maxAges,
    sizes,
    elapsedTime: 0,
  };
}

function spawnPlumeParticle(particle: PlumeParticle) {
  const {
    plumeDriftSpeed,
    plumeLifetime,
    plumeMaxSize,
    plumeMinSize,
    plumeRiseSpeed,
    plumeSpread,
    plumeSpawnOffsetX,
  } = campfireSmokeSettings;

  particle.age = 0;
  particle.maxAge = randomBetween(plumeLifetime[0], plumeLifetime[1]);
  particle.size = randomBetween(plumeMinSize, plumeMaxSize);
  particle.x =
    plumeSpawnOffsetX + randomBetween(-plumeSpread, plumeSpread);
  particle.y = randomBetween(0, 0.08);
  particle.z = randomBetween(-plumeSpread, plumeSpread);
  particle.vx = randomBetween(-plumeDriftSpeed, plumeDriftSpeed);
  particle.vy = randomBetween(plumeRiseSpeed[0], plumeRiseSpeed[1]);
  particle.vz = randomBetween(-plumeDriftSpeed, plumeDriftSpeed);
}

function createPlumeSmokeSystem(): PlumeSmokeSystem {
  const { plumeMaxOpacity, plumeParticleCount, renderOrder } =
    campfireSmokeSettings;
  const particles: PlumeParticle[] = Array.from(
    { length: plumeParticleCount },
    () => ({
      age: 0,
      maxAge: 1,
      size: 0.1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }),
  );

  const positions = new Float32Array(plumeParticleCount * 3);
  const ages = new Float32Array(plumeParticleCount);
  const maxAges = new Float32Array(plumeParticleCount);
  const sizes = new Float32Array(plumeParticleCount);

  for (let i = 0; i < plumeParticleCount; i += 1) {
    const particle = particles[i];
    spawnPlumeParticle(particle);
    particle.age = randomBetween(0, particle.maxAge);
    writePlumeParticle(i, particle, positions, ages, maxAges, sizes);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
  geometry.setAttribute("aMaxAge", new THREE.BufferAttribute(maxAges, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = createPointsMaterial(plumeMaxOpacity);
  const points = new THREE.Points(geometry, material);
  points.name = "CampfireSmokePlume";
  points.frustumCulled = false;
  points.renderOrder = renderOrder;

  return { points, particles, positions, ages, maxAges, sizes };
}

// writeParticle - write a particle to the positions, ages, maxAges, and sizes arrays
function writeParticle(
  index: number,
  particle: Particle,
  positions: Float32Array,
  ages: Float32Array,
  maxAges: Float32Array,
  sizes: Float32Array,
) {
  const offset = index * 3;
  positions[offset] = particle.x;
  positions[offset + 1] = particle.y;
  positions[offset + 2] = particle.z;
  ages[index] = particle.age;
  maxAges[index] = particle.maxAge;
  sizes[index] = particle.size * (1 + (particle.age / particle.maxAge) * 1.2);
}

function writePlumeParticle(
  index: number,
  particle: PlumeParticle,
  positions: Float32Array,
  ages: Float32Array,
  maxAges: Float32Array,
  sizes: Float32Array,
) {
  const offset = index * 3;
  const life = particle.age / particle.maxAge;
  positions[offset] = particle.x;
  positions[offset + 1] = particle.y;
  positions[offset + 2] = particle.z;
  ages[index] = particle.age;
  maxAges[index] = particle.maxAge;
  sizes[index] = particle.size * (1 + life * 1.6);
}

// findCampfire - find the campfire object in the scene
function findCampfire(scene: THREE.Object3D) {
  const names = [
    campfireSmokeSettings.objectName,
    campfireSmokeSettings.blenderObjectName,
  ];

  for (const name of names) {
    const found = scene.getObjectByName(name);
    if (found?.isObject3D) return found;
  }

  const normalizedTarget = normalizeObjectName(
    campfireSmokeSettings.objectName,
  );
  let byName: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (byName || !child.isObject3D || !child.name) return;
    if (normalizeObjectName(child.name) === normalizedTarget) {
      byName = child;
    }
  });
  if (byName) return byName;

  let byMaterial: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (byMaterial || !child.isObject3D || !(child as THREE.Mesh).isMesh) {
      return;
    }

    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    if (
      materials.some((material) => {
        const materialName = material?.name ?? "";
        return (
          materialName === campfireSmokeSettings.objectMaterial ||
          normalizeObjectName(materialName) === "campfire"
        );
      })
    ) {
      byMaterial = mesh;
    }
  });

  return byMaterial;
}

// getEmitterWorldPosition - get the world position of the emitter
function getEmitterWorldPosition(campfire: THREE.Object3D) {
  const bounds = getObjectBounds(campfire);
  const { emitterWorldOffset } = campfireSmokeSettings;
  return new THREE.Vector3(
    (bounds.min.x + bounds.max.x) * 0.5 + emitterWorldOffset.x,
    bounds.max.y + campfireSmokeSettings.emitYOffset + emitterWorldOffset.y,
    (bounds.min.z + bounds.max.z) * 0.5 + emitterWorldOffset.z,
  );
}

// getFallbackWorldPosition - get the fallback world position
function getFallbackWorldPosition() {
  const [x, y, z] = campfireSmokeSettings.fallbackWorldPosition;
  const { emitterWorldOffset } = campfireSmokeSettings;
  return new THREE.Vector3(
    x + emitterWorldOffset.x,
    y + emitterWorldOffset.y,
    z + emitterWorldOffset.z,
  );
}

// isSceneObject - check if the value is a scene object
function isSceneObject(value: unknown): value is THREE.Object3D {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as THREE.Object3D).updateMatrixWorld === "function"
  );
}

// resolveEmitter - resolve the emitter position
function resolveEmitter(campfire: THREE.Object3D | null) {
  if (!isSceneObject(campfire)) {
    return getFallbackWorldPosition();
  }

  try {
    return getEmitterWorldPosition(campfire);
  } catch {
    return getFallbackWorldPosition();
  }
}

// mountSmokeSystem - mount the smoke system to the scene
function mountSmokeSystem(
  scene: THREE.Object3D,
  campfire: THREE.Object3D | null,
) : MountedSmokeSystems {
  const emitter = resolveEmitter(campfire);

  const text = createSmokeSystem();
  text.points.position.copy(emitter);
  scene.add(text.points);

  const plume = createPlumeSmokeSystem();
  plume.points.position.copy(emitter);
  scene.add(plume.points);

  if (process.env.NODE_ENV === "development") {
    console.info("[CampfireSmoke] Ready:", {
      campfire: campfire?.name ?? "fallback-position",
      emitter: emitter.toArray(),
      plumeParticles: plume.particles.length,
      textParticles: text.particles.length,
    });
  }

  return { plume, text };
}

function disposeSmokeSystem(mounted: MountedSmokeSystems) {
  mounted.text.points.removeFromParent();
  mounted.text.points.geometry.dispose();
  (mounted.text.points.material as THREE.Material).dispose();
  mounted.plume.points.removeFromParent();
  mounted.plume.points.geometry.dispose();
  (mounted.plume.points.material as THREE.Material).dispose();
}

function syncSmokeEmitter(
  mounted: MountedSmokeSystems,
  campfire: THREE.Object3D | null,
) {
  const emitter = resolveEmitter(campfire);
  const { renderOrder } = campfireSmokeSettings;

  mounted.text.points.position.copy(emitter);
  mounted.plume.points.position.copy(emitter);
  mounted.text.points.renderOrder = renderOrder;
  mounted.plume.points.renderOrder = renderOrder;
}

// CampfireSmoke - the campfire smoke component
export default function CampfireSmoke({ scene }: CampfireSmokeProps) {
  const systemRef = useRef<MountedSmokeSystems | null>(null);
  const campfireRef = useRef<THREE.Object3D | null>(null);
  const retryTimerRef = useRef(0);
  const mountAttemptsRef = useRef(0);
  const settingsRevision = useCampfireSmokeSettingsHmr();

  useEffect(() => {
    cachedTextTargets = null;
    const mounted = systemRef.current;
    if (mounted) {
      disposeSmokeSystem(mounted);
    }
    systemRef.current = null;
    campfireRef.current = null;
    retryTimerRef.current = 0;
    mountAttemptsRef.current = 0;
  }, [settingsRevision]);

  useEffect(() => {
    return () => {
      const mounted = systemRef.current;
      if (!mounted) return;
      disposeSmokeSystem(mounted);
      systemRef.current = null;
      campfireRef.current = null;
    };
  }, []);

  useFrame((_, delta) => {
    void settingsRevision;

    if (!systemRef.current) {
      retryTimerRef.current += delta;
      if (retryTimerRef.current < 0.1) return;

      retryTimerRef.current = 0;
      mountAttemptsRef.current += 1;
      scene.updateMatrixWorld(true);

      const campfire = findCampfire(scene);
      const validCampfire = isSceneObject(campfire) ? campfire : null;
      const shouldMount =
        Boolean(validCampfire) || mountAttemptsRef.current >= 3;

      if (!shouldMount) return;

      campfireRef.current = validCampfire;
      systemRef.current = mountSmokeSystem(scene, validCampfire);
      return;
    }

    const campfire = findCampfire(scene);
    campfireRef.current = isSceneObject(campfire) ? campfire : campfireRef.current;
    syncSmokeEmitter(systemRef.current, campfireRef.current);

    const mounted = systemRef.current;
    mounted.text.elapsedTime += delta;

    const {
      particles,
      positions,
      ages,
      maxAges,
      sizes,
      points,
    } = mounted.text;
    const positionAttr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const ageAttr = points.geometry.getAttribute(
      "aAge",
    ) as THREE.BufferAttribute;
    const maxAgeAttr = points.geometry.getAttribute(
      "aMaxAge",
    ) as THREE.BufferAttribute;
    const sizeAttr = points.geometry.getAttribute(
      "aSize",
    ) as THREE.BufferAttribute;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      const {
        cycleDuration,
        cyclePause,
        textEndScale,
        textLift,
        textRise,
        textStartScale,
      } = campfireSmokeSettings;
      const cycleLength = cycleDuration + cyclePause;
      const cycleTime = (mounted.text.elapsedTime + particle.delay) % cycleLength;

      if (cycleTime > cycleDuration) {
        particle.age = particle.maxAge;
      } else {
        particle.age = cycleTime;

        const life = particle.age / particle.maxAge;
        const easedLife = THREE.MathUtils.smoothstep(life, 0, 1);
        const glyphScale = THREE.MathUtils.lerp(
          textStartScale,
          textEndScale,
          easedLife,
        );

        particle.x =
          particle.glyphX * glyphScale +
          Math.sin(particle.phase + particle.age) * particle.sway;
        particle.y =
          textLift + easedLife * textRise + particle.glyphY * glyphScale;
        particle.z =
          particle.glyphZ * glyphScale +
          Math.cos(particle.phase + particle.age * 0.9) * particle.sway * 0.4;
      }

      writeParticle(i, particle, positions, ages, maxAges, sizes);
    }

    positionAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;
    maxAgeAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    const plume = mounted.plume;
    const plumePositionAttr = plume.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const plumeAgeAttr = plume.points.geometry.getAttribute(
      "aAge",
    ) as THREE.BufferAttribute;
    const plumeMaxAgeAttr = plume.points.geometry.getAttribute(
      "aMaxAge",
    ) as THREE.BufferAttribute;
    const plumeSizeAttr = plume.points.geometry.getAttribute(
      "aSize",
    ) as THREE.BufferAttribute;

    for (let i = 0; i < plume.particles.length; i += 1) {
      const particle = plume.particles[i];
      particle.age += delta;

      if (particle.age >= particle.maxAge) {
        spawnPlumeParticle(particle);
      } else {
        const life = particle.age / particle.maxAge;
        particle.x += particle.vx * delta * (1 + life * 0.6);
        particle.y += particle.vy * delta;
        particle.z += particle.vz * delta * (1 + life * 0.6);
      }

      writePlumeParticle(
        i,
        particle,
        plume.positions,
        plume.ages,
        plume.maxAges,
        plume.sizes,
      );
    }

    plumePositionAttr.needsUpdate = true;
    plumeAgeAttr.needsUpdate = true;
    plumeMaxAgeAttr.needsUpdate = true;
    plumeSizeAttr.needsUpdate = true;
  });

  return null;
}
