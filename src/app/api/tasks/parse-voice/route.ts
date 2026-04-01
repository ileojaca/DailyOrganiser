import { NextRequest, NextResponse } from 'next/server';
import { parseTaskInput, generateConfirmation } from '@/utils/voiceTaskParser';
import { createTask } from '@/lib/firebaseUtils';

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

    // Parse the input
    const parsed = parseTaskInput(normalizedInput);

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
