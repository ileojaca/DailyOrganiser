/**
 * Predictive Analytics Utility
 * 
 * Provides predictive analytics and forecasting for productivity,
 * burnout risk, and life balance trends.
 */

import type { BurnoutPrediction, FamilyNeglectPrediction } from '@/types/lifeManagement';

interface ProductivityDataPoint {
  date: Date;
  tasksCompleted: number;
  hoursWorked: number;
  qualityScore: number;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // percentage change
  confidence: number; // 0-1
}

export class PredictiveAnalytics {
  /**
   * Predict burnout risk based on work patterns
   */
  predictBurnoutRisk(
    workHours: number[],
    sleepQuality: number[],
    socialInteractions: number[],
    stressLevel: number[]
  ): BurnoutPrediction {
    // Calculate risk factors
    const avgWorkHours = this.average(workHours);
    const avgSleepQuality = this.average(sleepQuality);
    const avgSocial = this.average(socialInteractions);
    const avgStress = this.average(stressLevel);

    // Calculate risk score (0-100)
    let riskScore = 0;

    // Work hours factor (0-30 points)
    if (avgWorkHours > 60) riskScore += 30;
    else if (avgWorkHours > 50) riskScore += 20;
    else if (avgWorkHours > 45) riskScore += 10;

    // Sleep quality factor (0-25 points)
    if (avgSleepQuality < 5) riskScore += 25;
    else if (avgSleepQuality < 6) riskScore += 15;
    else if (avgSleepQuality < 7) riskScore += 5;

    // Social interaction factor (0-25 points)
    if (avgSocial < 2) riskScore += 25;
    else if (avgSocial < 4) riskScore += 15;
    else if (avgSocial < 6) riskScore += 5;

    // Stress level factor (0-20 points)
    riskScore += avgStress * 2;

    // Determine risk level
    let riskLevel: BurnoutPrediction['riskLevel'];
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    // Calculate confidence based on data consistency
    const confidence = this.calculateConfidence([
      workHours,
      sleepQuality,
      socialInteractions,
      stressLevel,
    ]);

    // Generate factors
    const factors: string[] = [];
    if (avgWorkHours > 50) factors.push('Working excessive hours');
    if (avgSleepQuality < 6) factors.push('Poor sleep quality');
    if (avgSocial < 4) factors.push('Limited social interactions');
    if (avgStress > 7) factors.push('High stress levels');

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgWorkHours > 50) recommendations.push('Reduce work hours to under 50 per week');
    if (avgSleepQuality < 6) recommendations.push('Improve sleep hygiene and aim for 7-8 hours');
    if (avgSocial < 4) recommendations.push('Schedule regular social activities');
    if (avgStress > 7) recommendations.push('Practice stress management techniques');

    // Estimate time to burnout
    const timeToBurnout = this.estimateTimeToBurnout(riskScore);

    return {
      userId: '',
      riskLevel,
      confidence,
      factors,
      recommendations,
      timeToBurnout,
      predictedAt: new Date(),
    };
  }

  /**
   * Predict family neglect risk
   */
  predictFamilyNeglectRisk(
    familyHoursPerWeek: number[],
    lastInteractionDays: number,
    missedEvents: number
  ): FamilyNeglectPrediction {
    const avgFamilyHours = this.average(familyHoursPerWeek);

    // Calculate risk level
    let riskLevel: FamilyNeglectPrediction['riskLevel'];
    if (avgFamilyHours < 5 || lastInteractionDays > 7 || missedEvents > 3) {
      riskLevel = 'high';
    } else if (avgFamilyHours < 10 || lastInteractionDays > 3 || missedEvents > 1) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate recommended actions
    const recommendedActions: string[] = [];
    if (avgFamilyHours < 10) {
      recommendedActions.push('Schedule at least 10 hours of family time per week');
    }
    if (lastInteractionDays > 3) {
      recommendedActions.push('Plan a family activity this weekend');
    }
    if (missedEvents > 0) {
      recommendedActions.push('Attend the next family event');
    }

    // Generate connection prompts
    const connectionPrompts: string[] = [];
    if (lastInteractionDays > 1) {
      connectionPrompts.push('Call or message a family member today');
    }
    if (avgFamilyHours < 15) {
      connectionPrompts.push('Plan a family dinner this week');
    }

    return {
      userId: '',
      riskLevel,
      lastInteraction: new Date(Date.now() - lastInteractionDays * 24 * 60 * 60 * 1000),
      recommendedActions,
      connectionPrompts,
      predictedAt: new Date(),
    };
  }

  /**
   * Analyze productivity trends
   */
  analyzeProductivityTrend(data: ProductivityDataPoint[]): TrendAnalysis {
    if (data.length < 2) {
      return { direction: 'stable', magnitude: 0, confidence: 0 };
    }

    // Calculate moving averages
    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);

    const recentAvg = this.average(recent.map(d => d.tasksCompleted));
    const previousAvg = this.average(previous.map(d => d.tasksCompleted));

    // Calculate change
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    // Determine direction
    let direction: TrendAnalysis['direction'];
    if (change > 5) direction = 'up';
    else if (change < -5) direction = 'down';
    else direction = 'stable';

    // Calculate confidence based on data consistency
    const confidence = Math.min(1, data.length / 30);

    return {
      direction,
      magnitude: Math.abs(change),
      confidence,
    };
  }

  /**
   * Forecast future productivity
   */
  forecastProductivity(
    historicalData: ProductivityDataPoint[],
    daysAhead: number
  ): number[] {
    if (historicalData.length < 7) {
      return Array(daysAhead).fill(0);
    }

    // Calculate trend
    const trend = this.analyzeProductivityTrend(historicalData);
    const lastValue = historicalData[historicalData.length - 1].tasksCompleted;

    // Simple linear forecast
    const forecast: number[] = [];
    for (let i = 1; i <= daysAhead; i++) {
      const change = trend.direction === 'up' ? 0.05 : trend.direction === 'down' ? -0.05 : 0;
      const predicted = lastValue * (1 + change * i);
      forecast.push(Math.max(0, Math.round(predicted)));
    }

    return forecast;
  }

  /**
   * Calculate average of array
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate confidence based on data consistency
   */
  private calculateConfidence(dataArrays: number[][]): number {
    let totalVariance = 0;
    let count = 0;

    dataArrays.forEach(arr => {
      if (arr.length > 1) {
        const avg = this.average(arr);
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
        totalVariance += variance;
        count++;
      }
    });

    if (count === 0) return 0;

    // Lower variance = higher confidence
    const avgVariance = totalVariance / count;
    const confidence = Math.max(0, 1 - avgVariance / 100);
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Estimate time to burnout based on risk score
   */
  private estimateTimeToBurnout(riskScore: number): number {
    if (riskScore >= 80) return 7; // 1 week
    if (riskScore >= 60) return 14; // 2 weeks
    if (riskScore >= 40) return 30; // 1 month
    if (riskScore >= 20) return 60; // 2 months
    return 90; // 3+ months
  }

  /**
   * Detect anomalies in data
   */
  detectAnomalies(data: number[], threshold: number = 2): number[] {
    if (data.length < 3) return [];

    const mean = this.average(data);
    const stdDev = Math.sqrt(
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    );

    const anomalies: number[] = [];
    data.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push(index);
      }
    });

    return anomalies;
  }

  /**
   * Calculate correlation between two datasets
   */
  calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    if (denominator === 0) return 0;
    return numerator / denominator;
  }
}

// Export singleton instance
export const predictiveAnalytics = new PredictiveAnalytics();
