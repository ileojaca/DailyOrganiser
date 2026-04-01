import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getUserTasks, createTask, updateTask } from '@/lib/firebaseUtils';
import { Task } from '@/types/simplified';

/**
 * GET /api/goals
 * Fetch user's tasks with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from Authorization header or Firebase Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, you'd validate the token here
    // For now, extract userId from token or use Firebase client-side auth
    // This is a simplified approach - use Firebase Admin SDK in production
    
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Get filter parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const completed = searchParams.get('completed');

    const filters: any = {};
    if (category) filters.category = category;
    if (priority) filters.priority = parseInt(priority);
    if (completed) filters.completed = completed === 'true';

    const tasks = await getUserTasks(userId, filters);
    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

/**
 * POST /api/goals
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      priority = 3,
      duration = 45,
      energyRequired = 3,
      scheduledTime,
      pointsValue = 10,
      funLevel = 3,
    } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    const newTask = await createTask(userId, {
      title,
      description,
      category,
      priority: Math.max(1, Math.min(5, priority)),
      duration,
      energyRequired: Math.max(1, Math.min(5, energyRequired)),
      scheduledTime,
      pointsValue,
      funLevel: Math.max(1, Math.min(5, funLevel)),
      completed: false,
      voiceCreated: body.voiceCreated || false,
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
