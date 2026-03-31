/**
 * Work-Life Balance Engine
 * 
 * Provides comprehensive work-life balance tracking, scoring, and recommendations
 */

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
}

export interface TimeAllocation {
  category: string;
  hours: number;
  percentage: number;
  target: number;
  deviation: number;
}

// Default life categories
export const LIFE_CATEGORIES: LifeCategory[] = [
  {
    id: 'work',
    name: 'Work',
    color: '#3B82F6',
    icon: '💼',
    targetHoursPerWeek: 40,
    minHoursPerWeek: 35,
    maxHoursPerWeek: 50,
  },
  {
    id: 'family',
    name: 'Family',
    color: '#EC4899',
    icon: '👨‍👩‍👧‍👦',
    targetHoursPerWeek: 20,
    minHoursPerWeek: 15,
    maxHoursPerWeek: 30,
  },
  {
    id: 'health',
    name: 'Health & Fitness',
    color: '#10B981',
    icon: '💪',
    targetHoursPerWeek: 7,
    minHoursPerWeek: 4,
    maxHoursPerWeek: 14,
  },
  {
    id: 'personal',
    name: 'Personal Growth',
    color: '#8B5CF6',
    icon: '📚',
    targetHoursPerWeek: 7,
    minHoursPerWeek: 3,
    maxHoursPerWeek: 14,
  },
  {
    id: 'social',
    name: 'Social',
    color: '#F59E0B',
    icon: '👥',
    targetHoursPerWeek: 7,
    minHoursPerWeek: 3,
    maxHoursPerWeek: 14,
  },
  {
    id: 'rest',
    name: 'Rest & Recovery',
    color: '#06B6D4',
    icon: '😴',
    targetHoursPerWeek: 56,
    minHoursPerWeek: 49,
    maxHoursPerWeek: 63,
  },
];

/**
 * Calculate work-life balance score
 */
export function calculateBalanceScore(
  timeAllocations: TimeAllocation[],
  historicalScores: number[] = []
): BalanceScore {
  const categoryScores: Record<string, number> = {};
  const insights: string[] = [];
  const recommendations: string[] = [];

  // Calculate score for each category
  for (const allocation of timeAllocations) {
    const category = LIFE_CATEGORIES.find(c => c.id === allocation.category);
    if (!category) continue;

    // Score based on how close to target
    const deviation = Math.abs(allocation.deviation);
    let score = 100;

    if (deviation > 0.5) {
      score = Math.max(0, 100 - (deviation * 100));
    }

    categoryScores[allocation.category] = score;

    // Generate insights
    if (allocation.deviation < -0.3) {
      insights.push(`${category.name} is below target (${allocation.hours}h vs ${category.targetHoursPerWeek}h)`);
      recommendations.push(`Consider allocating more time to ${category.name.toLowerCase()}`);
    } else if (allocation.deviation > 0.3) {
      insights.push(`${category.name} is above target (${allocation.hours}h vs ${category.targetHoursPerWeek}h)`);
      recommendations.push(`Consider reducing time spent on ${category.name.toLowerCase()}`);
    }
  }

  // Calculate overall score (weighted average)
  const weights: Record<string, number> = {
    work: 0.25,
    family: 0.25,
    health: 0.15,
    personal: 0.15,
    social: 0.1,
    rest: 0.1,
  };

  let overallScore = 0;
  let totalWeight = 0;

  for (const [category, score] of Object.entries(categoryScores)) {
    const weight = weights[category] || 0.1;
    overallScore += score * weight;
    totalWeight += weight;
  }

  overallScore = totalWeight > 0 ? overallScore / totalWeight : 0;

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (historicalScores.length >= 3) {
    const recent = historicalScores.slice(-3);
    const older = historicalScores.slice(-6, -3);
    
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }
  }

  return {
    overall: Math.round(overallScore),
    categories: categoryScores,
    trend,
    insights,
    recommendations,
  };
}

/**
 * Calculate time allocation from logs
 */
