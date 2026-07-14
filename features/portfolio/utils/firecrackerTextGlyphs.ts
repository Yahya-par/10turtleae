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
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function getLetterIndex(glyphX: number, canvasWidth: number, letterCount: number) {
  const normalized = THREE.MathUtils.clamp(
    (glyphX / canvasWidth) * letterCount,
    0,
    letterCount - 0.001,
  );
  return Math.floor(normalized);
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
    limited.push(points[Math.floor(i * step)]);
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
  return data[(y * width + x) * 4 + 3] >= 40;
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

  // Edge of the filled glyph (outer rim or hole rim).
  return (
    !isFilled(data, x - 1, y, width, height) ||
    !isFilled(data, x + 1, y, width, height) ||
    !isFilled(data, x, y - 1, width, height) ||
    !isFilled(data, x, y + 1, width, height)
  );
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
  } = config;
  const [canvasWidth, canvasHeight] = textCanvasSize;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) return [];

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let fontSize = Math.floor(canvasHeight * textFontScale);
  const buildFont = (size: number) =>
    `${textFontWeight} ${size}px ${textFontFamily}`;
  do {
    context.font = buildFont(fontSize);
    fontSize -= 4;
  } while (
    fontSize > 28 &&
    context.measureText(text).width > canvasWidth * 0.9
  );

  context.font = buildFont(fontSize);
  if (textLetterSpacing > 0) {
    context.letterSpacing = `${textLetterSpacing}px`;
  }
  context.fillText(text, canvasWidth * 0.5, canvasHeight * 0.52);

  const { data } = context.getImageData(0, 0, canvasWidth, canvasHeight);
  // Denser scan, then keep evenly spaced outline points.
  const scanGap = 1;
  const raw: FirecrackerTextGlyph[] = [];

  for (let y = 0; y < canvasHeight; y += scanGap) {
    for (let x = 0; x < canvasWidth; x += scanGap) {
      if (!isOutlinePixel(data, x, y, canvasWidth, canvasHeight)) continue;
      const letterIndex = getLetterIndex(x, canvasWidth, text.length);
      raw.push({
        x,
        y,
        letterIndex,
        hue: pickBurstHue(letterIndex),
      });
    }
  }

  // Thin outline rings to ~textSampleGap spacing so dots look even (not stacked).
  const spacing = Math.max(2, textSampleGap);
  const spaced: FirecrackerTextGlyph[] = [];
  for (const point of raw) {
    const tooClose = spaced.some(
      (kept) =>
        Math.hypot(kept.x - point.x, kept.y - point.y) < spacing,
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
