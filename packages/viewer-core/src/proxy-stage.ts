import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type WebGLRenderer,
} from "three";
import type {
  ApplyGarmentsInput,
  FreestyleViewerViewportInput,
  LoadAvatarInput,
  ViewerCameraPreset,
} from "./FreestyleViewer.js";
import { createViewerMaterial, createViewerSkinMaterial, resolveProxyMaterialClass, type ViewerMaterialClass } from "./material-system.js";

export type ViewerProxyGarmentKind =
  | "hair"
  | "top"
  | "outerwear"
  | "bottom"
  | "shoes"
  | "accessory"
  | "unknown";

type ViewerCameraOrbitState = {
  radius: number;
  polar: number;
  azimuth: number;
  targetY: number;
};

export const viewerProxyOrbitLimits = {
  min: 2.1,
  max: 5.8,
};

export const viewerProxyPolarLimits = {
  min: 0.55,
  max: 1.45,
};

const proxyBodyTone = {
  female: "#e4b39a",
  male: "#d5b091",
  default: "#dfb199",
} as const;

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

export const inferProxyGarmentKind = (garmentId: string): ViewerProxyGarmentKind => {
  const normalized = garmentId.toLowerCase();

  if (normalized.includes("hair")) return "hair";
  if (normalized.includes("shoe") || normalized.includes("sandal") || normalized.includes("boot")) return "shoes";
  if (normalized.includes("accessory") || normalized.includes("hat") || normalized.includes("bag")) return "accessory";
  if (normalized.includes("outer") || normalized.includes("coat") || normalized.includes("jacket")) return "outerwear";
  if (
    normalized.includes("bottom") ||
    normalized.includes("pant") ||
    normalized.includes("skirt") ||
    normalized.includes("short") ||
    normalized.includes("denim")
  ) {
    return "bottom";
  }
  if (normalized.includes("top") || normalized.includes("shirt") || normalized.includes("tee") || normalized.includes("crop")) {
    return "top";
  }

  return "unknown";
};

export const resolveProxyCameraOrbit = (preset: ViewerCameraPreset): ViewerCameraOrbitState => {
  switch (preset) {
    case "full-body-three-quarter":
      return {
        radius: 7.1,
        polar: 1.02,
        azimuth: -0.52,
        targetY: 1.28,
      };
    case "full-body-front-tight":
      return {
        radius: 5.7,
        polar: 1.08,
        azimuth: 0,
        targetY: 1.34,
      };
    case "full-body-front":
    default:
      return {
        radius: 6.8,
        polar: 1.04,
        azimuth: 0,
        targetY: 1.3,
      };
  }
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const disposeGroupChildren = (group: Group) => {
  group.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
      return;
    }

    child.material.dispose();
  });
  group.clear();
};

type ViewerProxyStageOptions = {
  canvas: HTMLCanvasElement;
  requestRender: (reason?: string) => void;
};

export class ViewerProxyStage {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(34, 1, 0.1, 100);

  private readonly avatarGroup = new Group();
  private readonly garmentGroup = new Group();
  private readonly requestRender: (reason?: string) => void;
  private readonly canvas: HTMLCanvasElement;

  private orbit = resolveProxyCameraOrbit("full-body-front");
  private pointerDrag: { active: boolean; x: number; y: number } = {
    active: false,
    x: 0,
    y: 0,
  };

  constructor({ canvas, requestRender }: ViewerProxyStageOptions) {
    this.canvas = canvas;
    this.requestRender = requestRender;

    this.scene.background = new Color("#101820");
    this.scene.add(this.avatarGroup);
    this.scene.add(this.garmentGroup);
    this.scene.add(this.createGround());
    this.scene.add(new AmbientLight("#ffffff", 0.85));
    this.scene.add(new HemisphereLight("#dbe7ff", "#1a1f28", 0.65));

    const keyLight = new DirectionalLight("#fff6e1", 1.5);
    keyLight.position.set(3.2, 5.5, 4.8);
    this.scene.add(keyLight);

    this.applyOrbit();
    this.attachInput();
  }

  setViewport(viewport: FreestyleViewerViewportInput) {
    this.camera.aspect = Math.max(1, viewport.widthCssPx) / Math.max(1, viewport.heightCssPx);
    this.camera.updateProjectionMatrix();
  }

  setBackgroundColor(color?: string) {
    this.scene.background = new Color(color ?? "#101820");
  }

  setCameraPreset(preset: ViewerCameraPreset) {
    this.orbit = resolveProxyCameraOrbit(preset);
    this.applyOrbit();
  }

