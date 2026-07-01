type CameraHudProps = {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
  fov: number;
};

function format(value: number) {
  return value.toFixed(2);
}

// CameraHud - display the camera position and look at values
export default function CameraHud({ position, lookAt, fov }: CameraHudProps) {
  return (
    <div className="camera-hud">
      <p className="camera-hud__title">Orbit camera — copy these values to me</p>
      <pre className="camera-hud__code">{`orbit: {
  position: { x: ${format(position.x)}, y: ${format(position.y)}, z: ${format(position.z)} },
  target:   { x: ${format(lookAt.x)}, y: ${format(lookAt.y)}, z: ${format(lookAt.z)} },
  fov: ${fov.toFixed(0)},
},
manual: {
  position: { x: ${format(position.x)}, y: ${format(position.y)}, z: ${format(position.z)} },
  lookAt:   { x: ${format(lookAt.x)}, y: ${format(lookAt.y)}, z: ${format(lookAt.z)} },
  fov: ${fov.toFixed(0)},
},`}</pre>
      <p className="camera-hud__hint">Frame the shot, then paste the HUD values in chat</p>
    </div>
  );
}
