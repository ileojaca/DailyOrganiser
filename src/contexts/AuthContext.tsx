'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { getAuthInstance, getDb } from '@/lib/firebase';

interface UserProfile {
  email: string;
  fullName?: string;
  timezone: string;
  chronotype: 'lark' | 'owl' | 'intermediate';
  energyPattern: { peakHours: string[]; lowHours: string[] };
  preferences: { notifications: boolean; reminders: boolean; suggestionAlerts: boolean };
  subscription_tier?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        const authInstance = getAuthInstance();
        const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
          if (!isMounted) return;
          
          setUser(firebaseUser);
          if (firebaseUser) {
            await loadProfile(firebaseUser.uid);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
        return unsubscribe;
      } catch (err) {
        console.error('Firebase initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Firebase');
        setLoading(false);
      }
    };

    const unsubPromise = initAuth();
    
    return () => {
      isMounted = false;
      unsubPromise.then(unsub => unsub?.());
    };
  }, []);

  const loadProfile = async (uid: string) => {
    try {
      const dbInstance = getDb();
      const docRef = doc(dbInstance, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as UserProfile);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const createUserProfile = async (uid: string, email: string, fullName?: string) => {
    const dbInstance = getDb();
    const now = Timestamp.now();
    const profileData = {
      email,
      fullName: fullName || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      chronotype: 'intermediate' as const,
      energyPattern: { peakHours: ['09:00-11:00', '15:00-17:00'], lowHours: ['13:00-14:00'] },
      preferences: { notifications: true, reminders: true, suggestionAlerts: true },
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(dbInstance, 'users', uid), profileData);
    setProfile({ ...profileData, createdAt: now.toDate(), updatedAt: now.toDate() });
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    const authInstance = getAuthInstance();
    await signInWithEmailAndPassword(authInstance, email, password);
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null);
    const authInstance = getAuthInstance();
    const { user: newUser } = await createUserWithEmailAndPassword(authInstance, email, password);
    await createUserProfile(newUser.uid, email, fullName);
    // Send verification email
    await sendEmailVerification(newUser);
  };

  const signInWithGoogle = async () => {
    setError(null);
    const authInstance = getAuthInstance();
    const dbInstance = getDb();
    const provider = new GoogleAuthProvider();
    const { user: googleUser } = await signInWithPopup(authInstance, provider);
    const snap = await getDoc(doc(dbInstance, 'users', googleUser.uid));
    if (!snap.exists()) {
      await createUserProfile(googleUser.uid, googleUser.email!, googleUser.displayName || undefined);
    }
  };

  const signInWithGithub = async () => {
    setError(null);
    const authInstance = getAuthInstance();
    const dbInstance = getDb();
    const provider = new GithubAuthProvider();
    const { user: githubUser } = await signInWithPopup(authInstance, provider);
    const snap = await getDoc(doc(dbInstance, 'users', githubUser.uid));
    if (!snap.exists()) {
      await createUserProfile(githubUser.uid, githubUser.email!, githubUser.displayName || undefined);
    }
  };

  const signInWithMicrosoft = async () => {
    setError(null);
    const authInstance = getAuthInstance();
    const dbInstance = getDb();
    const provider = new OAuthProvider('microsoft.com');
    const { user: microsoftUser } = await signInWithPopup(authInstance, provider);
    const snap = await getDoc(doc(dbInstance, 'users', microsoftUser.uid));
    if (!snap.exists()) {
      await createUserProfile(microsoftUser.uid, microsoftUser.email!, microsoftUser.displayName || undefined);
    }
  };

  const signOut = async () => {
    const authInstance = getAuthInstance();
    await firebaseSignOut(authInstance);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    const authInstance = getAuthInstance();
    await sendPasswordResetEmail(authInstance, email);
  };

  const sendVerificationEmail = async () => {
    if (!user) throw new Error('Not authenticated');
    await sendEmailVerification(user);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const dbInstance = getDb();
    const updateData = { ...data, updatedAt: Timestamp.now() };
    await setDoc(doc(dbInstance, 'users', user.uid), updateData, { merge: true });
    setProfile((prev) => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signUp, signInWithGoogle, signInWithGithub, signInWithMicrosoft, signOut, resetPassword, updateProfile, sendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}