  syncAvatar(input: LoadAvatarInput) {
    disposeGroupChildren(this.avatarGroup);

    const appearance = input.appearance as
      | {
          gender?: "female" | "male" | null;
          bodyFrame?: "balanced" | "athletic" | "soft" | "curvy" | null;
        }
      | undefined;

    const toneKey = appearance?.gender === "male" ? "male" : appearance?.gender === "female" ? "female" : "default";
    const bodyMaterial = createViewerSkinMaterial(proxyBodyTone[toneKey]);

    const torsoWidth =
      appearance?.bodyFrame === "athletic"
        ? 0.56
        : appearance?.bodyFrame === "curvy"
          ? 0.58
          : appearance?.bodyFrame === "soft"
            ? 0.55
            : 0.53;
    const hipWidth = appearance?.bodyFrame === "curvy" ? 0.64 : appearance?.bodyFrame === "athletic" ? 0.56 : 0.59;

    const torso = new Mesh(new CylinderGeometry(torsoWidth, hipWidth, 1.32, 24), bodyMaterial);
    torso.position.set(0, 1.37, 0);

    const head = new Mesh(new SphereGeometry(0.28, 24, 24), bodyMaterial);
    head.position.set(0, 2.34, 0);

    const leftLeg = new Mesh(new CylinderGeometry(0.14, 0.12, 1.08, 16), bodyMaterial);
    leftLeg.position.set(-0.16, 0.54, 0);

    const rightLeg = new Mesh(new CylinderGeometry(0.14, 0.12, 1.08, 16), bodyMaterial);
    rightLeg.position.set(0.16, 0.54, 0);

    const leftArm = new Mesh(new CylinderGeometry(0.1, 0.085, 0.92, 16), bodyMaterial);
    leftArm.position.set(-(torsoWidth + 0.18), 1.47, 0);
    leftArm.rotation.z = 0.2;

    const rightArm = new Mesh(new CylinderGeometry(0.1, 0.085, 0.92, 16), bodyMaterial);
    rightArm.position.set(torsoWidth + 0.18, 1.47, 0);
    rightArm.rotation.z = -0.2;

    this.avatarGroup.add(torso, head, leftLeg, rightLeg, leftArm, rightArm);
  }

  syncGarments(garments: ApplyGarmentsInput, selectedItemId?: string | null) {
    disposeGroupChildren(this.garmentGroup);

    garments.forEach((item, index) => {
      const kind = inferProxyGarmentKind(item.garmentId);
      const highlighted = selectedItemId === item.garmentId;
      const materialClass = resolveProxyMaterialClass(item.garmentId, kind);
      const material = createViewerMaterial(materialClass, {
        color: resolveProxyMaterialColor(item.garmentId, materialClass),
        highlighted,
      });

      const proxy = this.createGarmentProxy(kind, material, index);
      proxy.name = item.garmentId;
      this.garmentGroup.add(proxy);
    });
  }

  syncQualityMode(mode: "low" | "balanced" | "high") {
    this.camera.fov = mode === "low" ? 36 : mode === "high" ? 32 : 34;
    this.camera.updateProjectionMatrix();
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.detachInput();
    disposeGroupChildren(this.avatarGroup);
    disposeGroupChildren(this.garmentGroup);
    this.scene.clear();
  }

  private applyOrbit() {
    const horizontalRadius = Math.sin(this.orbit.polar) * this.orbit.radius;
    const x = Math.sin(this.orbit.azimuth) * horizontalRadius;
    const y = Math.cos(this.orbit.polar) * this.orbit.radius + this.orbit.targetY;
    const z = Math.cos(this.orbit.azimuth) * horizontalRadius;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(new Vector3(0, this.orbit.targetY, 0));
  }

