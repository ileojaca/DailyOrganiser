import { NextRequest, NextResponse } from 'next/server';
import { logEnergy, getEnergyLog, getUserTasks } from '@/lib/firebaseUtils';

/**
 * POST /api/energy-log
 * 
 * Log user's energy level for a specific time of day
 * 
 * Request body:
 * {
 *   date: "YYYY-MM-DD",
 *   morning?: 1-5,
 *   afternoon?: 1-5,
 *   evening?: 1-5,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const { date, morning, afternoon, evening, notes } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
    }

    // Validate energy levels (1-5)
    const validateEnergy = (val: any) => val === undefined || (val >= 1 && val <= 5);
    if (!validateEnergy(morning) || !validateEnergy(afternoon) || !validateEnergy(evening)) {
      return NextResponse.json(
        { error: 'Energy levels must be between 1-5' },
        { status: 400 }
      );
    }

    const result = await logEnergy(userId, date, {
      morning: morning || 3,
      afternoon: afternoon || 3,
      evening: evening || 2,
      notes,
    });

    return NextResponse.json({ energyLog: result }, { status: 201 });
  } catch (error) {
    console.error('Error logging energy:', error);
    return NextResponse.json({ error: 'Failed to log energy' }, { status: 500 });
  }
}

/**
 * GET /api/energy-log?date=YYYY-MM-DD
 * 
 * Get energy logs for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const energyLog = await getEnergyLog(userId, date);

    if (!energyLog) {
      return NextResponse.json({ energyLog: null }, { status: 200 });
    }

    return NextResponse.json({ energyLog }, { status: 200 });
  } catch (error) {
    console.error('Error fetching energy log:', error);
    return NextResponse.json({ error: 'Failed to fetch energy log' }, { status: 500 });
  }
}
