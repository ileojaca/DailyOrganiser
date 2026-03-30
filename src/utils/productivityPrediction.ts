/**
 * Productivity Prediction ML Model
 * 
 * This module provides machine learning-based predictions for:
 * - Task completion probability
 * - Optimal scheduling times
 * - Energy level forecasting
 * - Workload capacity estimation
 * 
 * @module productivityPrediction
 */

import { AccomplishmentLog, ProductivityMetrics } from '@/hooks/useAccomplishmentLogs'

export interface PredictionFeatures {
  hourOfDay: number
  dayOfWeek: number
  energyLevel: number
  taskCategory: string
  taskPriority: number
  estimatedDuration: number
  currentWorkload: number
  recentCompletionRate: number
  streakDays: number
}

export interface PredictionResult {
  completionProbability: number
  confidence: number
  recommendedTime?: string
  factors: string[]
}

export interface WorkloadForecast {
  date: string
  predictedTasks: number
  capacity: number
  utilization: number
  riskLevel: 'low' | 'medium' | 'high'
}

/**
 * Simple linear regression model for productivity prediction
 */
class ProductivityModel {
  private weights: Record<string, number> = {
    hourOfDay: 0.15,
    dayOfWeek: 0.1,
    energyLevel: 0.25,
    taskPriority: 0.2,
    estimatedDuration: -0.1,
    currentWorkload: -0.15,
    recentCompletionRate: 0.3,
    streakDays: 0.1
  }

  private bias = 0.5

  /**
   * Predict task completion probability
   */
  predict(features: PredictionFeatures): PredictionResult {
    const factors: string[] = []
    let score = this.bias

    // Hour of day factor (peak hours: 9-11 AM, 2-4 PM)
    const hourScore = this.calculateHourScore(features.hourOfDay)
    score += hourScore * this.weights.hourOfDay
    if (hourScore > 0.7) factors.push('Peak productivity hour')
    else if (hourScore < 0.3) factors.push('Low energy time of day')

    // Day of week factor (weekdays typically better)
    const dayScore = this.calculateDayScore(features.dayOfWeek)
    score += dayScore * this.weights.dayOfWeek

    // Energy level factor
    const energyScore = features.energyLevel / 10
    score += energyScore * this.weights.energyLevel
    if (energyScore > 0.7) factors.push('High energy level')
    else if (energyScore < 0.4) factors.push('Low energy - consider rescheduling')

    // Task priority factor
    const priorityScore = features.taskPriority / 5
    score += priorityScore * this.weights.taskPriority
    if (priorityScore > 0.8) factors.push('High priority task')

    // Duration factor (shorter tasks easier to complete)
    const durationScore = Math.max(0, 1 - (features.estimatedDuration / 480))
    score += durationScore * this.weights.estimatedDuration

    // Current workload factor
    const workloadScore = Math.max(0, 1 - (features.currentWorkload / 10))
    score += workloadScore * this.weights.currentWorkload
    if (features.currentWorkload > 7) factors.push('High workload - may impact focus')

    // Recent completion rate
    score += features.recentCompletionRate * this.weights.recentCompletionRate
    if (features.recentCompletionRate > 0.8) factors.push('Strong recent completion rate')

    // Streak factor
    const streakScore = Math.min(1, features.streakDays / 7)
    score += streakScore * this.weights.streakDays
    if (features.streakDays >= 3) factors.push(`${features.streakDays}-day streak`)

    // Normalize score to 0-1 range
    const completionProbability = Math.max(0, Math.min(1, score))

    // Calculate confidence based on feature availability
    const confidence = this.calculateConfidence(features)

    return {
      completionProbability,
      confidence,
      factors
    }
  }

  private calculateHourScore(hour: number): number {
    // Peak hours: 9-11 AM (0.9), 2-4 PM (0.8)
    // Good hours: 8 AM, 5 PM (0.6)
    // Low hours: 6-7 AM, 6-8 PM (0.4)
    // Very low: before 6 AM, after 8 PM (0.2)
    if (hour >= 9 && hour <= 11) return 0.9
    if (hour >= 14 && hour <= 16) return 0.8
    if (hour === 8 || hour === 17) return 0.6
    if (hour >= 6 && hour <= 7) return 0.4
    if (hour >= 18 && hour <= 20) return 0.4
    return 0.2
  }

  private calculateDayScore(day: number): number {
    // 0 = Sunday, 6 = Saturday
    // Weekdays (1-5) are typically more productive
    if (day >= 1 && day <= 5) return 0.7
    return 0.4
  }

