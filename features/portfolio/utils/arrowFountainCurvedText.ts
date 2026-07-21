import * as THREE from "three";
import { arrowFountainTextSettings } from "@features/portfolio/config/arrowFountainTextSettings";

type Point2 = { x: number; y: number };

function cubicPoint(
  t: number,
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
): Point2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function cubicTangent(
  t: number,
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
): Point2 {
  const u = 1 - t;
  return {
    x:
      3 * u * u * (p1.x - p0.x) +
      6 * u * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x),
    y:
      3 * u * u * (p1.y - p0.y) +
      6 * u * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y),
  };
}

function sampleArc(
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
  steps = 128,
) {
  const points: Point2[] = [];
  const lengths: number[] = [0];
  let total = 0;
  let prev = cubicPoint(0, p0, p1, p2, p3);
  points.push(prev);

  for (let i = 1; i <= steps; i += 1) {
    const point = cubicPoint(i / steps, p0, p1, p2, p3);
    total += Math.hypot(point.x - prev.x, point.y - prev.y);
    lengths.push(total);
    points.push(point);
    prev = point;
  }

  return { points, lengths, total };
}

function tAtDistance(
  lengths: number[],
  total: number,
  distance: number,
  steps: number,
) {
  const target = Math.min(Math.max(distance, 0), total);
  let lo = 0;
  let hi = steps;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid]! < target) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const len0 = lengths[i - 1]!;
  const len1 = lengths[i]!;
  const span = len1 - len0 || 1;
  const local = (target - len0) / span;
  return (i - 1 + local) / steps;
}

function toPoint(uv: readonly [number, number], width: number, height: number) {
  return { x: uv[0] * width, y: uv[1] * height };
}

function copyTextureSettings(target: THREE.Texture, source: THREE.Texture) {
  target.flipY = source.flipY;
  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
  target.repeat.copy(source.repeat);
  target.offset.copy(source.offset);
  target.center.copy(source.center);
  target.rotation = source.rotation;
  target.colorSpace = source.colorSpace;
}

function resolveImageSource(
  map: THREE.Texture,
): CanvasImageSource | null {
  const image = map.image as
    | HTMLImageElement
    | ImageBitmap
    | HTMLCanvasElement
    | OffscreenCanvas
    | undefined;
  if (!image) return null;
  if ("width" in image && typeof image.width === "number" && image.width > 0) {
    return image;
  }
  return null;
}

function getImageSize(source: CanvasImageSource) {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  if ("width" in source && "height" in source) {
    return {
      width: Number(source.width) || 0,
      height: Number(source.height) || 0,
    };
  }
  return { width: 0, height: 0 };
}

/**
 * Draw the curved headline onto a canvas cloned from the fountain billboard map.
 */
export function createArrowFountainTextTexture(sourceMap: THREE.Texture) {
  const source = resolveImageSource(sourceMap);
  if (!source) return null;

  const { width, height } = getImageSize(source);
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(source, 0, 0, width, height);

  const {
    text,
    curve,
    normalOffset,
    pathFill,
    fontFamily,
    fontWeight,
    fontSizeFromHeight,
    minFontSize,
    letterSpacing,
    fillColor,
    strokeColor,
    strokeWidth,
    shadowColor,
    shadowBlur,
  } = arrowFountainTextSettings;

  const p0 = toPoint(curve.start, width, height);
  const p1 = toPoint(curve.control1, width, height);
  const p2 = toPoint(curve.control2, width, height);
  const p3 = toPoint(curve.end, width, height);
  const arc = sampleArc(p0, p1, p2, p3);
  const usable = arc.total * pathFill;
  const pad = (arc.total - usable) * 0.5;
  const offsetPx = Math.abs(normalOffset) * height;

  let fontSize = Math.floor(height * fontSizeFromHeight);
  const buildFont = (size: number) => `${fontWeight} ${size}px ${fontFamily}`;

  const measureWidth = (size: number) => {
    context.font = buildFont(size);
    let total = 0;
    for (const char of text) {
      total += context.measureText(char).width + letterSpacing;
    }
    return total - letterSpacing;
  };

  while (fontSize > minFontSize && measureWidth(fontSize) > usable) {
    fontSize -= 1;
  }

  context.font = buildFont(fontSize);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.lineWidth = strokeWidth;
  context.strokeStyle = strokeColor;
  context.fillStyle = fillColor;
  context.shadowColor = shadowColor;
  context.shadowBlur = shadowBlur;

  const glyphs = [...text];
  const advances = glyphs.map((char) => context.measureText(char).width);
  const textWidth =
    advances.reduce((sum, value) => sum + value, 0) +
    letterSpacing * Math.max(0, glyphs.length - 1);

  let cursor = pad + Math.max(0, (usable - textWidth) * 0.5);

  for (let i = 0; i < glyphs.length; i += 1) {
    const char = glyphs[i]!;
    const advance = advances[i]!;
    const center = cursor + advance * 0.5;
    const t = tAtDistance(arc.lengths, arc.total, center, arc.points.length - 1);
    const point = cubicPoint(t, p0, p1, p2, p3);
    const tangent = cubicTangent(t, p0, p1, p2, p3);
    const angle = Math.atan2(tangent.y, tangent.x);
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    // Prefer the normal that points toward the top of the image (above the arrow).
    let nx = -tangent.y / length;
    let ny = tangent.x / length;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }

    context.save();
    context.translate(point.x + nx * offsetPx, point.y + ny * offsetPx);
    context.rotate(angle);
    context.strokeText(char, 0, 0);
    context.shadowBlur = 0;
    context.fillText(char, 0, 0);
    context.shadowBlur = shadowBlur;
    context.restore();

    cursor += advance + letterSpacing;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  copyTextureSettings(texture, sourceMap);
  return texture;
}
