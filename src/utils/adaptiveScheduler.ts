/**
 * Adaptive Scheduler Utility
 * 
 * Provides intelligent scheduling based on user patterns,
 * energy levels, and task requirements.
 */

interface Task {
  id: string;
  title: string;
  estimatedDuration: number; // minutes
  priority: 'high' | 'medium' | 'low';
  category: string;
  energyRequired: 'high' | 'medium' | 'low';
  deadline?: Date;
}

interface TimeSlot {
  start: Date;
  end: Date;
  energyLevel: 'high' | 'medium' | 'low';
  available: boolean;
}

interface ScheduleResult {
  scheduledTasks: Array<{
    task: Task;
    startTime: Date;
    endTime: Date;
  }>;
  unscheduledTasks: Task[];
  suggestions: string[];
}

export class AdaptiveScheduler {
  /**
   * Schedule tasks based on energy levels and priorities
   */
  schedule(
    tasks: Task[],
    availableSlots: TimeSlot[],
    preferences: {
      bufferTime: number; // minutes between tasks
      maxTasksPerDay: number;
      preferredWorkHours: { start: number; end: number };
    }
  ): ScheduleResult {
    const scheduledTasks: Array<{ task: Task; startTime: Date; endTime: Date }> = [];
    const unscheduledTasks: Task[] = [];
    const suggestions: string[] = [];

    // Sort tasks by priority and energy requirement
    const sortedTasks = this.sortTasks(tasks);

    // Track used time slots
    const usedSlots: TimeSlot[] = [];

    for (const task of sortedTasks) {
      const slot = this.findBestSlot(task, availableSlots, usedSlots, preferences);

      if (slot) {
        scheduledTasks.push({
          task,
          startTime: slot.start,
          endTime: slot.end,
        });
        usedSlots.push(slot);
      } else {
        unscheduledTasks.push(task);
      }
    }

    // Generate suggestions for unscheduled tasks
    if (unscheduledTasks.length > 0) {
      suggestions.push(
        `${unscheduledTasks.length} tasks couldn't be scheduled. Consider:`
      );
      suggestions.push('• Breaking large tasks into smaller ones');
      suggestions.push('• Extending your available work hours');
      suggestions.push('• Delegating or postponing lower priority tasks');
    }

    return {
      scheduledTasks,
      unscheduledTasks,
      suggestions,
    };
  }

  /**
   * Sort tasks by priority and energy requirement
   */
  private sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      // Priority weight
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Energy weight (high energy tasks first)
      const energyWeight = { high: 3, medium: 2, low: 1 };
      const aEnergy = energyWeight[a.energyRequired];
      const bEnergy = energyWeight[b.energyRequired];

