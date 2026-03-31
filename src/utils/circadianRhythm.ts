/**
 * Circadian Rhythm Utility
 * 
 * Manages circadian rhythm profiles and provides chronotype-based
 * scheduling recommendations.
 */

import type { CircadianProfile } from '@/types/lifeManagement';

type Chronotype = 'lark' | 'owl' | 'intermediate';

interface TimeRange {
  start: string;
  end: string;
}

export class CircadianRhythm {
  /**
   * Create circadian profile based on chronotype
   */
  createProfile(userId: string, chronotype: Chronotype): CircadianProfile {
    const profile = this.getProfileForChronotype(chronotype);
    return {
      userId,
      chronotype,
      ...profile,
      updatedAt: new Date(),
    };
  }

  /**
   * Get profile settings for chronotype
   */
  private getProfileForChronotype(chronotype: Chronotype) {
    switch (chronotype) {
      case 'lark':
        return {
          peakHours: ['06:00', '07:00', '08:00', '09:00', '10:00'],
          lowHours: ['14:00', '15:00', '16:00', '21:00', '22:00'],
          optimalSleepTime: { start: '22:00', end: '06:00' },
          optimalWorkTime: { start: '08:00', end: '12:00' },
          optimalExerciseTime: '07:00',
          optimalFamilyTime: '18:00',
        };
      case 'owl':
        return {
          peakHours: ['10:00', '11:00', '16:00', '17:00', '18:00'],
          lowHours: ['06:00', '07:00', '08:00', '14:00', '15:00'],
          optimalSleepTime: { start: '00:00', end: '08:00' },
          optimalWorkTime: { start: '10:00', end: '14:00' },
          optimalExerciseTime: '18:00',
          optimalFamilyTime: '20:00',
        };
      case 'intermediate':
      default:
        return {
          peakHours: ['09:00', '10:00', '11:00', '15:00', '16:00'],
          lowHours: ['13:00', '14:00', '22:00', '23:00'],
          optimalSleepTime: { start: '23:00', end: '07:00' },
          optimalWorkTime: { start: '09:00', end: '12:00' },
          optimalExerciseTime: '17:00',
          optimalFamilyTime: '19:00',
        };
    }
  }

  /**
   * Get current energy level based on time
   */
  getCurrentEnergyLevel(profile: CircadianProfile): 'high' | 'medium' | 'low' {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (profile.peakHours.includes(currentTime)) {
      return 'high';
    }
    if (profile.lowHours.includes(currentTime)) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Get recommended task type for current time
   */
  getRecommendedTaskType(profile: CircadianProfile): string {
    const energyLevel = this.getCurrentEnergyLevel(profile);

    switch (energyLevel) {
      case 'high':
        return 'Deep work, complex tasks, creative work';
      case 'medium':
        return 'Meetings, emails, routine tasks';
      case 'low':
        return 'Breaks, light tasks, administrative work';
      default:
        return 'Flexible tasks';
    }
  }

  /**
   * Check if current time is good for specific activity
   */
  isGoodTimeFor(profile: CircadianProfile, activity: string): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    switch (activity) {
      case 'work':
        const workStart = parseInt(profile.optimalWorkTime.start.split(':')[0]);
        const workEnd = parseInt(profile.optimalWorkTime.end.split(':')[0]);
        return currentHour >= workStart && currentHour < workEnd;
      case 'exercise':
        const exerciseHour = parseInt(profile.optimalExerciseTime.split(':')[0]);
        return Math.abs(currentHour - exerciseHour) <= 1;
      case 'family':
        const familyHour = parseInt(profile.optimalFamilyTime.split(':')[0]);
        return Math.abs(currentHour - familyHour) <= 2;
      case 'sleep':
        const sleepStart = parseInt(profile.optimalSleepTime.start.split(':')[0]);
        const sleepEnd = parseInt(profile.optimalSleepTime.end.split(':')[0]);
        if (sleepStart > sleepEnd) {
          return currentHour >= sleepStart || currentHour < sleepEnd;
        }
        return currentHour >= sleepStart && currentHour < sleepEnd;
      default:
        return true;
    }
  }

  /**
   * Get schedule recommendations for the day
   */
  getDailySchedule(profile: CircadianProfile): Array<{ time: string; activity: string; energy: string }> {
    const schedule: Array<{ time: string; activity: string; energy: string }> = [];

    // Morning routine
    schedule.push({
      time: '06:00',
      activity: 'Wake up, light exercise',
      energy: 'medium',
    });

    // Peak hours
    profile.peakHours.forEach(hour => {
      schedule.push({
        time: hour,
        activity: 'Deep work, complex tasks',
        energy: 'high',
      });
    });

    // Low hours
    profile.lowHours.forEach(hour => {
      schedule.push({
        time: hour,
        activity: 'Breaks, light tasks',
        energy: 'low',
      });
    });

    // Family time
    schedule.push({
      time: profile.optimalFamilyTime,
      activity: 'Family time, dinner',
      energy: 'medium',
    });

    // Evening routine
    schedule.push({
      time: '21:00',
      activity: 'Wind down, prepare for sleep',
      energy: 'low',
    });

    return schedule.sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Get chronotype description
   */
  getChronotypeDescription(chronotype: Chronotype): string {
    switch (chronotype) {
      case 'lark':
        return 'You\'re most productive in the morning. Schedule important tasks early in the day.';
      case 'owl':
        return 'You\'re most productive in the evening. Schedule important tasks for the afternoon.';
      case 'intermediate':
        return 'You\'re flexible throughout the day. You can adapt to various schedules.';
      default:
        return '';
    }
  }

  /**
   * Get chronotype icon
   */
  getChronotypeIcon(chronotype: Chronotype): string {
    switch (chronotype) {
      case 'lark':
        return '🌅';
      case 'owl':
        return '🦉';
      case 'intermediate':
        return '🐦';
      default:
        return '⏰';
    }
  }

  /**
   * Update profile based on user feedback
   */
  updateProfile(
    profile: CircadianProfile,
    feedback: {
      peakHours?: string[];
      lowHours?: string[];
      optimalSleepTime?: TimeRange;
      optimalWorkTime?: TimeRange;
    }
  ): CircadianProfile {
    return {
      ...profile,
      ...feedback,
      updatedAt: new Date(),
    };
  }

  /**
   * Calculate sleep quality score based on consistency
   */
  calculateSleepConsistency(bedtimes: Date[], wakeTimes: Date[]): number {
    if (bedtimes.length < 2 || wakeTimes.length < 2) return 0;

    // Calculate bedtime variance
    const bedtimeMinutes = bedtimes.map(d => d.getHours() * 60 + d.getMinutes());
    const bedtimeVariance = this.calculateVariance(bedtimeMinutes);

    // Calculate wake time variance
    const wakeTimeMinutes = wakeTimes.map(d => d.getHours() * 60 + d.getMinutes());
    const wakeTimeVariance = this.calculateVariance(wakeTimeMinutes);

    // Lower variance = higher consistency
    const maxVariance = 120; // 2 hours
    const bedtimeScore = Math.max(0, 100 - (bedtimeVariance / maxVariance) * 100);
    const wakeTimeScore = Math.max(0, 100 - (wakeTimeVariance / maxVariance) * 100);

    return Math.round((bedtimeScore + wakeTimeScore) / 2);
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
export const circadianRhythm = new CircadianRhythm();
