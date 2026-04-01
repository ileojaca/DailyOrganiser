/**
 * Voice & Natural Language Task Parser
 * 
 * Converts natural language input to structured tasks
 * Phase 1: Simple regex-based parsing
 * Phase 2+: Will integrate with NLP AI
 */

import { ParsedVoiceInput } from '@/types/simplified';

// Task category keywords
const CATEGORY_KEYWORDS = {
  homework: ['homework', 'study', 'learn', 'assignment', 'exam', 'quiz', 'reading'],
  work: ['work', 'meeting', 'email', 'report', 'project', 'deadline', 'presentation'],
  chores: ['chore', 'clean', 'wash', 'cook', 'grocery', 'laundry', 'dishes', 'vacuum'],
  exercise: ['exercise', 'run', 'gym', 'workout', 'walk', 'yoga', 'swim', 'cycle'],
  social: ['call', 'meet', 'hang', 'friend', 'coffee', 'lunch', 'dinner', 'party'],
  personal: ['personal', 'hobby', 'art', 'music', 'read', 'game', 'movie'],
  family: ['family', 'kids', 'children', 'parent', 'dinner', 'game night', 'picnic'],
  rest: ['rest', 'nap', 'sleep', 'relax', 'break', 'meditation', 'chill'],
};

// Priority keywords
const PRIORITY_KEYWORDS = {
  5: ['critical', 'urgent', 'asap', 'immediately', 'emergency', 'must', 'important'],
  4: ['soon', 'today', 'this week', 'important', 'high'],
  3: [],
  2: ['whenever', 'sometime', 'flexible', 'low priority'],
  1: ['whenever possible', 'optional', 'nice to have', 'backlog'],
};

// Duration patterns (in minutes)
const DURATION_PATTERNS = [
  { regex: /(\d+)\s*hours?/gi, multiplier: 60 },
  { regex: /(\d+)\s*mins?/gi, multiplier: 1 },
  { regex: /(\d+)\s*h$/gi, multiplier: 60 },
  { regex: /(\d+):(\d+)/g, multiplier: 1 }, // 1:30 format
];

// Time patterns
const TIME_PATTERNS = [
  { text: ['today', "today's"], dayOffset: 0 },
  { text: ['tomorrow', "tomorrow's"], dayOffset: 1 },
  { text: ['tonight'], dayOffset: 0, hour: 18 },
  { text: ['morning'], hour: 9 },
  { text: ['afternoon'], hour: 14 },
  { text: ['evening'], hour: 18 },
  { text: ['night'], hour: 20 },
  { text: ['early morning'], hour: 7 },
];

/**
 * Extract duration from text
 */
function extractDuration(text: string): number | undefined {
  // Default durations by category
  const defaults: Record<string, number> = {
    homework: 60,
    work: 120,
    chores: 45,
    exercise: 45,
    social: 60,
    personal: 45,
    family: 60,
    rest: 30,
  };

  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match && match[1]) {
      const value = parseInt(match[1]);
      return value * pattern.multiplier;
    }
  }

  return undefined;
}

/**
 * Extract priority from text
 */
function extractPriority(text: string): 1 | 2 | 3 | 4 | 5 {
  const lowerText = text.toLowerCase();

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return parseInt(priority) as any;
      }
    }
  }

  return 3; // Default to medium priority
}

/**
 * Extract category from text
 */
function extractCategory(text: string): string {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return 'personal'; // Default category
}

/**
 * Extract task title (clean text)
 */
function extractTitle(text: string): string {
  let cleaned = text;

  // Remove time references
  cleaned = cleaned.replace(/\b(tomorrow|today|tonight|morning|afternoon|evening|night)\b/gi, '');

  // Remove duration references
  cleaned = cleaned.replace(/(\d+\s*(hours?|mins?|h))(\s+)?/gi, '');

  // Remove priority keywords
  const allPriorityKeywords = Object.values(PRIORITY_KEYWORDS).flat();
  allPriorityKeywords.forEach((keyword) => {
    cleaned = cleaned.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
  });

  // Remove extra whitespace
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  return cleaned || text;
}

