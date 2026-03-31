/**
 * Goal Decomposition Utility
 * 
 * Breaks down goals into actionable tasks and subtasks
 * with intelligent scheduling and prioritization.
 */

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: Date;
  priority: 'high' | 'medium' | 'low';
}

interface Task {
  id: string;
  goalId: string;
  title: string;
  description: string;
  estimatedDuration: number; // minutes
  priority: 'high' | 'medium' | 'low';
  dependencies: string[]; // Task IDs
  dueDate?: Date;
  completed: boolean;
}

interface DecompositionResult {
  tasks: Task[];
  timeline: Array<{
    week: number;
    tasks: Task[];
    focus: string;
  }>;
  milestones: Array<{
    date: Date;
    description: string;
    tasks: string[];
  }>;
}

export class GoalDecomposition {
  /**
   * Decompose a goal into tasks
   */
  decompose(goal: Goal, availableHoursPerWeek: number = 10): DecompositionResult {
    // Generate tasks based on goal category
    const tasks = this.generateTasks(goal);

    // Calculate timeline
    const timeline = this.calculateTimeline(tasks, goal.targetDate, availableHoursPerWeek);

    // Generate milestones
    const milestones = this.generateMilestones(tasks, goal.targetDate);

    return {
      tasks,
      timeline,
      milestones,
    };
  }

  /**
   * Generate tasks based on goal category
   */
  private generateTasks(goal: Goal): Task[] {
    const tasks: Task[] = [];
    const baseId = `task_${Date.now()}`;

    switch (goal.category) {
      case 'health':
        tasks.push(
          {
            id: `${baseId}_1`,
            goalId: goal.id,
            title: 'Research and plan',
            description: 'Research best practices and create a detailed plan',
            estimatedDuration: 120,
            priority: 'high',
            dependencies: [],
            completed: false,
          },
          {
            id: `${baseId}_2`,
            goalId: goal.id,
            title: 'Set up tracking system',
            description: 'Create a system to track progress',
            estimatedDuration: 60,
            priority: 'medium',
            dependencies: [`${baseId}_1`],
            completed: false,
          },
          {
            id: `${baseId}_3`,
            goalId: goal.id,
            title: 'Start weekly routine',
            description: 'Begin implementing the plan',
            estimatedDuration: 180,
            priority: 'high',
            dependencies: [`${baseId}_2`],
            completed: false,
          },
          {
            id: `${baseId}_4`,
            goalId: goal.id,
            title: 'Review and adjust',
            description: 'Evaluate progress and make adjustments',
            estimatedDuration: 60,
            priority: 'medium',
            dependencies: [`${baseId}_3`],
            completed: false,
          }
        );
        break;

      case 'learning':
        tasks.push(
          {
            id: `${baseId}_1`,
            goalId: goal.id,
            title: 'Identify resources',
            description: 'Find books, courses, and materials',
            estimatedDuration: 90,
            priority: 'high',
            dependencies: [],
            completed: false,
          },
          {
            id: `${baseId}_2`,
            goalId: goal.id,
            title: 'Create study schedule',
            description: 'Plan regular study sessions',
            estimatedDuration: 60,
            priority: 'medium',
            dependencies: [`${baseId}_1`],
            completed: false,
          },
          {
            id: `${baseId}_3`,
            goalId: goal.id,
            title: 'Complete first module',
            description: 'Finish initial learning phase',
            estimatedDuration: 240,
            priority: 'high',
            dependencies: [`${baseId}_2`],
            completed: false,
          },
          {
            id: `${baseId}_4`,
            goalId: goal.id,
            title: 'Practice and apply',
            description: 'Apply what you\'ve learned',
            estimatedDuration: 180,
            priority: 'high',
            dependencies: [`${baseId}_3`],
            completed: false,
          }
        );
        break;

      case 'work':
        tasks.push(
          {
            id: `${baseId}_1`,
            goalId: goal.id,
            title: 'Define success metrics',
            description: 'Clearly define what success looks like',
            estimatedDuration: 60,
            priority: 'high',
            dependencies: [],
            completed: false,
          },
          {
            id: `${baseId}_2`,
            goalId: goal.id,
            title: 'Break into milestones',
            description: 'Divide goal into achievable milestones',
            estimatedDuration: 90,
            priority: 'high',
            dependencies: [`${baseId}_1`],
            completed: false,
          },
          {
            id: `${baseId}_3`,
            goalId: goal.id,
            title: 'Execute first milestone',
            description: 'Complete the first major milestone',
            estimatedDuration: 300,
            priority: 'high',
            dependencies: [`${baseId}_2`],
            completed: false,
          },
          {
            id: `${baseId}_4`,
            goalId: goal.id,
            title: 'Review and iterate',
            description: 'Evaluate progress and plan next steps',
            estimatedDuration: 60,
            priority: 'medium',
            dependencies: [`${baseId}_3`],
            completed: false,
          }
        );
        break;

      default:
        tasks.push(
          {
            id: `${baseId}_1`,
            goalId: goal.id,
            title: 'Plan and prepare',
            description: 'Create a plan and gather resources',
            estimatedDuration: 120,
            priority: 'high',
            dependencies: [],
            completed: false,
          },
          {
            id: `${baseId}_2`,
            goalId: goal.id,
            title: 'Take first action',
            description: 'Complete the first actionable step',
            estimatedDuration: 180,
            priority: 'high',
            dependencies: [`${baseId}_1`],
            completed: false,
          },
          {
            id: `${baseId}_3`,
            goalId: goal.id,
            title: 'Build momentum',
            description: 'Continue making progress',
            estimatedDuration: 240,
            priority: 'medium',
            dependencies: [`${baseId}_2`],
            completed: false,
          },
          {
            id: `${baseId}_4`,
            goalId: goal.id,
            title: 'Complete and celebrate',
            description: 'Finish the goal and celebrate success',
            estimatedDuration: 60,
            priority: 'medium',
            dependencies: [`${baseId}_3`],
            completed: false,
          }
        );
    }

    return tasks;
  }

