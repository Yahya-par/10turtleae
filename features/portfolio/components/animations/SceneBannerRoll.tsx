"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import {
  getScrollProgressAtX,
  getScrollRange,
  type SceneFrame,
} from "@features/portfolio/components/camera/CameraPath";
import type { BannerRollSettings } from "@features/portfolio/config/bannerRollSettings";
import { carPassState } from "@features/portfolio/config/carPassState";
import { createBannerRollPlaceholderTexture } from "@features/portfolio/utils/bannerRollPlaceholderTexture";
import {
  findObjectByNamePattern,
  findSceneObject,
  getObjectBounds,
} from "@features/portfolio/utils/sceneObjectUtils";
import { assetNames } from "@features/portfolio/config/assetNames";

type SceneBannerRollProps = {
  settings: BannerRollSettings;
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
  turtleOnCarRef: RefObject<boolean>;
  carTravelProgressRef: RefObject<number>;
  turtleOnYachtRef?: RefObject<boolean>;
  yachtTravelProgressRef?: RefObject<number>;
};

type OpeningMetrics = {
  topAnchor: THREE.Vector3;
  bannerWidth: number;
  bannerMaxHeight: number;
  rollRadius: number;
  frameCenterX: number;
  scrollTriggerProgress: number;
  scrollTriggerMin: number;
  scrollTriggerMax: number;
};

type BannerRig = {
  root: THREE.Group;
  flatMesh: THREE.Mesh;
  rollMesh: THREE.Mesh;
  flatMaterial: THREE.MeshBasicMaterial;
  rollMaterial: THREE.MeshBasicMaterial;
  texture: THREE.Texture;
  textureAspect: number;
  opening: OpeningMetrics;
};

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

function resolveBottomY(
  settings: BannerRollSettings,
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  frameBounds: THREE.Box3,
) {
  if ("frameTextAsset" in settings && settings.frameTextAsset) {
    const frameText = findSceneObject(
      scene,
      nodes,
      settings.frameTextAsset,
      settings.frameTextAssetBlender,
    );
    if (!frameText) return null;

    frameText.updateMatrixWorld(true);
    return getObjectBounds(frameText).max.y + settings.gapAboveFrameText;
  }

  if ("bottomAnchorUVW" in settings && settings.bottomAnchorUVW) {
    return (
      pointFromBounds(frameBounds, settings.bottomAnchorUVW).y +
      settings.gapAboveBottomAnchor
    );
  }

  return null;
}

function resolveOpeningMetrics(
  settings: BannerRollSettings,
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

  if (!frame) return null;

  frame.updateMatrixWorld(true);

  const frameBounds = getObjectBounds(frame);
  const frameSize = frameBounds.getSize(new THREE.Vector3());
  const bottomY = resolveBottomY(settings, scene, nodes, frameBounds);
  if (bottomY === null) return null;

  const topAnchor = pointFromBounds(frameBounds, settings.anchorTopUVW);
  if ("positionOffset" in settings && settings.positionOffset) {
    topAnchor.add(
      new THREE.Vector3(
        settings.positionOffset.x,
        settings.positionOffset.y,
        settings.positionOffset.z,
      ),
    );
  } else if ("worldNudge" in settings) {
    topAnchor.add(new THREE.Vector3(...settings.worldNudge));
  }

  const autoHeight = Math.max(0.8, topAnchor.y - bottomY);
  const bannerMaxHeight =
    "bannerHeight" in settings && settings.bannerHeight != null
      ? settings.bannerHeight
      : autoHeight;
  const bannerWidth =
    "bannerWidth" in settings && settings.bannerWidth != null
      ? settings.bannerWidth
      : Math.max(0.8, frameSize.x * settings.widthFromFrame);
  const rollRadius = Math.max(
    0.05,
    bannerMaxHeight * settings.rollRadiusFromOpening,
  );

  const frameCenterX = (frameBounds.min.x + frameBounds.max.x) / 2;

  let scrollTriggerProgress = 0.16;
  let scrollTriggerMin = scrollTriggerProgress - settings.scrollProgressPadding;
  let scrollTriggerMax = scrollTriggerProgress + settings.scrollProgressPadding;
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
    const scrollRange = getScrollRange(sceneFrame);
    scrollTriggerProgress = getScrollProgressAtX(panelCenterX, scrollRange);
    const scrollAtMinX = getScrollProgressAtX(panelBounds.min.x, scrollRange);
    const scrollAtMaxX = getScrollProgressAtX(panelBounds.max.x, scrollRange);
    scrollTriggerMin =
      Math.min(scrollAtMinX, scrollAtMaxX) - settings.scrollProgressPadding;
    scrollTriggerMax =
      Math.max(scrollAtMinX, scrollAtMaxX) + settings.scrollProgressPadding;
  }

  return {
    topAnchor,
    bannerWidth,
    bannerMaxHeight,
    rollRadius,
    frameCenterX,
    scrollTriggerProgress,
    scrollTriggerMin,
    scrollTriggerMax,
  };
}