/**
 * Extract energy requirement based on category and keywords
 */
function extractEnergyRequired(text: string, category: string): 1 | 2 | 3 | 4 | 5 {
  const lowerText = text.toLowerCase();

  // High-energy keywords
  if (lowerText.match(/\b(hard|difficult|focus|concentrate|intense|complex)\b/)) {
    return 5;
  }

  // Default by category
  const defaults: Record<string, number> = {
    homework: 4,
    work: 4,
    chores: 2,
    exercise: 3,
    social: 2,
    personal: 2,
    family: 2,
    rest: 1,
  };

  return (defaults[category] || 3) as any;
}

/**
 * Extract scheduled time from text
 */
function extractScheduledTime(text: string): Date | undefined {
  const lowerText = text.toLowerCase();
  const now = new Date();

  // Check for specific times like "3pm", "15:30", "3:30pm"
  const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(?:am|pm)?/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const isPM = lowerText.includes('pm');
    const isAM = lowerText.includes('am');

    const time = new Date();
    time.setHours(isAM || hour < 12 ? hour : hour + 12, minute);

    // Make sure it's not in the past
    if (time < now) {
      time.setHours(time.getHours() + 12);
    }

    return time;
  }

  // Check for day-relative times
  for (const pattern of TIME_PATTERNS) {
    for (const text of pattern.text) {
      if (lowerText.includes(text)) {
        const time = new Date(now);
        if (pattern.dayOffset !== undefined) {
          time.setDate(time.getDate() + pattern.dayOffset);
        }
        if (pattern.hour !== undefined) {
          time.setHours(pattern.hour, 0);
        }
        return time;
      }
    }
  }

  return undefined;
}

/**
 * Parse voice/text input into structured task data
 * 
 * Examples:
 * - "Do homework for 2 hours tomorrow at 3pm"
 * - "urgent: finish project report - high priority"
 * - "take a 30 min break this afternoon"
 * - "call mom tonight"
 */
export function parseTaskInput(input: string): ParsedVoiceInput {
  if (!input || input.trim().length === 0) {
    return {
      taskTitle: '',
      confidence: 0,
    };
  }

  const category = extractCategory(input);
  const priority = extractPriority(input);
  const duration = extractDuration(input) || 45; // default 45 min
  const energyRequired = extractEnergyRequired(input, category);
  const scheduledTime = extractScheduledTime(input);
  const taskTitle = extractTitle(input);

  // Calculate confidence based on quality of extraction
  let confidence = 0.5; // base confidence

  if (taskTitle.length > 3) confidence += 0.2;
  if (scheduledTime) confidence += 0.15;
  if (duration) confidence += 0.1;
  if (extractDuration(input)) confidence += 0.05; // explicit duration was provided

  confidence = Math.min(confidence, 1);

  return {
    taskTitle,
    category: category as any,
    priority: priority as any,
    duration,
    energyRequired: energyRequired as any,
    scheduledTime,
    confidence,
  };
}

/**
 * Generate friendly confirmation message for parsed task
 */
export function generateConfirmation(parsed: ParsedVoiceInput): string {
  let message = `Got it! I'll create: **${parsed.taskTitle}** (${parsed.category})`;

  if (parsed.duration) {
    message += ` - about ${parsed.duration} mins`;
  }

  if (parsed.scheduledTime) {
    const time = parsed.scheduledTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    message += ` at ${time}`;
  }

  if (parsed.confidence < 0.6) {
    message += ` (I'm ${Math.round(parsed.confidence * 100)}% sure - feel free to adjust!)`;
  }

  return message;
}

/**
 * Batch parse multiple voice inputs
 */
export function parseMultipleInputs(inputs: string[]): ParsedVoiceInput[] {
  return inputs.map((input) => parseTaskInput(input));
}
