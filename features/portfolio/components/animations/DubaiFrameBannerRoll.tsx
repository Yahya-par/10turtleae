"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import { carPassState } from "@features/portfolio/config/carPassState";
import { dubaiFrameBannerSettings } from "@features/portfolio/config/dubaiFrameBannerSettings";
import { createDubaiFrameBannerPlaceholderTexture } from "@features/portfolio/utils/dubaiFrameBannerTexture";
import {
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";

type DubaiFrameBannerRollProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnCarRef: RefObject<boolean>;
  carTravelProgressRef: RefObject<number>;
};

type OpeningMetrics = {
  topAnchor: THREE.Vector3;
  bannerWidth: number;
  bannerMaxHeight: number;
  rollRadius: number;
  frameCenterX: number;
  scrollTriggerProgress: number;
};

type BannerRig = {
  root: THREE.Group;
  flatMesh: THREE.Mesh;
  rollMesh: THREE.Mesh;
  flatMaterial: THREE.MeshBasicMaterial;
  rollMaterial: THREE.MeshBasicMaterial;
  texture: THREE.Texture;
  opening: OpeningMetrics;
};

const settings = dubaiFrameBannerSettings;
const tempActorPos = new THREE.Vector3();
const foregroundRenderRestore = new WeakMap<THREE.Object3D, number>();

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function pointFromBounds(
  bounds: THREE.Box3,
  uvw: readonly [number, number, number],
) {
  const [u, v, w] = uvw;
  return new THREE.Vector3(
    THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, u),
    THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, v),
    THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, w),
  );
}

function resolveOpeningMetrics(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  sceneFrame: SceneFrame | null,
): OpeningMetrics | null {
  const frame = findSceneObject(
    scene,
    nodes,
    settings.frameAsset,
    settings.frameAssetBlender,
  );
  const frameText = findSceneObject(
    scene,
    nodes,
    settings.frameTextAsset,
    settings.frameTextAssetBlender,
  );

  if (!frame || !frameText) return null;

  frame.updateMatrixWorld(true);
  frameText.updateMatrixWorld(true);

  const frameBounds = getObjectBounds(frame);
  const textBounds = getObjectBounds(frameText);
  const frameSize = frameBounds.getSize(new THREE.Vector3());

  const topAnchor = pointFromBounds(frameBounds, settings.anchorTopUVW);
  topAnchor.add(new THREE.Vector3(...settings.worldNudge));

  const bottomY = textBounds.max.y + settings.gapAboveFrameText;
  const bannerMaxHeight = Math.max(0.8, topAnchor.y - bottomY);
  const bannerWidth = Math.max(0.8, frameSize.x * settings.widthFromFrame);
  const rollRadius = Math.max(0.05, bannerMaxHeight * settings.rollRadiusFromOpening);

  const frameCenterX = (frameBounds.min.x + frameBounds.max.x) / 2;

  let scrollTriggerProgress = 0.16;
  if (sceneFrame) {
    const panel =
      findSceneObject(
        scene,
        nodes,
        settings.scenePanel,
        settings.scenePanelBlender,
      ) ?? frame;
    const panelBounds = getObjectBounds(panel);
    const panelCenterX = (panelBounds.min.x + panelBounds.max.x) / 2;
    scrollTriggerProgress = getScrollProgressAtX(
      panelCenterX,
      getScrollRange(sceneFrame),
    );
  }

  return {
    topAnchor,
    bannerWidth,
    bannerMaxHeight,
    rollRadius,
    frameCenterX,
    scrollTriggerProgress,
  };
}

function resolveCarCarrier(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  return findSceneObject(scene, nodes, settings.carCarrierName);
}

function isScrollAtDubaiFrame(
  rig: BannerRig,
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
    Math.abs(current - rig.opening.scrollTriggerProgress) <=
    settings.scrollProgressPadding
  );
}

function isCarNearFrame(carrier: THREE.Object3D, rig: BannerRig) {
  carrier.updateMatrixWorld(true);
  const x = carrier.getWorldPosition(tempActorPos).x;
  return Math.abs(x - rig.opening.frameCenterX) <= settings.frameCenterXPadding;
}

function shouldRollBanner(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  rig: BannerRig,
  scrollProgress: RefObject<number>,
  targetScrollProgress: RefObject<number>,
  lerpFactor: number,
  turtleOnCarRef: RefObject<boolean>,
  carTravelProgressRef: RefObject<number>,
) {
  // Wait until the turtle has finished boarding — not during the arc.
  if (carPassState.boatToCarTransfer) return false;
  if (!turtleOnCarRef.current) return false;

  const carrier = resolveCarCarrier(scene, nodes);
  if (!carrier) return false;

  const atScroll = isScrollAtDubaiFrame(
    rig,
    scrollProgress,
    targetScrollProgress,
    lerpFactor,
  );
  const nearFrame = isCarNearFrame(carrier, rig);
  const atDubaiFrameDock =
    carTravelProgressRef.current <= settings.carArrivalProgress;

  return atScroll && nearFrame && atDubaiFrameDock;
}

