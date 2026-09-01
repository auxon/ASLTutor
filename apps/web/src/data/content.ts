import type { ASLSignClip, Dictionary, Lessons } from '@asl/sign-schema';
import {
  buildFingerspellingAnimations,
  buildSignAnimations,
  FINGERSPELL_LETTERS,
  FINGERSPELL_NUMBERS,
} from '@/engine/sign-player';

function makeLetterSign(letter: string): ASLSignClip {
  const isNumber = /\d/.test(letter);
  return {
    id: `sign-${letter.toLowerCase()}`,
    gloss: letter,
    english: isNumber ? [letter] : [`Letter ${letter}`],
    category: 'fingerspelling',
    difficulty: 1,
    clipUrl: `/assets/clips/${letter.toLowerCase()}.json`,
    duration: letter === 'J' || letter === 'Z' ? 2 : 1.5,
    handshapes: { right: letter },
    palmOrientation: 'Facing viewer',
    location: 'Neutral space',
    movement: letter === 'J' ? 'Trace J motion' : letter === 'Z' ? 'Trace Z motion' : 'Hold',
    regionalNotes: undefined,
  };
}

const GREETING_SIGNS: ASLSignClip[] = [
  {
    id: 'sign-hello',
    gloss: 'HELLO',
    english: ['Hello', 'Hi'],
    category: 'greetings',
    difficulty: 1,
    clipUrl: '/assets/clips/hello.json',
    duration: 2,
    handshapes: { right: '5' },
    palmOrientation: 'Facing out',
    location: 'Forehead → neutral',
    movement: 'Salute wave outward',
    nmm: { brows: 'neutral', mouth: 'slight smile optional' },
  },
  {
    id: 'sign-thank-you',
    gloss: 'THANK-YOU',
    english: ['Thank you', 'Thanks'],
    category: 'greetings',
    difficulty: 1,
    clipUrl: '/assets/clips/thank-you.json',
    duration: 2,
    handshapes: { right: '5' },
    palmOrientation: 'Facing self',
    location: 'Chin',
    movement: 'Flat hand from chin outward',
    nmm: { brows: 'slight raise', mouth: 'mouthing "thank you" optional' },
  },
  {
    id: 'sign-please',
    gloss: 'PLEASE',
    english: ['Please'],
    category: 'greetings',
    difficulty: 1,
    clipUrl: '/assets/clips/please.json',
    duration: 2,
    handshapes: { right: '5' },
    palmOrientation: 'Facing self',
    location: 'Chest',
    movement: 'Circular on chest',
  },
  {
    id: 'sign-yes',
    gloss: 'YES',
    english: ['Yes'],
    category: 'greetings',
    difficulty: 1,
    clipUrl: '/assets/clips/yes.json',
    duration: 1.5,
    handshapes: { right: 'S' },
    palmOrientation: 'Facing self',
    location: 'Neutral',
    movement: 'Nod fist up and down',
  },
  {
    id: 'sign-no',
    gloss: 'NO',
    english: ['No'],
    category: 'greetings',
    difficulty: 1,
    clipUrl: '/assets/clips/no.json',
    duration: 1.5,
    handshapes: { right: '1' },
    palmOrientation: 'Facing out',
    location: 'Neutral',
    movement: 'Snap index to thumb twice',
  },
  {
    id: 'sign-help',
    gloss: 'HELP',
    english: ['Help'],
    category: 'greetings',
    difficulty: 2,
    clipUrl: '/assets/clips/help.json',
    duration: 2,
    handshapes: { right: 'A', left: '5' },
    palmOrientation: 'Right thumb up on left palm',
    location: 'Neutral',
    movement: 'Lift together',
  },
  {
    id: 'sign-name',
    gloss: 'NAME',
    english: ['Name'],
    category: 'greetings',
    difficulty: 2,
    clipUrl: '/assets/clips/name.json',
    duration: 2,
    handshapes: { right: 'H' },
    palmOrientation: 'Facing down',
    location: 'Non-dominant palm',
    movement: 'Tap H-hands together',
  },
];

