/**
 * CAMERA SETTINGS
 *
 * mode: "orbit"  — free fly with mouse (use this to find your framing)
 * mode: "manual" — fixed camera using `manual` values below
 * mode: "scroll" — scroll-driven tour along Blender Empty waypoints
 */

export type CameraMode = "orbit" | "manual" | "scroll";

export const cameraSettings = {
  mode: "scroll" as CameraMode,

  orbit: {
    position: { x: 11.08, y: 6.17, z: -15.03 },
    target: { x: 11.09, y: 5.93, z: -6.33 },
    fov: 45,
    near: 0.1,
    far: 300,
    minDistance: 2,
    maxDistance: 120,
    enableDamping: true,
    dampingFactor: 0.08,
  },

  manual: {
    position: { x: 11.08, y: 6.755, z: -10.03 },
    lookAt: { x: 11.09, y: 6.53, z: -6.33 },
    fov: 15,
    near: 0.1,
    far: 300,
  },

  scroll: {
    distance: 12,
    heightOffset: 1.2,
    /**
     * Shift scroll camera framing along X so the opening backdrop edge
     * starts at the viewport left instead of centered.
     */
    xOffset: - 0.5,
  },
};