  private calculateConfidence(features: PredictionFeatures): number {
    let confidence = 0.5
    if (features.recentCompletionRate > 0) confidence += 0.2
    if (features.energyLevel > 0) confidence += 0.15
    if (features.streakDays > 0) confidence += 0.15
    return Math.min(1, confidence)
  }

  /**
   * Update model weights based on feedback
   */
  updateWeights(actualOutcome: boolean, features: PredictionFeatures, learningRate = 0.01): void {
    const prediction = this.predict(features)
    const error = (actualOutcome ? 1 : 0) - prediction.completionProbability

    // Update weights based on error
    this.weights.hourOfDay += learningRate * error * this.calculateHourScore(features.hourOfDay)
    this.weights.energyLevel += learningRate * error * (features.energyLevel / 10)
    this.weights.recentCompletionRate += learningRate * error * features.recentCompletionRate
    this.weights.streakDays += learningRate * error * Math.min(1, features.streakDays / 7)
    this.bias += learningRate * error
  }
}

// Singleton instance
const productivityModel = new ProductivityModel()

/**
 * Predict task completion probability
 */
export function predictTaskCompletion(
  features: PredictionFeatures
): PredictionResult {
  return productivityModel.predict(features)
}

/**
 * Find optimal time slots for a task
 */
export function findOptimalTimeSlots(
  task: {
    category: string
    priority: number
    estimatedDuration: number
    energyRequired: number
  },
  logs: AccomplishmentLog[],
  date: string
): Array<{ hour: number; score: number; reason: string }> {
  const slots: Array<{ hour: number; score: number; reason: string }> = []
  
  // Calculate recent completion rate
  const recentLogs = logs.filter(log => {
    const logDate = new Date(log.scheduledDate)
    const targetDate = new Date(date)
    const daysDiff = Math.abs(targetDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff <= 7
  })
  const recentCompletionRate = recentLogs.length > 0
    ? recentLogs.filter(log => log.completionStatus === 'completed').length / recentLogs.length
    : 0.5

  // Calculate current streak
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  )
  let streakDays = 0
  for (const log of sortedLogs) {
    if (log.completionStatus === 'completed') {
      streakDays++
    } else {
      break
    }
  }

  // Evaluate each hour from 6 AM to 9 PM
  for (let hour = 6; hour <= 21; hour++) {
    const features: PredictionFeatures = {
      hourOfDay: hour,
      dayOfWeek: new Date(date).getDay(),
      energyLevel: task.energyRequired,
      taskCategory: task.category,
      taskPriority: task.priority,
      estimatedDuration: task.estimatedDuration,
      currentWorkload: 0, // Would need to calculate from scheduled tasks
      recentCompletionRate,
      streakDays
    }

    const prediction = productivityModel.predict(features)
    
    let reason = ''
    if (prediction.completionProbability > 0.7) {
      reason = 'High completion probability'
    } else if (prediction.completionProbability > 0.5) {
      reason = 'Moderate completion probability'
    } else {
      reason = 'Lower completion probability'
    }

    slots.push({
      hour,
      score: prediction.completionProbability,
      reason
    })
  }

  return slots.sort((a, b) => b.score - a.score)
}

/**
 * Generate workload forecast for upcoming days
 */
export function generateWorkloadForecast(
  logs: AccomplishmentLog[],
  scheduledTasks: Array<{ date: string; count: number }>,
  days: number = 7
): WorkloadForecast[] {
  const forecast: WorkloadForecast[] = []
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    // Calculate historical average for this day of week
    const dayOfWeek = date.getDay()
    const historicalLogs = logs.filter(log => {
      const logDate = new Date(log.scheduledDate)
      return logDate.getDay() === dayOfWeek
    })
    
    const avgTasks = historicalLogs.length > 0
      ? historicalLogs.length / Math.max(1, new Set(historicalLogs.map(l => l.scheduledDate)).size)
      : 5

    // Get scheduled tasks for this date
    const scheduled = scheduledTasks.find(t => t.date === dateStr)
    const predictedTasks = scheduled?.count || Math.round(avgTasks)

    // Calculate capacity (based on historical completion)
    const completedOnThisDay = historicalLogs.filter(log => 
      log.completionStatus === 'completed'
    ).length
    const capacity = Math.max(5, Math.round(completedOnThisDay / Math.max(1, historicalLogs.length) * 10))

    // Calculate utilization
    const utilization = capacity > 0 ? predictedTasks / capacity : 0

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    if (utilization > 0.9) riskLevel = 'high'
    else if (utilization > 0.7) riskLevel = 'medium'

    forecast.push({
      date: dateStr,
      predictedTasks,
      capacity,
      utilization,
      riskLevel
    })
  }

  return forecast
}

