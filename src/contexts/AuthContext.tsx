'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  email: string;
  fullName?: string;
  timezone: string;
  chronotype: 'lark' | 'owl' | 'intermediate';
  energyPattern: { peakHours: string[]; lowHours: string[] };
  preferences: { notifications: boolean; reminders: boolean; suggestionAlerts: boolean };
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
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
    await setDoc(doc(db, 'users', uid), profileData);
    setProfile({ ...profileData, createdAt: now.toDate(), updatedAt: now.toDate() });
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(newUser.uid, email, fullName);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user: googleUser } = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db, 'users', googleUser.uid));
    if (!snap.exists()) {
      await createUserProfile(googleUser.uid, googleUser.email!, googleUser.displayName || undefined);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const updateData = { ...data, updatedAt: Timestamp.now() };
    await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
    setProfile((prev) => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
