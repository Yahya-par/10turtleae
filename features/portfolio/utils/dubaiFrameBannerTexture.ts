import * as THREE from "three";
import { dubaiFrameBannerSettings } from "@features/portfolio/config/dubaiFrameBannerSettings";

type PlaceholderStyle = (typeof dubaiFrameBannerSettings)["placeholder"];

function drawPlaceholderCanvas(
  canvas: HTMLCanvasElement,
  style: PlaceholderStyle,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, style.background);
  gradient.addColorStop(1, "#5c1a0d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.fillStyle = style.accent;
  ctx.font = "bold 64px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.headline, width / 2, height * 0.34);

  ctx.fillStyle = style.text;
  ctx.font = "28px Arial, sans-serif";
  ctx.fillText(style.subline, width / 2, height * 0.44);

  ctx.fillStyle = "rgba(255, 248, 235, 0.18)";
  ctx.fillRect(48, height * 0.54, width - 96, height * 0.3);

  ctx.fillStyle = style.text;
  ctx.font = "22px Arial, sans-serif";
  ctx.fillText("Placeholder artwork", width / 2, height * 0.69);
}

export function createDubaiFrameBannerPlaceholderTexture(
  style: PlaceholderStyle = dubaiFrameBannerSettings.placeholder,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  drawPlaceholderCanvas(canvas, style);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function loadDubaiFrameBannerImageTexture(url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}
