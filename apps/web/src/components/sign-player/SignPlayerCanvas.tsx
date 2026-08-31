import { Suspense, forwardRef, useEffect, useImperativeHandle, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { HandPair } from './HandRig';
import { useSignPlayerStore, type CameraPreset } from '@/stores/sign-player-store';
import { sampleAnimation } from '@/engine/sign-player';
import { getDefaultPose, type FlatHandPose } from '@/engine/hand-poses';
import type { FrameCaptureHandle } from '@/engine/compare-card';
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

const LOOK_AT = new THREE.Vector3(0, 0.05, 0);
/** Pull the camera back so both hands (and fingertips) fit in the compare card. */
const CAPTURE_DISTANCE = 1.05;

function captureTeacherFrame(
  gl: THREE.WebGLRenderer,
  camera: THREE.Camera,
  scene: THREE.Scene,
): HTMLCanvasElement | null {
  const src = gl.domElement;
  if (!src || src.width === 0 || src.height === 0) return null;

  const origPos = camera.position.clone();
  const offset = origPos.clone().sub(LOOK_AT);
  const distance = offset.length();
  if (distance > 1e-5 && distance < CAPTURE_DISTANCE) {
    camera.position.copy(LOOK_AT).addScaledVector(offset.normalize(), CAPTURE_DISTANCE);
    camera.updateMatrixWorld();
  }
  gl.render(scene, camera);

  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (ctx) ctx.drawImage(src, 0, 0);
  camera.position.copy(origPos);
  camera.updateMatrixWorld();
  return ctx ? out : null;
}

function GlBridge({
  captureRef,
}: {
  captureRef: MutableRefObject<(() => HTMLCanvasElement | null) | null>;
}) {
  const { gl, camera, scene } = useThree();
  captureRef.current = () => captureTeacherFrame(gl, camera, scene);
  return null;
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

export const SignPlayerCanvas = forwardRef<FrameCaptureHandle, SignPlayerCanvasProps>(
  function SignPlayerCanvas({ animation, className }, ref) {
    const captureRef = useRef<(() => HTMLCanvasElement | null) | null>(null);

    useImperativeHandle(ref, () => ({
      captureFrame() {
        return captureRef.current?.() ?? null;
      },
    }));

    return (
      <div className={className} role="img" aria-label="3D ASL hand demonstration">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ fov: 45, near: 0.1, far: 10, position: [0, 0.05, 0.45] }}
          frameloop="always"
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        >
          <GlBridge captureRef={captureRef} />
          <Suspense fallback={null}>
            <SceneContent animation={animation} />
          </Suspense>
        </Canvas>
      </div>
    );
  },
);
