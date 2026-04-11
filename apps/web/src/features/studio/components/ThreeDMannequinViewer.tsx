'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Color,
  DoubleSide,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import type { GarmentProfile } from '@freestyle/contracts/domain-types';

export type MannequinMeasurements = {
  heightCm: number;
  shouldersCm: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  inseamCm: number;
};

export type ViewerGarmentLayer = {
  id: string;
  label: string;
  imageSrc: string;
  category: string;
  visible: boolean;
  fit: number;
  length: number;
  puff: number;
  accentColor?: string;
  garmentProfile?: GarmentProfile;
  measurements?: {
    chestCm?: number;
    waistCm?: number;
    hipCm?: number;
    shoulderCm?: number;
    lengthCm?: number;
    inseamCm?: number;
    hemCm?: number;
  };
};

type ThreeDMannequinViewerProps = {
  measurements: MannequinMeasurements;
  layers: ViewerGarmentLayer[];
  selectedLayerId: string | null;
};

type BodyDimensions = ReturnType<typeof buildBodyDimensions>;

const neutralBodyColor = new Color('#d8cfc3');
const neutralJointColor = new Color('#c2b6aa');

const buildBodyDimensions = (measurements: MannequinMeasurements) => {
  const heightScale = measurements.heightCm / 170;
  const torsoHeight = 1.08 * heightScale;
  const pelvisHeight = 0.32 * heightScale;
  const legHeight = Math.max(1.05, (measurements.inseamCm / 100) * 1.3);
  const shoulderRadius = measurements.shouldersCm / 88;
  const chestRadius = measurements.chestCm / 210;
  const waistRadius = measurements.waistCm / 240;
  const hipRadius = measurements.hipsCm / 215;

  return {
    heightScale,
    shoulderRadius,
    chestRadius,
    waistRadius,
    hipRadius,
    torsoHeight,
    pelvisHeight,
    legHeight,
    headRadius: 0.22 * heightScale,
    neckHeight: 0.12 * heightScale,
    armLength: 0.94 * heightScale,
    armRadius: 0.1 * heightScale,
    shoulderWidth: shoulderRadius * 2.1,
    torsoCenterY: 0.65 * heightScale,
    pelvisCenterY: -0.1 * heightScale,
    hipY: -0.22 * heightScale,
    kneeY: -0.82 * heightScale,
    groundY: -1.62 * heightScale,
  };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const sampleWidth = (
  profile: GarmentProfile | undefined,
  key: keyof GarmentProfile['widthProfile'],
  fallback: number
) => profile?.widthProfile?.[key] ?? fallback;

const getGarmentSpec = (layer: ViewerGarmentLayer, body: BodyDimensions, order: number) => {
  const category = layer.category;
  const radiusOffset = 0.03 + order * 0.018 + layer.puff * 0.06;
  const fitScale = 1 + layer.fit * 0.3;
  const lengthScale = 1 + layer.length * 0.38;
  const chestFactor = layer.measurements?.chestCm
    ? clamp(layer.measurements.chestCm / 96, 0.82, 1.36)
    : 1;
  const waistFactor = layer.measurements?.waistCm
    ? clamp(layer.measurements.waistCm / 78, 0.82, 1.4)
    : chestFactor;
  const hipFactor = layer.measurements?.hipCm
    ? clamp(layer.measurements.hipCm / 96, 0.82, 1.4)
    : waistFactor;
  const inseamFactor = layer.measurements?.inseamCm
    ? clamp(layer.measurements.inseamCm / 78, 0.72, 1.28)
    : 1;
  const lengthFactor = layer.measurements?.lengthCm
    ? clamp(layer.measurements.lengthCm / 68, 0.7, 1.35)
    : inseamFactor;

  if (category === 'bottoms') {
    const topRadius =
      (body.waistRadius + sampleWidth(layer.garmentProfile, 'waistRatio', 0.28)) * fitScale * waistFactor +
      radiusOffset;
    const bottomRadius =
      (body.hipRadius + sampleWidth(layer.garmentProfile, 'hemRatio', 0.24)) * (1 + layer.fit * 0.22) * hipFactor +
      radiusOffset;
    const height = clamp(body.legHeight * 0.72 * lengthScale * inseamFactor, 0.9, body.legHeight * 1.18);
    return {
      radiusTop: topRadius,
      radiusBottom: bottomRadius,
      height,
      y: body.hipY - height / 2 + 0.18,
      thetaLength: Math.PI * 1.46,
      thetaStart: Math.PI * 0.27,
    };
  }

  if (category === 'outerwear') {
    const radiusTop =
      (body.shoulderRadius + sampleWidth(layer.garmentProfile, 'shoulderRatio', 0.3)) * fitScale * chestFactor +
      radiusOffset +
      0.05;
    const radiusBottom =
      (body.hipRadius + sampleWidth(layer.garmentProfile, 'hemRatio', 0.28)) * fitScale * hipFactor +
      radiusOffset +
      0.05;
    const height = clamp(body.torsoHeight * 0.9 * lengthScale * lengthFactor, 0.88, body.torsoHeight * 1.32);
    return {
      radiusTop,
      radiusBottom,
      height,
      y: body.torsoCenterY - height * 0.12,
      thetaLength: Math.PI * 1.55,
      thetaStart: Math.PI * 0.22,
    };
  }

  if (category === 'shoes') {
    const height = 0.18 * body.heightScale;
    return {
      radiusTop: 0.2 * body.heightScale + radiusOffset * 0.3,
      radiusBottom: 0.25 * body.heightScale + radiusOffset * 0.3,
      height,
      y: body.groundY + 0.1,
      thetaLength: Math.PI * 0.92,
      thetaStart: Math.PI * 0.04,
    };
  }

  const radiusTop =
    (body.shoulderRadius + sampleWidth(layer.garmentProfile, 'shoulderRatio', 0.28)) * fitScale * chestFactor +
    radiusOffset;
  const radiusBottom =
    (body.waistRadius + sampleWidth(layer.garmentProfile, 'hemRatio', 0.22)) * fitScale * waistFactor +
    radiusOffset;
  const height = clamp(body.torsoHeight * 0.76 * lengthScale * lengthFactor, 0.72, body.torsoHeight * 1.06);
  return {
    radiusTop,
    radiusBottom,
    height,
    y: body.torsoCenterY - height * 0.08,
    thetaLength: Math.PI * 1.48,
    thetaStart: Math.PI * 0.24,
  };
};

function GarmentShell({
  layer,
  body,
  order,
  selected,
}: {
  layer: ViewerGarmentLayer;
  body: BodyDimensions;
  order: number;
  selected: boolean;
}) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let active = true;
    const loader = new TextureLoader();
    loader.load(
      layer.imageSrc,
      (nextTexture) => {
        nextTexture.colorSpace = SRGBColorSpace;
        if (!active) return;
        setTexture(nextTexture);
      },
      undefined,
      () => {
        if (!active) return;
        setTexture(null);
      }
    );

    return () => {
      active = false;
    };
  }, [layer.imageSrc]);

  const spec = useMemo(() => getGarmentSpec(layer, body, order), [body, layer, order]);

  return (
    <group renderOrder={order + 3}>
      <mesh position={[0, spec.y, 0]} renderOrder={order + 3}>
        <cylinderGeometry
          args={[
            spec.radiusTop,
            spec.radiusBottom,
            spec.height,
            48,
            1,
            true,
            spec.thetaStart,
            spec.thetaLength,
          ]}
        />
        <meshStandardMaterial
          transparent
          alphaTest={0.08}
          side={DoubleSide}
          color={selected ? '#ffffff' : layer.accentColor ?? '#f3eee7'}
          emissive={selected ? '#ffffff' : '#000000'}
          emissiveIntensity={selected ? 0.1 : 0}
          opacity={categoryOpacity(layer.category)}
          map={texture}
          polygonOffset
          polygonOffsetFactor={-1 - order}
        />
      </mesh>
    </group>
  );
}

