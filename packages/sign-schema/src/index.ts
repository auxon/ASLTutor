import { z } from 'zod';

export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const NMMSchema = z.object({
  brows: z.string().optional(),
  mouth: z.string().optional(),
  head: z.string().optional(),
});

export const HandshapesSchema = z.object({
  left: z.string().optional(),
  right: z.string().optional(),
});

export const ASLSignClipSchema = z.object({
  id: z.string(),
  gloss: z.string(),
  english: z.array(z.string()),
  category: z.string(),
  difficulty: DifficultySchema,
  clipUrl: z.string(),
  duration: z.number().positive(),
  handshapes: HandshapesSchema,
  palmOrientation: z.string(),
  location: z.string(),
  movement: z.string(),
  nmm: NMMSchema.optional(),
  variants: z.array(z.string()).optional(),
  regionalNotes: z.string().optional(),
  videoUrl: z.string().optional(),
});

export const BoneRotationSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const HandPoseSchema = z.object({
  wrist: BoneRotationSchema.optional(),
  thumbCmc: BoneRotationSchema.optional(),
  thumbMcp: BoneRotationSchema.optional(),
  thumbIp: BoneRotationSchema.optional(),
  indexMcp: BoneRotationSchema.optional(),
  indexPip: BoneRotationSchema.optional(),
  indexDip: BoneRotationSchema.optional(),
  middleMcp: BoneRotationSchema.optional(),
  middlePip: BoneRotationSchema.optional(),
  middleDip: BoneRotationSchema.optional(),
  ringMcp: BoneRotationSchema.optional(),
  ringPip: BoneRotationSchema.optional(),
  ringDip: BoneRotationSchema.optional(),
  pinkyMcp: BoneRotationSchema.optional(),
  pinkyPip: BoneRotationSchema.optional(),
  pinkyDip: BoneRotationSchema.optional(),
  position: z.tuple([z.number(), z.number(), z.number()]).optional(),
  rotation: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

export const SignKeyframeSchema = z.object({
  t: z.number().min(0).max(1),
  leftHand: HandPoseSchema.optional(),
  rightHand: HandPoseSchema.optional(),
  handshape: z.string().optional(),
});

export const SignAnimationSchema = z.object({
  id: z.string(),
  gloss: z.string(),
  duration: z.number().positive(),
  keyframes: z.array(SignKeyframeSchema).min(1),
});

export const QuizOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  signId: z.string().optional(),
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['receptive', 'expressive', 'multiple-choice']),
  prompt: z.string(),
  correctSignId: z.string(),
  options: z.array(QuizOptionSchema).optional(),
  hint: z.string().optional(),
});

export const LessonStepSchema = z.object({
  id: z.string(),
  type: z.enum(['intro', 'watch', 'breakdown', 'quiz', 'practice', 'review']),
  title: z.string(),
  content: z.string().optional(),
  signIds: z.array(z.string()).optional(),
  cultureTip: z.string().optional(),
  questions: z.array(QuizQuestionSchema).optional(),
});

export const LessonModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  estimatedMinutes: z.number(),
  objectives: z.array(z.string()),
  steps: z.array(LessonStepSchema),
  signIds: z.array(z.string()),
});

export const DictionarySchema = z.object({
  version: z.string(),
  signs: z.array(ASLSignClipSchema),
  animations: z.array(SignAnimationSchema),
});

export const LessonsSchema = z.object({
  version: z.string(),
  modules: z.array(LessonModuleSchema),
});

export type Difficulty = z.infer<typeof DifficultySchema>;
export type NMM = z.infer<typeof NMMSchema>;
export type Handshapes = z.infer<typeof HandshapesSchema>;
export type ASLSignClip = z.infer<typeof ASLSignClipSchema>;
export type BoneRotation = z.infer<typeof BoneRotationSchema>;
export type HandPose = z.infer<typeof HandPoseSchema>;
export type SignKeyframe = z.infer<typeof SignKeyframeSchema>;
export type SignAnimation = z.infer<typeof SignAnimationSchema>;
export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type LessonStep = z.infer<typeof LessonStepSchema>;
export type LessonModule = z.infer<typeof LessonModuleSchema>;
export type Dictionary = z.infer<typeof DictionarySchema>;
export type Lessons = z.infer<typeof LessonsSchema>;

export const HANDshape_LABELS: Record<string, string> = {
  A: 'Closed fist, thumb alongside',
  B: 'Flat hand, fingers together, thumb across palm',
  C: 'Curved hand like letter C',
  D: 'Index up, other fingers touch thumb',
  E: 'Fingers curled down, thumb across',
  F: 'OK handshape — thumb and index circle',
  G: 'Index and thumb point sideways',
  H: 'Index and middle extended sideways',
  I: 'Pinky extended, other fingers in fist',
  J: 'Pinky traces J motion',
  K: 'Index and middle in V, thumb between',
  L: 'Thumb and index form L',
  M: 'Three fingers over thumb in fist',
  N: 'Two fingers over thumb in fist',
  O: 'All fingertips touch, forming O',
  P: 'K handshape pointing down',
  Q: 'G handshape pointing down',
  R: 'Crossed index and middle fingers',
  S: 'Closed fist, thumb over fingers',
  T: 'Thumb between index and middle in fist',
  U: 'Index and middle together, extended',
  V: 'Index and middle spread in V',
  W: 'Three fingers up (thumb, index, middle)',
  X: 'Index finger hooked/bent',
  Y: 'Thumb and pinky extended',
  '5': 'All fingers spread open',
  '0': 'All fingers and thumb touch forming O',
  '1': 'Index finger extended',
  flatO: 'Flat O — fingertips touch, slightly open',
  claw: '5-hand with bent fingers',
  bentB: 'B-hand with bent fingers',
};

export const CATEGORIES = [
  'fingerspelling',
  'greetings',
  'numbers',
  'family',
  'colors',
  'questions',
  'daily',
] as const;

export type Category = (typeof CATEGORIES)[number];
