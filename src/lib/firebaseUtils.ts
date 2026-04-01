/**
 * Firebase Firestore Utilities
 * 
 * Helper functions for Firestore operations with proper error handling
 */

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Query,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Get Firestore instance (for server-side operations)
 */
export async function getServerFirestore() {
  // This will be called from API routes
  // Firebase Admin SDK setup can be added here if needed
  return getFirestore();
}

/**
 * Create a task in Firestore
 */
export async function createTask(userId: string, taskData: any) {
  try {
    const db = getFirestore();
    const tasksRef = collection(db, 'users', userId, 'tasks');
    
    const newTask = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId,
    });
    
    return { id: newTask.id, ...taskData };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Get tasks for a user
 */
export async function getUserTasks(userId: string, filters?: any) {
  try {
    const db = getFirestore();
    const tasksRef = collection(db, 'users', userId, 'tasks');
    
    let q: Query = query(
      tasksRef,
      orderBy('createdAt', 'desc')
    );
    
    // Apply filters if provided
    if (filters?.status) {
      q = query(tasksRef, where('completed', '==', filters.status === 'completed'));
    }
    if (filters?.category) {
      q = query(tasksRef, where('category', '==', filters.category));
    }
    if (filters?.priority) {
      q = query(tasksRef, where('priority', '==', filters.priority));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

/**
 * Get a single task
 */
export async function getTask(userId: string, taskId: string) {
  try {
    const db = getFirestore();
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      return null;
    }
    
    return {
      id: taskSnap.id,
      ...taskSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;
  }
}

/**
 * Update a task
 */
export async function updateTask(userId: string, taskId: string, updates: any) {
  try {
    const db = getFirestore();
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    return { id: taskId, ...updates };
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Mark task as complete
 */
export async function completeTask(userId: string, taskId: string) {
  try {
    const db = getFirestore();
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    
    await updateDoc(taskRef, {
      completed: true,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { id: taskId, completed: true };
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(userId: string, taskId: string) {
  try {
    const db = getFirestore();
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    
    await deleteDoc(taskRef);
    return { id: taskId, deleted: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Log energy level for a day
 */
export async function logEnergy(userId: string, date: string, energyData: any) {
  try {
    const db = getFirestore();
    const energyRef = doc(db, 'users', userId, 'energyLogs', date);
    
    await setDoc(energyRef, {
      ...energyData,
      date,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { date, ...energyData };
  } catch (error) {
    console.error('Error logging energy:', error);
    throw error;
  }
}

/**
 * Get energy log for a day
 */
export async function getEnergyLog(userId: string, date: string) {
  try {
    const db = getFirestore();
    const energyRef = doc(db, 'users', userId, 'energyLogs', date);
    const energySnap = await getDoc(energyRef);
    
    if (!energySnap.exists()) {
      return null;
    }
    
    return {
      date,
      ...energySnap.data(),
    };
  } catch (error) {
    console.error('Error fetching energy log:', error);
    throw error;
  }
}

/**
 * Get daily schedule
 */
export async function getDailySchedule(userId: string, date: string) {
  try {
    const db = getFirestore();
    const scheduleRef = doc(db, 'users', userId, 'dailySchedules', date);
    const scheduleSnap = await getDoc(scheduleRef);
    
    if (!scheduleSnap.exists()) {
      return null;
    }
    
    return {
      date,
      ...scheduleSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
}

/**
 * Save daily schedule
 */
export async function saveDailySchedule(userId: string, date: string, scheduleData: any) {
  try {
    const db = getFirestore();
    const scheduleRef = doc(db, 'users', userId, 'dailySchedules', date);
    
    await setDoc(scheduleRef, {
      ...scheduleData,
      date,
      userId,
      updatedAt: serverTimestamp(),
    });
    
    return { date, ...scheduleData };
  } catch (error) {
    console.error('Error saving schedule:', error);
    throw error;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  try {
    const db = getFirestore();
    const profileRef = doc(db, 'users', userId, 'profile', 'data');
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      return null;
    }
    
    return {
      userId,
      ...profileSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

/**
 * Get gamification profile
 */
export async function getGamificationProfile(userId: string) {
  try {
    const db = getFirestore();
    const gamRef = doc(db, 'users', userId, 'gamification', 'data');
    const gamSnap = await getDoc(gamRef);
    
    if (!gamSnap.exists()) {
      // Return default gamification profile
      return {
        userId,
        totalPoints: 0,
        level: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
        tasksCompleted: 0,
        totalTimeSpent: 0,
      };
    }
    
    return {
      userId,
      ...gamSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching gamification:', error);
    throw error;
  }
}

/**
 * Update gamification profile
 */
export async function updateGamification(userId: string, updates: any) {
  try {
    const db = getFirestore();
    const gamRef = doc(db, 'users', userId, 'gamification', 'data');
    
    await setDoc(gamRef, {
      userId,
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { userId, ...updates };
  } catch (error) {
    console.error('Error updating gamification:', error);
    throw error;
  }
}
