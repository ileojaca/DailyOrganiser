'use client';

import { useState, useCallback, useRef } from 'react';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollbackData: T) => void;
  onSettled?: () => void;
}

interface OptimisticUpdateResult<T> {
  data: T;
  isUpdating: boolean;
  error: Error | null;
  execute: (optimisticData: T, asyncOperation: () => Promise<T>) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for implementing optimistic UI updates
 * Allows immediate UI updates while async operations are in progress
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T> = {}
): OptimisticUpdateResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (optimisticData: T, asyncOperation: () => Promise<T>) => {
      // Store the current data for rollback before updating
      setData(currentData => {
        const originalData = currentData;
        
        // Apply optimistic update immediately
        setIsUpdating(true);
        setError(null);

        // Execute async operation in the background
        (async () => {
          try {
            // Execute the async operation
            const result = await asyncOperation();

            // Update with the actual result
            setData(result);
            options.onSuccess?.(result);
          } catch (err) {
            // Rollback to original data on error
            setData(originalData);
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            options.onError?.(error, originalData);
          } finally {
            setIsUpdating(false);
            options.onSettled?.();
          }
        })();

        // Return optimistic data for immediate update
        return optimisticData;
      });
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsUpdating(false);
  }, [initialData]);

  return {
    data,
    isUpdating,
    error,
    execute,
    reset,
  };
}

/**
 * Hook for optimistic list updates (add, remove, update items)
 */
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  options: OptimisticUpdateOptions<T[]> = {}
) {
  const { data: items, isUpdating, error, execute, reset } = useOptimisticUpdate(initialItems, options);

  const addItem = useCallback(
    async (newItem: T, asyncOperation: () => Promise<T>) => {
      const optimisticItems = [...items, newItem];
      await execute(optimisticItems, async () => {
        const result = await asyncOperation();
        return [...items, result];
      });
    },
    [items, execute]
  );

  const removeItem = useCallback(
    async (itemId: string, asyncOperation: () => Promise<void>) => {
      const optimisticItems = items.filter(item => item.id !== itemId);
      await execute(optimisticItems, async () => {
        await asyncOperation();
        return items.filter(item => item.id !== itemId);
      });
    },
    [items, execute]
  );

  const updateItem = useCallback(
    async (itemId: string, updates: Partial<T>, asyncOperation: () => Promise<T>) => {
      const optimisticItems = items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      await execute(optimisticItems, async () => {
        const result = await asyncOperation();
        return items.map(item => (item.id === itemId ? result : item));
      });
    },
    [items, execute]
  );

  return {
    items,
    isUpdating,
    error,
    addItem,
    removeItem,
    updateItem,
    reset,
  };
}

/**
 * Hook for optimistic task status updates
 */
export function useOptimisticTaskStatus(initialTasks: Array<{ id: string; status: string }>) {
  const { items: tasks, updateItem, ...rest } = useOptimisticList(initialTasks);

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: string, asyncOperation: () => Promise<void>) => {
      await updateItem(taskId, { status: newStatus } as Partial<{ id: string; status: string }>, async () => {
        await asyncOperation();
        return tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        );
      });
    },
    [tasks, updateItem]
  );

  return {
    tasks,
    updateTaskStatus,
    ...rest,
  };
}
