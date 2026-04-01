import { NextRequest, NextResponse } from 'next/server';
import { getDailySchedule, saveDailySchedule, getUserTasks, getEnergyLog } from '@/lib/firebaseUtils';
import { generateDailySchedule, generateEnergyForecast } from '@/utils/ruleBasedScheduler';
import { DailyPlan, Task, EnergyLog } from '@/types/simplified';

/**
 * GET /api/schedule?date=YYYY-MM-DD
 * 
 * Get or generate daily schedule for a specific date
 * Includes AI suggestions based on energy, priority, and category
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let date = searchParams.get('date');

    if (!date) {
      // Use today if not specified
      const today = new Date();
      date = today.toISOString().split('T')[0];
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
    }

    // Get existing schedule or create new one
    let schedule = await getDailySchedule(userId, date);

    if (!schedule) {
      // Generate new schedule based on tasks and energy
      const tasksResult = await getUserTasks(userId);
      const tasks = (tasksResult as any[]) || [];
      const today = new Date();
      const logDate = today.toISOString().split('T')[0];
      const energyLogs: EnergyLog[] = [];

      // Get recent energy logs (last 7 days for patterns)
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const log = await getEnergyLog(userId, dayStr);
        if (log) {
          energyLogs.push(log as any);
        }
      }

      // Filter tasks for this date and get unscheduled ones
      const tasksForDate = tasks.filter((t: any) => {
        return t && !t.completedAt && !t.completed;
      }) as Task[];

      // Get existing scheduled hours
      const scheduleData = schedule as any;
      const occupiedHours = scheduleData?.tasks?.map((t: any) => {
        const [hours] = t.scheduledTime.split(':');
        return parseInt(hours);
      }) || [];

      // Generate suggestions using rule-based scheduler
      const suggestions = generateDailySchedule(tasksForDate, energyLogs, occupiedHours);

      // Get energy forecast
      const energyForecast = generateEnergyForecast(energyLogs);

      // Calculate total possible points
      const totalPointsPossible = tasksForDate.reduce((sum, task) => sum + (task.pointsValue || 0), 0);

      const plan: DailyPlan = {
        date,
        tasks: tasksForDate,
        suggestions,
        energyForecast,
        totalPointsPossible,
      };

      // Save the schedule
      schedule = await saveDailySchedule(userId, date, {
        tasks: tasksForDate.map((t, i) => ({
          taskId: t.id,
          scheduledTime: suggestions[i]?.recommendedTime || '14:00',
          order: i,
        })),
        breaks: [],
        pointsEarned: 0,
        tasksCompleted: 0,
      });

      return NextResponse.json({ schedule, plan, generated: true }, { status: 200 });
    }

    // If schedule exists, return it with tasks
    const tasks = await getUserTasks(userId);
    const energyLog = await getEnergyLog(userId, date);

    return NextResponse.json(
      {
        schedule,
        tasks,
        energyLog,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

/**
 * POST /api/schedule
 * 
 * Save/update daily schedule
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const { date, tasks, breaks, pointsEarned, tasksCompleted } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const result = await saveDailySchedule(userId, date, {
      tasks,
      breaks,
      pointsEarned: pointsEarned || 0,
      tasksCompleted: tasksCompleted || 0,
    });

    return NextResponse.json({ schedule: result }, { status: 201 });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}
