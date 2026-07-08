import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  sceneLinkSettings,
  type SceneLinkConfig,
} from "@features/portfolio/config/sceneLinkSettings";
import {
  findSceneObject,
  normalizeObjectName,
} from "@features/portfolio/utils/sceneObjectUtils";

type SceneObjectLinksProps = {
  scene: THREE.Object3D;
  nodes: Record<string, THREE.Object3D>;
  onTargetOpen?: (target: SceneLinkConfig) => boolean | void;
};

type LinkTarget = SceneLinkConfig & {
  object: THREE.Object3D;
};

function findLinkTarget(
  scene: THREE.Object3D,
  nodes: Record<string, THREE.Object3D>,
  link: SceneLinkConfig,
) {
  const byName = findSceneObject(scene, nodes, link.objectName);
  if (byName) return byName;

  const byBlenderName = findSceneObject(scene, nodes, link.blenderObjectName);
  if (byBlenderName) return byBlenderName;

  let byMaterial: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (byMaterial || !(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    if (
      materials.some((material) => {
        const materialName = material?.name ?? "";
        return (
          materialName === link.objectMaterial ||
          normalizeObjectName(materialName) ===
            normalizeObjectName(link.objectMaterial)
        );
      })
    ) {
      byMaterial = mesh;
    }
  });

  return byMaterial;
}

function resolveLinkTarget(
  hit: THREE.Object3D,
  targets: LinkTarget[],
): LinkTarget | null {
  for (const target of targets) {
    let node: THREE.Object3D | null = hit;
    while (node) {
      if (node === target.object) return target;
      node = node.parent;
    }
  }
  return null;
}

export default function SceneObjectLinks({
  scene,
  nodes,
  onTargetOpen,
}: SceneObjectLinksProps) {
  const { camera, gl } = useThree();
  const targetsRef = useRef<LinkTarget[]>([]);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHoveringRef = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);

    const targets: LinkTarget[] = [];
    for (const link of sceneLinkSettings.links) {
      const object = findLinkTarget(scene, nodes, link);
      if (!object) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[SceneObjectLinks] Missing object:", {
            id: link.id,
            objectName: link.objectName,
          });
        }
        continue;
      }

      targets.push({ ...link, object });
    }

    targetsRef.current = targets;

    if (process.env.NODE_ENV === "development" && targets.length) {
      console.info(
        "[SceneObjectLinks] Ready:",
        targets.map((target) => ({
          id: target.id,
          object: target.object.name,
          url: target.url,
        })),
      );
    }
  }, [scene, nodes]);

  useEffect(() => {
    const canvas = gl.domElement;
    const { dragThreshold } = sceneLinkSettings;

    const setHoverCursor = (hovering: boolean) => {
      if (isHoveringRef.current === hovering) return;
      isHoveringRef.current = hovering;
      canvas.style.cursor = hovering ? "pointer" : "";
    };

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getHitTarget = () => {
      const targets = targetsRef.current;
      if (!targets.length) return null;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        targets.map((target) => target.object),
        true,
      );
      if (!hits.length) return null;

      return resolveLinkTarget(hits[0].object, targets);
    };

    const onPointerDown = (event: PointerEvent) => {
      dragStartRef.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY);
      setHoverCursor(Boolean(getHitTarget()));
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;
      if (!start) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > dragThreshold) return;

      updatePointer(event.clientX, event.clientY);
      const target = getHitTarget();
      if (!target) return;

      const shouldContinue = onTargetOpen?.(target) ?? true;
      if (!shouldContinue) return;

      window.open(target.url, "_blank", "noopener,noreferrer");
    };

    const onPointerLeave = () => {
      setHoverCursor(false);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.style.cursor = "";
    };
  }, [camera, gl, onTargetOpen, pointer, raycaster]);

  return null;
}
