import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentData
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'

export interface Goal {
  id: string
  userId: string
  title: string
  description?: string
  category: 'work' | 'personal' | 'health' | 'learning' | 'social'
  priority: number
  aiAdjustedPriority: boolean
  adjustmentReason?: string
  estimatedDuration?: number
  deadline?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
  context: {
    location?: string
    tools?: string[]
    networkStatus?: string
  }
  energyRequired?: number
  scheduledStart?: Date
  scheduledEnd?: Date
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

interface CreateGoalInput {
  title: string
  description?: string
  category: Goal['category']
  priority: number
  estimatedDuration?: number
  deadline?: Date
  energyRequired?: number
  context?: Goal['context']
}

interface UpdateGoalInput {
  title?: string
  description?: string
  category?: Goal['category']
  priority?: number
  aiAdjustedPriority?: boolean
  adjustmentReason?: string
  estimatedDuration?: number
  deadline?: Date
  status?: Goal['status']
  energyRequired?: number
  scheduledStart?: Date
  scheduledEnd?: Date
  completedAt?: Date
}

export function useGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Subscribe to goals collection
  useEffect(() => {
    if (!userId) {
      setGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    
    const db = getDb()
    const goalsQuery = query(
      collection(db, 'users', userId, 'goals'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      goalsQuery,
      (snapshot) => {
        const goalsData: Goal[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId,
            title: data.title,
            description: data.description,
            category: data.category,
            priority: data.priority,
            aiAdjustedPriority: data.aiAdjustedPriority || false,
            adjustmentReason: data.adjustmentReason,
            estimatedDuration: data.estimatedDuration,
            deadline: data.deadline?.toDate(),
            status: data.status || 'pending',
            context: data.context || {},
            energyRequired: data.energyRequired,
            scheduledStart: data.scheduledStart?.toDate(),
            scheduledEnd: data.scheduledEnd?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            completedAt: data.completedAt?.toDate()
          } as Goal
        })
        setGoals(goalsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching goals:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  // Create a new goal
  const createGoal = useCallback(async (input: CreateGoalInput): Promise<string> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const now = Timestamp.now()
    const goalData = {
      title: input.title,
      description: input.description || null,
      category: input.category,
      priority: input.priority,
      aiAdjustedPriority: false,
      estimatedDuration: input.estimatedDuration || null,
      deadline: input.deadline ? Timestamp.fromDate(input.deadline) : null,
      status: 'pending',
      context: input.context || {},
      energyRequired: input.energyRequired || null,
      createdAt: now,
      updatedAt: now
    }

    const goalsRef = collection(db, 'users', userId, 'goals')
    const docRef = await addDoc(goalsRef, goalData)
    return docRef.id
  }, [userId])

  // Update a goal
  const updateGoal = useCallback(async (goalId: string, input: UpdateGoalInput): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const updateData: DocumentData = {
      updatedAt: Timestamp.now()
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.category !== undefined) updateData.category = input.category
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.aiAdjustedPriority !== undefined) updateData.aiAdjustedPriority = input.aiAdjustedPriority
    if (input.adjustmentReason !== undefined) updateData.adjustmentReason = input.adjustmentReason
    if (input.estimatedDuration !== undefined) updateData.estimatedDuration = input.estimatedDuration
    if (input.deadline !== undefined) updateData.deadline = input.deadline ? Timestamp.fromDate(input.deadline) : null
    if (input.status !== undefined) updateData.status = input.status
    if (input.energyRequired !== undefined) updateData.energyRequired = input.energyRequired
    if (input.scheduledStart !== undefined) updateData.scheduledStart = input.scheduledStart ? Timestamp.fromDate(input.scheduledStart) : null
    if (input.scheduledEnd !== undefined) updateData.scheduledEnd = input.scheduledEnd ? Timestamp.fromDate(input.scheduledEnd) : null
    if (input.completedAt !== undefined) updateData.completedAt = input.completedAt ? Timestamp.fromDate(input.completedAt) : null

    const goalRef = doc(db, 'users', userId, 'goals', goalId)
    await updateDoc(goalRef, updateData)
  }, [userId])

  // Delete a goal
  const deleteGoal = useCallback(async (goalId: string): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const goalRef = doc(db, 'users', userId, 'goals', goalId)
    await deleteDoc(goalRef)
  }, [userId])

  // Complete a goal
  const completeGoal = useCallback(async (goalId: string, actualDuration?: number): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const db = getDb()
    const goalRef = doc(db, 'users', userId, 'goals', goalId)
    await updateDoc(goalRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      actualDuration: actualDuration || null,
      updatedAt: Timestamp.now()
    })
  }, [userId])

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal
  }
}

export default useGoals