function createBannerMaterial(texture: THREE.Texture, tint?: THREE.Color) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: tint ?? new THREE.Color(0xffffff),
    side: THREE.DoubleSide,
    toneMapped: false,
    depthTest: true,
    depthWrite: false,
    transparent: true,
  });
}

function setSubtreeRenderOrder(root: THREE.Object3D | null | undefined, order: number) {
  if (!root) return;
  root.traverse((child) => {
    if (!foregroundRenderRestore.has(child)) {
      foregroundRenderRestore.set(child, child.renderOrder);
    }
    child.renderOrder = order;
  });
}

function restoreSubtreeRenderOrder(root: THREE.Object3D | null | undefined) {
  if (!root) return;
  root.traverse((child) => {
    const previous = foregroundRenderRestore.get(child);
    if (previous !== undefined) {
      child.renderOrder = previous;
      foregroundRenderRestore.delete(child);
    }
  });
}

function updateBannerGeometry(rig: BannerRig, unroll: number) {
  const { flatMesh, rollMesh, flatMaterial, opening } = rig;
  const { bannerMaxHeight, rollRadius } = opening;

  if (unroll <= 0.001) {
    rig.root.visible = false;
    return;
  }

  rig.root.visible = true;

  const deployed = bannerMaxHeight * unroll;

  flatMesh.visible = true;
  flatMesh.scale.set(1, unroll, 1);
  flatMesh.position.y = (-bannerMaxHeight * unroll) / 2;

  const map = flatMaterial.map;
  if (map) {
    map.offset.set(0, 1 - unroll);
    map.repeat.set(1, unroll);
    flatMaterial.needsUpdate = true;
  }

  const showRoll = unroll > 0.05 && unroll < 0.99;
  rollMesh.visible = showRoll;
  if (showRoll) {
    rollMesh.position.y = -deployed + rollRadius;
    rollMesh.rotation.order = "XYZ";
    rollMesh.rotation.z = Math.PI / 2;
    rollMesh.rotation.x = THREE.MathUtils.lerp(-0.1, -0.52, unroll);
    rollMesh.rotation.y = 0;
  }
}

function syncRigLayout(rig: BannerRig, opening: OpeningMetrics) {
  rig.opening = opening;
  rig.root.position.copy(opening.topAnchor);

  const { bannerWidth, bannerMaxHeight, rollRadius } = opening;
  const flat = rig.flatMesh.geometry as THREE.PlaneGeometry;
  const needsFlat =
    Math.abs(flat.parameters.width - bannerWidth) > 0.01 ||
    Math.abs(flat.parameters.height - bannerMaxHeight) > 0.01;

  if (needsFlat) {
    rig.flatMesh.geometry.dispose();
    rig.flatMesh.geometry = new THREE.PlaneGeometry(
      bannerWidth,
      bannerMaxHeight,
      1,
      16,
    );
    rig.flatMesh.position.y = -bannerMaxHeight / 2;

    rig.rollMesh.geometry.dispose();
    rig.rollMesh.geometry = new THREE.CylinderGeometry(
      rollRadius,
      rollRadius,
      bannerWidth,
      32,
      1,
      true,
      0,
      Math.PI,
    );
  }
}

function buildBannerRig(
  scene: THREE.Object3D,
  opening: OpeningMetrics,
  texture: THREE.Texture,
): BannerRig {
  const root = new THREE.Group();
  root.name = settings.carrierName;
  root.renderOrder = settings.renderOrder;
  scene.add(root);
  root.position.copy(opening.topAnchor);

  const flatMaterial = createBannerMaterial(texture);
  const rollMaterial = createBannerMaterial(
    texture,
    new THREE.Color(settings.placeholder.back),
  );

  const flatMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(opening.bannerWidth, opening.bannerMaxHeight, 1, 16),
    flatMaterial,
  );
  flatMesh.name = `${settings.carrierName}_Flat`;
  flatMesh.renderOrder = settings.renderOrder;
  flatMesh.position.y = -opening.bannerMaxHeight / 2;

  const rollMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      opening.rollRadius,
      opening.rollRadius,
      opening.bannerWidth,
      32,
      1,
      true,
      0,
      Math.PI,
    ),
    rollMaterial,
  );
  rollMesh.name = `${settings.carrierName}_Roll`;
  rollMesh.renderOrder = settings.renderOrder + 1;

  root.add(flatMesh);
  root.add(rollMesh);
  root.visible = false;

  return {
    root,
    flatMesh,
    rollMesh,
    flatMaterial,
    rollMaterial,
    texture,
    opening,
  };
}