const QUESTION_SIGNS: ASLSignClip[] = [
  {
    id: 'sign-what',
    gloss: 'WHAT',
    english: ['What?'],
    category: 'questions',
    difficulty: 2,
    clipUrl: '/assets/clips/what.json',
    duration: 1.5,
    handshapes: { right: '1' },
    palmOrientation: 'Facing up',
    location: 'Neutral',
    movement: 'Wiggle index side to side',
    nmm: { brows: 'furrowed', head: 'forward tilt' },
  },
  {
    id: 'sign-who',
    gloss: 'WHO',
    english: ['Who?'],
    category: 'questions',
    difficulty: 2,
    clipUrl: '/assets/clips/who.json',
    duration: 1.5,
    handshapes: { right: '1' },
    palmOrientation: 'Facing side',
    location: 'Near mouth',
    movement: 'Circle at lips',
    nmm: { brows: 'furrowed' },
  },
  {
    id: 'sign-where',
    gloss: 'WHERE',
    english: ['Where?'],
    category: 'questions',
    difficulty: 2,
    clipUrl: '/assets/clips/where.json',
    duration: 1.5,
    handshapes: { right: '1' },
    palmOrientation: 'Facing up',
    location: 'Neutral',
    movement: 'Index side to side',
    nmm: { brows: 'furrowed' },
  },
];

const COLOR_SIGNS: ASLSignClip[] = [
  {
    id: 'sign-red',
    gloss: 'RED',
    english: ['Red'],
    category: 'colors',
    difficulty: 2,
    clipUrl: '/assets/clips/red.json',
    duration: 1.5,
    handshapes: { right: '1' },
    palmOrientation: 'Facing down',
    location: 'Lower lip',
    movement: 'Brush down chin',
  },
  {
    id: 'sign-blue',
    gloss: 'BLUE',
    english: ['Blue'],
    category: 'colors',
    difficulty: 2,
    clipUrl: '/assets/clips/blue.json',
    duration: 1.5,
    handshapes: { right: 'B' },
    palmOrientation: 'Facing out',
    location: 'Neutral',
    movement: 'Twist wrist back and forth',
  },
  {
    id: 'sign-green',
    gloss: 'GREEN',
    english: ['Green'],
    category: 'colors',
    difficulty: 2,
    clipUrl: '/assets/clips/green.json',
    duration: 1.5,
    handshapes: { right: 'G' },
    palmOrientation: 'Facing out',
    location: 'Neutral',
    movement: 'Twist G-hand back and forth',
  },
];

const DAILY_SIGNS: ASLSignClip[] = [
  {
    id: 'sign-bathroom',
    gloss: 'BATHROOM',
    english: ['Bathroom', 'Restroom', 'Toilet'],
    category: 'daily',
    difficulty: 1,
    clipUrl: '/assets/clips/bathroom.json',
    duration: 2,
    handshapes: { right: 'T' },
    palmOrientation: 'Facing out',
    location: 'Neutral space',
    movement: 'Shake T-hand side to side',
  },
];

const FAMILY_SIGNS: ASLSignClip[] = [
  {
    id: 'sign-mother',
    gloss: 'MOTHER',
    english: ['Mother', 'Mom'],
    category: 'family',
    difficulty: 2,
    clipUrl: '/assets/clips/mother.json',
    duration: 1.5,
    handshapes: { right: '5' },
    palmOrientation: 'Open B',
    location: 'Chin',
    movement: 'Tap thumb on chin',
  },
  {
    id: 'sign-father',
    gloss: 'FATHER',
    english: ['Father', 'Dad'],
    category: 'family',
    difficulty: 2,
    clipUrl: '/assets/clips/father.json',
    duration: 1.5,
    handshapes: { right: '5' },
    palmOrientation: 'Open B',
    location: 'Forehead',
    movement: 'Tap thumb on forehead',
  },
];