  private createGround() {
    const ground = new Mesh(
      new PlaneGeometry(20, 20),
      new MeshStandardMaterial({
        color: "#1c2630",
        roughness: 1,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    return ground;
  }

  private createGarmentProxy(kind: ViewerProxyGarmentKind, material: MeshStandardMaterial, index: number) {
    switch (kind) {
      case "hair": {
        const hair = new Mesh(new SphereGeometry(0.36, 18, 18), material);
        hair.position.set(0, 2.42, 0);
        hair.scale.set(1, 0.7, 1);
        return hair;
      }
      case "top": {
        const top = new Mesh(new CylinderGeometry(0.63, 0.68, 0.94, 20), material);
        top.position.set(0, 1.42, 0);
        return top;
      }
      case "outerwear": {
        const outerwear = new Mesh(new CylinderGeometry(0.71, 0.76, 1.1, 20), material);
        outerwear.position.set(0, 1.36, 0);
        return outerwear;
      }
      case "bottom": {
        const bottom = new Group();

        const leftLeg = new Mesh(new CylinderGeometry(0.19, 0.18, 0.98, 16), material);
        leftLeg.position.set(-0.17, 0.62, 0);

        const rightLeg = new Mesh(new CylinderGeometry(0.19, 0.18, 0.98, 16), material);
        rightLeg.position.set(0.17, 0.62, 0);

        const waist = new Mesh(new CylinderGeometry(0.58, 0.63, 0.34, 20), material);
        waist.position.set(0, 1.09, 0);

        bottom.add(leftLeg, rightLeg, waist);
        return bottom;
      }
      case "shoes": {
        const shoes = new Group();

        const leftShoe = new Mesh(new BoxGeometry(0.34, 0.16, 0.62), material);
        leftShoe.position.set(-0.16, 0.08, 0.08);

        const rightShoe = new Mesh(new BoxGeometry(0.34, 0.16, 0.62), material);
        rightShoe.position.set(0.16, 0.08, 0.08);

        shoes.add(leftShoe, rightShoe);
        return shoes;
      }
      case "accessory": {
        const accessory = new Mesh(new TorusGeometry(0.24, 0.04, 12, 24), material);
        accessory.position.set(0, 2.02 + index * 0.02, 0);
        accessory.rotation.x = Math.PI / 2;
        return accessory;
      }
      case "unknown":
      default: {
        const unknown = new Mesh(new BoxGeometry(0.48, 0.48, 0.48), material);
        unknown.position.set(0, 1.18 + index * 0.12, 0);
        return unknown;
      }
    }
  }

  private attachInput() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointerleave", this.handlePointerUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  private detachInput() {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointerleave", this.handlePointerUp);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.pointerDrag = {
      active: true,
      x: event.clientX,
      y: event.clientY,
    };
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.pointerDrag.active) {
      return;
    }

    const deltaX = event.clientX - this.pointerDrag.x;
    const deltaY = event.clientY - this.pointerDrag.y;

    this.pointerDrag = {
      active: true,
      x: event.clientX,
      y: event.clientY,
    };

    this.orbit = {
      ...this.orbit,
      azimuth: this.orbit.azimuth - deltaX * 0.01,
      polar: clamp(this.orbit.polar - deltaY * 0.01, viewerProxyPolarLimits.min, viewerProxyPolarLimits.max),
    };
    this.applyOrbit();
    this.requestRender("pointer-orbit");
  };

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (!this.pointerDrag.active) {
      return;
    }

    this.pointerDrag = {
      active: false,
      x: event.clientX,
      y: event.clientY,
    };
    this.canvas.releasePointerCapture?.(event.pointerId);
  };

  private readonly handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const nextRadius = clamp(this.orbit.radius + event.deltaY * 0.002, viewerProxyOrbitLimits.min, viewerProxyOrbitLimits.max);
    if (nextRadius === this.orbit.radius) {
      return;
    }

    this.orbit = {
      ...this.orbit,
      radius: nextRadius,
    };
    this.applyOrbit();
    this.requestRender("wheel-zoom");
  };
}

const resolveProxyMaterialColor = (garmentId: string, materialClass: ViewerMaterialClass) => {
  const seed = hashString(garmentId);
  const paletteByClass: Record<ViewerMaterialClass, readonly string[]> = {
    skin: ["#dfb199"],
    hair: ["#4c3e36", "#5b4b43", "#3f352f"],
    cotton: ["#5d748d", "#6c9171", "#8c6a56"],
    denim: ["#536d8d", "#5b7798", "#4b6788"],
    leather: ["#6b4e44", "#705345", "#584034"],
    rubber: ["#4a5560", "#505c67", "#434d57"],
    knit: ["#8b6d7e", "#9a7a8c", "#7c6573"],
    silk: ["#d2c1cf", "#c8b5c4", "#dbc9d6"],
    synthetic: ["#6e7287", "#5e748a", "#687e74"],
    metal: ["#a9acb7", "#b7bbc7", "#9499a6"],
    plastic: ["#c6ccd4", "#b8c0c9", "#d1d6dd"],
  };

  const palette = paletteByClass[materialClass];
  return palette[seed % palette.length];
};
