/**
 * Context-Aware Planning Utility
 * 
 * This module provides intelligent task scheduling suggestions based on:
 * - User's current energy levels
 * - Task importance/priority
 * - Environmental context (location, tools, network)
 * - Historical productivity patterns
 * 
 * @module contextAwarePlanning
 */

export interface EnergyLevel {
  value: number; // 1-10
  label: string;
  description: string;
  suitableFor: TaskType[];
}

export interface TaskContext {
  location: 'home' | 'office' | 'commute' | 'cafe' | 'gym' | 'outdoors';
  tools: string[];
  networkStatus: 'online' | 'offline' | 'limited';
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile';
}

export type Chronotype = 'lark' | 'owl' | 'intermediate';

export interface ChronotypeSchedule {
  peakHours: string[];
  lowHours: string[];
  optimalTaskTypes: Record<string, TaskType[]>;
}

export interface Task {
  id: string;
  title: string;
  priority: number; // 1-5
  estimatedDuration: number; // minutes
  energyRequired: number; // 1-10
  category: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  context?: Partial<TaskContext>;
  deadline?: Date;
  scheduled_start?: string;
  scheduled_end?: string;
  completed_at?: string | null;
}

export interface PlanningSuggestion {
  taskId: string;
  recommendedTime: string;
  confidence: number; // 0-1
  rationale: string;
  energyAlignment: 'optimal' | 'good' | 'fair' | 'poor';
  contextCompatibility: 'full' | 'partial' | 'none';
  priorityScore: number;
  suggestedAdjustments?: {
    duration?: number;
    energyRequired?: number;
    priority?: number;
  };
}

type TaskType = 'deep_work' | 'analytical' | 'writing' | 'planning' | 
                'communication' | 'administrative' | 'routine' | 'passive' | 'micro';

// Energy level definitions
export const ENERGY_LEVELS: EnergyLevel[] = [
  { value: 1, label: 'Very Low', description: 'Rest, passive activities only', suitableFor: ['passive', 'micro'] },
  { value: 2, label: 'Low', description: 'Minimal cognitive effort', suitableFor: ['passive', 'micro', 'routine'] },
  { value: 3, label: 'Low-Moderate', description: 'Light administrative work', suitableFor: ['routine', 'administrative', 'micro'] },
  { value: 4, label: 'Moderate-Low', description: 'Standard routine tasks', suitableFor: ['routine', 'administrative', 'communication'] },
  { value: 5, label: 'Moderate', description: 'Standard work, communication', suitableFor: ['communication', 'planning', 'administrative'] },
  { value: 6, label: 'Moderate-High', description: 'Complex planning, coordination', suitableFor: ['planning', 'communication', 'writing'] },
  { value: 7, label: 'High', description: 'Creative work, problem solving', suitableFor: ['writing', 'analytical', 'planning'] },
  { value: 8, label: 'High-Very High', description: 'Complex analysis, deep focus', suitableFor: ['analytical', 'deep_work', 'writing'] },
  { value: 9, label: 'Very High', description: 'Deep work, complex analysis', suitableFor: ['deep_work', 'analytical'] },
  { value: 10, label: 'Peak', description: 'Maximum cognitive performance', suitableFor: ['deep_work'] },
];

// Task type to energy mapping
const TASK_TYPE_ENERGY_MAP: Record<TaskType, { min: number; optimal: number; max: number }> = {
  deep_work: { min: 8, optimal: 9, max: 10 },
  analytical: { min: 6, optimal: 8, max: 10 },
  writing: { min: 5, optimal: 7, max: 9 },
  planning: { min: 4, optimal: 6, max: 8 },
  communication: { min: 3, optimal: 5, max: 7 },
  administrative: { min: 2, optimal: 4, max: 6 },
  routine: { min: 1, optimal: 3, max: 5 },
  passive: { min: 1, optimal: 2, max: 4 },
  micro: { min: 1, optimal: 1, max: 3 },
};

// Chronotype-based scheduling preferences
const CHRONOTYPE_SCHEDULES: Record<Chronotype, ChronotypeSchedule> = {
  lark: {
    peakHours: ['06:00-10:00', '15:00-17:00'],
    lowHours: ['13:00-14:00', '20:00-22:00'],
    optimalTaskTypes: {
      '06:00-10:00': ['deep_work', 'analytical', 'writing'],
      '10:00-12:00': ['planning', 'communication'],
      '13:00-14:00': ['passive', 'micro', 'routine'],
      '15:00-17:00': ['analytical', 'writing', 'planning'],
      '17:00-20:00': ['communication', 'administrative'],
    },
  },
  owl: {
    peakHours: ['10:00-14:00', '18:00-23:00'],
    lowHours: ['06:00-09:00', '15:00-16:00'],
    optimalTaskTypes: {
      '06:00-09:00': ['passive', 'micro', 'routine'],
      '10:00-14:00': ['deep_work', 'analytical', 'writing'],
      '15:00-16:00': ['passive', 'micro'],
      '18:00-23:00': ['deep_work', 'analytical', 'writing', 'planning'],
    },
  },
  intermediate: {
    peakHours: ['09:00-12:00', '15:00-18:00'],
    lowHours: ['13:00-14:00', '21:00-23:00'],
    optimalTaskTypes: {
      '09:00-12:00': ['deep_work', 'analytical', 'writing'],
      '12:00-13:00': ['communication', 'administrative'],
      '13:00-14:00': ['passive', 'micro', 'routine'],
      '15:00-18:00': ['analytical', 'writing', 'planning'],
      '18:00-21:00': ['communication', 'administrative'],
    },
  },
};

