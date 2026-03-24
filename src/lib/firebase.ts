import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { 
  getFirestore, 
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore'
import { 
  getAuth, 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
}

// Check if we're in a static build or development without env vars
const isMissingConfig = !firebaseConfig.apiKey || !firebaseConfig.projectId || firebaseConfig.apiKey === ''

// Mock Firestore client for static builds
const createMockFirestore = (): Firestore => {
  const mockData = new Map<string, DocumentData>()
  
  return {
    app: {} as FirebaseApp,
    type: 'firestore',
    toJSON: () => ({}),
    collection: (path: string) => ({
      id: path,
      path,
      parent: null,
      firestore: {} as Firestore,
      withConverter: () => ({}),
      doc: (id?: string) => ({
        id: id || 'mock-doc-id',
        path: `${path}/${id || 'mock-doc-id'}`,
        parent: {} as any,
        firestore: {} as Firestore,
        withConverter: () => ({}),
        get: async () => ({ 
          exists: () => false, 
          data: () => null,
          id: id || 'mock-doc-id',
          metadata: {}
        } as unknown as DocumentSnapshot<DocumentData>),
        set: async (data: DocumentData) => { mockData.set(`${path}/${id || 'mock-doc-id'}`, data) },
        update: async (data: Partial<DocumentData>) => { 
          const existing = mockData.get(`${path}/${id || 'mock-doc-id'}`) || {}
          mockData.set(`${path}/${id || 'mock-doc-id'}`, { ...existing, ...data })
        },
        delete: async () => { mockData.delete(`${path}/${id || 'mock-doc-id'}`) }
      }),
      get: async () => ({ 
        docs: [], 
        empty: true,
        size: 0,
        metadata: {}
      } as unknown as QuerySnapshot<DocumentData>),
      where: () => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
      orderBy: () => ({ get: async () => ({ docs: [], empty: true, size: 0 }) })
    }),
    batch: () => ({
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {}
    }),
    runTransaction: async () => ({}),
    doc: (path: string) {
      return this.collection('').doc(path)
    }
  } as unknown as Firestore
}

// Mock Auth client for static builds
const createMockAuth = (): Auth => {
  let currentUser: User | null = null
  
  return {
    app: {} as FirebaseApp,
    name: 'mock-auth',
    config: { apiKey: 'mock', authDomain: 'mock' },
    currentUser: null,
    setPersistence: async () => {},
    signOut: async () => { currentUser = null },
    onAuthStateChanged: (callback: any) => {
      callback(currentUser)
      return () => {}
    },
    signInWithEmailAndPassword: async () => { throw new Error('Mock auth') },
    createUserWithEmailAndPassword: async () => { throw new Error('Mock auth') },
    signInWithPopup: async () => { throw new Error('Mock auth') }
  } as unknown as Auth
}

// Initialize Firebase (or use mocks)
let app: FirebaseApp | undefined
let db: Firestore
let auth: Auth

if (!isMissingConfig && typeof window !== 'undefined') {
  // Real Firebase initialization
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  db = getFirestore(app)
  auth = getAuth(app)
} else {
  // Mock clients for static builds or missing config
  db = createMockFirestore()
  auth = createMockAuth()
}

// Export initialized instances
export { app, db, auth }

// Export helper functions for common operations
export const firebaseHelpers = {
  // User operations
  createUserProfile: async (userId: string, data: DocumentData) => {
    const userRef = doc(db, 'users', userId)
    await setDoc(userRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
  },

  getUserProfile: async (userId: string): Promise<DocumentData | null> => {
    const userRef = doc(db, 'users', userId)
    const snapshot = await getDoc(userRef)
    return snapshot.exists() ? snapshot.data() : null
  },

  updateUserProfile: async (userId: string, data: Partial<DocumentData>) => {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now()
    })
  },

  // Task/Goal operations
  createGoal: async (userId: string, goalData: DocumentData) => {
    const goalsRef = collection(db, 'users', userId, 'goals')
    const newGoalRef = doc(goalsRef)
    await setDoc(newGoalRef, {
      ...goalData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'pending'
    })
    return newGoalRef.id
  },

  getUserGoals: async (userId: string, status?: string): Promise<DocumentData[]> => {
    const goalsRef = collection(db, 'users', userId, 'goals')
    let q = query(goalsRef, orderBy('createdAt', 'desc'))
    
    if (status) {
      q = query(goalsRef, where('status', '==', status), orderBy('createdAt', 'desc'))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  updateGoal: async (userId: string, goalId: string, data: Partial<DocumentData>) => {
    const goalRef = doc(db, 'users', userId, 'goals', goalId)
    await updateDoc(goalRef, {
      ...data,
      updatedAt: Timestamp.now()
    })
  },

  deleteGoal: async (userId: string, goalId: string) => {
    const goalRef = doc(db, 'users', userId, 'goals', goalId)
    await deleteDoc(goalRef)
  },

  // Time blocks operations
  createTimeBlock: async (userId: string, blockData: DocumentData) => {
    const blocksRef = collection(db, 'users', userId, 'timeBlocks')
    const newBlockRef = doc(blocksRef)
    await setDoc(newBlockRef, {
      ...blockData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    return newBlockRef.id
  },

  getUserTimeBlocks: async (userId: string): Promise<DocumentData[]> => {
    const blocksRef = collection(db, 'users', userId, 'timeBlocks')
    const q = query(blocksRef, orderBy('startTime'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Accomplishment logs for AI learning
  createAccomplishmentLog: async (userId: string, logData: DocumentData) => {
    const logsRef = collection(db, 'users', userId, 'accomplishmentLogs')
    const newLogRef = doc(logsRef)
    await setDoc(newLogRef, {
      ...logData,
      createdAt: Timestamp.now()
    })
    return newLogRef.id
  },

  getUserAccomplishmentLogs: async (
    userId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<DocumentData[]> => {
    const logsRef = collection(db, 'users', userId, 'accomplishmentLogs')
    let q = query(logsRef, orderBy('scheduledDate', 'desc'))
    
    if (startDate && endDate) {
      q = query(
        logsRef, 
        where('scheduledDate', '>=', startDate.toISOString().split('T')[0]),
        where('scheduledDate', '<=', endDate.toISOString().split('T')[0]),
        orderBy('scheduledDate', 'desc')
      )
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
}

// Authentication helpers
export const authHelpers = {
  signInWithEmail: async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  },

  signUpWithEmail: async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password)
  },

  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  },

  signOut: async () => {
    return signOut(auth)
  },

  getCurrentUser: (): User | null => {
    return auth.currentUser
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback)
  }
}

// Type definitions for Firestore collections
export interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  timezone: string
  chronotype: 'lark' | 'owl' | 'intermediate'
  energyPattern: {
    peakHours: string[]
    lowHours: string[]
  }
  preferences: {
    notifications: boolean
    reminders: boolean
    suggestionAlerts: boolean
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Goal {
  id: string
  userId: string
  title: string
  description?: string
  category: 'work' | 'personal' | 'health' | 'learning' | 'social'
  priority: number // 1-5
  aiAdjustedPriority: boolean
  adjustmentReason?: string
  estimatedDuration?: number // minutes
  deadline?: Timestamp
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
  context: {
    location?: string
    tools?: string[]
    networkStatus?: string
  }
  energyRequired?: number // 1-10
  scheduledStart?: Timestamp
  scheduledEnd?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}

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
  createdAt: Timestamp
  updatedAt: Timestamp
}

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
  createdAt: Timestamp
}

export default firebaseHelpers
