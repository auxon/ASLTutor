import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { FlatHandPose } from '@/engine/hand-poses';

interface FingerSegmentProps {
  length: number;
  radius: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  color?: string;
  children?: ReactNode;
}

function FingerSegment({
  length,
  radius,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  color = '#e8b4a0',
  children,
}: FingerSegmentProps) {
  return (
    <group rotation={[rotationX, rotationY, rotationZ]}>
      <mesh position={[0, length / 2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[radius, length, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </mesh>
      <group position={[0, length, 0]}>{children}</group>
    </group>
  );
}

interface FingerChainProps {
  segments: [number, number, number];
  radii: [number, number, number];
  flex: [number, number, number];
  spread?: number;
  color?: string;
}

function FingerChain({ segments, radii, flex, spread = 0, color }: FingerChainProps) {
  return (
    <group rotation={[0, spread, 0]}>
      <FingerSegment length={segments[0]} radius={radii[0]} rotationX={flex[0]} color={color}>
        <FingerSegment length={segments[1]} radius={radii[1]} rotationX={flex[1]} color={color}>
          <FingerSegment length={segments[2]} radius={radii[2]} rotationX={flex[2]} color={color} />
        </FingerSegment>
      </FingerSegment>
    </group>
  );
}

export interface HandRigProps {
  pose: FlatHandPose;
  mirrored?: boolean;
  position?: [number, number, number];
  color?: string;
}

export function HandRig({
  pose,
  mirrored = false,
  position = [0, 0, 0],
  color = '#e8b4a0',
}: HandRigProps) {
  const groupRef = useRef<THREE.Group>(null);

  const wristRotX = pose.wristRotX ?? 0;
  const wristRotY = pose.wristRotY ?? 0;
  const wristRotZ = pose.wristRotZ ?? 0;
  const mirror = mirrored ? -1 : 1;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.set(wristRotX, wristRotY * mirror, wristRotZ * mirror);
    }
  });

  const palmColor = color;
  const nailColor = '#d4a090';

  return (
    <group ref={groupRef} position={position} scale={[mirror, 1, 1]}>
      {/* Palm */}
      <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.09, 0.05, 0.025]} />
        <meshStandardMaterial color={palmColor} roughness={0.55} />
      </mesh>

      {/* Thumb */}
      <group
        position={[0.045, 0.02, 0.01]}
        rotation={[pose.thumbCmc ?? 0, (pose.thumbCmcY ?? 0) * mirror, 0]}
      >
        <FingerSegment
          length={0.025}
          radius={0.009}
          rotationX={pose.thumbMcp ?? 0}
          color={nailColor}
        >
          <FingerSegment
            length={0.022}
            radius={0.008}
            rotationX={pose.thumbIp ?? 0}
            color={nailColor}
          />
        </FingerSegment>
      </group>

      {/* Index finger */}
      <group position={[0.035, 0.05, 0]}>
        <FingerChain
          segments={[0.028, 0.022, 0.018]}
          radii={[0.008, 0.007, 0.006]}
          flex={[pose.indexMcp ?? 0, pose.indexPip ?? 0, pose.indexDip ?? 0]}
          spread={pose.indexMcpSpread ?? 0}
          color={palmColor}
        />
      </group>

      {/* Middle finger */}
      <group position={[0.012, 0.052, 0]}>
        <FingerChain
          segments={[0.032, 0.025, 0.02]}
          radii={[0.008, 0.007, 0.006]}
          flex={[pose.middleMcp ?? 0, pose.middlePip ?? 0, pose.middleDip ?? 0]}
          color={palmColor}
        />
      </group>

      {/* Ring finger */}
      <group position={[-0.012, 0.05, 0]}>
        <FingerChain
          segments={[0.03, 0.024, 0.019]}
          radii={[0.0075, 0.0065, 0.0055]}
          flex={[pose.ringMcp ?? 0, pose.ringPip ?? 0, pose.ringDip ?? 0]}
          spread={pose.ringMcpSpread ?? 0}
          color={palmColor}
        />
      </group>

      {/* Pinky */}
      <group position={[-0.035, 0.045, 0]}>
        <FingerChain
          segments={[0.022, 0.018, 0.014]}
          radii={[0.006, 0.0055, 0.005]}
          flex={[pose.pinkyMcp ?? 0, pose.pinkyPip ?? 0, pose.pinkyDip ?? 0]}
          spread={pose.pinkyMcpSpread ?? 0}
          color={palmColor}
        />
      </group>

      {/* Forearm stub */}
      <mesh position={[0, -0.04, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.08, 12]} />
        <meshStandardMaterial color={palmColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function HandPair({
  leftPose,
  rightPose,
  showLeft = true,
  showRight = true,
}: {
  leftPose: FlatHandPose;
  rightPose: FlatHandPose;
  showLeft?: boolean;
  showRight?: boolean;
}) {
  return (
    <group>
      {showRight && (
        <HandRig pose={rightPose} mirrored={false} position={[0.12, -0.05, 0]} color="#e8b4a0" />
      )}
      {showLeft && (
        <HandRig pose={leftPose} mirrored={true} position={[-0.12, -0.05, 0]} color="#ddb09c" />
      )}
    </group>
  );
}
