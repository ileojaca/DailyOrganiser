import { Goal } from '@/hooks/useGoals';

export interface ScheduleInput {
  tasks: Goal[];
  userEnergy: number;
  sleepLastNight: number;
  workLifeBalance: {
    work: number;
    personal: number;
    health: number;
    learning: number;
  };
  workingHoursStart: number;
  workingHoursEnd: number;
  today: Date;
  pastCompletedTasks?: Array<{ completedAt: Date; category: string; estimatedDuration: number }>;
}

export interface ScheduledTask {
  taskId: string;
  title: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  priority: number;
  energyRequired: number;
  reason: string;
  category: string;
}

export interface ScheduleOutput {
  schedule: ScheduledTask[];
  recommendations: string[];
  workLifeBalance: {
    actual: Record<string, number>;
    target: Record<string, number>;
  };
  energyDistribution: {
    peakHours: string[];
    goodHours: string[];
    lightHours: string[];
  };
}

function getEnergyPatternFromSleep(sleepHours: number, wakeTime: Date): {
  peakStart: number;
  peakEnd: number;
  goodStart: number;
  goodEnd: number;
} {
  if (sleepHours < 6) {
    return {
      peakStart: wakeTime.getHours() + 3,
      peakEnd: wakeTime.getHours() + 5,
      goodStart: wakeTime.getHours() + 2,
      goodEnd: wakeTime.getHours() + 6,
    };
  }

  if (sleepHours >= 7 && sleepHours <= 9) {
    return {
      peakStart: wakeTime.getHours() + 2,
      peakEnd: wakeTime.getHours() + 4,
      goodStart: wakeTime.getHours() + 1,
      goodEnd: wakeTime.getHours() + 6,
    };
  }

  return {
    peakStart: wakeTime.getHours() + 1,
    peakEnd: wakeTime.getHours() + 3,
    goodStart: wakeTime.getHours() + 1,
    goodEnd: wakeTime.getHours() + 5,
  };
}

function normalizeHour(hour: number): number {
  return hour < 0 ? hour + 24 : hour >= 24 ? hour - 24 : hour;
}

function calculateEnergyAtTime(hour: number, pattern: ReturnType<typeof getEnergyPatternFromSleep>): number {
  const normHour = normalizeHour(hour);
  const peakStart = normalizeHour(pattern.peakStart);
  const peakEnd = normalizeHour(pattern.peakEnd);
  const goodStart = normalizeHour(pattern.goodStart);
  const goodEnd = normalizeHour(pattern.goodEnd);

  if (normHour >= peakStart && normHour < peakEnd) return 9;
  if (normHour >= goodStart && normHour < goodEnd) return 7;
  if (normHour >= 8 && normHour < 22) return 5;
  return 2;
}

function estimateTaskDurationMinutes(task: Goal): number {
  if (task.estimatedDuration) return task.estimatedDuration;
  if (task.priority >= 4) return 90;
  if (task.priority >= 3) return 60;
  return 30;
}

function estimateEnergyRequired(task: Goal): number {
  if (task.energyRequired) return task.energyRequired;
  if (task.priority >= 4) return 8;
  if (task.priority >= 3) return 6;
  return 4;
}