function categoryOpacity(category: string) {
  if (category === 'outerwear') return 0.96;
  if (category === 'accessories') return 0.88;
  return 0.94;
}

function MannequinBody({ measurements, children }: { measurements: MannequinMeasurements; children?: ReactNode }) {
  const body = useMemo(() => buildBodyDimensions(measurements), [measurements]);

  return (
    <group position={[0, 0.1, 0]}>
      <mesh position={[0, body.torsoCenterY + body.torsoHeight * 0.72, 0]}>
        <sphereGeometry args={[body.headRadius, 32, 32]} />
        <meshStandardMaterial color={neutralBodyColor} />
      </mesh>

      <mesh position={[0, body.torsoCenterY + body.torsoHeight * 0.38, 0]}>
        <cylinderGeometry args={[body.chestRadius * 0.42, body.chestRadius * 0.48, body.neckHeight, 24]} />
        <meshStandardMaterial color={neutralJointColor} />
      </mesh>

      <mesh position={[0, body.torsoCenterY, 0]}>
        <cylinderGeometry args={[body.chestRadius, body.waistRadius, body.torsoHeight, 48]} />
        <meshStandardMaterial color={neutralBodyColor} />
      </mesh>

      <mesh position={[0, body.pelvisCenterY, 0]}>
        <cylinderGeometry args={[body.waistRadius, body.hipRadius, body.pelvisHeight, 40]} />
        <meshStandardMaterial color={neutralJointColor} />
      </mesh>

      {[-1, 1].map((direction) => (
        <group key={direction}>
          <mesh position={[direction * body.shoulderWidth * 0.53, body.torsoCenterY + body.torsoHeight * 0.33, 0]}>
            <cylinderGeometry args={[body.armRadius * 0.92, body.armRadius * 0.72, body.armLength, 24]} />
            <meshStandardMaterial color={neutralBodyColor} />
          </mesh>

          <mesh position={[direction * body.hipRadius * 0.58, body.kneeY + body.legHeight * 0.35, 0]}>
            <cylinderGeometry args={[body.hipRadius * 0.38, body.hipRadius * 0.22, body.legHeight, 28]} />
            <meshStandardMaterial color={neutralBodyColor} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, body.groundY - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 64]} />
        <meshStandardMaterial color="#efebe4" />
      </mesh>

      {children}
    </group>
  );
}

export function ThreeDMannequinViewer({
  measurements,
  layers,
  selectedLayerId,
}: ThreeDMannequinViewerProps) {
  const visibleLayers = layers.filter((layer) => layer.visible);
  const body = useMemo(() => buildBodyDimensions(measurements), [measurements]);

  return (
    <Canvas camera={{ position: [0, 1.3, 4.4], fov: 34 }}>
      <color attach="background" args={['#f6f1ea']} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[3.2, 5, 4]} intensity={1.25} />
      <directionalLight position={[-2.6, 3.5, 2]} intensity={0.45} />
      <MannequinBody measurements={measurements}>
        {visibleLayers.map((layer, index) => (
          <GarmentShell
            key={layer.id}
            layer={layer}
            body={body}
            order={index}
            selected={layer.id === selectedLayerId}
          />
        ))}
      </MannequinBody>
      <OrbitControls enablePan={false} minDistance={3.3} maxDistance={6.2} maxPolarAngle={Math.PI * 0.53} />
    </Canvas>
  );
}
