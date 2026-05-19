'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const recentTitlesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const db = getDb();
    const notifCollection = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifCollection, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Notification[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const timestamp =
            data.timestamp instanceof Timestamp
              ? data.timestamp.toDate()
              : data.timestamp
              ? new Date(data.timestamp)
              : new Date();
          return {
            id: docSnap.id,
            type: data.type,
            title: data.title,
            message: data.message,
            timestamp,
            read: data.read ?? false,
            action: undefined,
          };
        });
        setNotifications(docs);
      },
      (err) => {
        if (err.code !== 'permission-denied') console.error('Notifications listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const isDuplicate = useCallback((title: string): boolean => {
    const now = Date.now();
    const map = recentTitlesRef.current;
    const last = map.get(title);
    if (last !== undefined && now - last < 60_000) {
      return true;
    }
    map.set(title, now);
    return false;
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      if (isDuplicate(notification.title)) return;

      if (user) {
        const db = getDb();
        const { action: _, ...persistable } = notification;
        addDoc(collection(db, 'users', user.uid, 'notifications'), {
          ...persistable,
          timestamp: serverTimestamp(),
          read: false,
        }).catch(console.error);
      } else {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          read: false,
        };
        setNotifications((prev) => [newNotification, ...prev]);
      }
    },
    [user?.uid, isDuplicate]
  );

  const markAsRead = useCallback(
    (id: string) => {
      if (user) {
        const db = getDb();
        updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true }).catch(
          console.error
        );
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    },
    [user?.uid]
  );

  const markAllAsRead = useCallback(() => {
    if (user) {
      const db = getDb();
      const unread = notifications.filter((n) => !n.read);
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
      });
      batch.commit().catch(console.error);
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, [user?.uid, notifications]);

  const removeNotification = useCallback(
    (id: string) => {
      if (user) {
        const db = getDb();
        deleteDoc(doc(db, 'users', user.uid, 'notifications', id)).catch(console.error);
      } else {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    },
    [user?.uid]
  );

  const clearAll = useCallback(() => {
    if (user) {
      const db = getDb();
      if (notifications.length === 0) return;
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'users', user.uid, 'notifications', n.id));
      });
      batch.commit().catch(console.error);
    } else {
      setNotifications([]);
    }
  }, [user?.uid, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
