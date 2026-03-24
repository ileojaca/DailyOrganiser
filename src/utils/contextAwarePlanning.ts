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

export interface Task {
  id: string;
  title: string;
  priority: number; // 1-5
  estimatedDuration: number; // minutes
  energyRequired: number; // 1-10
  category: string;
  context?: Partial<TaskContext>;
  deadline?: Date;
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
 * Generate planning suggestions based on energy, importance, and context
 */
export function generatePlanningSuggestions(
  tasks: Task[],
  userEnergy: number,
  context: TaskContext,
  availableTimeBlocks: { start: Date; end: Date }[]
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
    
    // Calculate priority score (0-1)
    const priorityScore = task.priority / 5;
    
    // Calculate overall confidence
    const confidence = (
      energyAlignment.score * 0.4 +
      contextCompatibility.score * 0.3 +
      priorityScore * 0.3
    );
    
    // Find best time block
    const recommendedTime = findOptimalTimeBlock(
      task,
      availableTimeBlocks,
      userEnergy,
      energyAlignment.alignment
    );
    
    suggestions.push({
      taskId: task.id,
      recommendedTime: recommendedTime?.toISOString() || new Date().toISOString(),
      confidence,
      rationale: generateRationale(task, energyAlignment, contextCompatibility, priorityScore),
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
 * Find optimal time block for a task
 */
function findOptimalTimeBlock(
  task: Task,
  timeBlocks: { start: Date; end: Date }[],
  userEnergy: number,
  energyAlignment: string
): Date | null {
  if (timeBlocks.length === 0) return null;
  
  // For high energy tasks, prefer earlier time blocks
  if (task.energyRequired && task.energyRequired >= 7) {
    return timeBlocks[0].start;
  }
  
  // For low energy tasks, prefer later time blocks
  if (task.energyRequired && task.energyRequired <= 3) {
    return timeBlocks[timeBlocks.length - 1].start;
  }
  
  // Default to first available
  return timeBlocks[0].start;
}

/**
 * Generate human-readable rationale for suggestion
 */
function generateRationale(
  task: Task,
  energyAlignment: { alignment: string; score: number },
  contextCompatibility: { compatibility: string; score: number },
  priorityScore: number
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

export default TaskDashboard;
