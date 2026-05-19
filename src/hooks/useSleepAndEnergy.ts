import { useState, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

export interface SleepData {
  lastNightHours: number;
  quality: number;
  lastRecordedDate: Date | null;
}

export interface EnergyData {
  currentLevel: number;
  recentAverage: number;
  lastRecordedDate: Date | null;
  lastSleepDuration: number;
}

export function useSleepAndEnergy(userId: string | undefined) {
  const [sleep, setSleep] = useState<SleepData>({
    lastNightHours: 7,
    quality: 7,
    lastRecordedDate: null,
  });
  const [energy, setEnergy] = useState<EnergyData>({
    currentLevel: 5,
    recentAverage: 5,
    lastRecordedDate: null,
    lastSleepDuration: 7,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSleepData = async () => {
      try {
        const db = getDb();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
          collection(db, 'users', userId, 'sleepRecords'),
          where('date', '>=', Timestamp.fromDate(today)),
          orderBy('date', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.docs.length > 0) {
          const data = snapshot.docs[0].data();
          setSleep({
            lastNightHours: Math.round((data.duration || 0) / 60 * 10) / 10,
            quality: data.quality || 7,
            lastRecordedDate: data.date?.toDate?.() || new Date(data.date),
          });
        }
      } catch (error) {
        console.error('Error fetching sleep data:', error);
      }
    };

    const fetchCheckinData = async () => {
      try {
        const db = getDb();
        const todayStr = new Date().toISOString().slice(0, 10);
        const checkinRef = doc(db, 'users', userId, 'dailyCheckin', todayStr);
        const { getDoc } = await import('firebase/firestore');
        const checkinSnap = await getDoc(checkinRef);
        if (checkinSnap.exists()) {
          const data = checkinSnap.data();
          if (typeof data.sleepHours === 'number') {
            setEnergy(prev => ({ ...prev, lastSleepDuration: data.sleepHours }));
          }
        }
      } catch (error) {
        console.error('Error fetching checkin data:', error);
      }
    };

    const fetchEnergyData = async () => {
      try {
        const db = getDb();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentQ = query(
          collection(db, 'energyEntries'),
          where('userId', '==', userId),
          where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo)),
          orderBy('timestamp', 'desc'),
          limit(7)
        );

        const recentSnapshot = await getDocs(recentQ);
        if (recentSnapshot.docs.length > 0) {
          const entries = recentSnapshot.docs.map(doc => doc.data());
          const recentAverage = Math.round(
            entries.reduce((sum, entry) => sum + (entry.level || 5), 0) / entries.length
          );
          const currentLevel = entries[0]?.level || 5;
          const lastDate = entries[0]?.timestamp?.toDate?.() || new Date(entries[0]?.timestamp);

          setEnergy(prev => ({
            ...prev,
            currentLevel,
            recentAverage,
            lastRecordedDate: lastDate,
          }));
        }
      } catch (error) {
        console.error('Error fetching energy data:', error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSleepData(), fetchEnergyData(), fetchCheckinData()]);
      setLoading(false);
    };

    loadData();
  }, [userId]);

  const updateSleep = async (hours: number) => {
    if (!userId) return;
    const db = getDb();
    const todayStr = new Date().toISOString().slice(0, 10);
    const checkinRef = doc(db, 'users', userId, 'dailyCheckin', todayStr);
    await setDoc(checkinRef, { sleepHours: hours, updatedAt: serverTimestamp() }, { merge: true });
    setEnergy(prev => ({ ...prev, lastSleepDuration: hours }));
  };

  return {
    sleep,
    energy,
    loading,
    updateSleep,
  };
}
