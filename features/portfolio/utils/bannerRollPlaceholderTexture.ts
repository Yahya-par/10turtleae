import * as THREE from "three";

/** Pixel sizes are defined at this reference canvas height and scale with actual canvas size. */
const REF_CANVAS_HEIGHT = 1024;

export type BannerRollPlaceholderStyle = {
  headline: string;
  subline: string;
  background: string;
  accent: string;
  text: string;
  back: string;
  fontFamily?: string;
  textShadow?: string;
  /** Headline size in px at REF_CANVAS_HEIGHT (default 64). */
  headlineFontSize?: number;
  /** Subline size in px at REF_CANVAS_HEIGHT (default 28). */
  sublineFontSize?: number;
  /** Caption size in px at REF_CANVAS_HEIGHT (default 22). */
  captionFontSize?: number;
};

function scaleFontSize(size: number, canvasHeight: number) {
  return Math.round(size * (canvasHeight / REF_CANVAS_HEIGHT));
}

function drawPlaceholderCanvas(
  canvas: HTMLCanvasElement,
  style: BannerRollPlaceholderStyle,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  const pad = Math.round(width * 0.055);
  const trimInset = Math.max(8, Math.round(height * 0.01));
  const headlineSize = scaleFontSize(style.headlineFontSize ?? 64, height);
  const sublineSize = scaleFontSize(style.sublineFontSize ?? 28, height);
  const captionSize = scaleFontSize(style.captionFontSize ?? 22, height);
  const fontFamily = style.fontFamily ?? "Arial, sans-serif";

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, style.background);
  gradient.addColorStop(0.55, style.background);
  gradient.addColorStop(1, style.back);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#000000" : "#ffffff";
    ctx.fillRect(
      Math.random() * width,
      Math.random() * height,
      1 + Math.random(),
      1,
    );
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(3, Math.round(height * 0.005));
  ctx.beginPath();
  ctx.moveTo(pad, trimInset);
  ctx.lineTo(width - pad, trimInset);
  ctx.moveTo(pad, height - trimInset);
  ctx.lineTo(width - pad, height - trimInset);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = style.text;
  ctx.font = `600 ${headlineSize}px ${fontFamily}`;
  ctx.shadowColor = style.textShadow ?? "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillText(style.headline, width / 2, height * 0.34);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = style.text;
  ctx.font = `400 ${sublineSize}px ${fontFamily}`;
  ctx.fillText(style.subline, width / 2, height * 0.44);

  const artX = pad * 1.7;
  const artY = height * 0.54;
  const artW = width - pad * 3.4;
  const artH = height * 0.3;
  const artRadius = Math.min(artW, artH) * 0.06;

  ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
  ctx.beginPath();
  ctx.roundRect(artX, artY, artW, artH, artRadius);
  ctx.fill();

  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(2, Math.round(height * 0.0025));
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.roundRect(artX, artY, artW, artH, artRadius);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.font = `400 ${captionSize}px ${fontFamily}`;
  ctx.fillText("Placeholder artwork", width / 2, height * 0.69);
}

export function createBannerRollPlaceholderTexture(
  style: BannerRollPlaceholderStyle,
  /** Banner plane width / height — keeps text from stretching on wide banners. */
  aspectRatio = 0.5,
) {
  const canvas = document.createElement("canvas");
  const safeAspect = Math.max(0.25, aspectRatio);
  canvas.height = REF_CANVAS_HEIGHT;
  canvas.width = Math.round(REF_CANVAS_HEIGHT * safeAspect);
  drawPlaceholderCanvas(canvas, style);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
