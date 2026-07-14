import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { extractSceneFrame, type SceneFrame } from "@features/portfolio/components/camera/CameraPath";
import { yachtScrollConfigs, atlantisYachtScrollSettings } from "@features/portfolio/config/yachtScrollSettings";
import type { SceneLinkConfig } from "@features/portfolio/config/sceneLinkSettings";
import MetroTrainAnimation from "../animations/MetroTrainAnimation";
import CarAnimation from "../animations/CarAnimation";
import CloudAnimation from "../animations/CloudAnimation";
import AinAnimation from "../animations/AinAnimation";
import DolphinTextAnimation from "../animations/DolphinTextAnimation";
import CampfireSmoke from "../animations/CampfireSmoke";
import SafariCampWind from "../animations/SafariCampWind";
import DroneAnimation from "../animations/DroneAnimation";
import CamelWalkAnimation from "../animations/CamelWalkAnimation";
import SafariCamelScrollMovement from "../animations/SafariCamelScrollMovement";
import SafariCamelWalkAnimation from "../animations/SafariCamelWalkAnimation";
import SceneObjectLinks from "./SceneObjectLinks";
import SceneMeshLayerFix from "./SceneMeshLayerFix";
import CamelScrollMovement from "../animations/CamelScrollMovement";
import BirdAnimation from "../animations/BirdAnimation";
import BoatScrollMovement from "../animations/BoatScrollMovement";
import CarScrollMovement from "../animations/CarScrollMovement";
import JetskiScrollMovement from "../animations/JetskiScrollMovement";
import YachtScrollMovement from "../animations/YachtScrollMovement";
import PlaneScrollMovement from "../animations/PlaneScrollMovement";
import LanternAnimation from "../animations/LanternAnimation";
import FirecrackerVideoOverlay from "../animations/FirecrackerVideoOverlay";
import BurjKhalifaVideoOverlay from "../animations/BurjKhalifaVideoOverlay";
import FutureMuseumBannerRoll from "../animations/FutureMuseumBannerRoll";
import DubaiFrameBannerRoll from "../animations/DubaiFrameBannerRoll";
import WaterBalloonAnimation from "../animations/WaterBalloonAnimation";
import NewAtlantisBannerRoll from "../animations/NewAtlantisBannerRoll";
import DesertSafariVideoPositionTracker from "../animations/DesertSafariVideoPositionTracker";
import AudioRuntime from "../audio/AudioRuntime";
import CarPassAudio from "../audio/CarPassAudio";
import MetroPassAudio from "../audio/MetroPassAudio";
import PlanePassAudio from "../audio/PlanePassAudio";
import CampfirePassAudio from "../audio/CampfirePassAudio";
import DronePassAudio from "../audio/DronePassAudio";
import OldDubaiTextAudio from "../audio/OldDubaiTextAudio";
import FrameTextAudio from "../audio/FrameTextAudio";
import SafariCampTextAudio from "../audio/SafariCampTextAudio";
import PlaneTextAudio from "../audio/PlaneTextAudio";

const MODEL_PATH = "/Models/testmodel.glb";

type DesertModelProps = {
  onFrameReady: (frame: SceneFrame) => void;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  isScrollLocked: RefObject<boolean>;
  lerpFactor: number;
  onTargetOpen?: (target: SceneLinkConfig) => boolean | void;
};

function buildNodeMap(scene: THREE.Object3D) {
  const nodes: Record<string, THREE.Object3D> = {};
  scene.traverse((child) => {
    if (child.name) nodes[child.name] = child;
  });
  return nodes;
}

function prepareScene(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((material) => {
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    });
  });
}

