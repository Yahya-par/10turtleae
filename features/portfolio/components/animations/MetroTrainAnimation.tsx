import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { metroTrainSettings } from "@features/portfolio/config/metroTrainSettings";
// Metro Automation banner — temporarily disabled
// import {
//   createThemedBannerMesh,
//   disposeThemedBannerMesh,
// } from "@features/portfolio/utils/themedBannerTexture";

type MetroBounds = {
  start: THREE.Vector3;
  end: THREE.Vector3;
};

type MetroTrainAnimationProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
};

// normalizeObjectName - normalize the name of the object
function normalizeObjectName(name: string) {
  return name.replace(/\./g, "").toLowerCase();
}

// findMetroObject - find the metro object in the scene
function findMetroObject(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D> | undefined,
  name: string,
) {
  const fromNodes = nodes?.[name];
  if (fromNodes) return fromNodes;

  const fromScene = scene.getObjectByName(name);
  if (fromScene) return fromScene;

  const normalized = normalizeObjectName(name);
  let match: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (match || !child.name) return;
    if (
      child.name === name ||
      normalizeObjectName(child.name) === normalized
    ) {
      match = child;
    }
  });
  return match;
}

// attachTrainCarrier is a function that attaches the train carrier to the train.
function attachTrainCarrier(train: THREE.Object3D) {
  if (train.parent?.name === "MetroTrainCarrier") {
    return train.parent as THREE.Group;
  }

  train.updateMatrixWorld(true);

  const parent = train.parent;
  if (!parent) {
    throw new Error("Metro train must have a parent in the scene graph");
  }

  parent.updateMatrixWorld(true);

  const worldMatrix = train.matrixWorld.clone();
  const parentInverse = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const localMatrix = worldMatrix.premultiply(parentInverse);

  const carrier = new THREE.Group();
  carrier.name = "MetroTrainCarrier";
  localMatrix.decompose(
    carrier.position,
    carrier.quaternion,
    carrier.scale,
  );

  parent.add(carrier);
  parent.remove(train);
  carrier.add(train);

  train.position.set(0, 0, 0);
  train.rotation.set(0, 0, 0);
  train.scale.set(1, 1, 1);

  return carrier;
}

function isMetroBodyMesh(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  return materials.some((material) => material && /metro/i.test(material.name));
}

const GEOM_CORNER = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
];

function fillGeometryCorners(box: THREE.Box3, target: THREE.Vector3[]) {
  const { min, max } = box;
  target[0].set(min.x, min.y, min.z);
  target[1].set(max.x, min.y, min.z);
  target[2].set(min.x, max.y, min.z);
  target[3].set(max.x, max.y, min.z);
  target[4].set(min.x, min.y, max.z);
  target[5].set(max.x, min.y, max.z);
  target[6].set(min.x, max.y, max.z);
  target[7].set(max.x, max.y, max.z);
}

/** Roof anchor from Metro body meshes only — avoids station/bridge bounds on Metro001. */
function getTrainMeshLocalBounds(train: THREE.Object3D) {
  train.updateMatrixWorld(true);
  const inverse = train.matrixWorld.clone().invert();
  const localBox = new THREE.Box3();
  const corner = new THREE.Vector3();
  let matchedMesh = false;

  train.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    if (!isMetroBodyMesh(child)) return;

    matchedMesh = true;
    const geometry = child.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;

    fillGeometryCorners(geometry.boundingBox, GEOM_CORNER);
    for (const point of GEOM_CORNER) {
      corner.copy(point).applyMatrix4(child.matrixWorld).applyMatrix4(inverse);
      localBox.expandByPoint(corner);
    }
  });

  if (!matchedMesh) {
    train.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.geometry) return;

      const geometry = child.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (!geometry.boundingBox) return;

      fillGeometryCorners(geometry.boundingBox, GEOM_CORNER);
      for (const point of GEOM_CORNER) {
        corner.copy(point).applyMatrix4(child.matrixWorld).applyMatrix4(inverse);
        localBox.expandByPoint(corner);
      }
    });
  }

  return localBox;
}

const BANNER_FLIP_Y = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI,
);

function faceBannerOnCarrier(
  bannerRoot: THREE.Object3D,
  carrier: THREE.Object3D,
  camera: THREE.Camera,
  lookMatrix: THREE.Matrix4,
  worldQuat: THREE.Quaternion,
  carrierQuat: THREE.Quaternion,
) {
  carrier.updateMatrixWorld(true);
  bannerRoot.updateMatrixWorld(true);

  const worldPos = new THREE.Vector3();
  bannerRoot.getWorldPosition(worldPos);
  lookMatrix.lookAt(worldPos, camera.position, camera.up);
  worldQuat.setFromRotationMatrix(lookMatrix).multiply(BANNER_FLIP_Y);
  carrier.getWorldQuaternion(carrierQuat);
  bannerRoot.quaternion.copy(worldQuat).premultiply(carrierQuat.invert());
}

