import * as THREE from "three";
import { safariCampWindSettings } from "@features/portfolio/config/safariCampWindSettings";

export type WindMaterialHandle = {
  uniforms: {
    uTime: THREE.IUniform<number>;
    uWindStrength: THREE.IUniform<number>;
    uWindSpeed: THREE.IUniform<number>;
    uFabricZStart: THREE.IUniform<number>;
    uFabricZEnd: THREE.IUniform<number>;
  };
  materials: THREE.Material[];
};

type WindMaterialOptions = {
  strength?: number;
  speed?: number;
  fabricZStart?: number;
  fabricZEnd?: number;
};

// patchWindMaterial - patch the wind material
function patchWindMaterial(
  material: THREE.Material,
  uniforms: WindMaterialHandle["uniforms"],
) {
  const tagged = material as THREE.Material & {
    userData: { windApplied?: boolean };
  };
  if (tagged.userData.windApplied) return;

  tagged.userData.windApplied = true;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.uniforms.uWindSpeed = uniforms.uWindSpeed;
    shader.uniforms.uFabricZStart = uniforms.uFabricZStart;
    shader.uniforms.uFabricZEnd = uniforms.uFabricZEnd;

    shader.vertexShader = `
uniform float uTime;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform float uFabricZStart;
uniform float uFabricZEnd;
${shader.vertexShader}`;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
float fabricMask = smoothstep(uFabricZStart, uFabricZEnd, position.z);
fabricMask *= smoothstep(1.4, 2.8, length(position.xz));
#ifdef USE_UV
  fabricMask *= smoothstep(0.35, 0.92, 1.0 - uv.y);
#endif
float phase = position.x * 2.35 + position.z * 1.15;
float wave = sin(uTime * uWindSpeed + phase);
float ripple = cos(uTime * uWindSpeed * 0.84 + phase * 1.08);
transformed.x += wave * uWindStrength * fabricMask;
transformed.z += ripple * uWindStrength * 0.42 * fabricMask;
`,
    );
  };

  material.needsUpdate = true;
}

// applySoftWindToObject - apply the soft wind to the object
export function applySoftWindToObject(
  root: THREE.Object3D,
  options: WindMaterialOptions = {},
): WindMaterialHandle | null {
  const {
    strength = safariCampWindSettings.strength,
    speed = safariCampWindSettings.speed,
    fabricZStart = safariCampWindSettings.fabricZStart,
    fabricZEnd = safariCampWindSettings.fabricZEnd,
  } = options;

  const uniforms: WindMaterialHandle["uniforms"] = {
    uTime: { value: 0 },
    uWindStrength: { value: strength },
    uWindSpeed: { value: speed },
    uFabricZStart: { value: fabricZStart },
    uFabricZEnd: { value: fabricZEnd },
  };

  const materials: THREE.Material[] = [];

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const material of meshMaterials) {
      if (!material) continue;
      patchWindMaterial(material, uniforms);
      if (!materials.includes(material)) {
        materials.push(material);
      }
    }
  });

  if (!materials.length) return null;

  return { uniforms, materials };
}
