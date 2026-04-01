/**
 * Rule-Based Scheduler
 * 
 * Phase 1 AI: Simple scheduling algorithm without ML
 * Matches tasks to optimal times based on energy, priority, and category
 */

import { Task, EnergyLog, SchedulingSuggestion } from '@/types/simplified';

// Energy level mapping to time slots
const ENERGY_PATTERNS = {
  morning: [8, 9, 10], // 8am-10am
  afternoon: [14, 15, 16], // 2pm-4pm
  evening: [18, 19, 20], // 6pm-8pm
};

// Task energy requirements mapping
const ENERGY_INTENSITY = {
  high: [4, 5], // deep work, analysis, writing, coding
  medium: [2, 3], // routine tasks, calls, meetings
  low: [1], // passive tasks, reading, planning
};

// Category-to-energy mapping (what kind of energy does this task need?)
const CATEGORY_ENERGY = {
  homework: 4, // requires focus
  work: 4, // requires focus
  chores: 2, // routine
  exercise: 3, // moderate
  social: 2, // low mental effort
  personal: 2, // varies
  family: 2, // collaborative
  rest: 1, // low energy
};

// Ideal time slots by category
const CATEGORY_TIME_PREFERENCE = {
  homework: 'afternoon', // after school
  work: 'morning', // peak focus time
  chores: 'afternoon', // flexible
  exercise: 'morning', // ideally morning
  social: 'evening', // after work
  personal: 'evening', // personal time is usually evening
  family: 'evening', // family time is usually evening
  rest: 'evening', // recovery time
};

/**
 * Calculate when a user typically has peak energy
 * Based on energy logs over the past 7 days
 */
export function calculatePeakEnergyHours(energyLogs: EnergyLog[]): string {
  if (!energyLogs || energyLogs.length === 0) {
    return 'afternoon'; // default to afternoon
  }

  let morningTotal = 0;
  let afternoonTotal = 0;
  let eveningTotal = 0;

  energyLogs.forEach((log) => {
    morningTotal += log.morning || 0;
    afternoonTotal += log.afternoon || 0;
    eveningTotal += log.evening || 0;
  });

  const average = {
    morning: morningTotal / energyLogs.length,
    afternoon: afternoonTotal / energyLogs.length,
    evening: eveningTotal / energyLogs.length,
  };

  if (average.morning >= average.afternoon && average.morning >= average.evening) {
    return 'morning';
  }
  if (average.afternoon >= average.evening) {
    return 'afternoon';
  }
  return 'evening';
}

/**
 * Get recommended time slots for energy level
 */
function getTimeSlotForEnergy(energyLevel: 1 | 2 | 3 | 4 | 5, peakHours: string): number[] {
  // If high energy required and peak hours are available, use peak
  if (energyLevel >= 4 && peakHours) {
    return ENERGY_PATTERNS[peakHours as keyof typeof ENERGY_PATTERNS] || [14, 15, 16];
  }

  // Medium energy - use flexible afternoon
  if (energyLevel === 3) {
    return [12, 13, 14, 15];
  }

  // Low energy - can do anytime
  return [9, 10, 11, 12, 13, 14, 15, 16, 17];
}

/**
 * Score a task-time combination
 * Higher score = better match
 */
function scoreTaskTimeSlot(
  task: Task,
  hour: number,
  priorityBoost: number,
  peakHours: string
): number {
  let score = 0;

  // 1. Does this hour match the task's time preference?
  const categoryPref = CATEGORY_TIME_PREFERENCE[task.category];
  const categoryTimes = ENERGY_PATTERNS[categoryPref as keyof typeof ENERGY_PATTERNS] || [];
  if (categoryTimes.includes(hour)) {
    score += 30;
  }

  // 2. Does this hour have the right energy type?
  const taskEnergyNeeded = task.energyRequired;
  const recommendedHours = getTimeSlotForEnergy(taskEnergyNeeded, peakHours);
  if (recommendedHours.includes(hour)) {
    score += 25;
  }

  // 3. Priority boost
  score += task.priority * priorityBoost;

  // 4. Fun level (higher fun = slightly earlier in day)
  if (task.funLevel >= 4 && hour < 15) {
    score += 10; // Schedule fun tasks earlier
  }

  return score;
}

/**
 * Find best time slot for a task
 */