// Context compatibility matrix
const CONTEXT_COMPATIBILITY: Record<string, Record<string, number>> = {
  home: {
    deep_work: 1.0, analytical: 1.0, writing: 1.0, planning: 1.0,
    communication: 0.9, administrative: 1.0, routine: 1.0, passive: 1.0, micro: 1.0,
  },
  office: {
    deep_work: 0.9, analytical: 1.0, writing: 0.9, planning: 1.0,
    communication: 1.0, administrative: 1.0, routine: 1.0, passive: 0.7, micro: 0.9,
  },
  commute: {
    deep_work: 0.3, analytical: 0.5, writing: 0.4, planning: 0.6,
    communication: 0.7, administrative: 0.5, routine: 0.6, passive: 1.0, micro: 0.9,
  },
  cafe: {
    deep_work: 0.8, analytical: 0.8, writing: 0.9, planning: 0.7,
    communication: 0.6, administrative: 0.7, routine: 0.8, passive: 0.9, micro: 0.8,
  },
  gym: {
    deep_work: 0.1, analytical: 0.2, writing: 0.1, planning: 0.3,
    communication: 0.4, administrative: 0.2, routine: 0.5, passive: 0.8, micro: 0.6,
  },
  outdoors: {
    deep_work: 0.2, analytical: 0.3, writing: 0.4, planning: 0.5,
    communication: 0.6, administrative: 0.3, routine: 0.5, passive: 0.9, micro: 0.7,
  },
};

/**
 * Calculate energy alignment between user energy and task requirements
 */
export function calculateEnergyAlignment(
  userEnergy: number,
  taskEnergyRequired: number
): { alignment: 'optimal' | 'good' | 'fair' | 'poor'; score: number } {
  const difference = userEnergy - taskEnergyRequired;
  
  if (difference >= 2) {
    return { alignment: 'optimal', score: 1.0 };
  } else if (difference >= 0) {
    return { alignment: 'good', score: 0.8 };
  } else if (difference >= -2) {
    return { alignment: 'fair', score: 0.5 };
  } else {
    return { alignment: 'poor', score: 0.2 };
  }
}

/**
 * Get chronotype schedule for a user
 */
export function getChronotypeSchedule(chronotype: Chronotype): ChronotypeSchedule {
  return CHRONOTYPE_SCHEDULES[chronotype] || CHRONOTYPE_SCHEDULES.intermediate;
}

/**
 * Check if current time is within peak hours for a chronotype
 */
export function isPeakHour(chronotype: Chronotype, hour: number): boolean {
  const schedule = getChronotypeSchedule(chronotype);
  return schedule.peakHours.some(range => {
    const [start, end] = range.split('-').map(h => parseInt(h.split(':')[0]));
    return hour >= start && hour < end;
  });
}

/**
 * Get optimal task types for current time based on chronotype
 */
export function getOptimalTaskTypesForTime(chronotype: Chronotype, hour: number): TaskType[] {
  const schedule = getChronotypeSchedule(chronotype);
  const timeRange = schedule.peakHours.find(range => {
    const [start, end] = range.split('-').map(h => parseInt(h.split(':')[0]));
    return hour >= start && hour < end;
  });
  
  if (timeRange && schedule.optimalTaskTypes[timeRange]) {
    return schedule.optimalTaskTypes[timeRange];
  }
  
  // Default task types for non-peak hours
  return ['routine', 'administrative', 'passive', 'micro'];
}

/**
 * Calculate context compatibility score
 */
export function calculateContextCompatibility(
  context: TaskContext,
  taskType: TaskType
): { compatibility: 'full' | 'partial' | 'none'; score: number } {
  const locationScore = CONTEXT_COMPATIBILITY[context.location]?.[taskType] || 0.5;
  
  // Adjust for network status
  let networkMultiplier = 1.0;
  if (context.networkStatus === 'offline') {
    networkMultiplier = 0.6;
  } else if (context.networkStatus === 'limited') {
    networkMultiplier = 0.8;
  }
  
  const finalScore = locationScore * networkMultiplier;
  
  if (finalScore >= 0.8) {
    return { compatibility: 'full', score: finalScore };
  } else if (finalScore >= 0.5) {
    return { compatibility: 'partial', score: finalScore };
  } else {
    return { compatibility: 'none', score: finalScore };
  }
}

/**
 * Generate planning suggestions based on energy, importance, context, and chronotype
 */
