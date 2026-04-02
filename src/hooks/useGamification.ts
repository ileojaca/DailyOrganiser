import { useState, useEffect, useCallback } from 'react';
import { GamificationEngine, UserProgress } from '@/utils/gamificationEngine';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

const engine = new GamificationEngine();

export interface GamificationHook {
  progress: UserProgress | null;
  loading: boolean;
  awardPoints: (points: number, action: string) => Promise<void>;
  checkAchievements: (metrics: Record<string, number>) => Promise<void>;
  updateStreak: (completed: boolean) => Promise<void>;
  getMotivationalMessage: () => string;
}

export function useGamification(): GamificationHook {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Load progress from Firestore
  useEffect(() => {
    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const db = getDb();
        const progressRef = doc(db, 'users', user.uid, 'gamification', 'progress');
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const data = progressSnap.data();
          setProgress({
            totalPoints: data.totalPoints || 0,
            currentStreak: data.currentStreak || 0,
            longestStreak: data.longestStreak || 0,
            level: data.level || 1,
            achievements: data.achievements || engine.initializeProgress().achievements,
            badges: data.badges || [],
          });
        } else {
          // Initialize new progress
          const initialProgress = engine.initializeProgress();
          await setDoc(progressRef, {
            totalPoints: initialProgress.totalPoints,
            currentStreak: initialProgress.currentStreak,
            longestStreak: initialProgress.longestStreak,
            level: initialProgress.level,
            achievements: initialProgress.achievements,
            badges: initialProgress.badges,
            updatedAt: new Date(),
          });
          setProgress(initialProgress);
        }
      } catch (error) {
        console.error('Error loading gamification progress:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(`gamification_${user.uid}`);
        if (saved) {
          setProgress(JSON.parse(saved));
        } else {
          setProgress(engine.initializeProgress());
        }
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [user]);

  // Save progress to Firestore
  const saveProgress = useCallback(async (newProgress: UserProgress) => {
    if (!user) return;

    try {
      const db = getDb();
      const progressRef = doc(db, 'users', user.uid, 'gamification', 'progress');
      await setDoc(progressRef, {
        ...newProgress,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving gamification progress:', error);
      // Fallback to localStorage
      localStorage.setItem(`gamification_${user.uid}`, JSON.stringify(newProgress));
    }
  }, [user]);

  // Award points
  const awardPoints = useCallback(async (points: number, action: string) => {
    if (!progress) return;

    const newProgress = engine.awardPoints(progress, points, action);
    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress, saveProgress]);

  // Check achievements
  const checkAchievements = useCallback(async (metrics: Record<string, number>) => {
    if (!progress) return;

    const result = engine.checkAchievements(progress, metrics);
    if (result.unlocked.length > 0) {
      setProgress(result.progress);
      await saveProgress(result.progress);
      // Could show notification here for unlocked achievements
      console.log('Achievements unlocked:', result.unlocked.map(a => a.name));
    }
  }, [progress, saveProgress]);

  // Update streak
  const updateStreak = useCallback(async (completed: boolean) => {
    if (!progress) return;

    const newProgress = engine.updateStreak(progress, completed);
    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress, saveProgress]);

  // Get motivational message
  const getMotivationalMessage = useCallback(() => {
    if (!progress) return 'Keep going!';
    return engine.getMotivationalMessage(progress);
  }, [progress]);

  return {
    progress,
    loading,
    awardPoints,
    checkAchievements,
    updateStreak,
    getMotivationalMessage,
  };
}