"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { campfireSmokeSettings } from "@/app/config/campfireSmokeSettings";
import {
  getObjectBounds,
  normalizeObjectName,
} from "./sceneObjectUtils";

type CampfireSmokeProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

type Particle = {
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

type SmokeSystem = {
  points: THREE.Points;
  particles: Particle[];
  positions: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  sizes: Float32Array;
};

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

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float soft = smoothstep(0.5, 0.06, dist);
    gl_FragColor = vec4(0.86, 0.86, 0.86, soft * vAlpha);
  }
`;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnParticle(particle: Particle) {
  const {
    minSize,
    maxSize,
    riseSpeed,
    driftSpeed,
    lifetime,
    emitSpread,
  } = campfireSmokeSettings;

  particle.age = 0;
  particle.maxAge = randomBetween(lifetime[0], lifetime[1]);
  particle.size = randomBetween(minSize, maxSize);
  particle.x = randomBetween(-emitSpread, emitSpread);
  particle.y = 0;
  particle.z = randomBetween(-emitSpread, emitSpread);
  particle.vx = randomBetween(-driftSpeed, driftSpeed);
  particle.vy = randomBetween(riseSpeed[0], riseSpeed[1]);
  particle.vz = randomBetween(-driftSpeed, driftSpeed);
}

function createSmokeSystem(): SmokeSystem {
  const { particleCount, maxOpacity } = campfireSmokeSettings;
  const particles: Particle[] = Array.from({ length: particleCount }, () => ({
    age: 0,
    maxAge: 1,
    size: 0.1,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
  }));

  const positions = new Float32Array(particleCount * 3);
  const ages = new Float32Array(particleCount);
  const maxAges = new Float32Array(particleCount);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const particle = particles[i];
    spawnParticle(particle);
    particle.age = randomBetween(0, particle.maxAge);
    writeParticle(i, particle, positions, ages, maxAges, sizes);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
  geometry.setAttribute("aMaxAge", new THREE.BufferAttribute(maxAges, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMaxOpacity: { value: maxOpacity },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = "CampfireSmoke";
  points.frustumCulled = false;
  points.renderOrder = 10;

  return { points, particles, positions, ages, maxAges, sizes };
}

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
  sizes[index] = particle.size * (1 + (particle.age / particle.maxAge) * 0.75);
}

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

function getEmitterWorldPosition(campfire: THREE.Object3D) {
  const bounds = getObjectBounds(campfire);
  return new THREE.Vector3(
    (bounds.min.x + bounds.max.x) * 0.5,
    bounds.max.y + campfireSmokeSettings.emitYOffset,
    (bounds.min.z + bounds.max.z) * 0.5,
  );
}

function getFallbackWorldPosition() {
  const [x, y, z] = campfireSmokeSettings.fallbackWorldPosition;
  return new THREE.Vector3(x, y, z);
}

function isSceneObject(value: unknown): value is THREE.Object3D {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as THREE.Object3D).updateMatrixWorld === "function"
  );
}

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

function mountSmokeSystem(
  scene: THREE.Object3D,
  campfire: THREE.Object3D | null,
) {
  const emitter = resolveEmitter(campfire);

  const system = createSmokeSystem();
  system.points.position.copy(emitter);
  scene.add(system.points);

  if (process.env.NODE_ENV === "development") {
    console.info("[CampfireSmoke] Ready:", {
      campfire: campfire?.name ?? "fallback-position",
      emitter: emitter.toArray(),
      particles: campfireSmokeSettings.particleCount,
    });
  }

  return system;
}

export default function CampfireSmoke({ scene }: CampfireSmokeProps) {
  const systemRef = useRef<SmokeSystem | null>(null);
  const retryTimerRef = useRef(0);
  const mountAttemptsRef = useRef(0);

  useEffect(() => {
    return () => {
      const system = systemRef.current;
      if (!system) return;

      system.points.removeFromParent();
      system.points.geometry.dispose();
      (system.points.material as THREE.Material).dispose();
      systemRef.current = null;
    };
  }, []);

  useFrame((_, delta) => {
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

      systemRef.current = mountSmokeSystem(scene, validCampfire);
      return;
    }

    const system = systemRef.current;
    const { particles, positions, ages, maxAges, sizes, points } = system;
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
      particle.age += delta;

      if (particle.age >= particle.maxAge) {
        spawnParticle(particle);
      } else {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.z += particle.vz * delta;
      }

      writeParticle(i, particle, positions, ages, maxAges, sizes);
    }

    positionAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;
    maxAgeAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return null;
}
