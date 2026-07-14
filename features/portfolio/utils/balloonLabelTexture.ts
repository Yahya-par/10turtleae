import * as THREE from "three";

export type BalloonLabelStyle = {
  text: string;
  color: string;
  colorDark: string;
  textColor: string;
  fontSize?: number;
};

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 640;

export const BALLOON_TEXTURE_ASPECT = TEXTURE_WIDTH / TEXTURE_HEIGHT;

function parseHex(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function mixHex(hex: string, target: { r: number; g: number; b: number }, t: number) {
  const source = parseHex(hex);
  const r = Math.round(source.r + (target.r - source.r) * t);
  const g = Math.round(source.g + (target.g - source.g) * t);
  const b = Math.round(source.b + (target.b - source.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function traceBalloonBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
) {
  const rx = width / 2;
  const ry = height / 2;
  const tipY = cy + ry * 0.9;
  const topY = cy - ry;

  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.bezierCurveTo(
    cx - rx * 1.08,
    cy + ry * 0.38,
    cx - rx * 0.98,
    topY + ry * 0.12,
    cx,
    topY,
  );
  ctx.bezierCurveTo(
    cx + rx * 0.98,
    topY + ry * 0.12,
    cx + rx * 1.08,
    cy + ry * 0.38,
    cx,
    tipY,
  );
  ctx.closePath();
}

function drawBalloonBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  style: BalloonLabelStyle,
) {
  traceBalloonBody(ctx, cx, cy, width, height);

  const gradient = ctx.createRadialGradient(
    cx - width * 0.18,
    cy - height * 0.22,
    width * 0.08,
    cx,
    cy,
    width * 0.55,
  );
  gradient.addColorStop(0, mixHex(style.color, { r: 255, g: 255, b: 255 }, 0.18));
  gradient.addColorStop(0.55, style.color);
  gradient.addColorStop(1, style.colorDark);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.save();
  traceBalloonBody(ctx, cx, cy, width, height);
  ctx.clip();

  ctx.fillStyle = mixHex(style.color, { r: 255, g: 255, b: 255 }, 0.42);
  ctx.beginPath();
  ctx.ellipse(
    cx - width * 0.14,
    cy - height * 0.18,
    width * 0.22,
    height * 0.2,
    -0.35,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.strokeStyle = style.colorDark;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx + width * 0.08, cy + height * 0.02, width * 0.44, 0.15, Math.PI * 0.92);
  ctx.stroke();
  ctx.restore();
}

function drawBalloonKnot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  tipY: number,
  style: BalloonLabelStyle,
) {
  const knotWidth = 26;
  const knotHeight = 20;

  ctx.fillStyle = style.colorDark;
  ctx.beginPath();
  ctx.moveTo(cx - knotWidth * 0.42, tipY);
  ctx.lineTo(cx + knotWidth * 0.42, tipY);
  ctx.lineTo(cx + knotWidth * 0.22, tipY + knotHeight);
  ctx.lineTo(cx - knotWidth * 0.22, tipY + knotHeight);
  ctx.closePath();
  ctx.fill();
}

function drawBalloonString(ctx: CanvasRenderingContext2D, cx: number, startY: number) {
  ctx.strokeStyle = "#141414";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, startY);
  ctx.bezierCurveTo(
    cx - 18,
    startY + 42,
    cx + 22,
    startY + 88,
    cx - 8,
    startY + 128,
  );
  ctx.stroke();
}

function drawBalloonLabel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  style: BalloonLabelStyle,
) {
  ctx.fillStyle = style.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let fontSize = style.fontSize ?? 68;
  const maxWidth = width * 0.72;
  do {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    fontSize -= 2;
  } while (fontSize > 24 && ctx.measureText(style.text).width > maxWidth);

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillText(style.text, cx, cy - 6);
}

export function createBalloonLabelTexture(style: BalloonLabelStyle) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("[balloonLabelTexture] Failed to create canvas context");
  }

  const cx = TEXTURE_WIDTH / 2;
  const bodyWidth = TEXTURE_WIDTH * 0.72;
  const bodyHeight = TEXTURE_HEIGHT * 0.58;
  const bodyCenterY = TEXTURE_HEIGHT * 0.34;
  const tipY = bodyCenterY + bodyHeight * 0.45;

  drawBalloonBody(ctx, cx, bodyCenterY, bodyWidth, bodyHeight, style);
  drawBalloonLabel(ctx, cx, bodyCenterY, bodyWidth, style);
  drawBalloonKnot(ctx, cx, tipY, style);
  drawBalloonString(ctx, cx, tipY + 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}
