import Dexie, { type EntityTable } from 'dexie';

export interface MasteryRecord {
  signId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: number;
  lastReview: number;
  correctCount: number;
  incorrectCount: number;
  mastery: number;
}

export interface DailyGoal {
  id: string;
  date: string;
  targetMinutes: number;
  completedMinutes: number;
  streak: number;
}

export interface PracticeSession {
  id?: number;
  signId: string;
  score: number;
  timestamp: number;
  mode: 'receptive' | 'expressive' | 'review';
}

class SignFlowDatabase extends Dexie {
  mastery!: EntityTable<MasteryRecord, 'signId'>;
  dailyGoals!: EntityTable<DailyGoal, 'id'>;
  sessions!: EntityTable<PracticeSession, 'id'>;

  constructor() {
    super('SignFlowDB');
    this.version(1).stores({
      mastery: 'signId, nextReview, mastery',
      dailyGoals: 'id, date',
      sessions: '++id, signId, timestamp',
    });
  }
}

export const db = new SignFlowDatabase();

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

export function computeMastery(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  if (total === 0) return 0;
  return (correct + 1) / (total + 2);
}

export async function getMastery(signId: string): Promise<MasteryRecord | undefined> {
  return db.mastery.get(signId);
}

export async function getAllMastery(): Promise<MasteryRecord[]> {
  return db.mastery.toArray();
}

export async function getReviewQueue(limit = 20): Promise<MasteryRecord[]> {
  const now = Date.now();
  const due = await db.mastery.where('nextReview').belowOrEqual(now).limit(limit).toArray();
  return due.sort((a, b) => a.nextReview - b.nextReview);
}

export async function recordReview(
  signId: string,
  quality: number,
): Promise<MasteryRecord> {
  const existing = await db.mastery.get(signId);
  const now = Date.now();

  let record: MasteryRecord = existing ?? {
    signId,
    easeFactor: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    nextReview: now,
    lastReview: now,
    correctCount: 0,
    incorrectCount: 0,
    mastery: 0,
  };

  if (quality >= 3) {
    record.correctCount += 1;
    if (record.repetitions === 0) {
      record.interval = 1;
    } else if (record.repetitions === 1) {
      record.interval = 3;
    } else {
      record.interval = Math.round(record.interval * record.easeFactor);
    }
    record.repetitions += 1;
  } else {
    record.incorrectCount += 1;
    record.repetitions = 0;
    record.interval = 1;
  }

  record.easeFactor = Math.max(
    MIN_EASE,
    record.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  record.mastery = computeMastery(record.correctCount, record.incorrectCount);
  record.lastReview = now;
  record.nextReview = now + record.interval * 24 * 60 * 60 * 1000;

  await db.mastery.put(record);
  return record;
}

export async function recordPracticeSession(
  signId: string,
  score: number,
  mode: PracticeSession['mode'],
): Promise<void> {
  await db.sessions.add({
    signId,
    score,
    timestamp: Date.now(),
    mode,
  });

  const quality = score >= 0.8 ? 5 : score >= 0.6 ? 4 : score >= 0.4 ? 3 : score >= 0.2 ? 2 : 1;
  await recordReview(signId, quality);
}

export async function getTodayGoal(): Promise<DailyGoal> {
  const today = new Date().toISOString().slice(0, 10);
  const id = `goal-${today}`;
  const existing = await db.dailyGoals.get(id);

  if (existing) return existing;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayId = `goal-${yesterday.toISOString().slice(0, 10)}`;
  const yesterdayGoal = await db.dailyGoals.get(yesterdayId);
  const streak =
    yesterdayGoal && yesterdayGoal.completedMinutes >= yesterdayGoal.targetMinutes
      ? yesterdayGoal.streak + 1
      : 0;

  const goal: DailyGoal = {
    id,
    date: today,
    targetMinutes: 10,
    completedMinutes: 0,
    streak,
  };
  await db.dailyGoals.put(goal);
  return goal;
}

export async function addPracticeMinutes(minutes: number): Promise<DailyGoal> {
  const goal = await getTodayGoal();
  goal.completedMinutes = Math.min(goal.targetMinutes, goal.completedMinutes + minutes);
  await db.dailyGoals.put(goal);
  return goal;
}

export async function getProgressStats(): Promise<{
  signsLearned: number;
  reviewDue: number;
  averageMastery: number;
  totalSessions: number;
  streak: number;
}> {
  const allMastery = await getAllMastery();
  const reviewDue = (await getReviewQueue(100)).length;
  const goal = await getTodayGoal();
  const sessions = await db.sessions.count();

  const learned = allMastery.filter((m) => m.mastery >= 0.6).length;
  const avgMastery =
    allMastery.length > 0
      ? allMastery.reduce((sum, m) => sum + m.mastery, 0) / allMastery.length
      : 0;

  return {
    signsLearned: learned,
    reviewDue,
    averageMastery: avgMastery,
    totalSessions: sessions,
    streak: goal.streak,
  };
}

export async function initializeSignMastery(signIds: string[]): Promise<void> {
  const now = Date.now();
  for (const signId of signIds) {
    const existing = await db.mastery.get(signId);
    if (!existing) {
      await db.mastery.put({
        signId,
        easeFactor: DEFAULT_EASE,
        interval: 0,
        repetitions: 0,
        nextReview: now,
        lastReview: 0,
        correctCount: 0,
        incorrectCount: 0,
        mastery: 0,
      });
    }
  }
}