function formatTimeRange(start: Date, end: Date): string {
  const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${startStr} - ${endStr}`;
}

export function generateOptimalDailySchedule(input: ScheduleInput): ScheduleOutput {
  const today = new Date(input.today);
  today.setHours(0, 0, 0, 0);

  const now = new Date();
  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const dueTodayOrOverdue = input.tasks.filter((task) => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      return deadline <= today || (deadline.getTime() - today.getTime()) < 24 * 60 * 60 * 1000;
    }
    return false;
  });

  const energyPattern = getEnergyPatternFromSleep(input.sleepLastNight, wakeTime);

  const sortedTasks = [...dueTodayOrOverdue].sort((a, b) => {
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    return a.deadline && b.deadline ? a.deadline.getTime() - b.deadline.getTime() : 0;
  });

  const schedule: ScheduledTask[] = [];
  const categoryDurations: Record<string, number> = {
    work: 0,
    personal: 0,
    health: 0,
    learning: 0,
    social: 0,
    family: 0,
  };

  let currentHour = Math.max(now.getHours(), input.workingHoursStart);
  const endHour = Math.min(input.workingHoursEnd, 20);

  for (const task of sortedTasks) {
    const durationMinutes = estimateTaskDurationMinutes(task);
    const energyRequired = estimateEnergyRequired(task);
    const hoursNeeded = durationMinutes / 60;

    let bestHour = currentHour;
    let bestEnergyDiff = Math.abs(energyRequired - calculateEnergyAtTime(currentHour, energyPattern));

    for (let h = currentHour; h < endHour; h++) {
      const energyAtTime = calculateEnergyAtTime(h, energyPattern);
      const energyDiff = Math.abs(energyRequired - energyAtTime);
      if (energyDiff < bestEnergyDiff) {
        bestEnergyDiff = energyDiff;
        bestHour = h;
      }
    }

    if (bestHour + hoursNeeded <= endHour) {
      const scheduledStart = new Date(today);
      scheduledStart.setHours(bestHour, 0, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + durationMinutes);

      const reason =
        energyRequired >= 7
          ? 'High priority, due today'
          : task.priority >= 4
            ? 'Critical deadline'
            : 'Optimal energy match';

      schedule.push({
        taskId: task.id,
        title: task.title,
        scheduledStart,
        scheduledEnd,
        priority: task.priority,
        energyRequired,
        reason,
        category: task.category,
      });

      categoryDurations[task.category] = (categoryDurations[task.category] || 0) + durationMinutes;
      currentHour = bestHour + Math.ceil(hoursNeeded) + 0.5;
    }
  }

  const totalScheduledMinutes = Object.values(categoryDurations).reduce((a, b) => a + b, 0);
  const targetTotalMinutes = (endHour - input.workingHoursStart) * 60;

  const actualBalance: Record<string, number> = {};
  const targetBalance: Record<string, number> = {};

  Object.keys(input.workLifeBalance).forEach((category) => {
    const percentage = input.workLifeBalance[category as keyof typeof input.workLifeBalance];
    actualBalance[category] = Math.round((categoryDurations[category] || 0) / 60);
    targetBalance[category] = Math.round((targetTotalMinutes * percentage) / 100 / 60);
  });

  const recommendations: string[] = [];

  if (input.sleepLastNight < 6) {
    recommendations.push('You got less than 6 hours of sleep. Consider more frequent breaks today.');
  } else if (input.sleepLastNight >= 7 && input.sleepLastNight <= 9) {
    recommendations.push('Great sleep last night! Your peak productivity hours are 2-4 hours after waking.');
  }

  if (input.userEnergy < 4) {
    recommendations.push('Your current energy is low. Schedule lighter tasks first, save deep work for later.');
  }

  const workMinutes = categoryDurations['work'] || 0;
  const totalMinutes = Object.values(categoryDurations).reduce((a, b) => a + b, 0);

  if (totalMinutes > 0) {
    const workPercentage = (workMinutes / totalMinutes) * 100;
    if (workPercentage > 60) {
      recommendations.push('Your schedule is >60% work. Consider adding a personal or health break.');
    }
  }

  if (!categoryDurations['health'] || categoryDurations['health'] === 0) {
    recommendations.push('No health/exercise tasks scheduled. Consider a 30-minute walk or stretch break.');
  }

  if (!categoryDurations['learning'] || categoryDurations['learning'] === 0) {
    if (input.workLifeBalance.learning > 0) {
      recommendations.push('No learning tasks scheduled. Add a 30-minute learning block to match your goals.');
    }
  }

  if (schedule.length === 0) {
    recommendations.push('No tasks could be scheduled for today. Check your working hours or task durations.');
  }

  const peakHours: string[] = [];
  const goodHours: string[] = [];
  const lightHours: string[] = [];

  for (let h = input.workingHoursStart; h < input.workingHoursEnd; h++) {
    const energy = calculateEnergyAtTime(h, energyPattern);
    const timeStr = `${h}:00`;
    if (energy >= 8) {
      peakHours.push(timeStr);
    } else if (energy >= 6) {
      goodHours.push(timeStr);
    } else {
      lightHours.push(timeStr);
    }
  }

  return {
    schedule,
    recommendations,
    workLifeBalance: {
      actual: actualBalance,
      target: targetBalance,
    },
    energyDistribution: {
      peakHours,
      goodHours,
      lightHours,
    },
  };
}