      return bEnergy - aEnergy;
    });
  }

  /**
   * Find the best time slot for a task
   */
  private findBestSlot(
    task: Task,
    availableSlots: TimeSlot[],
    usedSlots: TimeSlot[],
    preferences: {
      bufferTime: number;
      maxTasksPerDay: number;
      preferredWorkHours: { start: number; end: number };
    }
  ): TimeSlot | null {
    const taskDuration = task.estimatedDuration;
    const bufferTime = preferences.bufferTime;

    for (const slot of availableSlots) {
      // Skip if slot is already used
      if (this.isSlotUsed(slot, usedSlots)) {
        continue;
      }

      // Check if slot has enough time
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
      if (slotDuration < taskDuration + bufferTime) {
        continue;
      }

      // Check if energy level matches task requirement
      if (!this.energyMatches(slot.energyLevel, task.energyRequired)) {
        continue;
      }

      // Check if within preferred work hours
      if (!this.isWithinWorkHours(slot.start, preferences.preferredWorkHours)) {
        continue;
      }

      // Check daily task limit
      const tasksOnDay = this.countTasksOnDay(slot.start, usedSlots);
      if (tasksOnDay >= preferences.maxTasksPerDay) {
        continue;
      }

      // Create scheduled slot
      const endTime = new Date(slot.start.getTime() + taskDuration * 60 * 1000);
      return {
        start: slot.start,
        end: endTime,
        energyLevel: slot.energyLevel,
        available: true,
      };
    }

    return null;
  }

  /**
   * Check if a slot is already used
   */
  private isSlotUsed(slot: TimeSlot, usedSlots: TimeSlot[]): boolean {
    for (const used of usedSlots) {
      if (
        (slot.start >= used.start && slot.start < used.end) ||
        (slot.end > used.start && slot.end <= used.end)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if energy level matches task requirement
   */
  private energyMatches(
    slotEnergy: 'high' | 'medium' | 'low',
    taskEnergy: 'high' | 'medium' | 'low'
  ): boolean {
    const energyLevels = { high: 3, medium: 2, low: 1 };
    return energyLevels[slotEnergy] >= energyLevels[taskEnergy];
  }

  /**
   * Check if time is within preferred work hours
   */
  private isWithinWorkHours(
    time: Date,
    workHours: { start: number; end: number }
  ): boolean {
    const hour = time.getHours();
    return hour >= workHours.start && hour < workHours.end;
  }

  /**
   * Count tasks scheduled on a given day
   */
  private countTasksOnDay(date: Date, usedSlots: TimeSlot[]): number {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return usedSlots.filter(slot => {
      return slot.start >= dayStart && slot.start < dayEnd;
    }).length;
  }

  /**
   * Generate energy-based time slots for a day
   */
  generateDaySlots(date: Date, chronotype: 'lark' | 'owl' | 'intermediate'): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Define energy patterns based on chronotype
    const energyPatterns = this.getEnergyPattern(chronotype);

    for (const pattern of energyPatterns) {
      const startTime = new Date(date);
      startTime.setHours(pattern.startHour, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(pattern.endHour, 0, 0, 0);

      slots.push({
        start: startTime,
        end: endTime,
        energyLevel: pattern.energy,
        available: true,
      });
    }

    return slots;
  }

  /**
   * Get energy pattern based on chronotype
   */
  private getEnergyPattern(
    chronotype: 'lark' | 'owl' | 'intermediate'
  ): Array<{ startHour: number; endHour: number; energy: 'high' | 'medium' | 'low' }> {
    switch (chronotype) {
      case 'lark':
        return [
          { startHour: 6, endHour: 9, energy: 'high' },
          { startHour: 9, endHour: 12, energy: 'high' },
          { startHour: 12, endHour: 14, energy: 'low' },
          { startHour: 14, endHour: 17, energy: 'medium' },
          { startHour: 17, endHour: 20, energy: 'low' },
        ];
      case 'owl':
        return [
          { startHour: 10, endHour: 12, energy: 'medium' },
          { startHour: 12, endHour: 14, energy: 'low' },
          { startHour: 14, endHour: 17, energy: 'medium' },
          { startHour: 17, endHour: 20, energy: 'high' },
          { startHour: 20, endHour: 23, energy: 'high' },
        ];
      case 'intermediate':
      default:
        return [
          { startHour: 8, endHour: 10, energy: 'medium' },
          { startHour: 10, endHour: 12, energy: 'high' },
          { startHour: 12, endHour: 14, energy: 'low' },
          { startHour: 14, endHour: 16, energy: 'medium' },
          { startHour: 16, endHour: 18, energy: 'high' },
        ];
    }
  }

  /**
   * Reschedule tasks based on completion patterns
   */
  reschedule(
    tasks: Task[],
    completionHistory: Array<{ taskId: string; completedAt: Date; estimated: number; actual: number }>,
    availableSlots: TimeSlot[]
  ): ScheduleResult {
    // Adjust task durations based on history
    const adjustedTasks = tasks.map(task => {
      const history = completionHistory.find(h => h.taskId === task.id);
      if (history) {
        const ratio = history.actual / history.estimated;
        return {
          ...task,
          estimatedDuration: Math.round(task.estimatedDuration * ratio),
        };
      }
      return task;
    });

    // Reschedule with adjusted durations
    return this.schedule(adjustedTasks, availableSlots, {
      bufferTime: 15,
      maxTasksPerDay: 6,
      preferredWorkHours: { start: 9, end: 18 },
    });
  }

  /**
   * Get scheduling statistics
   */
  getStatistics(
    scheduledTasks: Array<{ task: Task; startTime: Date; endTime: Date }>
  ): {
    totalTasks: number;
    totalDuration: number;
    averagePriority: string;
    energyDistribution: Record<string, number>;
  } {
    const totalTasks = scheduledTasks.length;
    const totalDuration = scheduledTasks.reduce(
      (sum, st) => sum + st.task.estimatedDuration,
      0
    );

    // Calculate average priority
    const priorityScores = { high: 3, medium: 2, low: 1 };
    const avgPriorityScore =
      scheduledTasks.reduce(
        (sum, st) => sum + priorityScores[st.task.priority],
        0
      ) / totalTasks;

    let averagePriority: string;
    if (avgPriorityScore >= 2.5) averagePriority = 'high';
    else if (avgPriorityScore >= 1.5) averagePriority = 'medium';
    else averagePriority = 'low';

    // Calculate energy distribution
    const energyDistribution: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const st of scheduledTasks) {
      energyDistribution[st.task.energyRequired]++;
    }

    return {
      totalTasks,
      totalDuration,
      averagePriority,
      energyDistribution,
    };
  }
}

// Export singleton instance
export const adaptiveScheduler = new AdaptiveScheduler();