function syncMetroBanner(
  carrier: THREE.Group,
  train: THREE.Object3D,
  bannerRoot: THREE.Group,
  camera: THREE.Camera,
  lookMatrix: THREE.Matrix4,
  worldQuat: THREE.Quaternion,
  carrierQuat: THREE.Quaternion,
) {
  const { banner } = metroTrainSettings;
  const localBox = getTrainMeshLocalBounds(train);

  bannerRoot.position.set(
    (localBox.min.x + localBox.max.x) * 0.5 + banner.offsetX,
    localBox.max.y + banner.offsetY + banner.height * 0.5,
    (localBox.min.z + localBox.max.z) * 0.5 + banner.offsetZ,
  );
  faceBannerOnCarrier(
    bannerRoot,
    carrier,
    camera,
    lookMatrix,
    worldQuat,
    carrierQuat,
  );
}

// Metro Automation banner — temporarily disabled
// function createMetroBannerRoot(carrier: THREE.Group) {
//   const { banner } = metroTrainSettings;
//   const root = new THREE.Group();
//   root.name = "MetroBannerRoot";
//
//   const mesh = createThemedBannerMesh(banner, banner.width, banner.height, {
//     depthTest: true,
//     renderOrder: 0,
//   });
//   root.add(mesh);
//   carrier.add(root);
//
//   return { root, mesh };
// }

function getTrainHalfLength(train: THREE.Object3D) {
  train.updateMatrixWorld(true);
  const trainBox = new THREE.Box3().setFromObject(train);
  return (trainBox.max.x - trainBox.min.x) / 2;
}

// getTrackEndpoints is a function that returns the start and end positions of the train along the track.
function getTrackEndpoints(
  leftStation: THREE.Object3D,
  rightStation: THREE.Object3D,
  train: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
) {
  leftStation.updateMatrixWorld(true);
  rightStation.updateMatrixWorld(true);

  const leftBox = new THREE.Box3().setFromObject(leftStation);
  const rightBox = new THREE.Box3().setFromObject(rightStation);
  const { startInset, endInset } = metroTrainSettings;
  const trainHalfLength = getTrainHalfLength(train);

  const start = new THREE.Vector3(
    leftBox.min.x + startInset + trainHalfLength,
    carrierY,
    carrierZ,
  );
  const end = new THREE.Vector3(
    rightBox.max.x - endInset - trainHalfLength,
    carrierY,
    carrierZ,
  );

  return { start, end, leftBox, rightBox };
}

function getBridgeTrackEndpoints(
  bridge: THREE.Object3D,
  train: THREE.Object3D,
  carrierY: number,
  carrierZ: number,
) {
  bridge.updateMatrixWorld(true);

  const bridgeBox = new THREE.Box3().setFromObject(bridge);
  const bridgeInset = metroTrainSettings.bridgeInset;
  const trainHalfLength = getTrainHalfLength(train);

  const start = new THREE.Vector3(
    bridgeBox.min.x + bridgeInset + trainHalfLength,
    carrierY,
    carrierZ,
  );
  const end = new THREE.Vector3(
    bridgeBox.max.x - bridgeInset - trainHalfLength,
    carrierY,
    carrierZ,
  );

  return { start, end, bridgeBox };
}

// getPingPongProgress is a function that returns a number between 0 and 1 that represents the progress of the train along the track.
function getPingPongProgress(
  elapsed: number,
  legDuration: number,
  pause: number,
): number {
  const legTime = legDuration + pause;
  const cycleTime = legTime * 2;
  const cyclePosition = elapsed % cycleTime;

  if (cyclePosition < legTime) {
    const moving = cyclePosition <= legDuration;
    return moving ? cyclePosition / legDuration : 1;
  }

  const returnPosition = cyclePosition - legTime;
  const moving = returnPosition <= legDuration;
  return moving ? 1 - returnPosition / legDuration : 0;
}

