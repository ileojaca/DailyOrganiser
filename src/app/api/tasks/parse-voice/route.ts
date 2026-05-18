import { NextRequest, NextResponse } from 'next/server';
import { parseTaskInput, generateConfirmation } from '@/utils/voiceTaskParser';
import { createTask } from '@/lib/firebaseUtils';
import Anthropic from '@anthropic-ai/sdk';

async function parseWithClaude(input: string, userId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Parse this task description into structured data. Return ONLY valid JSON, no explanation.

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
}`
    }],
  });

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
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
    const { input, text, createImmediate = false } = body;
    const normalizedInput = typeof input === 'string' ? input : typeof text === 'string' ? text : '';

    if (!normalizedInput.trim()) {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
    }

    // Parse the input — try Claude first, fall back to regex
    let parsed = await parseWithClaude(normalizedInput, userId);
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
