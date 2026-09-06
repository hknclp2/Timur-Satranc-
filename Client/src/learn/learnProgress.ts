/**
 * Öğren Modülü — İlerleme Deposu (backend'e hazır arayüz)
 *
 * Ekranlar SADECE bu arayüze konuşur. Bugün localStorage adapter kullanılır,
 * yarın backend adapter takılır; ekran kodu değişmez.
 */
import { useCallback, useEffect, useState } from 'react';
import { LEARN_LEVELS, TOTAL_LESSONS, TOTAL_XP } from './learnContent';

export interface LearnProgressState {
  /** "1.1" gibi tamamlanmış ders id'leri */
  completedLessons: string[];
  /** seviyeId -> son kalınan ders index (devam et için) */
  lastLessonIdxByLevel: Record<number, number>;
}

export interface LearnProgressStore {
  getState(): LearnProgressState;
  isLessonComplete(lessonId: string): boolean;
  completeLesson(levelId: number, lessonId: string): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

const STORAGE_KEY = 'timur-learn-progress-v1';

function loadInitial(): LearnProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedLessons: [], lastLessonIdxByLevel: {} };
    const parsed = JSON.parse(raw) as LearnProgressState;
    if (!Array.isArray(parsed.completedLessons)) return { completedLessons: [], lastLessonIdxByLevel: {} };
    return {
      completedLessons: parsed.completedLessons,
      lastLessonIdxByLevel: parsed.lastLessonIdxByLevel ?? {},
    };
  } catch {
    return { completedLessons: [], lastLessonIdxByLevel: {} };
  }
}

function persist(state: LearnProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* yoksay */
  }
}

// ─── Varsayılan local adapter (singleton) ────────────────────────────────────
class LocalLearnProgressStore implements LearnProgressStore {
  private state: LearnProgressState = loadInitial();
  private listeners = new Set<() => void>();

  getState(): LearnProgressState {
    return this.state;
  }

  isLessonComplete(lessonId: string): boolean {
    return this.state.completedLessons.includes(lessonId);
  }

  completeLesson(levelId: number, lessonId: string): void {
    if (this.state.completedLessons.includes(lessonId)) return;
    const level = LEARN_LEVELS.find((l) => l.id === levelId);
    const lessonIdx = level ? level.lessons.findIndex((d) => d.id === lessonId) : -1;
    this.state = {
      completedLessons: [...this.state.completedLessons, lessonId],
      lastLessonIdxByLevel: {
        ...this.state.lastLessonIdxByLevel,
        [levelId]: lessonIdx >= 0 ? Math.min(lessonIdx + 1, (level?.lessons.length ?? 1) - 1) : 0,
      },
    };
    persist(this.state);
    this.listeners.forEach((fn) => fn());
  }

  reset(): void {
    this.state = { completedLessons: [], lastLessonIdxByLevel: {} };
    persist(this.state);
    this.listeners.forEach((fn) => fn());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** Backend geldiğinde bu singleton backend adapter ile değiştirilecek. */
export const learnProgressStore: LearnProgressStore = new LocalLearnProgressStore();

// ─── Türetilmiş metrikler (saf fonksiyonlar) ─────────────────────────────────
export function completedLessonCount(state: LearnProgressState): number {
  return state.completedLessons.length;
}

export function overallPercent(state: LearnProgressState): number {
  if (TOTAL_LESSONS === 0) return 0;
  return Math.round((state.completedLessons.length / TOTAL_LESSONS) * 100);
}

export function earnedXP(state: LearnProgressState): number {
  // Basit kural: tamamlanan ders başına ait olduğu seviyenin XP'si / ders sayısı
  let xp = 0;
  for (const level of LEARN_LEVELS) {
    const doneInLevel = level.lessons.filter((d) => state.completedLessons.includes(d.id)).length;
    if (doneInLevel === 0) continue;
    xp += Math.round((level.xp * doneInLevel) / level.lessons.length);
  }
  return Math.min(xp, TOTAL_XP);
}

export function completedLevelCount(state: LearnProgressState): number {
  return LEARN_LEVELS.filter((l) => l.lessons.every((d) => state.completedLessons.includes(d.id))).length;
}

export function isLevelUnlocked(state: LearnProgressState, levelId: number): boolean {
  if (levelId <= 1) return true;
  const prev = LEARN_LEVELS.find((l) => l.id === levelId - 1);
  if (!prev) return true;
  return prev.lessons.every((d) => state.completedLessons.includes(d.id));
}

export function activeLevelId(state: LearnProgressState): number {
  for (const level of LEARN_LEVELS) {
    if (!level.lessons.every((d) => state.completedLessons.includes(d.id))) return level.id;
  }
  return LEARN_LEVELS[LEARN_LEVELS.length - 1].id;
}

// ─── React hook ──────────────────────────────────────────────────────────────
export function useLearnProgress(store: LearnProgressStore = learnProgressStore) {
  const [, bump] = useState(0);

  useEffect(() => store.subscribe(() => bump((n) => n + 1)), [store]);

  const state = store.getState();
  const completeLesson = useCallback(
    (levelId: number, lessonId: string) => store.completeLesson(levelId, lessonId),
    [store],
  );

  return {
    state,
    completedCount: completedLessonCount(state),
    totalLessons: TOTAL_LESSONS,
    percent: overallPercent(state),
    xp: earnedXP(state),
    totalXP: TOTAL_XP,
    completedLevels: completedLevelCount(state),
    isLessonComplete: (id: string) => store.isLessonComplete(id),
    isLevelUnlocked: (id: number) => isLevelUnlocked(state, id),
    activeLevel: activeLevelId(state),
    completeLesson,
  };
}