/**
 * Advanced workload forecasting with trend analysis
 */
export function advancedWorkloadForecast(
  logs: AccomplishmentLog[],
  scheduledTasks: Array<{ date: string; count: number }>,
  days: number = 14
): {
  forecast: WorkloadForecast[]
  trends: {
    averageUtilization: number
    peakDays: string[]
    recommendations: string[]
  }
} {
  const forecast = generateWorkloadForecast(logs, scheduledTasks, days)
  
  // Calculate trends
  const averageUtilization = forecast.reduce((sum, day) => sum + day.utilization, 0) / forecast.length
  
  // Find peak days (highest utilization)
  const peakDays = forecast
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 3)
    .map(day => day.date)
  
  // Generate recommendations
  const recommendations: string[] = []
  
  if (averageUtilization > 0.8) {
    recommendations.push('Consider reducing task load - average utilization is high')
  }
  
  const highRiskDays = forecast.filter(day => day.riskLevel === 'high')
  if (highRiskDays.length > 0) {
    recommendations.push(`${highRiskDays.length} days have high overload risk - consider redistributing tasks`)
  }
  
  const lowCapacityDays = forecast.filter(day => day.capacity < 5)
  if (lowCapacityDays.length > 0) {
    recommendations.push('Some days have low capacity - schedule important tasks on higher capacity days')
  }
  
  // Check for patterns
  const weekdayUtilization = forecast
    .filter(day => {
      const dayOfWeek = new Date(day.date).getDay()
      return dayOfWeek >= 1 && dayOfWeek <= 5
    })
    .reduce((sum, day) => sum + day.utilization, 0) / 5
  
  const weekendUtilization = forecast
    .filter(day => {
      const dayOfWeek = new Date(day.date).getDay()
      return dayOfWeek === 0 || dayOfWeek === 6
    })
    .reduce((sum, day) => sum + day.utilization, 0) / 2
  
  if (weekdayUtilization > weekendUtilization * 1.5) {
    recommendations.push('Weekdays are significantly busier than weekends - consider balancing workload')
  }
  
  return {
    forecast,
    trends: {
      averageUtilization,
      peakDays,
      recommendations
    }
  }
}

/**
 * Detect burnout risk based on workload patterns
 */
export function detectBurnoutRisk(
  logs: AccomplishmentLog[],
  scheduledTasks: Array<{ date: string; count: number }>
): {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
  recommendations: string[]
} {
  const factors: string[] = []
  const recommendations: string[] = []
  
  // Check recent completion rate (last 7 days)
  const recentLogs = logs.filter(log => {
    const logDate = new Date(log.scheduledDate)
    const daysAgo = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysAgo <= 7
  })
  
  const recentCompletionRate = recentLogs.length > 0
    ? recentLogs.filter(log => log.completionStatus === 'completed').length / recentLogs.length
    : 1
  
  if (recentCompletionRate < 0.5) {
    factors.push('Low completion rate in the past week')
    recommendations.push('Consider reducing task load or breaking tasks into smaller chunks')
  }
  
  // Check for consecutive high-workload days
  const forecast = generateWorkloadForecast(logs, scheduledTasks, 7)
  const consecutiveHighDays = forecast.filter(day => day.utilization > 0.8).length
  
  if (consecutiveHighDays >= 3) {
    factors.push(`${consecutiveHighDays} consecutive high-utilization days`)
    recommendations.push('Schedule a lighter day or take a break to prevent burnout')
  }
  
  // Check average energy levels
  const logsWithEnergy = logs.filter(log => log.energyLevelAtStart !== undefined)
  const avgEnergy = logsWithEnergy.length > 0
    ? logsWithEnergy.reduce((sum, log) => sum + (log.energyLevelAtStart || 0), 0) / logsWithEnergy.length
    : 5
  
  if (avgEnergy < 4) {
    factors.push('Low average energy levels')
    recommendations.push('Focus on rest and recovery - schedule less demanding tasks')
  }
  
  // Check for abandoned tasks
  const abandonedTasks = logs.filter(log => log.completionStatus === 'abandoned').length
  if (abandonedTasks > 3) {
    factors.push('Multiple abandoned tasks recently')
    recommendations.push('Review task difficulty and deadlines - consider adjusting expectations')
  }
  
  // Check for declining efficiency
  const recentEfficiency = recentLogs.length > 0
    ? recentLogs.reduce((sum, log) => sum + log.efficiencyScore, 0) / recentLogs.length
    : 1
  
  if (recentEfficiency < 0.6) {
    factors.push('Declining task efficiency')
    recommendations.push('Take breaks between tasks and avoid multitasking')
  }
  
  // Check for irregular sleep patterns (based on task scheduling)
  const lateNightTasks = logs.filter(log => log.scheduledHour >= 23 || log.scheduledHour <= 4).length
  if (lateNightTasks > 5) {
    factors.push('Frequent late-night work sessions')
    recommendations.push('Prioritize sleep and schedule demanding tasks during peak hours')
  }
  
  // Check for lack of breaks
  const taskDates = [...new Set(logs.map(log => log.scheduledDate))].sort()
  let maxConsecutiveDays = 0
  let currentStreak = 1
  for (let i = 1; i < taskDates.length; i++) {
    const prevDate = new Date(taskDates[i - 1])
    const currDate = new Date(taskDates[i])
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      currentStreak++
      maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak)
    } else {
      currentStreak = 1
    }
  }
  
  if (maxConsecutiveDays >= 10) {
    factors.push(`${maxConsecutiveDays} consecutive days without breaks`)
    recommendations.push('Schedule rest days to prevent burnout')
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (factors.length >= 4) riskLevel = 'critical'
  else if (factors.length >= 3) riskLevel = 'high'
  else if (factors.length >= 2) riskLevel = 'medium'
  else if (factors.length >= 1) riskLevel = 'low'
  
  return {
    riskLevel,
    factors,
    recommendations
  }
}

