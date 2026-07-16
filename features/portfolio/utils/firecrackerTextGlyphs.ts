import * as THREE from "three";

export type FirecrackerTextGlyph = {
  /** Canvas pixel X */
  x: number;
  /** Canvas pixel Y */
  y: number;
  letterIndex: number;
  hue: number;
};

export type FirecrackerTextGlyphConfig = {
  text: string;
  textCanvasSize: readonly [number, number];
  textSampleGap: number;
  textFontFamily: string;
  textFontWeight: number;
  textLetterSpacing: number;
  glyphSparkCount: number;
  textStrokeWidth?: number;
  textFontScale?: number;
  /** Max fraction of canvas width the full string may occupy. */
  textMaxWidthRatio?: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickBurstHue(_letterIndex: number) {
  // Warm white / gold firecracker light
  return randomBetween(0.09, 0.13);
}

function limitGlyphs(points: FirecrackerTextGlyph[], maxPoints: number) {
  if (points.length <= maxPoints) return points;

  const limited: FirecrackerTextGlyph[] = [];
  const step = points.length / maxPoints;
  for (let i = 0; i < maxPoints; i += 1) {
    limited.push(points[Math.floor(i * step)]!);
  }
  return limited;
}

function isFilled(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return data[(y * width + x) * 4 + 3]! >= 40;
}

/**
 * Keep only outline / contour pixels — hollow letter edges like Ain Dubai lights.
 */
function isOutlinePixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!isFilled(data, x, y, width, height)) return false;

  return (
    !isFilled(data, x - 1, y, width, height) ||
    !isFilled(data, x + 1, y, width, height) ||
    !isFilled(data, x, y - 1, width, height) ||
    !isFilled(data, x, y + 1, width, height)
  );
}

function measureSpacedWidth(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
) {
  let width = 0;
  for (let i = 0; i < text.length; i += 1) {
    width += context.measureText(text[i]!).width;
    if (i < text.length - 1) width += letterSpacing;
  }
  return width;
}

/**
 * Draw each glyph with explicit spacing so fit + kerning stay predictable
 * (canvas `letterSpacing` is not included in measureText in all browsers).
 */
function drawSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  letterSpacing: number,
) {
  const totalWidth = measureSpacedWidth(context, text, letterSpacing);
  let x = centerX - totalWidth * 0.5;
  const bounds: { start: number; end: number }[] = [];

  context.textAlign = "left";
  context.textBaseline = "middle";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    const charWidth = context.measureText(char).width;
    context.fillText(char, x, centerY);
    bounds.push({ start: x, end: x + charWidth });
    x += charWidth + letterSpacing;
  }

  return bounds;
}

function letterIndexAtX(
  x: number,
  bounds: { start: number; end: number }[],
  fallbackCount: number,
) {
  for (let i = 0; i < bounds.length; i += 1) {
    const b = bounds[i]!;
    if (x >= b.start && x <= b.end) return i;
  }

  // Nearest glyph if sample lands in a gap.
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < bounds.length; i += 1) {
    const b = bounds[i]!;
    const mid = (b.start + b.end) * 0.5;
    const dist = Math.abs(x - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return Math.min(best, Math.max(fallbackCount - 1, 0));
}

/**
 * Sample evenly along letter outlines (drone / Ain Dubai style).
 */
export function sampleFirecrackerTextGlyphs(
  config: FirecrackerTextGlyphConfig,
): FirecrackerTextGlyph[] {
  if (typeof document === "undefined") return [];

  const {
    text,
    textCanvasSize,
    textSampleGap,
    textFontFamily,
    textFontWeight,
    textLetterSpacing,
    glyphSparkCount,
    textFontScale = 0.72,
    textMaxWidthRatio = 0.88,
  } = config;
  const [canvasWidth, canvasHeight] = textCanvasSize;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) return [];

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#ffffff";

  const buildFont = (size: number) =>
    `${textFontWeight} ${size}px ${textFontFamily}`;
  const maxWidth = canvasWidth * textMaxWidthRatio;

  let fontSize = Math.max(12, Math.floor(canvasHeight * textFontScale));
  let letterSpacing = textLetterSpacing;

  // Shrink font (then spacing) until the full string fits with a side margin.
  for (let guard = 0; guard < 80; guard += 1) {
    context.font = buildFont(fontSize);
    const width = measureSpacedWidth(context, text, letterSpacing);
    if (width <= maxWidth) break;

    if (fontSize > 18) {
      fontSize -= 2;
      continue;
    }

    if (letterSpacing > 0) {
      letterSpacing = Math.max(0, letterSpacing - 0.5);
      continue;
    }

    break;
  }

  context.font = buildFont(fontSize);
  const charBounds = drawSpacedText(
    context,
    text,
    canvasWidth * 0.5,
    canvasHeight * 0.52,
    letterSpacing,
  );

  const { data } = context.getImageData(0, 0, canvasWidth, canvasHeight);
  const raw: FirecrackerTextGlyph[] = [];

  for (let y = 0; y < canvasHeight; y += 1) {
    for (let x = 0; x < canvasWidth; x += 1) {
      if (!isOutlinePixel(data, x, y, canvasWidth, canvasHeight)) continue;
      const letterIndex = letterIndexAtX(x, charBounds, text.length);
      raw.push({
        x,
        y,
        letterIndex,
        hue: pickBurstHue(letterIndex),
      });
    }
  }

  const spacing = Math.max(2, textSampleGap);
  const spaced: FirecrackerTextGlyph[] = [];
  for (const point of raw) {
    const tooClose = spaced.some(
      (kept) => Math.hypot(kept.x - point.x, kept.y - point.y) < spacing,
    );
    if (tooClose) continue;
    spaced.push(point);
  }

  return limitGlyphs(spaced, glyphSparkCount);
}

export function hueToFireworkRgb(hue: number) {
  const h = ((hue % 1) + 1) % 1;
  const color = new THREE.Color().setHSL(h, 0.92, 0.58);
  return {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255),
  };
}
