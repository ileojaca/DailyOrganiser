/**
 * Life Balance Engine
 * 
 * Calculates life balance scores and provides recommendations
 * for achieving better work-life balance.
 */

import type { BalanceScore, TimeAllocation, LifeCategory } from '@/types/lifeManagement';

// Default life categories with targets
const DEFAULT_CATEGORIES: LifeCategory[] = [
  {
    id: 'work',
    name: 'Work',
    color: '#3B82F6',
    icon: '💼',
    targetHoursPerWeek: 40,
    minHoursPerWeek: 30,
    maxHoursPerWeek: 50,
  },
  {
    id: 'family',
    name: 'Family',
    color: '#EC4899',
    icon: '👨‍👩‍👧‍👦',
    targetHoursPerWeek: 15,
    minHoursPerWeek: 10,
    maxHoursPerWeek: 25,
  },
  {
    id: 'health',
    name: 'Health',
    color: '#10B981',
    icon: '🏃',
    targetHoursPerWeek: 10,
    minHoursPerWeek: 5,
    maxHoursPerWeek: 15,
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#8B5CF6',
    icon: '🌟',
    targetHoursPerWeek: 10,
    minHoursPerWeek: 5,
    maxHoursPerWeek: 20,
  },
  {
    id: 'social',
    name: 'Social',
    color: '#F59E0B',
    icon: '👥',
    targetHoursPerWeek: 8,
    minHoursPerWeek: 3,
    maxHoursPerWeek: 15,
  },
  {
    id: 'rest',
    name: 'Rest',
    color: '#06B6D4',
    icon: '😴',
    targetHoursPerWeek: 56, // 8 hours per night
    minHoursPerWeek: 49,
    maxHoursPerWeek: 63,
  },
];

export class LifeBalanceEngine {
  private categories: LifeCategory[];

  constructor(categories?: LifeCategory[]) {
    this.categories = categories || DEFAULT_CATEGORIES;
  }

  /**
   * Calculate balance score from time allocations
   */
  calculateBalanceScore(allocations: TimeAllocation[]): BalanceScore {
    const categoryScores: Record<string, number> = {};
    let totalDeviation = 0;
    let totalWeight = 0;

    // Calculate score for each category
    allocations.forEach(allocation => {
      const category = this.categories.find(c => c.id === allocation.category);
      if (!category) return;

      // Calculate how close to target (0-100)
      const deviation = Math.abs(allocation.deviation);
      const maxDeviation = category.targetHoursPerWeek * 0.5; // 50% deviation is max
      const score = Math.max(0, 100 - (deviation / maxDeviation) * 100);

      categoryScores[allocation.category] = Math.round(score);
      totalDeviation += deviation;
      totalWeight += category.targetHoursPerWeek;
    });

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      Object.values(categoryScores).reduce((sum, score) => sum + score, 0) /
      Object.keys(categoryScores).length
    );

    // Determine trend
    const trend = this.determineTrend(categoryScores);

    // Generate insights
    const insights = this.generateInsights(allocations, categoryScores);

    // Generate recommendations
    const recommendations = this.generateRecommendations(allocations, categoryScores);

    return {
      overall: overallScore,
      categories: categoryScores,
      trend,
      insights,
      recommendations,
      calculatedAt: new Date(),
    };
  }

  /**
   * Determine trend based on category scores
   */
  private determineTrend(categoryScores: Record<string, number>): 'improving' | 'stable' | 'declining' {
    const scores = Object.values(categoryScores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore >= 70) return 'improving';
    if (avgScore >= 50) return 'stable';
    return 'declining';
  }

  /**
   * Generate insights from allocations
   */
  private generateInsights(
    allocations: TimeAllocation[],
    categoryScores: Record<string, number>
  ): string[] {
    const insights: string[] = [];

    // Find best and worst categories
    const sortedCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a);

    if (sortedCategories.length > 0) {
      const [bestCategory, bestScore] = sortedCategories[0];
      const category = this.categories.find(c => c.id === bestCategory);
      if (category && bestScore >= 80) {
        insights.push(`Great job maintaining balance in ${category.name}!`);
      }
    }

    if (sortedCategories.length > 1) {
      const [worstCategory, worstScore] = sortedCategories[sortedCategories.length - 1];
      const category = this.categories.find(c => c.id === worstCategory);
      if (category && worstScore < 50) {
        insights.push(`${category.name} needs attention - consider allocating more time.`);
      }
    }

    // Check for overwork
    const workAllocation = allocations.find(a => a.category === 'work');
    if (workAllocation && workAllocation.hours > 50) {
      insights.push('You\'re working over 50 hours. Consider setting boundaries.');
    }

    // Check for sleep deprivation
    const restAllocation = allocations.find(a => a.category === 'rest');
    if (restAllocation && restAllocation.hours < 49) {
      insights.push('You\'re getting less than 7 hours of sleep. Prioritize rest.');
    }

    return insights;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(
    allocations: TimeAllocation[],
    categoryScores: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    allocations.forEach(allocation => {
      const category = this.categories.find(c => c.id === allocation.category);
      if (!category) return;

      const score = categoryScores[allocation.category];

      if (score < 50) {
        if (allocation.deviation < 0) {
          // Under target
          recommendations.push(
            `Increase ${category.name} time by ${Math.abs(allocation.deviation).toFixed(1)} hours/week`
          );
        } else {
          // Over target
          recommendations.push(
            `Reduce ${category.name} time by ${allocation.deviation.toFixed(1)} hours/week`
          );
        }
      }
    });

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push('Maintain your current balance - you\'re doing great!');
    }

    return recommendations;
  }

  /**
   * Calculate time allocations from hours spent
   */
  calculateAllocations(hoursSpent: Record<string, number>): TimeAllocation[] {
    return this.categories.map(category => {
      const hours = hoursSpent[category.id] || 0;
      const totalHours = Object.values(hoursSpent).reduce((a, b) => a + b, 0);
      const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
      const deviation = hours - category.targetHoursPerWeek;

      return {
        category: category.id,
        hours,
        percentage: Math.round(percentage * 10) / 10,
        target: category.targetHoursPerWeek,
        deviation: Math.round(deviation * 10) / 10,
      };
    });
  }

  /**
   * Get category by ID
   */
  getCategory(id: string): LifeCategory | undefined {
    return this.categories.find(c => c.id === id);
  }

  /**
   * Get all categories
   */
  getCategories(): LifeCategory[] {
    return [...this.categories];
  }

  /**
   * Update category targets
   */
  updateCategoryTargets(categoryId: string, targetHours: number): void {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      category.targetHoursPerWeek = targetHours;
    }
  }

  /**
   * Get balance status label
   */
  getBalanceStatus(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  }

  /**
   * Get balance color
   */
  getBalanceColor(score: number): string {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#3B82F6'; // Blue
    if (score >= 40) return '#F59E0B'; // Yellow
    if (score >= 20) return '#F97316'; // Orange
    return '#EF4444'; // Red
  }
}

// Export singleton instance
export const lifeBalanceEngine = new LifeBalanceEngine();