/**
 * Analyze productivity patterns for burnout indicators
 */
export function analyzeBurnoutPatterns(
  logs: AccomplishmentLog[]
): {
  patterns: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }>
  overallRisk: number
} {
  const patterns: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }> = []
  
  // Pattern 1: Declining completion rate over time
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  )
  
  if (sortedLogs.length >= 14) {
    const firstWeek = sortedLogs.slice(0, 7)
    const lastWeek = sortedLogs.slice(-7)
    
    const firstWeekRate = firstWeek.filter(l => l.completionStatus === 'completed').length / firstWeek.length
    const lastWeekRate = lastWeek.filter(l => l.completionStatus === 'completed').length / lastWeek.length
    
    if (lastWeekRate < firstWeekRate - 0.2) {
      patterns.push({
        type: 'declining_completion',
        severity: 'high',
        description: 'Completion rate has dropped significantly over the past two weeks'
      })
    }
  }
  
  // Pattern 2: Energy depletion
  const energyLogs = logs.filter(l => l.energyLevelAtStart !== undefined)
  if (energyLogs.length >= 7) {
    const recentEnergy = energyLogs.slice(-7).reduce((sum, l) => sum + (l.energyLevelAtStart || 0), 0) / 7
    const olderEnergy = energyLogs.slice(0, 7).reduce((sum, l) => sum + (l.energyLevelAtStart || 0), 0) / 7
    
    if (recentEnergy < olderEnergy - 1.5) {
      patterns.push({
        type: 'energy_depletion',
        severity: 'high',
        description: 'Energy levels have been declining recently'
      })
    }
  }
  
  // Pattern 3: Task avoidance
  const deferredTasks = logs.filter(l => l.completionStatus === 'abandoned').length
  const totalTasks = logs.length
  if (totalTasks > 10 && deferredTasks / totalTasks > 0.2) {
    patterns.push({
      type: 'task_avoidance',
      severity: 'medium',
      description: 'High rate of abandoned or deferred tasks'
    })
  }
  
  // Pattern 4: Weekend work
  const weekendLogs = logs.filter(log => {
    const day = new Date(log.scheduledDate).getDay()
    return day === 0 || day === 6
  })
  if (weekendLogs.length > logs.length * 0.3) {
    patterns.push({
      type: 'weekend_work',
      severity: 'medium',
      description: 'Frequent work on weekends without adequate rest'
    })
  }
  
  // Calculate overall risk
  const severityScores = { low: 1, medium: 2, high: 3 }
  const overallRisk = patterns.reduce((sum, p) => sum + severityScores[p.severity], 0) / Math.max(1, patterns.length)
  
  return {
    patterns,
    overallRisk
  }
}

/**
 * Update model with feedback
 */
export function updateModelWithFeedback(
  actualOutcome: boolean,
  features: PredictionFeatures
): void {
  productivityModel.updateWeights(actualOutcome, features)
}