export function buildDictionary(): Dictionary {
  const letterSigns = FINGERSPELL_LETTERS.map(makeLetterSign);
  const numberSigns = FINGERSPELL_NUMBERS.map(makeLetterSign);
  const signs = [
    ...letterSigns,
    ...numberSigns,
    ...GREETING_SIGNS,
    ...QUESTION_SIGNS,
    ...COLOR_SIGNS,
    ...FAMILY_SIGNS,
    ...DAILY_SIGNS,
  ];

  return {
    version: '1.0.0',
    signs,
    animations: [...buildFingerspellingAnimations(), ...buildSignAnimations()],
  };
}

export function buildLessons(): Lessons {
  return {
    version: '1.0.0',
    modules: [
      {
        id: 'lesson-alphabet',
        title: 'ASL Alphabet & Fingerspelling',
        description:
          'Learn the 26 letters and 10 numbers of ASL fingerspelling — essential for names, places, and words without dedicated signs.',
        order: 1,
        estimatedMinutes: 15,
        objectives: [
          'Recognize all 26 ASL letter handshapes',
          'Produce fingerspelled letters with correct palm orientation',
          'Understand hold vs. transition segments in fingerspelling',
        ],
        signIds: [
          ...FINGERSPELL_LETTERS.map((l) => `sign-${l.toLowerCase()}`),
          ...FINGERSPELL_NUMBERS.map((n) => `sign-${n}`),
        ],
        steps: [
          {
            id: 'alphabet-intro',
            type: 'intro',
            title: 'Why Fingerspelling Matters',
            content:
              'Fingerspelling is used for names, technical terms, and words without established signs. In ASL, each letter has a specific handshape — learning them unlocks spelling any word.',
            cultureTip:
              'Deaf people often have name signs given by the community. Until you receive one, fingerspelling your name is perfectly respectful.',
          },
          {
            id: 'alphabet-watch-a-m',
            type: 'watch',
            title: 'Letters A through M',
            signIds: FINGERSPELL_LETTERS.slice(0, 13).map((l) => `sign-${l.toLowerCase()}`),
          },
          {
            id: 'alphabet-watch-n-z',
            type: 'watch',
            title: 'Letters N through Z',
            signIds: FINGERSPELL_LETTERS.slice(13).map((l) => `sign-${l.toLowerCase()}`),
            cultureTip: 'Letters J and Z include movement — watch them in slow motion.',
          },
          {
            id: 'alphabet-breakdown',
            type: 'breakdown',
            title: 'Handshape Breakdown',
            content:
              'Focus on the five parameters: handshape, palm orientation, location, movement, and non-manual markers. For fingerspelling, handshape is primary.',
            signIds: ['sign-a', 'sign-b', 'sign-c'],
          },
          {
            id: 'alphabet-quiz',
            type: 'quiz',
            title: 'Receptive Quiz',
            questions: [
              {
                id: 'q1',
                type: 'receptive',
                prompt: 'Which letter is this sign?',
                correctSignId: 'sign-a',
                options: [
                  { id: 'o1', label: 'A', signId: 'sign-a' },
                  { id: 'o2', label: 'E', signId: 'sign-e' },
                  { id: 'o3', label: 'S', signId: 'sign-s' },
                  { id: 'o4', label: 'T', signId: 'sign-t' },
                ],
              },
              {
                id: 'q2',
                type: 'receptive',
                prompt: 'Which letter uses a flat hand with thumb across the palm?',
                correctSignId: 'sign-b',
                options: [
                  { id: 'o1', label: 'B', signId: 'sign-b' },
                  { id: 'o2', label: 'D', signId: 'sign-d' },
                  { id: 'o3', label: '5', signId: 'sign-5' },
                  { id: 'o4', label: 'C', signId: 'sign-c' },
                ],
              },
              {
                id: 'q3',
                type: 'receptive',
                prompt: 'Which letter requires a tracing motion?',
                correctSignId: 'sign-j',
                options: [
                  { id: 'o1', label: 'I', signId: 'sign-i' },
                  { id: 'o2', label: 'J', signId: 'sign-j' },
                  { id: 'o3', label: 'Y', signId: 'sign-y' },
                  { id: 'o4', label: 'L', signId: 'sign-l' },
                ],
              },
            ],
          },
          {
            id: 'alphabet-practice',
            type: 'practice',
            title: 'Expressive Practice',
            content: 'Try fingerspelling each letter shown. Use the camera to get feedback on your handshape.',
            signIds: ['sign-a', 'sign-b', 'sign-c', 'sign-d', 'sign-e'],
          },
          {
            id: 'alphabet-review',
            type: 'review',
            title: 'Add to Review',
            content: 'These signs have been added to your spaced repetition queue.',
            signIds: FINGERSPELL_LETTERS.slice(0, 10).map((l) => `sign-${l.toLowerCase()}`),
          },
        ],
      },
      {
        id: 'lesson-greetings',
        title: 'Greetings & Introductions',
        description:
          'Master essential greeting signs and learn cultural norms for introductions in the Deaf community.',
        order: 2,
        estimatedMinutes: 12,
        objectives: [
          'Sign common greetings: hello, thank you, please, yes, no',
          'Introduce yourself using NAME sign',
          'Apply appropriate facial expressions with greeting signs',
        ],
        signIds: GREETING_SIGNS.map((s) => s.id),
        steps: [
          {
            id: 'greetings-intro',
            type: 'intro',
            title: 'Greeting in ASL Culture',
            content:
              'Eye contact is essential in Deaf culture. When greeting someone, maintain eye contact and sign clearly in their visual field.',
            cultureTip:
              'A common introduction pattern: HELLO, MY NAME [fingerspell], NICE MEET-YOU.',
          },
          {
            id: 'greetings-watch',
            type: 'watch',
            title: 'Core Greeting Signs',
            signIds: GREETING_SIGNS.map((s) => s.id),
          },
          {
            id: 'greetings-breakdown',
            type: 'breakdown',
            title: 'THANK-YOU Breakdown',
            content:
              'Start at the chin with an open hand (B/5 handshape), palm facing you. Move outward and slightly down. Optional: mouthing "thank you" is common but not required.',
            signIds: ['sign-thank-you'],
          },
          {
            id: 'greetings-quiz',
            type: 'quiz',
            title: 'Greeting Quiz',
            questions: [
              {
                id: 'gq1',
                type: 'receptive',
                prompt: 'Which sign means "Thank you"?',
                correctSignId: 'sign-thank-you',
                options: [
                  { id: 'o1', label: 'THANK-YOU', signId: 'sign-thank-you' },
                  { id: 'o2', label: 'PLEASE', signId: 'sign-please' },
                  { id: 'o3', label: 'HELLO', signId: 'sign-hello' },
                  { id: 'o4', label: 'HELP', signId: 'sign-help' },
                ],
              },
              {
                id: 'gq2',
                type: 'receptive',
                prompt: 'Which sign is made with an S-handshape nodding?',
                correctSignId: 'sign-yes',
                options: [
                  { id: 'o1', label: 'YES', signId: 'sign-yes' },
                  { id: 'o2', label: 'NO', signId: 'sign-no' },
                  { id: 'o3', label: 'NAME', signId: 'sign-name' },
                  { id: 'o4', label: 'HELLO', signId: 'sign-hello' },
                ],
              },
            ],
          },
          {
            id: 'greetings-practice',
            type: 'practice',
            title: 'Practice Greetings',
            signIds: ['sign-hello', 'sign-thank-you', 'sign-please'],
          },
          {
            id: 'greetings-review',
            type: 'review',
            title: 'Review Queue',
            signIds: GREETING_SIGNS.map((s) => s.id),
          },
        ],
      },
      {
        id: 'lesson-numbers',
        title: 'Numbers & Counting',
        description:
          'Learn ASL numbers 0–9 and how counting differs from fingerspelling in handshape and movement.',
        order: 3,
        estimatedMinutes: 10,
        objectives: [
          'Sign numbers 0 through 9',
          'Distinguish number handshapes from similar letters',
          'Count items using correct palm orientation',
        ],
        signIds: FINGERSPELL_NUMBERS.map((n) => `sign-${n}`),
        steps: [
          {
            id: 'numbers-intro',
            type: 'intro',
            title: 'Numbers in ASL',
            content:
              'ASL numbers 1–5 use specific handshapes. Numbers 6–9 are signed with twists near the body. Zero uses an O-handshape.',
            cultureTip:
              'When counting objects, palm orientation shifts — facing yourself for 1–5, then twisting outward for 6–9.',
          },
          {
            id: 'numbers-watch',
            type: 'watch',
            title: 'Numbers 0–9',
            signIds: FINGERSPELL_NUMBERS.map((n) => `sign-${n}`),
          },
          {
            id: 'numbers-breakdown',
            type: 'breakdown',
            title: '3 vs. W vs. 7',
            content:
              'Three (3), W, and seven (7) share extended fingers but differ in which fingers are up and wrist orientation. Study each carefully.',
            signIds: ['sign-3', 'sign-w', 'sign-7'],
          },
          {
            id: 'numbers-quiz',
            type: 'quiz',
            title: 'Number Quiz',
            questions: [
              {
                id: 'nq1',
                type: 'receptive',
                prompt: 'Which number uses all five fingers spread open?',
                correctSignId: 'sign-5',
                options: [
                  { id: 'o1', label: '5', signId: 'sign-5' },
                  { id: 'o2', label: '4', signId: 'sign-4' },
                  { id: 'o3', label: 'W', signId: 'sign-w' },
                  { id: 'o4', label: '0', signId: 'sign-0' },
                ],
              },
              {
                id: 'nq2',
                type: 'receptive',
                prompt: 'Which number forms an O-shape with all fingertips?',
                correctSignId: 'sign-0',
                options: [
                  { id: 'o1', label: '0', signId: 'sign-0' },
                  { id: 'o2', label: 'O', signId: 'sign-o' },
                  { id: 'o3', label: '6', signId: 'sign-6' },
                  { id: 'o4', label: 'C', signId: 'sign-c' },
                ],
              },
            ],
          },
          {
            id: 'numbers-practice',
            type: 'practice',
            title: 'Practice Numbers',
            signIds: ['sign-1', 'sign-2', 'sign-3', 'sign-4', 'sign-5'],
          },
          {
            id: 'numbers-review',
            type: 'review',
            title: 'Review Queue',
            signIds: FINGERSPELL_NUMBERS.map((n) => `sign-${n}`),
          },
        ],
      },
    ],
  };
}

