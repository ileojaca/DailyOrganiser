'use client';

import React, { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeBlocks, TimeBlock } from '@/hooks/useTimeBlocks';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ENERGY_COLORS: Record<string, string> = {
  high: 'bg-green-100 border-green-300 text-green-800',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  low: 'bg-gray-100 border-gray-300 text-gray-700',
};
const BLOCK