// MetroTrainAnimation is a component that animates the metro train along the track.
export default function MetroTrainAnimation({
  scene,
  nodes,
}: MetroTrainAnimationProps) {
  const carrierRef = useRef<THREE.Group | null>(null);
  const trainRef = useRef<THREE.Object3D | null>(null);
  const boundsRef = useRef<MetroBounds | null>(null);
  const bannerRootRef = useRef<THREE.Group | null>(null);
  const bannerMeshRef = useRef<THREE.Mesh | null>(null);
  const bannerLookMatrixRef = useRef(new THREE.Matrix4());
  const bannerWorldQuatRef = useRef(new THREE.Quaternion());
  const bannerCarrierQuatRef = useRef(new THREE.Quaternion());
  const elapsedRef = useRef(0);
  const tempPositionRef = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const train = findMetroObject(scene, nodes, metroTrainSettings.train);
    const leftStation = findMetroObject(
      scene,
      nodes,
      metroTrainSettings.stationLeft,
    );
    const rightStation = findMetroObject(
      scene,
      nodes,
      metroTrainSettings.stationRight,
    );
    const bridge = findMetroObject(scene, nodes, metroTrainSettings.bridge);

    if (!train || (!leftStation || !rightStation) && !bridge) {
      if (process.env.NODE_ENV === "development") {
        const metroLike: string[] = [];
        scene.traverse((child) => {
          if (/metro|station|train/i.test(child.name)) {
            metroLike.push(child.name);
          }
        });
        console.warn("[MetroTrainAnimation] Missing metro assets:", {
          train: metroTrainSettings.train,
          trainFound: Boolean(train),
          leftStation: metroTrainSettings.stationLeft,
          leftFound: Boolean(leftStation),
          rightStation: metroTrainSettings.stationRight,
          rightFound: Boolean(rightStation),
          bridge: metroTrainSettings.bridge,
          bridgeFound: Boolean(bridge),
          metroLike,
        });
      }
      return;
    }

    if (carrierRef.current) return;

    const carrier = attachTrainCarrier(train);
    const fallbackToBridge = !leftStation || !rightStation;
    const { start, end, leftBox, rightBox, bridgeBox } = fallbackToBridge
      ? {
          ...getBridgeTrackEndpoints(
            bridge as THREE.Object3D,
            train,
            carrier.position.y,
            carrier.position.z,
          ),
          leftBox: null,
          rightBox: null,
        }
      : {
          ...getTrackEndpoints(
            leftStation as THREE.Object3D,
            rightStation as THREE.Object3D,
            train,
            carrier.position.y,
            carrier.position.z,
          ),
          bridgeBox: null,
        };

    carrierRef.current = carrier;
    trainRef.current = train;
    boundsRef.current = { start, end };
    carrier.position.copy(start);

    // Metro Automation banner — temporarily disabled
    // const banner = createMetroBannerRoot(carrier);
    // bannerRootRef.current = banner.root;
    // bannerMeshRef.current = banner.mesh;

    if (process.env.NODE_ENV === "development") {
      console.info("[MetroTrainAnimation] Ready:", {
        train: train.name,
        start: start.toArray(),
        end: end.toArray(),
        banner: metroTrainSettings.banner.text,
        mode: fallbackToBridge ? "bridge-fallback" : "station-to-station",
        leftStationX: leftBox ? [leftBox.min.x, leftBox.max.x] : null,
        rightStationX: rightBox ? [rightBox.min.x, rightBox.max.x] : null,
        bridgeX: bridgeBox ? [bridgeBox.min.x, bridgeBox.max.x] : null,
      });
    }

    return () => {
      // Metro Automation banner — temporarily disabled
      // if (bannerMeshRef.current) {
      //   disposeThemedBannerMesh(bannerMeshRef.current);
      // }
      // bannerRootRef.current?.removeFromParent();
      // bannerRootRef.current = null;
      // bannerMeshRef.current = null;
      trainRef.current = null;
      carrierRef.current = null;
      boundsRef.current = null;
    };
  }, [scene, nodes]);

  useFrame((_state, delta) => {
    const carrier = carrierRef.current;
    // const train = trainRef.current;
    const bounds = boundsRef.current;
    // const bannerRoot = bannerRootRef.current;
    if (!carrier || !bounds) return;

    elapsedRef.current += delta;

    const t = getPingPongProgress(
      elapsedRef.current,
      metroTrainSettings.legDuration,
      metroTrainSettings.pauseAtStation,
    );

    tempPositionRef.current.copy(bounds.start).lerp(bounds.end, t);
    carrier.position.copy(tempPositionRef.current);

    // Metro Automation banner — temporarily disabled
    // if (bannerRoot && train) {
    //   syncMetroBanner(
    //     carrier,
    //     train,
    //     bannerRoot,
    //     state.camera,
    //     bannerLookMatrixRef.current,
    //     bannerWorldQuatRef.current,
    //     bannerCarrierQuatRef.current,
    //   );
    // }
  });

  return null;
}