export function findBestTimeSlot(
  task: Task,
  currentHour: number,
  peakHours: string,
  occupiedHours: number[] = []
): { hour: number; reason: string; confidence: number } {
  const dayHours = Array.from({ length: 12 }, (_, i) => 8 + i); // 8am to 7pm

  let bestHour = 14; // default to 2pm
  let bestScore = -Infinity;
  let reason = 'Default time (2pm)';

  // Filter out occupied hours
  const availableHours = dayHours.filter((h) => !occupiedHours.includes(h));

  if (availableHours.length === 0) {
    return { hour: 19, reason: 'After hours - day is full', confidence: 0.3 };
  }

  // Score each available hour
  availableHours.forEach((hour) => {
    const score = scoreTaskTimeSlot(task, hour, 5, peakHours);

    if (score > bestScore) {
      bestScore = score;
      bestHour = hour;

      // Generate reason
      const categoryPref = CATEGORY_TIME_PREFERENCE[task.category];
      const energyMatch = getTimeSlotForEnergy(task.energyRequired, peakHours).includes(hour);

      if (hour === ENERGY_PATTERNS[categoryPref as keyof typeof ENERGY_PATTERNS]?.[0]) {
        reason = `Ideal time for ${task.category}`;
      } else if (energyMatch) {
        reason = `Good energy match for this task`;
      } else {
        reason = `Available slot that works`;
      }
    }
  });

  // Calculate confidence (0-1)
  const maxPossibleScore = 40 + (5 * 5) + 10; // category + priority + fun
  const confidence = Math.min(bestScore / maxPossibleScore, 1);

  return { hour: bestHour, reason, confidence };
}

/**
 * Generate daily schedule suggestions
 */
export function generateDailySchedule(
  tasks: Task[],
  energyLogs: EnergyLog[],
  occupiedHours: number[] = []
): SchedulingSuggestion[] {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  // Determine peak energy hours
  const peakHours = calculatePeakEnergyHours(energyLogs);

  // Sort tasks by priority (high first)
  const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);

  // Generate suggestions for each task
  const suggestions: SchedulingSuggestion[] = sortedTasks.map((task) => {
    const { hour, reason, confidence } = findBestTimeSlot(
      task,
      new Date().getHours(),
      peakHours,
      occupiedHours
    );

    return {
      taskId: task.id,
      recommendedTime: `${String(hour).padStart(2, '0')}:00`,
      reason,
      successProbability: 0.5 + task.priority * 0.1, // Higher priority = higher success
      confidence,
    };
  });

  return suggestions;
}

/**
 * Validate if a schedule is balanced
 * - No more than 3 consecutive hours of high-energy tasks
 * - At least 1 break per 4 hours
 */
export function validateScheduleBalance(
  tasks: Array<{
    hour: number;
    energyRequired: number;
  }>
): {
  isBalanced: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Sort by hour
  const sortedTasks = [...tasks].sort((a, b) => a.hour - b.hour);

  // Check for consecutive high-energy tasks
  let consecutiveHighEnergy = 0;
  for (let i = 0; i < sortedTasks.length; i++) {
    if (sortedTasks[i].energyRequired >= 4) {
      consecutiveHighEnergy++;
      if (consecutiveHighEnergy > 3) {
        warnings.push(`⚠️ Too many high-focus tasks in a row (${consecutiveHighEnergy} hours)`);
        consecutiveHighEnergy = 0;
      }
    } else {
      consecutiveHighEnergy = 0;
    }
  }

  // Check for breaks
  if (sortedTasks.length > 3) {
    let lastBreakHour = sortedTasks[0].hour;
    for (let i = 1; i < sortedTasks.length; i++) {
      if (sortedTasks[i].hour - lastBreakHour > 4) {
        warnings.push(`⏱️ Consider adding a break around ${sortedTasks[i - 1].hour + 1}:00`);
        lastBreakHour = sortedTasks[i].hour;
      }
    }
  }

  return {
    isBalanced: warnings.length === 0,
    warnings,
  };
}

/**
 * Generate energy forecast for the day
 */
export function generateEnergyForecast(energyLogs: EnergyLog[]): {
  morning: string;
  afternoon: string;
  evening: string;
} {
  if (!energyLogs || energyLogs.length === 0) {
    return { morning: '⚡ Good', afternoon: '⚡⚡ Great', evening: '⚡ Good' };
  }

  const getEnergyEmoji = (level: number): string => {
    if (level >= 4) return '⚡⚡ Great';
    if (level >= 3) return '⚡ Good';
    return '😴 Low';
  };

  // Average energy levels from recent logs
  const avgMorning =
    energyLogs.reduce((sum, log) => sum + (log.morning || 3), 0) / energyLogs.length;
  const avgAfternoon =
    energyLogs.reduce((sum, log) => sum + (log.afternoon || 3), 0) / energyLogs.length;
  const avgEvening =
    energyLogs.reduce((sum, log) => sum + (log.evening || 2), 0) / energyLogs.length;

  return {
    morning: getEnergyEmoji(avgMorning),
    afternoon: getEnergyEmoji(avgAfternoon),
    evening: getEnergyEmoji(avgEvening),
  };
}