  /**
   * Calculate timeline for tasks
   */
  private calculateTimeline(
    tasks: Task[],
    targetDate: Date,
    availableHoursPerWeek: number
  ): Array<{ week: number; tasks: Task[]; focus: string }> {
    const timeline: Array<{ week: number; tasks: Task[]; focus: string }> = [];
    const now = new Date();
    const weeksUntilTarget = Math.ceil(
      (targetDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    const availableMinutesPerWeek = availableHoursPerWeek * 60;
    let currentWeek = 1;
    let currentWeekMinutes = 0;
    let currentWeekTasks: Task[] = [];

    // Sort tasks by dependencies
    const sortedTasks = this.topologicalSort(tasks);

    for (const task of sortedTasks) {
      if (currentWeekMinutes + task.estimatedDuration <= availableMinutesPerWeek) {
        currentWeekTasks.push(task);
        currentWeekMinutes += task.estimatedDuration;
      } else {
        // Start new week
        if (currentWeekTasks.length > 0) {
          timeline.push({
            week: currentWeek,
            tasks: currentWeekTasks,
            focus: this.getWeekFocus(currentWeekTasks),
          });
        }
        currentWeek++;
        currentWeekTasks = [task];
        currentWeekMinutes = task.estimatedDuration;
      }
    }

    // Add last week
    if (currentWeekTasks.length > 0) {
      timeline.push({
        week: currentWeek,
        tasks: currentWeekTasks,
        focus: this.getWeekFocus(currentWeekTasks),
      });
    }

    return timeline;
  }

  /**
   * Topological sort for tasks with dependencies
   */
  private topologicalSort(tasks: Task[]): Task[] {
    const sorted: Task[] = [];
    const visited = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
        sorted.push(task);
      }
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return sorted;
  }

  /**
   * Get focus description for a week
   */
  private getWeekFocus(tasks: Task[]): string {
    const priorities = tasks.map(t => t.priority);
    const highPriorityCount = priorities.filter(p => p === 'high').length;

    if (highPriorityCount > 1) {
      return 'Critical execution week';
    } else if (tasks.length > 2) {
      return 'Build momentum';
    } else {
      return 'Steady progress';
    }
  }

  /**
   * Generate milestones
   */
  private generateMilestones(
    tasks: Task[],
    targetDate: Date
  ): Array<{ date: Date; description: string; tasks: string[] }> {
    const milestones: Array<{ date: Date; description: string; tasks: string[] }> = [];
    const now = new Date();
    const totalDuration = targetDate.getTime() - now.getTime();

    // Create milestones at 25%, 50%, 75%, and 100%
    const milestonePoints = [0.25, 0.5, 0.75, 1.0];
    const milestoneDescriptions = [
      'Foundation complete',
      'Halfway milestone',
      'Final push',
      'Goal achieved!',
    ];

    for (let i = 0; i < milestonePoints.length; i++) {
      const milestoneDate = new Date(
        now.getTime() + totalDuration * milestonePoints[i]
      );

      // Find tasks that should be completed by this milestone
      const tasksForMilestone = tasks
        .filter((_, index) => index < Math.ceil(tasks.length * milestonePoints[i]))
        .map(t => t.id);

      milestones.push({
        date: milestoneDate,
        description: milestoneDescriptions[i],
        tasks: tasksForMilestone,
      });
    }

    return milestones;
  }

  /**
   * Calculate task priority score
   */
  calculatePriorityScore(task: Task, goal: Goal): number {
    let score = 0;

    // Priority weight
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    score += priorityWeights[task.priority] * 10;

    // Dependency weight (tasks with no dependencies are easier to start)
    if (task.dependencies.length === 0) {
      score += 5;
    }

    // Duration weight (shorter tasks are easier to complete)
    score += Math.max(0, 10 - (task.estimatedDuration / 60));

    return score;
  }

  /**
   * Get next actionable tasks
   */
  getNextTasks(tasks: Task[], completedTaskIds: string[]): Task[] {
    return tasks.filter(task => {
      // Skip completed tasks
      if (completedTaskIds.includes(task.id)) {
        return false;
      }

      // Check if all dependencies are completed
      const allDepsCompleted = task.dependencies.every(depId =>
        completedTaskIds.includes(depId)
      );

      return allDepsCompleted;
    });
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }
}

// Export singleton instance
export const goalDecomposition = new GoalDecomposition();
