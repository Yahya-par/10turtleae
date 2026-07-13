import * as THREE from "three";

export type ThemedBannerStyle = {
  text: string;
  bannerColor: string;
  bannerColorDark: string;
  textColor: string;
  trimColor: string;
  textFontFamily: string;
  textShadow?: string;
};

export function createThemedBannerTexture(style: ThemedBannerStyle) {
  const canvas = document.createElement("canvas");
  const width = 1024;
  const height = 256;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("[themedBannerTexture] Failed to create canvas context");
  }

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, style.bannerColor);
  gradient.addColorStop(0.55, style.bannerColor);
  gradient.addColorStop(1, style.bannerColorDark);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = style.trimColor;
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(0, 10);
  context.lineTo(width, 10);
  context.moveTo(0, height - 10);
  context.lineTo(width, height - 10);
  context.stroke();

  context.globalAlpha = 0.05;
  for (let i = 0; i < 900; i += 1) {
    context.fillStyle = i % 2 === 0 ? "#000000" : "#ffffff";
    context.fillRect(
      Math.random() * width,
      Math.random() * height,
      1 + Math.random(),
      1,
    );
  }
  context.globalAlpha = 1;

  context.fillStyle = style.textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";

  let fontSize = Math.floor(height * 0.4);
  do {
    context.font = `600 ${fontSize}px ${style.textFontFamily}`;
    fontSize -= 2;
  } while (fontSize > 28 && context.measureText(style.text).width > width * 0.88);

  context.font = `600 ${fontSize}px ${style.textFontFamily}`;
  context.shadowColor = style.textShadow ?? "rgba(0, 0, 0, 0.4)";
  context.shadowBlur = 6;
  context.shadowOffsetY = 2;
  context.fillText(style.text, width * 0.5, height * 0.53);
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function createThemedBannerMesh(
  style: ThemedBannerStyle,
  width: number,
  height: number,
  options: { renderOrder?: number; depthTest?: boolean } = {},
) {
  const { renderOrder = 12, depthTest = false } = options;
  const texture = createThemedBannerTexture(style);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.renderOrder = renderOrder;
  return mesh;
}

export function disposeThemedBannerMesh(mesh: THREE.Mesh) {
  const material = mesh.material;
  if (material instanceof THREE.MeshBasicMaterial) {
    material.map?.dispose();
    material.dispose();
  }
  mesh.geometry.dispose();
}

export function faceGroupToCamera(group: THREE.Group, camera: THREE.Camera) {
  const world = new THREE.Vector3();
  group.getWorldPosition(world);
  const dx = camera.position.x - world.x;
  const dz = camera.position.z - world.z;
  group.rotation.set(0, Math.atan2(dx, dz), 0);
}

/** Parallel to the view plane — stays flat on screen (no inherited parent tilt). */
export function faceGroupFlatToCamera(
  group: THREE.Object3D,
  camera: THREE.Camera,
) {
  group.lookAt(camera.position);
}