function beginRollAnimation(
  arrivedRef: RefObject<boolean>,
  animatingRef: RefObject<boolean>,
  elapsedRef: RefObject<number>,
  unrollRef: RefObject<number>,
) {
  arrivedRef.current = true;
  elapsedRef.current = 0;
  unrollRef.current = 0;
  animatingRef.current = true;
}

export default function DubaiFrameBannerRoll({
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnCarRef,
  carTravelProgressRef,
}: DubaiFrameBannerRollProps) {
  const { camera } = useThree();
  const rigRef = useRef<BannerRig | null>(null);
  const carCarrierRef = useRef<THREE.Object3D | null>(null);
  const arrivedRef = useRef(false);
  const animatingRef = useRef(false);
  const elapsedRef = useRef(0);
  const unrollRef = useRef(0);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const opening = resolveOpeningMetrics(scene, nodes, sceneFrame);
    const frameText = findSceneObject(
      scene,
      nodes,
      settings.frameTextAsset,
      settings.frameTextAssetBlender,
    );

    if (!opening || !frameText) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[DubaiFrameBannerRoll] Missing assets:", {
          opening: Boolean(opening),
          frameText: frameText?.name ?? settings.frameTextAsset,
        });
      }
      return;
    }

    const texture = createDubaiFrameBannerPlaceholderTexture();
    const rig = buildBannerRig(scene, opening, texture);
    rigRef.current = rig;
    carCarrierRef.current = resolveCarCarrier(scene, nodes);

    if (
      shouldRollBanner(
        scene,
        nodes,
        rig,
        scrollProgress,
        targetScrollProgress,
        lerpFactor,
        turtleOnCarRef,
        carTravelProgressRef,
      )
    ) {
      beginRollAnimation(arrivedRef, animatingRef, elapsedRef, unrollRef);
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[DubaiFrameBannerRoll] Ready:", {
        topAnchor: opening.topAnchor.toArray(),
        bannerMaxHeight: opening.bannerMaxHeight,
        bannerWidth: opening.bannerWidth,
        frameCenterX: opening.frameCenterX,
        scrollTriggerProgress: opening.scrollTriggerProgress,
      });
    }

    return () => {
      arrivedRef.current = false;
      animatingRef.current = false;
      elapsedRef.current = 0;
      unrollRef.current = 0;

      rig.root.parent?.remove(rig.root);
      rig.flatMesh.geometry.dispose();
      rig.rollMesh.geometry.dispose();
      rig.flatMaterial.dispose();
      rig.rollMaterial.dispose();
      rig.texture.dispose();
      restoreSubtreeRenderOrder(carCarrierRef.current);
      carCarrierRef.current = null;
      rigRef.current = null;
    };
  }, [
    scene,
    nodes,
    sceneFrame,
    scrollProgress,
    targetScrollProgress,
    lerpFactor,
    turtleOnCarRef,
    carTravelProgressRef,
  ]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const opening = resolveOpeningMetrics(scene, nodes, sceneFrame);
    if (opening) {
      syncRigLayout(rig, opening);
    }

    rig.root.lookAt(camera.position);

    const shouldRoll = shouldRollBanner(
      scene,
      nodes,
      rig,
      scrollProgress,
      targetScrollProgress,
      lerpFactor,
      turtleOnCarRef,
      carTravelProgressRef,
    );
    const wasArrived = arrivedRef.current;

    if (shouldRoll && !wasArrived) {
      beginRollAnimation(arrivedRef, animatingRef, elapsedRef, unrollRef);
    }

    if (!shouldRoll && wasArrived) {
      arrivedRef.current = false;
      animatingRef.current = false;
      elapsedRef.current = 0;
      unrollRef.current = 0;
      updateBannerGeometry(rig, 0);
      return;
    }

    if (animatingRef.current && unrollRef.current < 1) {
      elapsedRef.current += delta;
      const linear = Math.min(1, elapsedRef.current / settings.unrollDuration);
      unrollRef.current = easeOutCubic(linear);
      if (unrollRef.current >= 1) animatingRef.current = false;
    }

    updateBannerGeometry(rig, unrollRef.current);

    const bannerVisible = rig.root.visible && unrollRef.current > 0.001;
    const carCarrier = carCarrierRef.current ?? resolveCarCarrier(scene, nodes);
    if (bannerVisible) {
      setSubtreeRenderOrder(carCarrier, settings.foregroundActorRenderOrder);
    } else {
      restoreSubtreeRenderOrder(carCarrier);
    }
  });

  return null;
}
