"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import { waterBalloonAnimationSettings } from "@features/portfolio/config/waterBalloonAnimationSettings";
import {
  BALLOON_TEXTURE_ASPECT,
  createBalloonLabelTexture,
} from "@features/portfolio/utils/balloonLabelTexture";
import {
  findAlRabScenePanel,
  findObjectByNamePattern,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type WaterBalloonAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
};

type BalloonConfig = (typeof waterBalloonAnimationSettings.balloons)[number];

type BalloonRig = {
  group: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseX: number;
  baseZ: number;
  spawnY: number;
  topY: number;
  phase: number;
  riseDuration: number;
  scale: number;
};

type WaterZone = {
  spawnY: number;
  topY: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  scrollTriggerProgress: number;
};

type CarrierRig = {
  root: THREE.Group;
  balloons: BalloonRig[];
  zone: WaterZone;
  geometry: THREE.PlaneGeometry;
};

function resolveWaterMesh(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  const { water, waterBlender } = waterBalloonAnimationSettings;
  return (
    findSceneObject(scene, nodes, water, waterBlender) ??
    findObjectByNamePattern(scene, /^water\.?001$|^water001$/i)
  );
}

function resolveWaterZone(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): WaterZone | null {
  const water = resolveWaterMesh(scene, nodes);
  if (!water) return null;

  water.updateMatrixWorld(true);
  const bounds = getObjectBounds(water);
  const {
    waterInset,
    spawnBelowSurface,
    riseAboveSurface,
  } = waterBalloonAnimationSettings;

  const surfaceY = bounds.max.y;
  const panel =
    findAlRabScenePanel(scene, nodes) ??
    findSceneObject(
      scene,
      nodes,
      waterBalloonAnimationSettings.sceneFloor,
      waterBalloonAnimationSettings.sceneFloorBlender,
    );

  let scrollTriggerProgress = 0.72;
  if (panel && sceneFrame) {
    const panelBounds = getObjectBounds(panel);
    const centerX = (panelBounds.min.x + panelBounds.max.x) / 2;
    scrollTriggerProgress = getScrollProgressAtX(
      centerX,
      getScrollRange(sceneFrame),
    );
  }

  return {
    spawnY: surfaceY - spawnBelowSurface,
    topY: surfaceY + riseAboveSurface,
    minX: bounds.min.x + waterInset,
    maxX: bounds.max.x - waterInset,
    minZ: bounds.min.z + waterInset,
    maxZ: bounds.max.z - waterInset,
    scrollTriggerProgress,
  };
}

function pointOnWater(zone: WaterZone, u: number, v: number) {
  return {
    x: THREE.MathUtils.lerp(zone.minX, zone.maxX, u),
    z: THREE.MathUtils.lerp(zone.minZ, zone.maxZ, v),
  };
}

function createBalloonRig(
  config: BalloonConfig,
  zone: WaterZone,
  geometry: THREE.PlaneGeometry,
): BalloonRig {
  const { labelSize } = waterBalloonAnimationSettings;
  const spawn = pointOnWater(zone, config.u, config.v);
  const scale = config.scale;

  const group = new THREE.Group();
  group.position.set(spawn.x, zone.spawnY, spawn.z);

  const texture = createBalloonLabelTexture(config);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const worldSize = labelSize * scale;
  mesh.scale.set(worldSize * BALLOON_TEXTURE_ASPECT, worldSize, 1);
  mesh.renderOrder = waterBalloonAnimationSettings.renderOrder;
  group.add(mesh);

  return {
    group,
    mesh,
    material,
    baseX: spawn.x,
    baseZ: spawn.z,
    spawnY: zone.spawnY,
    topY: zone.topY,
    phase: config.phase,
    riseDuration: config.riseDuration,
    scale,
  };
}

function buildCarrierRig(
  scene: THREE.Object3D,
  zone: WaterZone,
): CarrierRig {
  const root = new THREE.Group();
  root.name = waterBalloonAnimationSettings.carrierName;
  scene.add(root);

  const geometry = new THREE.PlaneGeometry(1, 1);

  const balloons = waterBalloonAnimationSettings.balloons.map((config) =>
    createBalloonRig(config, zone, geometry),
  );

  for (const balloon of balloons) {
    root.add(balloon.group);
  }

  return { root, balloons, zone, geometry };
}

function isSceneActive(
  zone: WaterZone,
  scrollProgress: RefObject<number>,
  targetScrollProgress: RefObject<number>,
  lerpFactor: number,
) {
  const current = THREE.MathUtils.lerp(
    scrollProgress.current,
    targetScrollProgress.current,
    lerpFactor,
  );
  return (
    Math.abs(current - zone.scrollTriggerProgress) <=
    waterBalloonAnimationSettings.scrollProgressPadding
  );
}

function updateBalloon(
  balloon: BalloonRig,
  elapsed: number,
  camera: THREE.Camera,
  active: boolean,
) {
  balloon.group.visible = active;
  if (!active) return;

  const { swayAmount, swaySpeed } = waterBalloonAnimationSettings;
  const cycle =
    ((elapsed + balloon.phase) % balloon.riseDuration) / balloon.riseDuration;
  const eased = cycle * cycle * (3 - 2 * cycle);
  const y = THREE.MathUtils.lerp(balloon.spawnY, balloon.topY, eased);
  const swayX = Math.sin(elapsed * swaySpeed + balloon.phase) * swayAmount;
  const swayZ =
    Math.cos(elapsed * swaySpeed * 0.86 + balloon.phase * 1.3) * swayAmount;

  balloon.group.position.set(
    balloon.baseX + swayX,
    y,
    balloon.baseZ + swayZ,
  );

  balloon.mesh.lookAt(camera.position);
}

export default function WaterBalloonAnimation({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
}: WaterBalloonAnimationProps) {
  const { camera } = useThree();
  const rigRef = useRef<CarrierRig | null>(null);
  const elapsedRef = useRef(0);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const zone = resolveWaterZone(scene, nodes, sceneFrame);
    if (!zone) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[WaterBalloonAnimation] Missing water001 mesh.");
      }
      return;
    }

    const rig = buildCarrierRig(scene, zone);
    rigRef.current = rig;

    if (process.env.NODE_ENV === "development") {
      console.info("[WaterBalloonAnimation] Ready:", {
        balloons: rig.balloons.length,
        spawnY: zone.spawnY,
        topY: zone.topY,
        scrollTriggerProgress: zone.scrollTriggerProgress,
      });
    }

    return () => {
      for (const balloon of rig.balloons) {
        balloon.material.map?.dispose();
        balloon.material.dispose();
      }

      rig.geometry.dispose();
      rig.root.parent?.remove(rig.root);
      rigRef.current = null;
    };
  }, [scene, nodes, sceneFrame]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const zone = resolveWaterZone(scene, nodes, sceneFrame);
    if (zone) {
      rig.zone = zone;
    }

    elapsedRef.current += delta;
    const active = isSceneActive(
      rig.zone,
      scrollProgress,
      targetScrollProgress,
      lerpFactor,
    );
    rig.root.visible = active;

    for (const balloon of rig.balloons) {
      updateBalloon(balloon, elapsedRef.current, camera, active);
    }
  });

  return null;
}