export function generatePlanningSuggestions(
  tasks: Task[],
  userEnergy: number,
  context: TaskContext,
  availableTimeBlocks: { start: Date; end: Date }[],
  chronotype: Chronotype = 'intermediate'
): PlanningSuggestion[] {
  const suggestions: PlanningSuggestion[] = [];
  
  // Sort tasks by priority and deadline urgency
  const sortedTasks = [...tasks]
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      // Priority first
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Then deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });
  
  for (const task of sortedTasks) {
    // Calculate energy alignment
    const energyAlignment = calculateEnergyAlignment(userEnergy, task.energyRequired || 5);
    
    // Calculate context compatibility
    const taskType = inferTaskType(task);
    const contextCompatibility = calculateContextCompatibility(context, taskType);
    
    // Calculate chronotype alignment
    const chronotypeAlignment = calculateChronotypeAlignment(task, chronotype);
    
    // Calculate priority score (0-1)
    const priorityScore = task.priority / 5;
    
    // Calculate overall confidence (adjusted weights to include chronotype)
    const confidence = (
      energyAlignment.score * 0.3 +
      contextCompatibility.score * 0.25 +
      chronotypeAlignment.score * 0.25 +
      priorityScore * 0.2
    );
    
    // Find best time block considering chronotype
    const recommendedTime = findOptimalTimeBlock(
      task,
      availableTimeBlocks,
      userEnergy,
      energyAlignment.alignment,
      chronotype
    );
    
    suggestions.push({
      taskId: task.id,
      recommendedTime: recommendedTime?.toISOString() || new Date().toISOString(),
      confidence,
      rationale: generateRationale(task, energyAlignment, contextCompatibility, priorityScore, chronotypeAlignment),
      energyAlignment: energyAlignment.alignment,
      contextCompatibility: contextCompatibility.compatibility,
      priorityScore,
      suggestedAdjustments: generateAdjustments(task, energyAlignment, userEnergy),
    });
  }
  
  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate how well a task aligns with user's chronotype
 */
function calculateChronotypeAlignment(
  task: Task,
  chronotype: Chronotype
): { alignment: 'optimal' | 'good' | 'fair' | 'poor'; score: number } {
  const taskType = inferTaskType(task);
  const schedule = getChronotypeSchedule(chronotype);
  
  // Check if task type is optimal for any peak hour
  const isOptimal = Object.values(schedule.optimalTaskTypes).some(
    types => types.includes(taskType)
  );
  
  if (isOptimal) {
    return { alignment: 'optimal', score: 1.0 };
  }
  
  // Check if task type is suitable for peak hours
  const isSuitable = schedule.peakHours.some(range => {
    const types = schedule.optimalTaskTypes[range] || [];
    return types.includes(taskType);
  });
  
  if (isSuitable) {
    return { alignment: 'good', score: 0.7 };
  }
  
  // Task is better suited for low energy periods
  const isLowEnergy = schedule.lowHours.some(range => {
    const types = schedule.optimalTaskTypes[range] || [];
    return types.includes(taskType);
  });
  
  if (isLowEnergy) {
    return { alignment: 'fair', score: 0.4 };
  }
  
  return { alignment: 'poor', score: 0.2 };
}

/**
 * Infer task type from category and description
 */
function inferTaskType(task: Task): TaskType {
  const categoryMap: Record<string, TaskType> = {
    work: 'analytical',
    personal: 'administrative',
    health: 'routine',
    learning: 'deep_work',
    social: 'communication',
  };
  
  return categoryMap[task.category] || 'administrative';
}

/**
 * Find optimal time block for a task considering chronotype
 */
function findOptimalTimeBlock(
  task: Task,
  timeBlocks: { start: Date; end: Date }[],
  userEnergy: number,
  energyAlignment: string,
  chronotype: Chronotype = 'intermediate'
): Date | null {
  if (timeBlocks.length === 0) return null;
  
  const taskType = inferTaskType(task);
  const schedule = getChronotypeSchedule(chronotype);
  
  // Score each time block based on chronotype alignment
  const scoredBlocks = timeBlocks.map(block => {
    const hour = block.start.getHours();
    const isPeak = isPeakHour(chronotype, hour);
    const optimalTypes = getOptimalTaskTypesForTime(chronotype, hour);
    const isOptimalType = optimalTypes.includes(taskType);
    
    let score = 0;
    if (isPeak) score += 2;
    if (isOptimalType) score += 3;
    
    // Adjust for energy requirements
    if (task.energyRequired && task.energyRequired >= 7 && isPeak) score += 2;
    if (task.energyRequired && task.energyRequired <= 3 && !isPeak) score += 1;
    
    return { block, score };
  });
  
  // Sort by score and return the best block
  scoredBlocks.sort((a, b) => b.score - a.score);
  return scoredBlocks[0].block.start;
}

/**
 * Generate human-readable rationale for suggestion
 */
