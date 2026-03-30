import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp,
  DocumentData
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'

export interface AccomplishmentLog {
  id: string
  userId: string
  goalId?: string
  scheduledDate: string // YYYY-MM-DD
  scheduledHour: number // 0-23
  actualDuration?: number // minutes
  completionStatus: 'completed' | 'partial' | 'abandoned'
  energyLevelAtStart?: number // 1-10
  contextSnapshot: {
    location?: string
    tools?: string[]
    distractions?: string[]
  }
  efficiencyScore: number // 0-1
  createdAt: Date
}

export interface ProductivityMetrics {
  totalTasks: number
  completedTasks: number
  completionRate: number
  averageEfficiency: number
  currentStreak: number
  longestStreak: number
  productiveHours: number[]
  categoryBreakdown: Record<string, { total: number; completed: number }>
  energyCorrelation: { low: number; medium: number; high: number }
}

interface CreateLogInput {
  goalId?: string
  scheduledDate: string
  scheduledHour: number
  actualDuration?: number
  completionStatus: AccomplishmentLog['completionStatus']
  energyLevelAtStart?: number
  contextSnapshot?: AccomplishmentLog['contextSnapshot']
  efficiencyScore: number
}

interface UpdateLogInput {
  goalId?: string
  scheduledDate?: string
  scheduledHour?: number
  actualDuration?: number
  completionStatus?: AccomplishmentLog['completionStatus']
  energyLevelAtStart?: number
  contextSnapshot?: AccomplishmentLog['contextSnapshot']
  efficiencyScore?: number
}

