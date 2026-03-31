/**
 * Sleep Analysis Utility
 * 
 * Analyzes sleep patterns and provides recommendations
 * for improving sleep quality and consistency.
 */

import type { SleepRecord, SleepAnalysis as SleepAnalysisType } from '@/types/lifeManagement';

export class SleepAnalysis {
  /**
   * Analyze sleep records and generate insights
   */
  analyze(records: SleepRecord[]): SleepAnalysisType {
    if (records.length === 0) {
      return this.getEmptyAnalysis();
    }

    // Calculate averages
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const totalQuality = records.reduce((sum, r) => sum + r.quality, 0);
    const avgDuration = totalDuration / records.length;
    const avgQuality = totalQuality / records.length;

    // Calculate sleep debt (assuming 8 hours is optimal)
    const optimalSleep = 8 * 60; // 8 hours in minutes
    const sleepDebt = records.reduce((debt, r) => {
      return debt + Math.max(0, optimalSleep - r.duration);
    }, 0) / 60; // Convert to hours

    // Find optimal bedtime
    const optimalBedtime = this.calculateOptimalBedtime(records);

    // Find optimal wake time
    const optimalWakeTime = this.calculateOptimalWakeTime(records);

    // Calculate sleep efficiency
    const avgAwakenings = records.reduce((sum, r) => sum + r.awakenings, 0) / records.length;
    const sleepEfficiency = Math.max(0, 100 - (avgAwakenings * 10));

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      avgDuration,
      avgQuality,
      sleepDebt,
      avgAwakenings
    );

    return {
      userId: records[0]?.userId || '',
      averageDuration: Math.round(avgDuration),
      averageQuality: Math.round(avgQuality * 10) / 10,
      sleepDebt: Math.round(sleepDebt * 10) / 10,
      optimalBedtime,
      optimalWakeTime,
      sleepEfficiency: Math.round(sleepEfficiency),
      recommendations,
      analyzedAt: new Date(),
    };
  }

  /**
   * Calculate optimal bedtime based on patterns
   */
  private calculateOptimalBedtime(records: SleepRecord[]): string {
    const bedtimes = records.map(r => {
      const bedtime = new Date(r.bedtime);
      return bedtime.getHours() * 60 + bedtime.getMinutes();
    });

    const avgBedtimeMinutes = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const hours = Math.floor(avgBedtimeMinutes / 60);
    const minutes = Math.round(avgBedtimeMinutes % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate optimal wake time based on patterns
   */
  private calculateOptimalWakeTime(records: SleepRecord[]): string {
    const wakeTimes = records.map(r => {
      const wakeTime = new Date(r.wakeTime);
      return wakeTime.getHours() * 60 + wakeTime.getMinutes();
    });

    const avgWakeTimeMinutes = wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length;
    const hours = Math.floor(avgWakeTimeMinutes / 60);
    const minutes = Math.round(avgWakeTimeMinutes % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Generate recommendations based on sleep data
   */
  private generateRecommendations(
    avgDuration: number,
    avgQuality: number,
    sleepDebt: number,
    avgAwakenings: number
  ): string[] {
    const recommendations: string[] = [];

    // Duration recommendations
    if (avgDuration < 7 * 60) {
      recommendations.push('Aim for at least 7 hours of sleep per night');
    } else if (avgDuration > 9 * 60) {
      recommendations.push('Consider reducing sleep to 7-9 hours for optimal rest');
    }

    // Quality recommendations
    if (avgQuality < 6) {
      recommendations.push('Improve sleep environment: dark, cool, and quiet');
      recommendations.push('Avoid screens 1 hour before bedtime');
    }

    // Sleep debt recommendations
    if (sleepDebt > 5) {
      recommendations.push('You have significant sleep debt. Consider catching up gradually');
    } else if (sleepDebt > 2) {
      recommendations.push('Try to get extra sleep on weekends to reduce debt');
    }

    // Awakenings recommendations
    if (avgAwakenings > 2) {
      recommendations.push('Reduce caffeine intake after 2 PM');
      recommendations.push('Consider relaxation techniques before bed');
    }

    // Consistency recommendations
    recommendations.push('Maintain consistent sleep and wake times');

    return recommendations;
  }

  /**
   * Get empty analysis for new users
   */
  private getEmptyAnalysis(): SleepAnalysisType {
    return {
      userId: '',
      averageDuration: 0,
      averageQuality: 0,
      sleepDebt: 0,
      optimalBedtime: '23:00',
      optimalWakeTime: '07:00',
      sleepEfficiency: 0,
      recommendations: ['Start tracking your sleep to receive personalized recommendations'],
      analyzedAt: new Date(),
    };
  }

  /**
   * Calculate sleep score (0-100)
   */
  calculateSleepScore(record: SleepRecord): number {
    let score = 0;

    // Duration score (0-40 points)
    const durationHours = record.duration / 60;
    if (durationHours >= 7 && durationHours <= 9) {
      score += 40;
    } else if (durationHours >= 6 && durationHours < 7) {
      score += 30;
    } else if (durationHours > 9 && durationHours <= 10) {
      score += 30;
    } else {
      score += 20;
    }

    // Quality score (0-40 points)
    score += (record.quality / 10) * 40;

    // Awakenings score (0-20 points)
    const awakeningsScore = Math.max(0, 20 - (record.awakenings * 5));
    score += awakeningsScore;

    return Math.round(score);
  }

  /**
   * Get sleep quality label
   */
  getQualityLabel(quality: number): string {
    if (quality >= 8) return 'Excellent';
    if (quality >= 6) return 'Good';
    if (quality >= 4) return 'Fair';
    return 'Poor';
  }

  /**
   * Get sleep quality color
   */
  getQualityColor(quality: number): string {
    if (quality >= 8) return '#10B981'; // Green
    if (quality >= 6) return '#3B82F6'; // Blue
    if (quality >= 4) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  }

  /**
   * Detect sleep patterns
   */
  detectPatterns(records: SleepRecord[]): string[] {
    const patterns: string[] = [];

    if (records.length < 7) return patterns;

    // Check for consistency
    const bedtimes = records.map(r => {
      const bedtime = new Date(r.bedtime);
      return bedtime.getHours() * 60 + bedtime.getMinutes();
    });

    const bedtimeVariance = this.calculateVariance(bedtimes);
    if (bedtimeVariance < 30) {
      patterns.push('Very consistent bedtime');
    } else if (bedtimeVariance > 120) {
      patterns.push('Inconsistent bedtime - try to regularize');
    }

    // Check for weekend vs weekday differences
    const weekdayRecords = records.filter(r => {
      const day = new Date(r.date).getDay();
      return day >= 1 && day <= 5;
    });

    const weekendRecords = records.filter(r => {
      const day = new Date(r.date).getDay();
      return day === 0 || day === 6;
    });

    if (weekdayRecords.length > 0 && weekendRecords.length > 0) {
      const weekdayAvg = weekdayRecords.reduce((sum, r) => sum + r.duration, 0) / weekdayRecords.length;
      const weekendAvg = weekendRecords.reduce((sum, r) => sum + r.duration, 0) / weekendRecords.length;

      if (weekendAvg - weekdayAvg > 60) {
        patterns.push('Sleeping significantly longer on weekends');
      }
    }

    return patterns;
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  }
}

// Export singleton instance
export const sleepAnalysis = new SleepAnalysis();