function generateRationale(
  task: Task,
  energyAlignment: { alignment: string; score: number },
  contextCompatibility: { compatibility: string; score: number },
  priorityScore: number,
  chronotypeAlignment?: { alignment: string; score: number }
): string {
  const parts: string[] = [];
  
  if (energyAlignment.alignment === 'optimal' || energyAlignment.alignment === 'good') {
    parts.push('Your current energy level is well-suited for this task');
  } else if (energyAlignment.alignment === 'poor') {
    parts.push('Consider postponing - your energy level may be too low for optimal performance');
  }
  
  if (contextCompatibility.compatibility === 'full') {
    parts.push('Your current context fully supports this task type');
  } else if (contextCompatibility.compatibility === 'none') {
    parts.push('Current environment may not be ideal - consider changing location or tools');
  }
  
  if (chronotypeAlignment) {
    if (chronotypeAlignment.alignment === 'optimal') {
      parts.push('This task aligns perfectly with your natural energy rhythm');
    } else if (chronotypeAlignment.alignment === 'good') {
      parts.push('This task fits well with your daily pattern');
    } else if (chronotypeAlignment.alignment === 'poor') {
      parts.push('Consider scheduling this task at a different time for better alignment');
    }
  }
  
  if (priorityScore >= 0.8) {
    parts.push('High priority - recommend completing soon');
  }
  
  return parts.join('. ') || 'Standard scheduling recommendation';
}

/**
 * Generate suggested adjustments for task
 */
function generateAdjustments(
  task: Task,
  energyAlignment: { alignment: string; score: number },
  userEnergy: number
): { duration?: number; energyRequired?: number; priority?: number } | undefined {
  const adjustments: { duration?: number; energyRequired?: number; priority?: number } = {};
  
  // Suggest duration adjustment if energy is low
  if (energyAlignment.alignment === 'poor' && task.estimatedDuration) {
    adjustments.duration = Math.ceil(task.estimatedDuration * 1.3);
  }
  
  // Suggest energy requirement adjustment
  if (userEnergy < (task.energyRequired || 5) - 3) {
    adjustments.energyRequired = Math.max(1, userEnergy - 1);
  }
  
  return Object.keys(adjustments).length > 0 ? adjustments : undefined;
}

/**
 * Calculate productivity score based on task completion patterns
 */
export function calculateProductivityScore(
  completedTasks: Task[],
  scheduledTasks: Task[]
): { score: number; trend: 'improving' | 'stable' | 'declining'; insights: string[] } {
  if (completedTasks.length === 0) {
    return { score: 0, trend: 'stable', insights: ['Start completing tasks to build your productivity score'] };
  }
  
  // Calculate completion rate
  const totalTasks = completedTasks.length + scheduledTasks.length;
  const completionRate = completedTasks.length / totalTasks;
  
  // Calculate on-time completion
  const onTimeCompletions = completedTasks.filter(task => {
    if (!task.scheduled_start || !task.completed_at) return true;
    return new Date(task.completed_at) <= new Date(task.scheduled_start);
  }).length;
  const onTimeRate = onTimeCompletions / completedTasks.length;
  
  // Calculate energy efficiency
  const highEnergyTasks = completedTasks.filter(t => (t.energyRequired || 5) >= 7);
  const energyEfficiency = highEnergyTasks.length > 0 
    ? highEnergyTasks.filter(t => t.status === 'completed').length / highEnergyTasks.length 
    : 0.5;
  
  // Overall score (0-100)
  const score = Math.round(
    (completionRate * 40) + 
    (onTimeRate * 30) + 
    (energyEfficiency * 30)
  );
  
  // Generate insights
  const insights: string[] = [];
  if (completionRate < 0.5) insights.push('Try breaking large tasks into smaller chunks');
  if (onTimeRate < 0.7) insights.push('Build in buffer time for unexpected delays');
  if (energyEfficiency < 0.5) insights.push('Schedule high-energy tasks during your peak hours');
  if (insights.length === 0) insights.push('Great job! Your productivity is on track');
  
  // Determine trend (simplified - would use historical data in production)
  const trend: 'improving' | 'stable' | 'declining' = score > 70 ? 'improving' : score > 40 ? 'stable' : 'declining';
  
  return { score, trend, insights };
}

/**
 * Detect conflicts between time blocks
 */
export function detectTimeBlockConflicts(
  timeBlocks: { start: Date; end: Date; id?: string }[]
): { conflicts: Array<{ block1: number; block2: number; overlapMinutes: number }>; hasConflicts: boolean } {
  const conflicts: Array<{ block1: number; block2: number; overlapMinutes: number }> = [];
  
  for (let i = 0; i < timeBlocks.length; i++) {
    for (let j = i + 1; j < timeBlocks.length; j++) {
      const block1 = timeBlocks[i];
      const block2 = timeBlocks[j];
      
      // Check for overlap
      const overlapStart = new Date(Math.max(block1.start.getTime(), block2.start.getTime()));
      const overlapEnd = new Date(Math.min(block1.end.getTime(), block2.end.getTime()));
      
      if (overlapStart < overlapEnd) {
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
        conflicts.push({
          block1: i,
          block2: j,
          overlapMinutes
        });
      }
    }
  }
  
  return {
    conflicts,
    hasConflicts: conflicts.length > 0
  };
}