export function useAccomplishmentLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<AccomplishmentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLogs([])
      setLoading(false)
      return
    }

    setLoading(true)

    const db = getDb()
    const logsQuery = query(
      collection(db, 'users', userId, 'accomplishmentLogs'),
      orderBy('scheduledDate', 'desc')
    )

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logsData: AccomplishmentLog[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId,
            goalId: data.goalId,
            scheduledDate: data.scheduledDate,
            scheduledHour: data.scheduledHour,
            actualDuration: data.actualDuration,
            completionStatus: data.completionStatus,
            energyLevelAtStart: data.energyLevelAtStart,
            contextSnapshot: data.contextSnapshot || {},
            efficiencyScore: data.efficiencyScore,
            createdAt: data.createdAt?.toDate()
          } as AccomplishmentLog
        })
        setLogs(logsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching accomplishment logs:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  const createLog = useCallback(async (input: CreateLogInput): Promise<string> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const logData = {
      goalId: input.goalId || null,
      scheduledDate: input.scheduledDate,
      scheduledHour: input.scheduledHour,
      actualDuration: input.actualDuration || null,
      completionStatus: input.completionStatus,
      energyLevelAtStart: input.energyLevelAtStart || null,
      contextSnapshot: input.contextSnapshot || {},
      efficiencyScore: input.efficiencyScore,
      createdAt: Timestamp.now()
    }

    const logsRef = collection(db, 'users', userId, 'accomplishmentLogs')
    const docRef = await addDoc(logsRef, logData)
    return docRef.id
  }, [userId])

  const updateLog = useCallback(async (logId: string, input: UpdateLogInput): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const updateData: DocumentData = {}

    if (input.goalId !== undefined) updateData.goalId = input.goalId
    if (input.scheduledDate !== undefined) updateData.scheduledDate = input.scheduledDate
    if (input.scheduledHour !== undefined) updateData.scheduledHour = input.scheduledHour
    if (input.actualDuration !== undefined) updateData.actualDuration = input.actualDuration
    if (input.completionStatus !== undefined) updateData.completionStatus = input.completionStatus
    if (input.energyLevelAtStart !== undefined) updateData.energyLevelAtStart = input.energyLevelAtStart
    if (input.contextSnapshot !== undefined) updateData.contextSnapshot = input.contextSnapshot
    if (input.efficiencyScore !== undefined) updateData.efficiencyScore = input.efficiencyScore

    const logRef = doc(db, 'users', userId, 'accomplishmentLogs', logId)
    await updateDoc(logRef, updateData)
  }, [userId])

  const deleteLog = useCallback(async (logId: string): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const logRef = doc(db, 'users', userId, 'accomplishmentLogs', logId)
    await deleteDoc(logRef)
  }, [userId])

  // Get logs for a specific date range
  const getLogsByDateRange = useCallback(async (startDate: string, endDate: string): Promise<AccomplishmentLog[]> => {
    if (!userId) return []

    const db = getDb()
    const logsQuery = query(
      collection(db, 'users', userId, 'accomplishmentLogs'),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      orderBy('scheduledDate', 'desc')
    )

    const snapshot = await getDocs(logsQuery)
    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        userId,
        goalId: data.goalId,
        scheduledDate: data.scheduledDate,
        scheduledHour: data.scheduledHour,
        actualDuration: data.actualDuration,
        completionStatus: data.completionStatus,
        energyLevelAtStart: data.energyLevelAtStart,
        contextSnapshot: data.contextSnapshot || {},
        efficiencyScore: data.efficiencyScore,
        createdAt: data.createdAt?.toDate()
      } as AccomplishmentLog
    })
  }, [userId])

  // Calculate productivity metrics
  const getProductivityMetrics = useCallback((): ProductivityMetrics => {
    if (logs.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        averageEfficiency: 0,
        currentStreak: 0,
        longestStreak: 0,
        productiveHours: [],
        categoryBreakdown: {},
        energyCorrelation: { low: 0, medium: 0, high: 0 }
      }
    }

    const totalTasks = logs.length
    const completedTasks = logs.filter(log => log.completionStatus === 'completed').length
    const completionRate = completedTasks / totalTasks

    // Calculate average efficiency
    const efficiencyScores = logs.map(log => log.efficiencyScore).filter(score => score > 0)
    const averageEfficiency = efficiencyScores.length > 0 
      ? efficiencyScores.reduce((a, b) => a + b, 0) / efficiencyScores.length 
      : 0

    // Calculate streaks
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    )
    
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    
    for (let i = 0; i < sortedLogs.length; i++) {
      if (sortedLogs[i].completionStatus === 'completed') {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }
    
    // Current streak is from the end
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      if (sortedLogs[i].completionStatus === 'completed') {
        currentStreak++
      } else {
        break
      }
    }

    // Find productive hours (hours with highest completion rate)
    const hourStats: Record<number, { total: number; completed: number }> = {}
    logs.forEach(log => {
      if (!hourStats[log.scheduledHour]) {
        hourStats[log.scheduledHour] = { total: 0, completed: 0 }
      }
      hourStats[log.scheduledHour].total++
      if (log.completionStatus === 'completed') {
        hourStats[log.scheduledHour].completed++
      }
    })
    
    const productiveHours = Object.entries(hourStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        rate: stats.completed / stats.total
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5)
      .map(item => item.hour)

    // Category breakdown
    const categoryBreakdown: Record<string, { total: number; completed: number }> = {}
    logs.forEach(log => {
      // Note: We'd need to join with goals to get category
      // For now, we'll use a placeholder
      const category = 'general'
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { total: 0, completed: 0 }
      }
      categoryBreakdown[category].total++
      if (log.completionStatus === 'completed') {
        categoryBreakdown[category].completed++
      }
    })

    // Energy correlation
    const energyCorrelation = { low: 0, medium: 0, high: 0 }
    logs.forEach(log => {
      if (log.energyLevelAtStart) {
        if (log.energyLevelAtStart <= 3) {
          energyCorrelation.low += log.completionStatus === 'completed' ? 1 : 0
        } else if (log.energyLevelAtStart <= 6) {
          energyCorrelation.medium += log.completionStatus === 'completed' ? 1 : 0
        } else {
          energyCorrelation.high += log.completionStatus === 'completed' ? 1 : 0
        }
      }
    })

    return {
      totalTasks,
      completedTasks,
      completionRate,
      averageEfficiency,
      currentStreak,
      longestStreak,
      productiveHours,
      categoryBreakdown,
      energyCorrelation
    }
  }, [logs])

  return {
    logs,
    loading,
    error,
    createLog,
    updateLog,
    deleteLog,
    getLogsByDateRange,
    getProductivityMetrics
  }
}

export default useAccomplishmentLogs