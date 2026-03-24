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
import { db } from '@/lib/firebase'

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

    const logRef = doc(db, 'users', userId, 'accomplishmentLogs', logId)
    await deleteDoc(logRef)
  }, [userId])

  // Get logs for a specific date range
  const getLogsByDateRange = useCallback(async (startDate: string, endDate: string): Promise<AccomplishmentLog[]> => {
    if (!userId) return []

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

  return {
    logs,
    loading,
    error,
    createLog,
    updateLog,
    deleteLog,
    getLogsByDateRange
  }
}

export default useAccomplishmentLogs
