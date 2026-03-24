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
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface TimeBlock {
  id: string
  userId: string
  name: string
  blockType: 'fixed' | 'flexible' | 'protected'
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  durationMinutes: number
  daysOfWeek: number[] // 0=Sunday, 6=Saturday
  energyLevel: 'high' | 'medium' | 'low'
  preferredTaskTypes?: string[]
  isProtected: boolean
  createdAt: Date
  updatedAt: Date
}

interface CreateTimeBlockInput {
  name: string
  blockType: TimeBlock['blockType']
  startTime: string
  endTime: string
  daysOfWeek: number[]
  energyLevel: TimeBlock['energyLevel']
  preferredTaskTypes?: string[]
  isProtected?: boolean
}

interface UpdateTimeBlockInput {
  name?: string
  blockType?: TimeBlock['blockType']
  startTime?: string
  endTime?: string
  daysOfWeek?: number[]
  energyLevel?: TimeBlock['energyLevel']
  preferredTaskTypes?: string[]
  isProtected?: boolean
}

export function useTimeBlocks(userId: string | undefined) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setTimeBlocks([])
      setLoading(false)
      return
    }

    setLoading(true)

    const blocksQuery = query(
      collection(db, 'users', userId, 'timeBlocks'),
      orderBy('startTime')
    )

    const unsubscribe = onSnapshot(
      blocksQuery,
      (snapshot) => {
        const blocksData: TimeBlock[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId,
            name: data.name,
            blockType: data.blockType,
            startTime: data.startTime,
            endTime: data.endTime,
            durationMinutes: data.durationMinutes,
            daysOfWeek: data.daysOfWeek,
            energyLevel: data.energyLevel,
            preferredTaskTypes: data.preferredTaskTypes || [],
            isProtected: data.isProtected || false,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          } as TimeBlock
        })
        setTimeBlocks(blocksData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching time blocks:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  const createTimeBlock = useCallback(async (input: CreateTimeBlockInput): Promise<string> => {
    if (!userId) throw new Error('User not authenticated')

    const now = Timestamp.now()
    
    // Calculate duration from start and end times
    const [startHour, startMin] = input.startTime.split(':').map(Number)
    const [endHour, endMin] = input.endTime.split(':').map(Number)
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)

    const blockData = {
      name: input.name,
      blockType: input.blockType,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      daysOfWeek: input.daysOfWeek,
      energyLevel: input.energyLevel,
      preferredTaskTypes: input.preferredTaskTypes || [],
      isProtected: input.isProtected || false,
      createdAt: now,
      updatedAt: now
    }

    const blocksRef = collection(db, 'users', userId, 'timeBlocks')
    const docRef = await addDoc(blocksRef, blockData)
    return docRef.id
  }, [userId])

  const updateTimeBlock = useCallback(async (blockId: string, input: UpdateTimeBlockInput): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: { [key: string]: any } = {
      updatedAt: Timestamp.now()
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.blockType !== undefined) updateData.blockType = input.blockType
    if (input.startTime !== undefined) updateData.startTime = input.startTime
    if (input.endTime !== undefined) updateData.endTime = input.endTime
    if (input.daysOfWeek !== undefined) updateData.daysOfWeek = input.daysOfWeek
    if (input.energyLevel !== undefined) updateData.energyLevel = input.energyLevel
    if (input.preferredTaskTypes !== undefined) updateData.preferredTaskTypes = input.preferredTaskTypes
    if (input.isProtected !== undefined) updateData.isProtected = input.isProtected

    // Recalculate duration if times changed
    if (input.startTime || input.endTime) {
      const startTime = input.startTime || updateData.startTime
      const endTime = input.endTime || updateData.endTime
      if (startTime && endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        updateData.durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
      }
    }

    const blockRef = doc(db, 'users', userId, 'timeBlocks', blockId)
    await updateDoc(blockRef, updateData)
  }, [userId])

  const deleteTimeBlock = useCallback(async (blockId: string): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const blockRef = doc(db, 'users', userId, 'timeBlocks', blockId)
    await deleteDoc(blockRef)
  }, [userId])

  return {
    timeBlocks,
    loading,
    error,
    createTimeBlock,
    updateTimeBlock,
    deleteTimeBlock
  }
}

export default useTimeBlocks