/**
 * Suggest resolution for time block conflicts
 */
export function suggestConflictResolutions(
  timeBlocks: { start: Date; end: Date; id?: string }[],
  conflicts: Array<{ block1: number; block2: number; overlapMinutes: number }>
): Array<{ conflict: { block1: number; block2: number; overlapMinutes: number }; suggestions: string[] }> {
  return conflicts.map(conflict => {
    const suggestions: string[] = [];
    const block1 = timeBlocks[conflict.block1];
    const block2 = timeBlocks[conflict.block2];
    
    // Suggest moving the shorter block
    const block1Duration = (block1.end.getTime() - block1.start.getTime()) / (1000 * 60);
    const block2Duration = (block2.end.getTime() - block2.start.getTime()) / (1000 * 60);
    
    if (block1Duration < block2Duration) {
      suggestions.push(`Consider moving the shorter block (${block1Duration} min) to avoid overlap`);
    } else {
      suggestions.push(`Consider moving the shorter block (${block2Duration} min) to avoid overlap`);
    }
    
    // Suggest reducing duration
    suggestions.push(`Reduce one block's duration by ${conflict.overlapMinutes} minutes`);
    
    // Suggest merging if blocks are similar
    suggestions.push('Consider merging overlapping blocks if they serve similar purposes');
    
    return {
      conflict,
      suggestions
    };
  });
}

/**
 * Find available time slots for a given duration
 */
export function findAvailableTimeSlots(
  existingBlocks: { start: Date; end: Date }[],
  targetDurationMinutes: number,
  searchStart: Date,
  searchEnd: Date,
  bufferMinutes: number = 15
): Array<{ start: Date; end: Date }> {
  const availableSlots: Array<{ start: Date; end: Date }> = [];
  
  // Sort existing blocks by start time
  const sortedBlocks = [...existingBlocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  let currentTime = searchStart.getTime();
  const endTime = searchEnd.getTime();
  const targetDurationMs = targetDurationMinutes * 60 * 1000;
  const bufferMs = bufferMinutes * 60 * 1000;
  
  for (const block of sortedBlocks) {
    const blockStart = block.start.getTime();
    const blockEnd = block.end.getTime();
    
    // Check if there's a gap before this block
    if (currentTime + targetDurationMs + bufferMs <= blockStart) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(currentTime + targetDurationMs)
      });
    }
    
    // Move current time to after this block
    currentTime = Math.max(currentTime, blockEnd + bufferMs);
  }
  
  // Check if there's time after the last block
  if (currentTime + targetDurationMs <= endTime) {
    availableSlots.push({
      start: new Date(currentTime),
      end: new Date(currentTime + targetDurationMs)
    });
  }
  
  return availableSlots;
}

/**
 * Automatic rescheduling logic for tasks
 */
export interface ReschedulingResult {
  success: boolean;
  newStartTime?: Date;
  newEndTime?: Date;
  reason: string;
  conflicts: Array<{ taskId: string; conflictType: string }>;
}

