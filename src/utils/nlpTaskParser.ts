/**
 * NLP Task Parser
 * Parses natural language input to extract task details
 */

export interface ParsedTask {
  title: string;
  duration?: number; // minutes
  deadline?: Date;
  priority?: number; // 1-5
  category?: 'work' | 'personal' | 'health' | 'learning' | 'social';
  energyRequired?: number; // 1-10
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | 'weekdays';
  context?: {
    location?: string;
    tools?: string[];
    networkStatus?: 'online' | 'offline' | 'limited';
  };
}

// Duration patterns (in minutes)
const DURATION_PATTERNS: { regex: RegExp; value: number }[] = [
  { regex: /(\d+)\s*hour/i, value: 60 },
  { regex: /(\d+)\s*hr/i, value: 60 },
  { regex: /(\d+)\s*h\b/i, value: 60 },
  { regex: /(\d+)\s*minute/i, value: 1 },
  { regex: /(\d+)\s*min/i, value: 1 },
  { regex: /(\d+)\s*m\b/i, value: 1 },
  { regex: /half\s*hour/i, value: 30 },
  { regex: /30\s*min/i, value: 30 },
  { regex: /45\s*min/i, value: 45 },
  { regex: /1\s*hour/i, value: 60 },
  { regex: /2\s*hours/i, value: 120 },
];

// Priority keywords
const PRIORITY_KEYWORDS: Record<string, number> = {
  'critical': 5,
  'urgent': 5,
  'asap': 5,
  'high priority': 4,
  'important': 4,
  'high': 4,
  'medium priority': 3,
  'medium': 3,
  'normal': 3,
  'low priority': 2,
  'low': 2,
  'whenever': 1,
  'someday': 1,
};

// Category keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'work': ['work', 'meeting', 'project', 'deadline', 'client', 'office'],
  'personal': ['personal', 'errand', 'chore', 'home', 'family'],
  'health': ['workout', 'exercise', 'gym', 'run', 'yoga', 'health', 'doctor'],
  'learning': ['study', 'learn', 'read', 'course', 'training', 'practice'],
  'social': ['friend', 'social', 'call', 'visit', 'party', 'dinner'],
};

// Energy level keywords
const ENERGY_KEYWORDS: Record<number, string[]> = {
  1: ['rest', 'easy', 'light'],
  2: ['low energy', 'simple'],
  3: ['quick', 'small'],
  4: ['moderate', 'normal'],
  5: ['standard', 'regular'],
  6: ['some effort', 'moderate focus'],
  7: ['focused', 'concentration'],
  8: ['deep work', 'intense'],
  9: ['complex', 'demanding'],
  10: ['maximum', 'peak'],
};

// Location keywords
const LOCATION_KEYWORDS: Record<string, string[]> = {
  'home': ['home', 'house', 'from home'],
  'office': ['office', 'workplace', 'at work'],
  'gym': ['gym', 'fitness', 'workout'],
  'cafe': ['cafe', 'coffee shop', 'starbucks'],
  'commute': ['commute', 'on the way', 'driving'],
  'outdoors': ['outside', 'outdoors', 'park'],
};

// Recurring patterns
const RECURRING_PATTERNS: { regex: RegExp; pattern: 'daily' | 'weekly' | 'monthly' | 'weekdays' }[] = [
  { regex: /every\s*day|daily|every\s*day/i, pattern: 'daily' },
  { regex: /every\s*week|weekly|once\s*a\s*week/i, pattern: 'weekly' },
  { regex: /every\s*month|monthly|once\s*a\s*month/i, pattern: 'monthly' },
  { regex: /weekdays|every\s*weekday|mon(-?)?fri/i, pattern: 'weekdays' },
  { regex: /every\s*monday|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?/i, pattern: 'weekly' },
];

/**
 * Parse natural language task input
 */
export function parseTaskInput(input: string): ParsedTask {
  const result: ParsedTask = {
    title: input.trim(),
  };

  // Extract duration
  const duration = extractDuration(input);
  if (duration) {
    result.duration = duration;
  }

  // Extract deadline
  const deadline = extractDeadline(input);
  if (deadline) {
    result.deadline = deadline;
  }

  // Extract priority
  const priority = extractPriority(input);
  if (priority) {
    result.priority = priority;
  }

  // Extract category
  const category = extractCategory(input);
  if (category) {
    result.category = category;
  }

  // Extract energy required
  const energy = extractEnergy(input);
  if (energy) {
    result.energyRequired = energy;
  }

  // Check for recurring
  const recurring = extractRecurring(input);
  if (recurring) {
    result.isRecurring = true;
    result.recurringPattern = recurring;
  }

  // Extract location
  const location = extractLocation(input);
  if (location) {
    result.context = { location };
  }

  // Clean up title - remove extracted parts
  result.title = cleanTitle(input, result);

  return result;
}

/**
 * Extract duration from input string
 */
function extractDuration(input: string): number | undefined {
  for (const pattern of DURATION_PATTERNS) {
    const match = input.match(pattern.regex);
    if (match) {
      const num = parseInt(match[1], 10);
      return num * pattern.value;
    }
  }
  return undefined;
}

/**
 * Extract deadline from relative date expressions
 */
