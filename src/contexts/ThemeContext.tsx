'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  accentColor: string;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [accentColor, setAccentColor] = useState('#4F46E5');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const savedAccent = localStorage.getItem('theme-accent');
    
    if (savedMode) setMode(savedMode);
    if (savedAccent) setAccentColor(savedAccent);
  }, []);

  useEffect(() => {
    // Resolve system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateResolvedMode = () => {
      if (mode === 'system') {
        setResolvedMode(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolvedMode();
    mediaQuery.addEventListener('change', updateResolvedMode);
    
    return () => mediaQuery.removeEventListener('change', updateResolvedMode);
  }, [mode]);

  const hexToRgb = (hex: string) => {
    const normalizedHex = hex.replace('#', '');
    const bigint = parseInt(normalizedHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;

    if (resolvedMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply accent color as CSS variable
    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--accent-color-rgb', hexToRgb(accentColor));

    // Save to localStorage
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accentColor);
  }, [mode, accentColor, resolvedMode]);

  return (
    <ThemeContext.Provider value={{ mode, accentColor, setMode, setAccentColor, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