export function automaticReschedule(
  taskToReschedule: Task,
  existingTasks: Task[],
  timeBlocks: { start: Date; end: Date }[],
  userEnergy: number,
  chronotype: Chronotype = 'intermediate',
  preferences: {
    preferMorning?: boolean;
    preferAfternoon?: boolean;
    preferEvening?: boolean;
    bufferMinutes?: number;
  } = {}
): ReschedulingResult {
  const { bufferMinutes = 15 } = preferences;
  
  // Get task duration
  const taskDuration = taskToReschedule.estimatedDuration || 60;
  
  // Find available slots for the next 7 days
  const searchStart = new Date();
  const searchEnd = new Date(searchStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const availableSlots = findAvailableTimeSlots(
    timeBlocks,
    taskDuration,
    searchStart,
    searchEnd,
    bufferMinutes
  );
  
  if (availableSlots.length === 0) {
    return {
      success: false,
      reason: 'No available time slots found in the next 7 days',
      conflicts: []
    };
  }
  
  // Score each available slot
  const scoredSlots = availableSlots.map(slot => {
    const hour = slot.start.getHours();
    const isPeak = isPeakHour(chronotype, hour);
    const taskType = inferTaskType(taskToReschedule);
    const optimalTypes = getOptimalTaskTypesForTime(chronotype, hour);
    const isOptimalType = optimalTypes.includes(taskType);
    
    let score = 0;
    
    // Chronotype alignment
    if (isPeak) score += 3;
    if (isOptimalType) score += 2;
    
    // Energy alignment
    const energyAlignment = calculateEnergyAlignment(userEnergy, taskToReschedule.energyRequired || 5);
    score += energyAlignment.score * 2;
    
    // Preference bonuses
    if (preferences.preferMorning && hour >= 6 && hour < 12) score += 2;
    if (preferences.preferAfternoon && hour >= 12 && hour < 18) score += 2;
    if (preferences.preferEvening && hour >= 18 && hour < 22) score += 2;
    
    // Priority bonus
    score += (taskToReschedule.priority / 5) * 2;
    
    // Deadline urgency
    if (taskToReschedule.deadline) {
      const daysUntilDeadline = (new Date(taskToReschedule.deadline).getTime() - slot.start.getTime()) / (24 * 60 * 60 * 1000);
      if (daysUntilDeadline <= 1) score += 5;
      else if (daysUntilDeadline <= 3) score += 3;
      else if (daysUntilDeadline <= 7) score += 1;
    }
    
    return { slot, score };
  });
  
  // Sort by score and get the best slot
  scoredSlots.sort((a, b) => b.score - a.score);
  const bestSlot = scoredSlots[0].slot;
  
  // Check for conflicts with other tasks
  const conflicts: Array<{ taskId: string; conflictType: string }> = [];
  for (const task of existingTasks) {
    if (task.id === taskToReschedule.id) continue;
    if (!task.scheduled_start || !task.scheduled_end) continue;
    
    const taskStart = new Date(task.scheduled_start);
    const taskEnd = new Date(task.scheduled_end);
    
    // Check for overlap
    if (bestSlot.start < taskEnd && bestSlot.end > taskStart) {
      conflicts.push({
        taskId: task.id,
        conflictType: 'time_overlap'
      });
    }
  }
  
  // Generate reason
  const hour = bestSlot.start.getHours();
  const isPeak = isPeakHour(chronotype, hour);
  let reason = '';
  
  if (isPeak) {
    reason = 'Scheduled during your peak productivity hours';
  } else if (taskToReschedule.deadline) {
    const daysUntilDeadline = (new Date(taskToReschedule.deadline).getTime() - bestSlot.start.getTime()) / (24 * 60 * 60 * 1000);
    if (daysUntilDeadline <= 1) {
      reason = 'Scheduled urgently due to approaching deadline';
    } else {
      reason = 'Scheduled at optimal available time';
    }
  } else {
    reason = 'Scheduled at best available time based on your preferences';
  }
  
  return {
    success: true,
    newStartTime: bestSlot.start,
    newEndTime: bestSlot.end,
    reason,
    conflicts
  };
}

/**
 * Batch reschedule multiple tasks
 */
export function batchReschedule(
  tasksToReschedule: Task[],
  existingTasks: Task[],
  timeBlocks: { start: Date; end: Date }[],
  userEnergy: number,
  chronotype: Chronotype = 'intermediate',
  preferences: {
    preferMorning?: boolean;
    preferAfternoon?: boolean;
    preferEvening?: boolean;
    bufferMinutes?: number;
  } = {}
): Map<string, ReschedulingResult> {
  const results = new Map<string, ReschedulingResult>();
  
  // Sort tasks by priority and deadline
  const sortedTasks = [...tasksToReschedule].sort((a, b) => {
    // Priority first
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Then deadline
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return 0;
  });
  
  // Reschedule each task
  let currentBlocks = [...timeBlocks];
  
  for (const task of sortedTasks) {
    const result = automaticReschedule(
      task,
      existingTasks,
      currentBlocks,
      userEnergy,
      chronotype,
      preferences
    );
    
    results.set(task.id, result);
    
    // If successful, add the new block to prevent double-booking
    if (result.success && result.newStartTime && result.newEndTime) {
      currentBlocks.push({
        start: result.newStartTime,
        end: result.newEndTime
      });
      // Re-sort blocks
      currentBlocks.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
  }
  
  return results;
}

/**
 * Generate task batching recommendations
 */
export interface BatchingRecommendation {
  batchId: string;
  tasks: Task[];
  reason: string;
  estimatedTimeSaving: number; // minutes
  energyBenefit: string;
  suggestedTimeSlot?: { start: Date; end: Date };
}

export function generateBatchingRecommendations(
  tasks: Task[],
  userEnergy: number,
  chronotype: Chronotype = 'intermediate',
  timeBlocks: { start: Date; end: Date }[] = []
): BatchingRecommendation[] {
  const recommendations: BatchingRecommendation[] = [];
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  
  // Group tasks by category
  const tasksByCategory = new Map<string, Task[]>();
  for (const task of pendingTasks) {
    const category = task.category || 'uncategorized';
    if (!tasksByCategory.has(category)) {
      tasksByCategory.set(category, []);
    }
    tasksByCategory.get(category)!.push(task);
  }
  
  // Generate recommendations for each category with multiple tasks
  for (const [category, categoryTasks] of tasksByCategory) {
    if (categoryTasks.length < 2) continue;
    
    // Sort by priority
    const sortedTasks = [...categoryTasks].sort((a, b) => b.priority - a.priority);
    
    // Calculate total duration
    const totalDuration = sortedTasks.reduce((sum, t) => sum + (t.estimatedDuration || 30), 0);
    
    // Estimate time saving (context switching overhead)
    const contextSwitchOverhead = 10; // minutes per task switch
    const estimatedTimeSaving = (sortedTasks.length - 1) * contextSwitchOverhead;
    
    // Determine energy benefit
    const avgEnergyRequired = sortedTasks.reduce((sum, t) => sum + (t.energyRequired || 5), 0) / sortedTasks.length;
    let energyBenefit = '';
    if (avgEnergyRequired <= 4) {
      energyBenefit = 'Batch low-energy tasks together to maintain momentum';
    } else if (avgEnergyRequired <= 7) {
      energyBenefit = 'Group similar tasks to reduce mental context switching';
    } else {
      energyBenefit = 'Schedule high-energy batch during peak hours for maximum focus';
    }
    
    // Find optimal time slot for the batch
    const optimalHour = findOptimalHourForBatch(sortedTasks, chronotype, userEnergy);
    let suggestedTimeSlot: { start: Date; end: Date } | undefined;
    
    if (optimalHour !== null) {
      const now = new Date();
      const suggestedStart = new Date(now);
      suggestedStart.setHours(optimalHour, 0, 0, 0);
      
      // If the suggested time is in the past, move to tomorrow
      if (suggestedStart < now) {
        suggestedStart.setDate(suggestedStart.getDate() + 1);
      }
      
      const suggestedEnd = new Date(suggestedStart.getTime() + totalDuration * 60 * 1000);
      suggestedTimeSlot = { start: suggestedStart, end: suggestedEnd };
    }
    
    // Generate reason
    const reason = `${sortedTasks.length} ${category} tasks can be batched together. ` +
      `Completing them in one session reduces context switching and improves focus.`;
    
    recommendations.push({
      batchId: `batch-${category}-${Date.now()}`,
      tasks: sortedTasks,
      reason,
      estimatedTimeSaving,
      energyBenefit,
      suggestedTimeSlot
    });
  }
  
  // Also check for tasks with similar energy requirements
  const tasksByEnergy = new Map<number, Task[]>();
  for (const task of pendingTasks) {
    const energy = task.energyRequired || 5;
    if (!tasksByEnergy.has(energy)) {
      tasksByEnergy.set(energy, []);
    }
    tasksByEnergy.get(energy)!.push(task);
  }
  
  for (const [energy, energyTasks] of tasksByEnergy) {
    if (energyTasks.length < 2) continue;
    
    // Skip if already recommended in category batch
    const alreadyRecommended = recommendations.some(rec => 
      rec.tasks.some(t => energyTasks.some(et => et.id === t.id))
    );
    if (alreadyRecommended) continue;
    
    const sortedTasks = [...energyTasks].sort((a, b) => b.priority - a.priority);
    const totalDuration = sortedTasks.reduce((sum, t) => sum + (t.estimatedDuration || 30), 0);
    const estimatedTimeSaving = (sortedTasks.length - 1) * 8;
    
    let energyBenefit = '';
    if (energy <= 3) {
      energyBenefit = 'Perfect for low-energy periods or end of day';
    } else if (energy <= 6) {
      energyBenefit = 'Good for maintaining steady productivity';
    } else {
      energyBenefit = 'Schedule during peak energy hours for best results';
    }
    
    const reason = `${sortedTasks.length} tasks with similar energy requirements (${energy}/10). ` +
      `Batching these together helps maintain consistent energy levels.`;
    
    recommendations.push({
      batchId: `batch-energy-${energy}-${Date.now()}`,
      tasks: sortedTasks,
      reason,
      estimatedTimeSaving,
      energyBenefit
    });
  }
  
  // Sort by estimated time saving (highest first)
  return recommendations.sort((a, b) => b.estimatedTimeSaving - a.estimatedTimeSaving);
}

/**
 * Find optimal hour for batching tasks
 */
function findOptimalHourForBatch(
  tasks: Task[],
  chronotype: Chronotype,
  userEnergy: number
): number | null {
  const schedule = getChronotypeSchedule(chronotype);
  const avgEnergyRequired = tasks.reduce((sum, t) => sum + (t.energyRequired || 5), 0) / tasks.length;
  
  // Find peak hours that match task energy requirements
  for (const range of schedule.peakHours) {
    const [start] = range.split('-').map(h => parseInt(h.split(':')[0]));
    const optimalTypes = schedule.optimalTaskTypes[range] || [];
    
    // Check if any task type matches this time slot
    const taskTypes = tasks.map(t => inferTaskType(t));
    const hasMatchingType = taskTypes.some(type => optimalTypes.includes(type));
    
    if (hasMatchingType && userEnergy >= avgEnergyRequired) {
      return start;
    }
  }
  
  // Fallback to first peak hour
  if (schedule.peakHours.length > 0) {
    const [start] = schedule.peakHours[0].split('-').map(h => parseInt(h.split(':')[0]));
    return start;
  }
  
  return null;
}

/**
 * Break suggestion interface
 */
export interface BreakSuggestion {
  type: 'short' | 'medium' | 'long';
  duration: number; // minutes
  reason: string;
  suggestedTime: Date;
  activities: string[];
}

/**
 * Generate break suggestions based on work patterns and energy levels
 */
export function generateBreakSuggestions(
  completedTasks: Task[],
  currentEnergy: number,
  chronotype: Chronotype = 'intermediate',
  lastBreakTime?: Date
): BreakSuggestion[] {
  const suggestions: BreakSuggestion[] = [];
  const now = new Date();
  const schedule = getChronotypeSchedule(chronotype);
  
  // Calculate work duration since last break
  const workDurationSinceBreak = lastBreakTime
    ? (now.getTime() - lastBreakTime.getTime()) / (1000 * 60) // minutes
    : 120; // default to 2 hours if no break recorded
  
  // Get recent tasks (last 2 hours)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const recentTasks = completedTasks.filter(task => {
    const completedAt = task.completed_at ? new Date(task.completed_at) : null;
    return completedAt && completedAt > twoHoursAgo;
  });
  
  // Calculate cognitive load from recent tasks
  const recentCognitiveLoad = recentTasks.reduce((sum, task) => {
    const taskType = inferTaskType(task);
    const energyMap = TASK_TYPE_ENERGY_MAP[taskType];
    return sum + (energyMap?.optimal || 5);
  }, 0);
  
  // Determine if we're in a low energy period
  const currentHour = now.getHours();
  const isLowEnergyPeriod = schedule.lowHours.some(range => {
    const [start, end] = range.split('-').map(h => parseInt(h.split(':')[0]));
    return currentHour >= start && currentHour < end;
  });
  
  // Suggest short break if working for more than 90 minutes
  if (workDurationSinceBreak >= 90 && workDurationSinceBreak < 120) {
    suggestions.push({
      type: 'short',
      duration: 5,
      reason: 'You\'ve been working for over 90 minutes. A quick break can help maintain focus.',
      suggestedTime: new Date(now.getTime() + 5 * 60 * 1000),
      activities: [
        'Stand up and stretch',
        'Get a glass of water',
        'Look away from screen (20-20-20 rule)',
        'Take a few deep breaths'
      ]
    });
  }
  
  // Suggest medium break if working for more than 2 hours
  if (workDurationSinceBreak >= 120) {
    suggestions.push({
      type: 'medium',
      duration: 15,
      reason: 'You\'ve been working for over 2 hours. A proper break will help prevent burnout.',
      suggestedTime: new Date(now.getTime() + 10 * 60 * 1000),
      activities: [
        'Take a short walk',
        'Have a healthy snack',
        'Do some light stretching',
        'Chat with a colleague',
        'Step outside for fresh air'
      ]
    });
  }
  
  // Suggest break during low energy periods
  if (isLowEnergyPeriod && currentEnergy <= 4) {
    suggestions.push({
      type: 'medium',
      duration: 20,
      reason: 'This is typically a low-energy period for you. Consider taking a longer break.',
      suggestedTime: now,
      activities: [
        'Take a power nap (15-20 min)',
        'Meditate or practice mindfulness',
        'Do light exercise or yoga',
        'Listen to calming music',
        'Have a caffeinated beverage (if before 2 PM)'
      ]
    });
  }
  
  // Suggest long break if high cognitive load
  if (recentCognitiveLoad >= 20) {
    suggestions.push({
      type: 'long',
      duration: 30,
      reason: 'You\'ve completed several demanding tasks. A longer break will help recovery.',
      suggestedTime: new Date(now.getTime() + 15 * 60 * 1000),
      activities: [
        'Take a 30-minute walk',
        'Have lunch or a proper meal',
        'Read something unrelated to work',
        'Call a friend or family member',
        'Engage in a hobby briefly'
      ]
    });
  }
  
  // Suggest break if energy is very low
  if (currentEnergy <= 3 && workDurationSinceBreak >= 60) {
    suggestions.push({
      type: 'long',
      duration: 30,
      reason: 'Your energy level is very low. Consider taking a break or switching to easier tasks.',
      suggestedTime: now,
      activities: [
        'Rest and recharge',
        'Do something you enjoy',
        'Avoid demanding tasks',
        'Consider ending work for the day if possible'
      ]
    });
  }
  
  // Remove duplicates and sort by urgency
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
    index === self.findIndex(s => s.type === suggestion.type)
  );
  
  return uniqueSuggestions.sort((a, b) => {
    // Prioritize by type: long > medium > short
    const typeOrder = { long: 0, medium: 1, short: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

/**
 * Check if user should take a break based on Pomodoro technique
 */
export function shouldTakePomodoroBreak(
  workStartTime: Date,
  completedPomodoros: number
): { shouldBreak: boolean; breakType: 'short' | 'long'; duration: number } {
  const now = new Date();
  const workDuration = (now.getTime() - workStartTime.getTime()) / (1000 * 60); // minutes
  
  // Standard Pomodoro: 25 min work, 5 min break, long break after 4 pomodoros
  if (workDuration >= 25) {
    if (completedPomodoros > 0 && completedPomodoros % 4 === 0) {
      return { shouldBreak: true, breakType: 'long', duration: 15 };
    }
    return { shouldBreak: true, breakType: 'short', duration: 5 };
  }
  
  return { shouldBreak: false, breakType: 'short', duration: 0 };
}