export function calculateTimeAllocation(
  logs: Array<{ category: string; duration: number }>,
  startDate: Date,
  endDate: Date
): TimeAllocation[] {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = days / 7;

  // Group by category
  const categoryHours: Record<string, number> = {};
  for (const log of logs) {
    categoryHours[log.category] = (categoryHours[log.category] || 0) + (log.duration / 60);
  }

  // Calculate allocations
  const allocations: TimeAllocation[] = [];
  const totalHours = Object.values(categoryHours).reduce((a, b) => a + b, 0);

  for (const category of LIFE_CATEGORIES) {
    const hours = categoryHours[category.id] || 0;
    const hoursPerWeek = hours / weeks;
    const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
    const target = category.targetHoursPerWeek;
    const deviation = target > 0 ? (hoursPerWeek - target) / target : 0;

    allocations.push({
      category: category.id,
      hours: Math.round(hoursPerWeek * 10) / 10,
      percentage: Math.round(percentage),
      target,
      deviation: Math.round(deviation * 100) / 100,
    });
  }

  return allocations;
}

/**
 * Generate work-life balance recommendations
 */
export function generateBalanceRecommendations(
  score: BalanceScore,
  timeAllocations: TimeAllocation[]
): string[] {
  const recommendations: string[] = [];

  // Check for overwork
  const workAllocation = timeAllocations.find(a => a.category === 'work');
  if (workAllocation && workAllocation.hours > 50) {
    recommendations.push('⚠️ You\'re working over 50 hours/week. Consider setting stricter work boundaries.');
  }

  // Check for insufficient rest
  const restAllocation = timeAllocations.find(a => a.category === 'rest');
  if (restAllocation && restAllocation.hours < 49) {
    recommendations.push('😴 You\'re getting less than 7 hours of rest per day. Prioritize sleep for better productivity.');
  }

  // Check for family time
  const familyAllocation = timeAllocations.find(a => a.category === 'family');
  if (familyAllocation && familyAllocation.hours < 15) {
    recommendations.push('👨‍👩‍👧‍👦 Consider allocating more time for family activities.');
  }

  // Check for health
  const healthAllocation = timeAllocations.find(a => a.category === 'health');
  if (healthAllocation && healthAllocation.hours < 4) {
    recommendations.push('💪 Try to include at least 30 minutes of exercise daily.');
  }

  // Check for personal growth
  const personalAllocation = timeAllocations.find(a => a.category === 'personal');
  if (personalAllocation && personalAllocation.hours < 3) {
    recommendations.push('📚 Dedicate time for learning and personal development.');
  }

  // Add general recommendations based on score
  if (score.overall < 50) {
    recommendations.push('🎯 Your work-life balance needs attention. Consider reviewing your schedule.');
  } else if (score.overall < 70) {
    recommendations.push('👍 Good balance! Small adjustments could improve your well-being.');
  } else {
    recommendations.push('🌟 Excellent work-life balance! Keep up the great work.');
  }

  return recommendations;
}

/**
 * Get optimal time for category based on chronotype
 */
export function getOptimalTimeForCategory(
  category: string,
  chronotype: 'lark' | 'owl' | 'intermediate'
): string[] {
  const schedules: Record<string, Record<string, string[]>> = {
    work: {
      lark: ['09:00-12:00', '14:00-17:00'],
      intermediate: ['10:00-12:00', '15:00-18:00'],
      owl: ['11:00-14:00', '16:00-20:00'],
    },
    family: {
      lark: ['17:00-20:00'],
      intermediate: ['18:00-21:00'],
      owl: ['19:00-22:00'],
    },
    health: {
      lark: ['06:00-07:00', '17:00-18:00'],
      intermediate: ['07:00-08:00', '18:00-19:00'],
      owl: ['08:00-09:00', '19:00-20:00'],
    },
    personal: {
      lark: ['06:00-07:00', '20:00-21:00'],
      intermediate: ['07:00-08:00', '21:00-22:00'],
      owl: ['08:00-09:00', '22:00-23:00'],
    },
    social: {
      lark: ['18:00-20:00'],
      intermediate: ['19:00-21:00'],
      owl: ['20:00-22:00'],
    },
    rest: {
      lark: ['22:00-06:00'],
      intermediate: ['23:00-07:00'],
      owl: ['00:00-08:00'],
    },
  };

  return schedules[category]?.[chronotype] || schedules[category]?.intermediate || [];
}
