/**
 * Life Management Types
 * 
 * Core data models for the holistic life management system
 */

// ============================================
// FAMILY & RELATIONSHIP TYPES
// ============================================

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';
  email?: string;
  calendarSyncEnabled: boolean;
  avatar?: string;
  birthday?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyEvent {
  id: string;
  title: string;
  type: 'meal' | 'outing' | 'game' | 'homework' | 'celebration' | 'other';
  startTime: Date;
  endTime: Date;
  participants: string[]; // FamilyMember IDs
  location?: string;
  notes?: string;
  recurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionPrompt {
  id: string;
  memberId: string;
  lastInteraction: Date;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
  dismissed: boolean;
  createdAt: Date;
}

export interface FamilyMilestone {
  id: string;
  memberId?: string;
  title: string;
  date: Date;
  type: 'birthday' | 'anniversary' | 'achievement' | 'custom';
  reminderDays: number;
  notes?: string;
  createdAt: Date;
}

// ============================================
// SLEEP & RECOVERY TYPES
// ============================================

export interface SleepRecord {
  id: string;
  userId: string;
  date: Date;
  bedtime: Date;
  wakeTime: Date;
  duration: number; // minutes
  quality: number; // 1-10
  deepSleep?: number; // minutes
  remSleep?: number; // minutes
  awakenings: number;
  notes?: string;
  source: 'manual' | 'apple_health' | 'google_fit' | 'oura' | 'whoop' | 'fitbit';
  createdAt: Date;
}

export interface SleepAnalysis {
  userId: string;
  averageDuration: number;
  averageQuality: number;
  sleepDebt: number; // hours
  optimalBedtime: string;
  optimalWakeTime: string;
  sleepEfficiency: number;
  recommendations: string[];
  analyzedAt: Date;
}

export interface CircadianProfile {
  userId: string;
  chronotype: 'lark' | 'owl' | 'intermediate';
  peakHours: string[];
  lowHours: string[];
  optimalSleepTime: { start: string; end: string };
  optimalWorkTime: { start: string; end: string };
  optimalExerciseTime: string;
  optimalFamilyTime: string;
  updatedAt: Date;
}

export interface RestActivity {
  id: string;
  userId: string;
  type: 'meditation' | 'nap' | 'walk' | 'reading' | 'exercise' | 'social' | 'other';
  duration: number; // minutes
  timestamp: Date;
  notes?: string;
  quality: number; // 1-10
  createdAt: Date;
}

export interface DigitalDetoxPlan {
  id: string;
  userId: string;
  type: 'micro' | 'mini' | 'full'; // 15min, 2hr, full day
  scheduledTime: Date;
  activities: string[];
  notifications: boolean;
  autoEnable: boolean;
  completed: boolean;
  createdAt: Date;
}

// ============================================
// LIFE BALANCE TYPES
// ============================================

export interface LifeCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  targetHoursPerWeek: number;
  minHoursPerWeek: number;
  maxHoursPerWeek: number;
}

export interface BalanceScore {
  overall: number; // 0-100
  categories: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
  recommendations: string[];
  calculatedAt: Date;
}

export interface TimeAllocation {
  category: string;
  hours: number;
  percentage: number;
  target: number;
  deviation: number;
}

// ============================================
// AI ADVISORY TYPES
// ============================================

export interface LifeAdvice {
  id: string;
  userId: string;
  category: 'productivity' | 'wellness' | 'relationships' | 'growth';
  insight: string;
  actionItems: string[];
  evidence: string[];
  confidence: number;
  dismissed: boolean;
  createdAt: Date;
}

export interface WeeklyLifeReview {
  id: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  workLifeBalance: number;
  familyTime: number; // hours
  personalTime: number; // hours
  restQuality: number;
  insights: string[];
  recommendations: string[];
  celebrations: string[];
  warnings: string[];
  createdAt: Date;
}

export interface BurnoutPrediction {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: string[];
  recommendations: string[];
  timeToBurnout: number; // days
  predictedAt: Date;
}

export interface FamilyNeglectPrediction {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastInteraction: Date;
  recommendedActions: string[];
  connectionPrompts: string[];
  predictedAt: Date;
}

// ============================================
// GAMIFICATION TYPES
// ============================================

export interface GamificationProfile {
  userId: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  level: number;
  badges: Badge[];
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  points: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: Date;
}

// ============================================
// GOAL INTELLIGENCE TYPES
// ============================================

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
  options?: string[];
  required: boolean;
}

export interface GoalClarification {
  goalId: string;
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  constraints: GoalConstraint[];
  decomposedTasks: string[]; // Task IDs
  schedule: AdaptiveSchedule;
  completed: boolean;
  createdAt: Date;
}

export interface GoalConstraint {
  type: 'time' | 'resource' | 'dependency' | 'preference';
  description: string;
  value: string;
}

export interface AdaptiveSchedule {
  goalId: string;
  dailyBlocks: TimeBlock[];
  weeklyPattern: WeeklyPattern;
  flexibility: number; // 0-1
  bufferTime: number; // minutes
  reviewFrequency: 'daily' | 'weekly';
  autoAdjust: boolean;
  updatedAt: Date;
}

export interface TimeBlock {
  id: string;
  startTime: string; // HH:MM
  endTime: string;
  dayOfWeek: number; // 0-6
  taskType: string;
}

export interface WeeklyPattern {
  monday: DayPattern;
  tuesday: DayPattern;
  wednesday: DayPattern;
  thursday: DayPattern;
  friday: DayPattern;
  saturday: DayPattern;
  sunday: DayPattern;
}

export interface DayPattern {
  workHours: number;
  familyHours: number;
  personalHours: number;
  restHours: number;
}

export interface SmartReminder {
  id: string;
  goalId: string;
  type: 'gentle' | 'urgent' | 'celebration';
  message: string;
  timing: 'optimal' | 'before' | 'after';
  snoozeOptions: number[];
  adaptive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

// ============================================
// ONBOARDING TYPES
// ============================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  completed: boolean;
  optional: boolean;
  order: number;
}

export interface OnboardingProgress {
  userId: string;
  currentStep: number;
  completedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface SmartTooltip {
  id: string;
  trigger: string;
  content: string;
  action?: string;
  dismissible: boolean;
  shown: boolean;
  dismissedAt?: Date;
}
