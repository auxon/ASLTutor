import { create } from 'zustand';
import type { ASLSignClip, SignAnimation } from '@asl/sign-schema';

export type CameraPreset = 'front' | 'side' | 'top' | 'free';

interface SignPlayerState {
  currentSign: ASLSignClip | null;
  currentAnimation: SignAnimation | null;
  isPlaying: boolean;
  speed: number;
  loop: boolean;
  progress: number;
  cameraPreset: CameraPreset;
  showLeftHand: boolean;
  showRightHand: boolean;
  setSign: (sign: ASLSignClip | null, animation: SignAnimation | null) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  setProgress: (progress: number) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  toggleHand: (hand: 'left' | 'right') => void;
  reset: () => void;
}

export const useSignPlayerStore = create<SignPlayerState>((set) => ({
  currentSign: null,
  currentAnimation: null,
  isPlaying: false,
  speed: 1,
  loop: false,
  progress: 0,
  cameraPreset: 'front',
  showLeftHand: true,
  showRightHand: true,
  setSign: (sign, animation) =>
    set({
      currentSign: sign,
      currentAnimation: animation,
      progress: 0,
      isPlaying: false,
    }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  setLoop: (loop) => set({ loop }),
  setProgress: (progress) => set({ progress }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  toggleHand: (hand) =>
    set((state) =>
      hand === 'left'
        ? { showLeftHand: !state.showLeftHand }
        : { showRightHand: !state.showRightHand },
    ),
  reset: () =>
    set({
      currentSign: null,
      currentAnimation: null,
      isPlaying: false,
      speed: 1,
      loop: false,
      progress: 0,
      cameraPreset: 'front',
    }),
}));

interface OnboardingState {
  completed: boolean;
  currentStep: number;
  complete: () => void;
  setStep: (step: number) => void;
  reset: () => void;
}

const ONBOARDING_KEY = 'signflow-onboarding-complete';

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) === 'true',
  currentStep: 0,
  complete: () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    set({ completed: true, currentStep: 0 });
  },
  setStep: (currentStep) => set({ currentStep }),
  reset: () => {
    localStorage.removeItem(ONBOARDING_KEY);
    set({ completed: false, currentStep: 0 });
  },
}));

interface PracticeState {
  targetSignId: string | null;
  isActive: boolean;
  lastScore: number | null;
  feedback: string[];
  setTarget: (signId: string | null) => void;
  setActive: (active: boolean) => void;
  setScore: (score: number, feedback: string[]) => void;
  reset: () => void;
}

export const usePracticeStore = create<PracticeState>((set) => ({
  targetSignId: null,
  isActive: false,
  lastScore: null,
  feedback: [],
  setTarget: (targetSignId) => set({ targetSignId }),
  setActive: (isActive) => set({ isActive }),
  setScore: (lastScore, feedback) => set({ lastScore, feedback }),
  reset: () => set({ targetSignId: null, isActive: false, lastScore: null, feedback: [] }),
}));
