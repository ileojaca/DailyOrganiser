import { NextRequest, NextResponse } from 'next/server';
import { parseTaskInput, generateConfirmation } from '@/utils/voiceTaskParser';
import { createTask } from '@/lib/firebaseUtils';
import { callAI, type AIProvider } from '@/lib/aiClient';

async function parseWithAI(input: string, provider?: AIProvider, model?: string) {
  const prompt = `Parse this task description into structured data. Return ONLY valid JSON, no explanation.

Input: "${input}"

Return JSON with these fields:
{
  "taskTitle": "string (required)",
  "category": "homework|work|chores|exercise|social|personal|family|rest",
  "priority": 1-5 (5=urgent),
  "duration": minutes as number,
  "energyRequired": 1-10,
  "scheduledTime": "ISO datetime string or null",
  "confidence": 0.0-1.0
}`;

  const text = await callAI({ provider, model, prompt, maxTokens: 300 });
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * POST /api/tasks/parse-voice
 * 
 * Parse voice input or text and create a task
 * 
 * Request body:
 * {
 *   input: string, // "Do homework for 2 hours tomorrow at 3pm"
 *   createTask?: boolean, // Auto-create if confidence > 0.7
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const { input, text, createImmediate = false, aiProvider, aiModel } = body;
    const normalizedInput = typeof input === 'string' ? input : typeof text === 'string' ? text : '';

    if (!normalizedInput.trim()) {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
    }

    // Parse the input — try AI first, fall back to regex
    let parsed = await parseWithAI(normalizedInput, aiProvider, aiModel);
    if (!parsed) {
      parsed = parseTaskInput(normalizedInput);
    }

    if (!parsed.taskTitle) {
      return NextResponse.json(
        {
          error: 'Could not parse task from input',
          parsed,
        },
        { status: 400 }
      );
    }

    // Generate confirmation message
    const confirmation = generateConfirmation(parsed);

    // Optionally create the task immediately if confidence is high
    let createdTask = null;
    if (createImmediate && parsed.confidence > 0.7) {
      createdTask = await createTask(userId, {
        title: parsed.taskTitle,
        category: parsed.category || 'personal',
        priority: parsed.priority || 3,
        duration: parsed.duration || 45,
        energyRequired: parsed.energyRequired || 3,
        scheduledTime: parsed.scheduledTime,
        pointsValue: 10,
        funLevel: 3,
        completed: false,
        voiceCreated: true,
      });
    }

    return NextResponse.json(
      {
        parsed,
        confirmation,
        createdTask,
        autoCreated: !!createdTask,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error parsing voice input:', error);
    return NextResponse.json({ error: 'Failed to parse input' }, { status: 500 });
  }
}
