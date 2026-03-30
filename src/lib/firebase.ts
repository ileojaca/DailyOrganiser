import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'

let app: FirebaseApp | undefined
let db: Firestore | undefined
let auth: Auth | undefined

const getFirebaseConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
})

const isConfigured = () => {
  const config = getFirebaseConfig()
  return config.apiKey && config.projectId && config.apiKey.length > 0
}

const initializeFirebase = () => {
  if (typeof window === 'undefined') {
    // Server-side - return undefined, client will handle initialization
    return null
  }
  
  if (!isConfigured()) {
    console.error('Firebase environment variables are not configured')
    return null
  }
  
  if (!app) {
    app = initializeApp(getFirebaseConfig())
  }
  
  if (!db) {
    db = getFirestore(app)
  }
  
  if (!auth) {
    auth = getAuth(app)
  }
  
  return { app, db, auth }
}

// Client-side initialization
if (typeof window !== 'undefined') {
  initializeFirebase()
}

export const getFirebaseApp = (): FirebaseApp => {
  const instance = initializeFirebase()
  if (!instance?.app) {
    throw new Error('Firebase not initialized. Make sure you are on the client and env vars are set.')
  }
  return instance.app
}

export const getDb = (): Firestore => {
  const instance = initializeFirebase()
  if (!instance?.db) {
    throw new Error('Firebase not initialized. Make sure you are on the client and env vars are set.')
  }
  return instance.db
}

export const getAuthInstance = (): Auth => {
  const instance = initializeFirebase()
  if (!instance?.auth) {
    throw new Error('Firebase not initialized. Make sure you are on the client and env vars are set.')
  }
  return instance.auth
}

export default app