export default function DesertModel({
  onFrameReady,
  sceneFrame,
  scrollProgress,
  targetScrollProgress,
  isScrollLocked,
  lerpFactor,
  onTargetOpen,
}: DesertModelProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const nodes = useMemo(() => buildNodeMap(scene), [scene]);
  const turtleOnBoatRef = useRef(false);
  const turtleOnScene1CamelRef = useRef(false);
  const boatTravelProgressRef = useRef(0);
  const turtleOnCarRef = useRef(false);
  const carTravelProgressRef = useRef(0);
  const turtleReturnedFromCarRef = useRef(false);
  const turtleOnJetskiRef = useRef(false);
  const jetskiTravelProgressRef = useRef(0);
  const turtleReturnedFromJetskiRef = useRef(false);
  const turtleOnYachtRef = useRef(false);
  const yachtTravelProgressRef = useRef(0);
  const mosqueYachtTravelProgressRef = useRef(0);
  const turtleReturnedFromYachtRef = useRef(false);
  const turtleOnSafariCamelRef = useRef(false);
  const safariCamelTravelProgressRef = useRef(0);

  useLayoutEffect(() => {
    prepareScene(scene);
    onFrameReady(extractSceneFrame(scene));
  }, [scene, onFrameReady]);

  return (
    <>
      <primitive object={scene} />
      <SceneMeshLayerFix scene={scene} nodes={nodes} />
      <SafariCamelScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnSafariCamelRef={turtleOnSafariCamelRef}
        turtleOnYachtRef={turtleOnYachtRef}
        safariCamelTravelProgressRef={safariCamelTravelProgressRef}
      />
      <CamelScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        isScrollLocked={isScrollLocked}
        lerpFactor={lerpFactor}
        turtleOnBoatRef={turtleOnBoatRef}
        turtleOnScene1CamelRef={turtleOnScene1CamelRef}
        boatTravelProgressRef={boatTravelProgressRef}
        turtleOnCarRef={turtleOnCarRef}
        carTravelProgressRef={carTravelProgressRef}
        turtleReturnedFromCarRef={turtleReturnedFromCarRef}
        turtleOnJetskiRef={turtleOnJetskiRef}
        turtleOnYachtRef={turtleOnYachtRef}
        jetskiTravelProgressRef={jetskiTravelProgressRef}
        turtleReturnedFromJetskiRef={turtleReturnedFromJetskiRef}
        yachtTravelProgressRef={yachtTravelProgressRef}
        mosqueYachtTravelProgressRef={mosqueYachtTravelProgressRef}
        turtleReturnedFromYachtRef={turtleReturnedFromYachtRef}
        turtleOnSafariCamelRef={turtleOnSafariCamelRef}
        safariCamelTravelProgressRef={safariCamelTravelProgressRef}
      />
      <CamelWalkAnimation
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnScene1CamelRef={turtleOnScene1CamelRef}
      />
      <SafariCamelWalkAnimation
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        turtleOnSafariCamelRef={turtleOnSafariCamelRef}
        turtleOnYachtRef={turtleOnYachtRef}
      />
      <AudioRuntime />
      <MetroTrainAnimation scene={scene} nodes={nodes} />
      <CarAnimation scene={scene} nodes={nodes} />
      <CarScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnCarRef={turtleOnCarRef}
        turtleOnBoatRef={turtleOnBoatRef}
        turtleOnJetskiRef={turtleOnJetskiRef}
        turtleOnYachtRef={turtleOnYachtRef}
        carTravelProgressRef={carTravelProgressRef}
      />
      <JetskiScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnJetskiRef={turtleOnJetskiRef}
        turtleOnCarRef={turtleOnCarRef}
        turtleOnYachtRef={turtleOnYachtRef}
        jetskiTravelProgressRef={jetskiTravelProgressRef}
      />
      <BoatScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnBoatRef={turtleOnBoatRef}
        boatTravelProgressRef={boatTravelProgressRef}
        turtleOnCarRef={turtleOnCarRef}
        turtleReturnedFromCarRef={turtleReturnedFromCarRef}
        turtleOnJetskiRef={turtleOnJetskiRef}
        turtleOnYachtRef={turtleOnYachtRef}
      />
      {yachtScrollConfigs.map((settings) => (
        <YachtScrollMovement
          key={settings.carrierName}
          settings={settings}
          scene={scene}
          nodes={nodes}
          sceneFrame={sceneFrame}
          scrollProgress={scrollProgress}
          targetScrollProgress={targetScrollProgress}
          lerpFactor={lerpFactor}
          travelProgressRef={
            settings.carrierName === atlantisYachtScrollSettings.carrierName
              ? yachtTravelProgressRef
              : settings.carrierName === "YachtScrollCarrier002"
                ? mosqueYachtTravelProgressRef
                : undefined
          }
          turtleOnYachtRef={turtleOnYachtRef}
        />
      ))}
      <PlaneScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <CampfireSmoke scene={scene} nodes={nodes} />
      <SafariCampWind scene={scene} nodes={nodes} />
      <LanternAnimation scene={scene} nodes={nodes} />
      <FirecrackerVideoOverlay
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <BurjKhalifaVideoOverlay scene={scene} nodes={nodes} />
      <DubaiFrameBannerRoll
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnCarRef={turtleOnCarRef}
        carTravelProgressRef={carTravelProgressRef}
      />
      <FutureMuseumBannerRoll
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnCarRef={turtleOnCarRef}
        carTravelProgressRef={carTravelProgressRef}
      />
      <WaterBalloonAnimation
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <NewAtlantisBannerRoll
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnCarRef={turtleOnCarRef}
        carTravelProgressRef={carTravelProgressRef}
        turtleOnYachtRef={turtleOnYachtRef}
        yachtTravelProgressRef={yachtTravelProgressRef}
      />
      <DesertSafariVideoPositionTracker
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
      />
      <SceneObjectLinks scene={scene} nodes={nodes} onTargetOpen={onTargetOpen} />
      <CloudAnimation scene={scene} nodes={nodes} />
      <DroneAnimation scene={scene} nodes={nodes} />
      <BirdAnimation scene={scene} nodes={nodes} />
      <AinAnimation scene={scene} nodes={nodes} />
      <DolphinTextAnimation scene={scene} nodes={nodes} />
      <CarPassAudio scene={scene} nodes={nodes} />
      <MetroPassAudio scene={scene} nodes={nodes} />
      <PlanePassAudio scene={scene} nodes={nodes} />
      <CampfirePassAudio scene={scene} nodes={nodes} />
      <DronePassAudio scene={scene} nodes={nodes} />
      <OldDubaiTextAudio scene={scene} nodes={nodes} />
      <FrameTextAudio scene={scene} nodes={nodes} />
      <SafariCampTextAudio scene={scene} nodes={nodes} />
      <PlaneTextAudio scene={scene} nodes={nodes} />
    </>
  );
}

useGLTF.preload(MODEL_PATH);
