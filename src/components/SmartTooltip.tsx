'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { SmartTooltip as SmartTooltipType } from '@/types/lifeManagement';

interface SmartTooltipProps {
  children: ReactNode;
  trigger: string;
  content: string;
  action?: string;
  onAction?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function SmartTooltip({
  children,
  trigger,
  content,
  action,
  onAction,
  position = 'top',
}: SmartTooltipProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Check if tooltip was dismissed
    const dismissed = localStorage.getItem(`tooltip_dismissed_${user.uid}_${trigger}`);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, [user, trigger]);

  useEffect(() => {
    if (!isVisible || isDismissed) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, isDismissed]);

  const handleMouseEnter = () => {
    if (!isDismissed) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleDismiss = () => {
    if (!user) return;
    setIsDismissed(true);
    setIsVisible(false);
    localStorage.setItem(`tooltip_dismissed_${user.uid}_${trigger}`, 'true');
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 dark:border-b-gray-700 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 dark:border-l-gray-700 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 dark:border-r-gray-700 border-t-transparent border-b-transparent border-l-transparent';
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  if (isDismissed) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${getPositionClasses()}`}
          role="tooltip"
        >
          <div className="bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg px-4 py-3 shadow-lg max-w-xs">
            <p>{content}</p>
            {action && (
              <button
                onClick={handleAction}
                className="mt-2 text-indigo-300 hover:text-indigo-200 text-xs font-medium"
              >
                {action}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="absolute top-1 right-1 text-gray-400 hover:text-white text-xs"
              aria-label="Dismiss tooltip"
            >
              ✕
            </button>
          </div>
          <div
            className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
          />
        </div>
      )}
    </div>
  );
}

// Hook for managing multiple tooltips
export function useSmartTooltips() {
  const { user } = useAuth();
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Load dismissed tooltips from localStorage
    const keys = Object.keys(localStorage);
    const dismissed = new Set<string>();
    keys.forEach(key => {
      if (key.startsWith(`tooltip_dismissed_${user.uid}_`)) {
        const trigger = key.replace(`tooltip_dismissed_${user.uid}_`, '');
        dismissed.add(trigger);
      }
    });
    setDismissedTooltips(dismissed);
  }, [user]);

  const dismissTooltip = (trigger: string) => {
    if (!user) return;
    setDismissedTooltips(prev => new Set([...prev, trigger]));
    localStorage.setItem(`tooltip_dismissed_${user.uid}_${trigger}`, 'true');
  };

  const resetTooltips = () => {
    if (!user) return;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`tooltip_dismissed_${user.uid}_`)) {
        localStorage.removeItem(key);
      }
    });
    setDismissedTooltips(new Set());
  };

  const isTooltipDismissed = (trigger: string) => {
    return dismissedTooltips.has(trigger);
  };

  return {
    dismissTooltip,
    resetTooltips,
    isTooltipDismissed,
  };
}