function resolveActorCarrier(
  settings: BannerRollSettings,
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
) {
  if ("actor" in settings && settings.actor === "yacht") {
    return findSceneObject(scene, nodes, settings.yachtCarrierName);
  }

  if ("carCarrierName" in settings) {
    return findSceneObject(scene, nodes, settings.carCarrierName);
  }

  return null;
}

function isTurtleOnActorCarrier(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  carrier: THREE.Object3D,
) {
  const turtle =
    findSceneObject(
      scene,
      nodes,
      assetNames.camel.turtle,
      assetNames.camel.turtleBlender,
    ) ?? findObjectByNamePattern(scene, /turtlechar/i);
  if (!turtle) return false;

  let node: THREE.Object3D | null = turtle;
  while (node) {
    if (node === carrier) return true;
    node = node.parent;
  }
  return false;
}

function isScrollAtScene(
  rig: BannerRig,
  scrollProgress: RefObject<number>,
  targetScrollProgress: RefObject<number>,
  lerpFactor: number,
  settings: BannerRollSettings,
) {
  const current = THREE.MathUtils.lerp(
    scrollProgress.current,
    targetScrollProgress.current,
    lerpFactor,
  );
  if (
    "useScenePanelScrollRange" in settings &&
    settings.useScenePanelScrollRange
  ) {
    return (
      current >= rig.opening.scrollTriggerMin &&
      current <= rig.opening.scrollTriggerMax
    );
  }

  return (
    Math.abs(current - rig.opening.scrollTriggerProgress) <=
    settings.scrollProgressPadding
  );
}

function isActorNearAnchor(
  carrier: THREE.Object3D,
  rig: BannerRig,
  settings: BannerRollSettings,
) {
  if ("skipActorNearAnchor" in settings && settings.skipActorNearAnchor) {
    return true;
  }

  carrier.updateMatrixWorld(true);
  const x = carrier.getWorldPosition(tempActorPos).x;
  return Math.abs(x - rig.opening.frameCenterX) <= settings.frameCenterXPadding;
}

function isActorAtTriggerProgress(
  progress: number,
  settings: BannerRollSettings,
) {
  if (
    "yachtTravelProgressMin" in settings &&
    "yachtTravelProgressMax" in settings
  ) {
    return (
      progress >= settings.yachtTravelProgressMin &&
      progress <= settings.yachtTravelProgressMax
    );
  }

  if (
    "carTravelProgressMin" in settings &&
    "carTravelProgressMax" in settings
  ) {
    return (
      progress >= settings.carTravelProgressMin &&
      progress <= settings.carTravelProgressMax
    );
  }

  if ("carArrivalProgress" in settings) {
    return progress <= settings.carArrivalProgress;
  }

  return false;
}

