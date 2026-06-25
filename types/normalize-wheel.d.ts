declare module "normalize-wheel" {
  type NormalizedWheel = {
    spinX: number;
    spinY: number;
    pixelX: number;
    pixelY: number;
  };

  export default function normalizeWheel(event: WheelEvent): NormalizedWheel;
}