export const dictionary = buildDictionary();
export const lessons = buildLessons();

export function getSignById(id: string): ASLSignClip | undefined {
  return dictionary.signs.find((s) => s.id === id);
}

export function getAnimationBySignId(signId: string) {
  const sign = getSignById(signId);
  if (!sign) return undefined;
  const slug = signId.replace(/^sign-/, '');
  const glossSlug = sign.gloss.toLowerCase().replace(/_/g, '-');
  return dictionary.animations.find(
    (a) =>
      a.gloss === sign.gloss ||
      a.id === `anim-${slug}` ||
      a.id === `anim-${glossSlug}` ||
      a.id === `anim-${sign.gloss.toLowerCase()}`,
  );
}

export function searchSigns(query: string, handshape?: string, category?: string) {
  const q = query.toLowerCase().trim();
  return dictionary.signs.filter((sign) => {
    const matchesQuery =
      !q ||
      sign.gloss.toLowerCase().includes(q) ||
      sign.english.some((e) => e.toLowerCase().includes(q));
    const matchesHandshape =
      !handshape ||
      sign.handshapes.right === handshape ||
      sign.handshapes.left === handshape;
    const matchesCategory = !category || sign.category === category;
    return matchesQuery && matchesHandshape && matchesCategory;
  });
}
