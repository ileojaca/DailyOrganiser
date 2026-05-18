import { useState, useEffect, useRef, useCallback } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

export interface ActivityLog {
  id: string;
  userId: string;
  activityType: 'sitting' | 'light-activity' | 'exercise' | 'manual';
  intensity: number;
  duration: number;
  timestamp: Date;
}

interface SensorReading {
  x: number;
  y: number;
  z: number;
}

export function useActivityTracker(userId: string | undefined) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const [lastSittingAlert, setLastSittingAlert] = useState<Date | null>(null);
  const sensorRef = useRef<any>(null);
  const sittingStartRef = useRef<Date | null>(null);
  const lastReading = useRef<SensorReading | null>(null);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(getDb(), 'users', userId, 'activityLogs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        userId,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
      } as ActivityLog));
      setActivities(logs);
    });

    return unsubscribe;
  }, [userId]);

  const checkSensorAPI = useCallback(() => {
    const hasLinearAccelerometer =
      typeof window !== 'undefined' &&
      'LinearAccelerationSensor' in window &&
      'permissions' in navigator;

    setSensorAvailable(hasLinearAccelerometer);
    return hasLinearAccelerometer;
  }, []);

  const logActivity = useCallback(
    async (type: 'sitting' | 'light-activity' | 'exercise' | 'manual', intensity: number, durationMinutes: number = 5) => {
      if (!userId) return;

      try {
        const db = getDb();
        await addDoc(collection(db, 'users', userId, 'activityLogs'), {
          userId,
          activityType: type,
          intensity,
          duration: durationMinutes,
          timestamp: Timestamp.now(),
        });
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    },
    [userId]
  );

  const calculateMotion = (reading: SensorReading): number => {
    return Math.sqrt(reading.x * reading.x + reading.y * reading.y + reading.z * reading.z);
  };

  const classifyActivity = (avgMotion: number): 'sitting' | 'light-activity' | 'exercise' => {
    if (avgMotion < 0.5) return 'sitting';
    if (avgMotion < 3) return 'light-activity';
    return 'exercise';
  };

  const startTracking = useCallback(() => {
    checkSensorAPI();

    const hasSensor = typeof window !== 'undefined' && 'LinearAccelerationSensor' in window;

    if (hasSensor) {
      try {
        const sensor = new (window as any).LinearAccelerationSensor({ frequency: 1 });

        const motionReadings: number[] = [];
        let trackingWindow = 0;

        sensor.addEventListener('reading', () => {
          const motion = calculateMotion({
            x: sensor.x,
            y: sensor.y,
            z: sensor.z,
          });
          motionReadings.push(motion);
          lastReading.current = { x: sensor.x, y: sensor.y, z: sensor.z };

          trackingWindow++;

          if (trackingWindow >= 60) {
            const avgMotion = motionReadings.reduce((a, b) => a + b, 0) / motionReadings.length;
            const activityType = classifyActivity(avgMotion);

            if (activityType === 'sitting') {
              if (!sittingStartRef.current) {
                sittingStartRef.current = new Date();
              } else {
                const sittingDuration = (Date.now() - sittingStartRef.current.getTime()) / (1000 * 60);
                if (sittingDuration > 45 && (!lastSittingAlert || Date.now() - lastSittingAlert.getTime() > 60000)) {
                  setLastSittingAlert(new Date());
                }
              }
            } else {
              sittingStartRef.current = null;
            }

            const intensity = Math.min(10, Math.round((avgMotion / 5) * 10));
            logActivity(activityType, intensity, 5);

            motionReadings.length = 0;
            trackingWindow = 0;
          }
        });

        sensor.addEventListener('error', (event: any) => {
          console.error('Sensor error:', event.error);
          setIsTracking(false);
        });

        sensor.start();
        sensorRef.current = sensor;
        setIsTracking(true);
      } catch (error) {
        console.error('Failed to initialize sensor:', error);
        setIsTracking(false);
      }
    } else {
      setIsTracking(true);
    }
  }, [checkSensorAPI, logActivity]);

  const stopTracking = useCallback(() => {
    if (sensorRef.current) {
      try {
        sensorRef.current.stop();
      } catch (error) {
        console.error('Error stopping sensor:', error);
      }
    }
    setIsTracking(false);
    sittingStartRef.current = null;
  }, []);

  const manualLogActivity = useCallback(
    async (type: 'sitting' | 'light-activity' | 'exercise', intensity: number) => {
      await logActivity(type, intensity, 5);
    },
    [logActivity]
  );

  const getSittingAlertMessage = (): string | null => {
    if (!sittingStartRef.current) return null;

    const sittingMinutes = (Date.now() - sittingStartRef.current.getTime()) / (1000 * 60);
    if (sittingMinutes > 45) {
      return `You've been sitting for ${Math.round(sittingMinutes)} minutes. Time for a break?`;
    }
    return null;
  };

  return {
    activities,
    isTracking,
    sensorAvailable,
    startTracking,
    stopTracking,
    logActivity: manualLogActivity,
    getSittingAlertMessage,
  };
}
