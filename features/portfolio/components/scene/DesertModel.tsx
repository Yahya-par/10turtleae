import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { extractSceneFrame, type SceneFrame } from "@features/portfolio/components/camera/CameraPath";
import { yachtScrollConfigs, atlantisYachtScrollSettings } from "@features/portfolio/config/yachtScrollSettings";
import MetroTrainAnimation from "../animations/MetroTrainAnimation";
import CarAnimation from "../animations/CarAnimation";
import CloudAnimation from "../animations/CloudAnimation";
import AinAnimation from "../animations/AinAnimation";
import CampfireSmoke from "../animations/CampfireSmoke";
import SafariCampWind from "../animations/SafariCampWind";
import CamelWalkAnimation from "../animations/CamelWalkAnimation";
import SceneObjectLinks from "./SceneObjectLinks";
import CamelScrollMovement from "../animations/CamelScrollMovement";
import BirdAnimation from "../animations/BirdAnimation";
import BoatScrollMovement from "../animations/BoatScrollMovement";
import CarScrollMovement from "../animations/CarScrollMovement";
import JetskiScrollMovement from "../animations/JetskiScrollMovement";
import YachtScrollMovement from "../animations/YachtScrollMovement";
import PlaneScrollMovement from "../animations/PlaneScrollMovement";
import LanternAnimation from "../animations/LanternAnimation";

const MODEL_PATH = "/Models/Modelv1.glb";

type DesertModelProps = {
  onFrameReady: (frame: SceneFrame) => void;
  sceneFrame: SceneFrame | null;
  scrollProgress: RefObject<number>;
  targetScrollProgress: RefObject<number>;
  lerpFactor: number;
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
  lerpFactor,
}: DesertModelProps) {
  const { scene } = useGLTF(MODEL_PATH);
  const nodes = useMemo(() => buildNodeMap(scene), [scene]);
  const turtleOnBoatRef = useRef(false);
  const boatTravelProgressRef = useRef(0);
  const turtleOnCarRef = useRef(false);
  const carTravelProgressRef = useRef(0);
  const turtleReturnedFromCarRef = useRef(false);
  const turtleOnJetskiRef = useRef(false);
  const jetskiTravelProgressRef = useRef(0);
  const turtleReturnedFromJetskiRef = useRef(false);
  const turtleOnYachtRef = useRef(false);
  const yachtTravelProgressRef = useRef(0);
  const turtleReturnedFromYachtRef = useRef(false);

  useLayoutEffect(() => {
    prepareScene(scene);
    onFrameReady(extractSceneFrame(scene));
  }, [scene, onFrameReady]);

  return (
    <>
      <primitive object={scene} />
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
      <CamelScrollMovement
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
        turtleOnBoatRef={turtleOnBoatRef}
        boatTravelProgressRef={boatTravelProgressRef}
        turtleOnCarRef={turtleOnCarRef}
        carTravelProgressRef={carTravelProgressRef}
        turtleReturnedFromCarRef={turtleReturnedFromCarRef}
        turtleOnJetskiRef={turtleOnJetskiRef}
        turtleOnYachtRef={turtleOnYachtRef}
        jetskiTravelProgressRef={jetskiTravelProgressRef}
        turtleReturnedFromJetskiRef={turtleReturnedFromJetskiRef}
        yachtTravelProgressRef={yachtTravelProgressRef}
        turtleReturnedFromYachtRef={turtleReturnedFromYachtRef}
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
              : undefined
          }
          turtleOnYachtRef={
            settings.carrierName === atlantisYachtScrollSettings.carrierName
              ? turtleOnYachtRef
              : undefined
          }
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
      <CamelWalkAnimation
        scene={scene}
        nodes={nodes}
        sceneFrame={sceneFrame}
        scrollProgress={scrollProgress}
        targetScrollProgress={targetScrollProgress}
        lerpFactor={lerpFactor}
      />
      <SceneObjectLinks scene={scene} nodes={nodes} />
      <CloudAnimation scene={scene} nodes={nodes} />
      <BirdAnimation scene={scene} nodes={nodes} />
      <AinAnimation scene={scene} nodes={nodes} />
    </>
  );
}

useGLTF.preload(MODEL_PATH);