function shouldRollBanner(
  settings: BannerRollSettings,
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  rig: BannerRig,
  scrollProgress: RefObject<number>,
  targetScrollProgress: RefObject<number>,
  lerpFactor: number,
  turtleOnCarRef: RefObject<boolean>,
  carTravelProgressRef: RefObject<number>,
  turtleOnYachtRef?: RefObject<boolean>,
  yachtTravelProgressRef?: RefObject<number>,
) {
  if ("actor" in settings && settings.actor === "yacht") {
    if (
      carPassState.jetskiToYachtTransfer ||
      carPassState.safariCamelToYachtTransfer
    ) {
      return false;
    }

    const carrier = resolveActorCarrier(settings, scene, nodes);
    if (!carrier) return false;

    const turtleOnYacht =
      turtleOnYachtRef?.current ||
      isTurtleOnActorCarrier(scene, nodes, carrier);
    if (!turtleOnYacht) return false;

    const progress = yachtTravelProgressRef?.current ?? 0;
    const atProgress = isActorAtTriggerProgress(progress, settings);
    const dockedNearHotel =
      carPassState.yachtDockedAtEnd &&
      !carPassState.yachtToSafariCamelTransfer;

    return (
      isScrollAtScene(
        rig,
        scrollProgress,
        targetScrollProgress,
        lerpFactor,
        settings,
      ) &&
      isActorNearAnchor(carrier, rig, settings) &&
      (atProgress || dockedNearHotel)
    );
  }

  if (carPassState.boatToCarTransfer) return false;
  if (!turtleOnCarRef.current) return false;

  const carrier = resolveActorCarrier(settings, scene, nodes);
  if (!carrier) return false;

  return (
    isScrollAtScene(
      rig,
      scrollProgress,
      targetScrollProgress,
      lerpFactor,
      settings,
    ) &&
    isActorNearAnchor(carrier, rig, settings) &&
    isActorAtTriggerProgress(carTravelProgressRef.current, settings)
  );
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

function syncTextureAspect(
  rig: BannerRig,
  opening: OpeningMetrics,
  placeholder: BannerRollSettings["placeholder"],
) {
  const aspect = opening.bannerWidth / opening.bannerMaxHeight;
  if (Math.abs(aspect - rig.textureAspect) <= 0.02) return;

  rig.texture.dispose();
  rig.texture = createBannerRollPlaceholderTexture(placeholder, aspect);
  rig.textureAspect = aspect;
  rig.flatMaterial.map = rig.texture;
  rig.rollMaterial.map = rig.texture;
  rig.flatMaterial.needsUpdate = true;
  rig.rollMaterial.needsUpdate = true;
}

function syncRigLayout(
  rig: BannerRig,
  opening: OpeningMetrics,
  placeholder: BannerRollSettings["placeholder"],
) {
  syncTextureAspect(rig, opening, placeholder);
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
  settings: BannerRollSettings,
  scene: THREE.Object3D,
  opening: OpeningMetrics,
  texture: THREE.Texture,
  textureAspect: number,
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
    textureAspect,
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

export default function SceneBannerRoll({
  settings,
  scene,
  nodes,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  lerpFactor,
  turtleOnCarRef,
  carTravelProgressRef,
  turtleOnYachtRef,
  yachtTravelProgressRef,
}: SceneBannerRollProps) {
  const { camera } = useThree();
  const rigRef = useRef<BannerRig | null>(null);
  const actorCarrierRef = useRef<THREE.Object3D | null>(null);
  const arrivedRef = useRef(false);
  const animatingRef = useRef(false);
  const elapsedRef = useRef(0);
  const unrollRef = useRef(0);
  const logTag = settings.carrierName;

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const opening = resolveOpeningMetrics(settings, scene, nodes, sceneFrame);

    if (!opening) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[${logTag}] Missing assets:`, {
          frame: settings.frameAsset,
          opening: false,
        });
      }
      return;
    }

    const textureAspect = opening.bannerWidth / opening.bannerMaxHeight;
    const texture = createBannerRollPlaceholderTexture(
      settings.placeholder,
      textureAspect,
    );
    const rig = buildBannerRig(
      settings,
      scene,
      opening,
      texture,
      textureAspect,
    );
    rigRef.current = rig;
    actorCarrierRef.current = resolveActorCarrier(settings, scene, nodes);

    if (
      shouldRollBanner(
        settings,
        scene,
        nodes,
        rig,
        scrollProgress,
        targetScrollProgress,
        lerpFactor,
        turtleOnCarRef,
        carTravelProgressRef,
        turtleOnYachtRef,
        yachtTravelProgressRef,
      )
    ) {
      beginRollAnimation(arrivedRef, animatingRef, elapsedRef, unrollRef);
    }

    if (process.env.NODE_ENV === "development") {
      console.info(`[${logTag}] Ready:`, {
        frame: settings.frameAsset,
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
      restoreSubtreeRenderOrder(actorCarrierRef.current);
      actorCarrierRef.current = null;
      rigRef.current = null;
    };
  }, [
    settings,
    scene,
    nodes,
    sceneFrame,
    scrollProgress,
    targetScrollProgress,
    lerpFactor,
    turtleOnCarRef,
    carTravelProgressRef,
    turtleOnYachtRef,
    yachtTravelProgressRef,
    logTag,
  ]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const opening = resolveOpeningMetrics(settings, scene, nodes, sceneFrame);
    if (opening) {
      syncRigLayout(rig, opening, settings.placeholder);
    }

    rig.root.lookAt(camera.position);

    const shouldRoll = shouldRollBanner(
      settings,
      scene,
      nodes,
      rig,
      scrollProgress,
      targetScrollProgress,
      lerpFactor,
      turtleOnCarRef,
      carTravelProgressRef,
      turtleOnYachtRef,
      yachtTravelProgressRef,
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
    const actorCarrier =
      actorCarrierRef.current ?? resolveActorCarrier(settings, scene, nodes);
    if (bannerVisible) {
      setSubtreeRenderOrder(actorCarrier, settings.foregroundActorRenderOrder);
    } else {
      restoreSubtreeRenderOrder(actorCarrier);
    }
  });

  return null;
}
