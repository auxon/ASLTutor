import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { HandPair } from './HandRig';
import { useSignPlayerStore, type CameraPreset } from '@/stores/sign-player-store';
import { sampleAnimation } from '@/engine/sign-player';
import { getDefaultPose, type FlatHandPose } from '@/engine/hand-poses';
import type { SignAnimation } from '@asl/sign-schema';

const CAMERA_PRESETS: Record<CameraPreset, [THREE.Vector3Tuple, THREE.Vector3Tuple]> = {
  front: [[0, 0.05, 0.45], [0, 0.05, 0]],
  side: [[0.45, 0.05, 0], [0, 0.05, 0]],
  top: [[0, 0.5, 0.05], [0, 0.05, 0]],
  free: [[0.2, 0.15, 0.35], [0, 0.05, 0]],
};

function CameraController() {
  const { cameraPreset } = useSignPlayerStore();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  useEffect(() => {
    const [pos, target] = CAMERA_PRESETS[cameraPreset];
    camera.position.set(...pos);
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  }, [cameraPreset, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={0.2}
      maxDistance={1.2}
      target={[0, 0.05, 0]}
    />
  );
}

function AnimatedHands({ animation }: { animation: SignAnimation | null }) {
  const [poses, setPoses] = useState<{ left: FlatHandPose; right: FlatHandPose }>({
    left: getDefaultPose(),
    right: getDefaultPose(),
  });
  const progressRef = useRef(0);

  const { isPlaying, speed, loop, progress, setProgress, showLeftHand, showRightHand } =
    useSignPlayerStore();

  useEffect(() => {
    progressRef.current = progress;
    if (animation) {
      setPoses(sampleAnimation(animation, progress));
    }
  }, [progress, animation]);

  useFrame((_, delta) => {
    if (!animation) return;

    if (isPlaying) {
      progressRef.current += (delta * speed) / animation.duration;
      if (progressRef.current >= 1) {
        if (loop) {
          progressRef.current = progressRef.current % 1;
        } else {
          progressRef.current = 1;
          useSignPlayerStore.getState().setPlaying(false);
        }
      }
      setProgress(progressRef.current);
      setPoses(sampleAnimation(animation, progressRef.current));
    }
  });

  return (
    <HandPair
      leftPose={poses.left}
      rightPose={poses.right}
      showLeft={showLeftHand}
      showRight={showRightHand}
    />
  );
}

function SceneContent({ animation }: { animation: SignAnimation | null }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
      <directionalLight position={[-2, 1, -1]} intensity={0.4} />
      <AnimatedHands animation={animation} />
      <ContactShadows position={[0, -0.12, 0]} opacity={0.4} scale={0.8} blur={2} />
      <Environment preset="studio" />
      <CameraController />
    </>
  );
}

interface SignPlayerCanvasProps {
  animation: SignAnimation | null;
  className?: string;
}

export function SignPlayerCanvas({ animation, className }: SignPlayerCanvasProps) {
  return (
    <div className={className} role="img" aria-label="3D ASL hand demonstration">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 45, near: 0.1, far: 10, position: [0, 0.05, 0.45] }}
        frameloop="always"
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <SceneContent animation={animation} />
        </Suspense>
      </Canvas>
    </div>
  );
}
