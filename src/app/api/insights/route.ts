import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { predictTaskCompletion, findOptimalTimeSlots, generateWorkloadForecast, advancedWorkloadForecast, detectBurnoutRisk } from '@/utils/productivityPrediction';

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const days = parseInt(searchParams.get('days') || '7');

    // Fetch user's accomplishment logs
    const { data: logs, error: logsError } = await supabase
      .from('accomplishment_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Fetch scheduled tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', new Date().toISOString().split('T')[0]);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Group tasks by date
    const scheduledTasks = tasks?.reduce((acc: Array<{ date: string; count: number }>, task: { scheduled_date: string }) => {
      const existing = acc.find(t => t.date === task.scheduled_date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date: task.scheduled_date, count: 1 });
      }
      return acc;
    }, []) || [];

    let insights: Record<string, unknown> = {};

    switch (type) {
      case 'overview':
        const forecast = generateWorkloadForecast(logs || [], scheduledTasks, days);
        const burnoutRisk = detectBurnoutRisk(logs || [], scheduledTasks);
        
        insights = {
          forecast,
          burnoutRisk,
          summary: {
            totalTasks: logs?.length || 0,
            completedTasks: logs?.filter((l: { completion_status: string }) => l.completion_status === 'completed').length || 0,
            averageEfficiency: logs?.reduce((sum: number, l: { efficiency_score?: number }) => sum + (l.efficiency_score || 0), 0) / (logs?.length || 1),
          }
        };
        break;

      case 'forecast':
        const advancedForecast = advancedWorkloadForecast(logs || [], scheduledTasks, days);
        insights = advancedForecast;
        break;

      case 'burnout':
        insights = detectBurnoutRisk(logs || [], scheduledTasks);
        break;

      case 'optimal-times':
        const category = searchParams.get('category') || 'work';
        const priority = parseInt(searchParams.get('priority') || '3');
        const duration = parseInt(searchParams.get('duration') || '60');
        const energyRequired = parseInt(searchParams.get('energy') || '5');

        const optimalSlots = findOptimalTimeSlots(
          { category, priority, estimatedDuration: duration, energyRequired },
          logs || [],
          new Date().toISOString().split('T')[0]
        );
        insights = { optimalSlots };
        break;

      default:
        return NextResponse.json({ error: 'Invalid insight type' }, { status: 400 });
    }

    return NextResponse.json({ insights, type, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskCategory, taskPriority, estimatedDuration, energyRequired, scheduledDate, scheduledHour } = body;

    // Predict completion probability
    const prediction = predictTaskCompletion({
      hourOfDay: scheduledHour || new Date().getHours(),
      dayOfWeek: new Date(scheduledDate || new Date()).getDay(),
      energyLevel: energyRequired || 5,
      taskCategory: taskCategory || 'work',
      taskPriority: taskPriority || 3,
      estimatedDuration: estimatedDuration || 60,
      currentWorkload: 0, // Will be calculated from scheduled tasks
      recentCompletionRate: 0.5, // Will be calculated from logs
      streakDays: 0, // Will be calculated from logs
    });

    // Fetch recent logs to calculate actual metrics
    const { data: recentLogs } = await supabase
      .from('accomplishment_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const recentCompletionRate = recentLogs && recentLogs.length > 0
      ? recentLogs.filter((l: { completion_status: string }) => l.completion_status === 'completed').length / recentLogs.length
      : 0.5;

    // Calculate streak
    const sortedLogs = [...(recentLogs || [])].sort((a: { scheduled_date: string }, b: { scheduled_date: string }) => 
      new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
    );
    let streakDays = 0;
    for (const log of sortedLogs) {
      if ((log as { completion_status: string }).completion_status === 'completed') {
        streakDays++;
      } else {
        break;
      }
    }

    // Update prediction with actual metrics
    const updatedPrediction = predictTaskCompletion({
      hourOfDay: scheduledHour || new Date().getHours(),
      dayOfWeek: new Date(scheduledDate || new Date()).getDay(),
      energyLevel: energyRequired || 5,
      taskCategory: taskCategory || 'work',
      taskPriority: taskPriority || 3,
      estimatedDuration: estimatedDuration || 60,
      currentWorkload: 0,
      recentCompletionRate,
      streakDays,
    });

    return NextResponse.json({
      prediction: updatedPrediction,
      metrics: {
        recentCompletionRate,
        streakDays,
        totalRecentTasks: recentLogs?.length || 0,
      }
    });
  } catch (error) {
    console.error('Error predicting task completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
