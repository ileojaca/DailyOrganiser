/**
 * Simplified Types for MVP - DailyOrganiser AI Planning Buddy
 * 
 * Focused schema for: Tasks, Energy, Family, Gamification
 * Firebase Firestore structure
 */

// ============================================
// USER PROFILE
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  ageGroup: 'kid' | 'teen' | 'adult' | 'parent';
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Preferences
  preferences: {
    notifications: boolean;
    suggestionAlerts: boolean;
    soundEnabled: boolean;
  };
}

// ============================================
// TASKS & SCHEDULING
// ============================================

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  
  // Scheduling
  scheduledTime?: Date;
  duration: number; // minutes
  priority: 1 | 2 | 3 | 4 | 5; // 1 = minimal, 5 = critical
  
  // Classification
  category: 'homework' | 'work' | 'chores' | 'exercise' | 'social' | 'personal' | 'family' | 'rest';
  energyRequired: 1 | 2 | 3 | 4 | 5; // 1 = low mental effort, 5 = high focus needed
  
  // Status
  completed: boolean;
  completedAt?: Date;
  
  // Rewards
  pointsValue: number; // how many points earned on completion
  funLevel: 1 | 2 | 3 | 4 | 5; // how fun/rewarding this task is
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  voiceCreated?: boolean; // was this created via voice?
}

export interface DailySchedule {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  
  // Tasks scheduled for this day
  tasks: {
    taskId: string;
    scheduledTime: string; // HH:MM format
    order: number;
  }[];
  
  // Breaks
  breaks: {
    name: string;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    type: 'meal' | 'rest' | 'exercise' | 'social';
  }[];
  
  // Rewards earned
  pointsEarned: number;
  tasksCompleted: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Type alias for convenience
export type Schedule = DailySchedule;

// ============================================
// ENERGY TRACKING
// ============================================

export interface EnergyLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  
  morning: 1 | 2 | 3 | 4 | 5; // How energetic?
  afternoon: 1 | 2 | 3 | 4 | 5;
  evening: 1 | 2 | 3 | 4 | 5;
  
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// FAMILY MANAGEMENT
// ============================================

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relationship: 'child' | 'parent' | 'sibling' | 'spouse' | 'other';
  avatar?: string;
  
  // Family features
  assignedTasks: string[]; // task IDs
  pointsBalance: number;
  achievements: string[]; // achievement IDs
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// GAMIFICATION
// ============================================

export interface GamificationProfile {
  userId: string;
  
  // Points & Levels
  totalPoints: number;
  level: number; // level = totalPoints / 500
  
  // Streaks
  currentStreak: number; // consecutive days with tasks
  longestStreak: number; // all-time best
  lastStreakDate?: string; // YYYY-MM-DD
  
  // Achievements
  achievements: Achievement[];
  
  // Stats
  tasksCompleted: number;
  totalTimeSpent: number; // minutes
  
  updatedAt?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  
  // Achievement types
  type: 'milestone' | 'consistency' | 'category_master' | 'challenge' | 'special';
  progress?: number; // 0-100 for in-progress achievements
}

// ============================================
// HABITS
// ============================================

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  
  frequency: 'daily' | 'weekly';
  daysOfWeek?: number[]; // 0-6 for weekly habits
  
  category: string;
  
  // Streak tracking
  streak: number;
  lastCompleted: string; // YYYY-MM-DD
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// VOICE PARSING
// ============================================

export interface ParsedVoiceInput {
  taskTitle: string;
  description?: string;
  category?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  duration?: number; // minutes
  scheduledTime?: Date;
  energyRequired?: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0-1
}

// ============================================
// SCHEDULING SUGGESTIONS
// ============================================

export interface SchedulingSuggestion {
  taskId: string;
  recommendedTime: string; // HH:MM
  reason: string; // why this time? "Peak energy window", etc.
  successProbability: number; // 0-1
  confidence: number; // 0-1
}

export interface DailyPlan {
  date: string;
  tasks: Task[];
  suggestions: SchedulingSuggestion[];
  energyForecast: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  totalPointsPossible: number;
}