function extractDeadline(input: string): Date | undefined {
  const now = new Date();
  const lowerInput = input.toLowerCase();
  
  // Today
  if (lowerInput.includes('today')) {
    return setTimeToEndOfDay(now);
  }
  
  // Tomorrow
  if (lowerInput.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return setTimeToEndOfDay(tomorrow);
  }
  
  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lowerInput.includes(`next ${days[i]}`) || lowerInput.includes(`${days[i]} next`)) {
      const targetDay = getNextDayOfWeek(now, i);
      return setTimeToEndOfDay(targetDay);
    }
    if (lowerInput.includes(days[i]) && !lowerInput.includes('next')) {
      const targetDay = getNextDayOfWeek(now, i);
      // If the day has passed this week, get next week's
      if (targetDay <= now) {
        targetDay.setDate(targetDay.getDate() + 7);
      }
      return setTimeToEndOfDay(targetDay);
    }
  }
  
  // "by Friday", "due Friday"
  if (lowerInput.includes('by ') || lowerInput.includes('due ')) {
    for (let i = 0; i < days.length; i++) {
      if (lowerInput.includes(days[i])) {
        const targetDay = getNextDayOfWeek(now, i);
        if (targetDay <= now) {
          targetDay.setDate(targetDay.getDate() + 7);
        }
        return setTimeToEndOfDay(targetDay);
      }
    }
  }
  
  // Next week
  if (lowerInput.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return setTimeToEndOfDay(nextWeek);
  }
  
  // In X days
  const inDaysMatch = lowerInput.match(/in\s+(\d+)\s*days?/);
  if (inDaysMatch) {
    const daysAhead = parseInt(inDaysMatch[1], 10);
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);
    return setTimeToEndOfDay(targetDate);
  }
  
  // Specific date (simple patterns)
  const datePatterns = [
    { regex: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, format: 'm/d' },
    { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, format: 'y-m-d' },
  ];
  
  for (const pattern of datePatterns) {
    const match = input.match(pattern.regex);
    if (match) {
      const date = new Date(input.match(pattern.regex)?.[0] || '');
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract priority from keywords
 */
function extractPriority(input: string): number | undefined {
  const lowerInput = input.toLowerCase();
  
  // Check for exact phrase matches first (longer = more specific)
  const phrases = Object.keys(PRIORITY_KEYWORDS).sort((a, b) => b.length - a.length);
  
  for (const phrase of phrases) {
    if (lowerInput.includes(phrase)) {
      return PRIORITY_KEYWORDS[phrase];
    }
  }
  
  return undefined;
}

/**
 * Extract category from keywords
 */
function extractCategory(input: string): 'work' | 'personal' | 'health' | 'learning' | 'social' | undefined {
  const lowerInput = input.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return category as 'work' | 'personal' | 'health' | 'learning' | 'social';
      }
    }
  }
  
  return undefined;
}

/**
 * Extract energy level from keywords
 */
function extractEnergy(input: string): number | undefined {
  const lowerInput = input.toLowerCase();
  
  for (const [level, keywords] of Object.entries(ENERGY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return parseInt(level, 10);
      }
    }
  }
  
  return undefined;
}

/**
 * Extract recurring pattern
 */
function extractRecurring(input: string): 'daily' | 'weekly' | 'monthly' | 'weekdays' | undefined {
  for (const pattern of RECURRING_PATTERNS) {
    if (pattern.regex.test(input)) {
      return pattern.pattern;
    }
  }
  return undefined;
}

/**
 * Extract location from keywords
 */
function extractLocation(input: string): string | undefined {
  const lowerInput = input.toLowerCase();
  
  for (const [location, keywords] of Object.entries(LOCATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return location;
      }
    }
  }
  
  return undefined;
}

/**
 * Clean up the title by removing extracted parts
 */
function cleanTitle(input: string, parsed: ParsedTask): string {
  let title = input;
  
  // Remove duration patterns
  for (const pattern of DURATION_PATTERNS) {
    title = title.replace(pattern.regex, '');
  }
  
  // Remove priority keywords
  Object.keys(PRIORITY_KEYWORDS).forEach(keyword => {
    title = title.replace(new RegExp(keyword, 'gi'), '');
  });
  
  // Remove category keywords
  Object.values(CATEGORY_KEYWORDS).flat().forEach(keyword => {
    title = title.replace(new RegExp(keyword, 'gi'), '');
  });
  
  // Remove time/date keywords
  const timeKeywords = ['today', 'tomorrow', 'next week', 'by ', 'due ', 'in ', 'days', 'every', 'daily', 'weekly', 'monthly', 'weekdays'];
  timeKeywords.forEach(keyword => {
    title = title.replace(new RegExp(keyword, 'gi'), '');
  });
  
  // Remove location keywords
  Object.values(LOCATION_KEYWORDS).flat().forEach(keyword => {
    title = title.replace(new RegExp(keyword, 'gi'), '');
  });
  
  // Clean up extra spaces and punctuation
  title = title.replace(/\s+/g, ' ').trim();
  title = title.replace(/^[,\-\s]+|[,\-\s]+$/g, '');
  
  return title || input;
}

// Helper functions
function setTimeToEndOfDay(date: Date): Date {
  date.setHours(23, 59, 59, 999);
  return date;
}

function getNextDayOfWeek(now: Date, dayOfWeek: number): Date {
  const result = new Date(now);
  result.setDate(result.getDate() + (dayOfWeek + 7 - result.getDay()) % 7);
  return result;
}

export default parseTaskInput;