import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { predictTaskCompletion, findOptimalTimeSlots, generateWorkloadForecast, advancedWorkloadForecast, detectBurnoutRisk } from '@/utils/productivityPrediction';

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const days = parseInt(searchParams.get('days') || '7');

    // Fetch user's goals as accomplishment logs
    const goalsSnapshot = await getAdminDb().collection('users').doc(uid).collection('goals').orderBy('createdAt', 'desc').limit(100).get();
    const logs = goalsSnapshot.docs.map(d => {
      const data = d.data();
      const scheduledDate = data.scheduledDate || data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0];
      const isCompleted = data.status === 'completed';
      return {
        id: d.id,
        userId: uid,
        goalId: d.id,
        scheduledDate,
        scheduledHour: data.scheduledHour ?? 9,
        actualDuration: data.actualDuration,
        completionStatus: (isCompleted ? 'completed' : 'abandoned') as 'completed' | 'partial' | 'abandoned',
        energyLevelAtStart: data.energyRequired,
        contextSnapshot: {},
        efficiencyScore: isCompleted ? 0.8 : 0,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        // extra fields for local filtering
        completion_status: isCompleted ? 'completed' : 'pending',
        efficiency_score: isCompleted ? 8 : 0,
        scheduled_date: scheduledDate,
        category: data.category,
        status: data.status,
      };
    });

    // Fetch scheduled tasks (upcoming)
    const today = new Date().toISOString().split('T')[0];
    const scheduledSnapshot = await getAdminDb().collection('users').doc(uid).collection('goals').get();
    const tasks = scheduledSnapshot.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .filter((t: Record<string, unknown>) => {
        const scheduledDate = t.scheduledDate as string | undefined;
        return scheduledDate && scheduledDate >= today;
      });

    // Group tasks by date
    const scheduledTasks = tasks.reduce((acc: Array<{ date: string; count: number }>, task: Record<string, unknown>) => {
      const scheduledDate = task.scheduledDate as string;
      const existing = acc.find(t => t.date === scheduledDate);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date: scheduledDate, count: 1 });
      }
      return acc;
    }, []);

    let insights: Record<string, unknown> = {};

    switch (type) {
      case 'overview': {
        const forecast = generateWorkloadForecast(logs, scheduledTasks, days);
        const burnoutRisk = detectBurnoutRisk(logs, scheduledTasks);

        insights = {
          forecast,
          burnoutRisk,
          summary: {
            totalTasks: logs.length,
            completedTasks: logs.filter((l: { completion_status: string }) => l.completion_status === 'completed').length,
            averageEfficiency: logs.reduce((sum: number, l: { efficiency_score?: number }) => sum + (l.efficiency_score || 0), 0) / (logs.length || 1),
          }
        };
        break;
      }

      case 'forecast': {
        const advancedForecast = advancedWorkloadForecast(logs, scheduledTasks, days);
        insights = advancedForecast;
        break;
      }

      case 'burnout':
        insights = detectBurnoutRisk(logs, scheduledTasks);
        break;

      case 'optimal-times': {
        const category = searchParams.get('category') || 'work';
        const priority = parseInt(searchParams.get('priority') || '3');
        const duration = parseInt(searchParams.get('duration') || '60');
        const energyRequired = parseInt(searchParams.get('energy') || '5');

        const optimalSlots = findOptimalTimeSlots(
          { category, priority, estimatedDuration: duration, energyRequired },
          logs,
          new Date().toISOString().split('T')[0]
        );
        insights = { optimalSlots };
        break;
      }

      case 'ai-summary': {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          insights = { summary: 'AI insights require ANTHROPIC_API_KEY to be configured.' };
          break;
        }

        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey });

        const completedCount = logs.filter((l: any) => l.completion_status === 'completed').length;
        const totalCount = logs.length;
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `You are a productivity coach. Based on this user's data, provide 3 specific, actionable insights in JSON format.

User stats (last ${days} days):
- Tasks completed: ${completedCount} of ${totalCount} (${completionRate}%)
- Categories: ${[...new Set(logs.map((l: any) => l.category))].join(', ') || 'none'}

Return JSON: { "insights": [{ "title": "string", "insight": "string", "action": "string" }] }`
          }],
        });

        try {
          const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
          insights = JSON.parse(text);
        } catch {
          insights = { insights: [] };
        }
        break;
      }

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
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskCategory, taskPriority, estimatedDuration, energyRequired, scheduledDate, scheduledHour } = body;

    // Fetch recent logs to calculate actual metrics
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentSnapshot = await getAdminDb().collection('users').doc(uid).collection('goals').orderBy('createdAt', 'desc').limit(100).get();
    const recentLogs = recentSnapshot.docs
      .map(d => {
        const data = d.data();
        const scheduledDate = data.scheduledDate || data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0];
        const isCompleted = data.status === 'completed';
        return {
          id: d.id,
          userId: uid,
          goalId: d.id,
          scheduledDate,
          scheduledHour: data.scheduledHour ?? 9,
          actualDuration: data.actualDuration,
          completionStatus: (isCompleted ? 'completed' : 'abandoned') as 'completed' | 'partial' | 'abandoned',
          energyLevelAtStart: data.energyRequired,
          contextSnapshot: {},
          efficiencyScore: isCompleted ? 0.8 : 0,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          completion_status: isCompleted ? 'completed' : 'pending',
          efficiency_score: isCompleted ? 8 : 0,
          scheduled_date: scheduledDate,
        };
      })
      .filter((l: { scheduled_date?: string }) => l.scheduled_date && l.scheduled_date >= sevenDaysAgo);

    const recentCompletionRate = recentLogs.length > 0
      ? recentLogs.filter((l: { completion_status: string }) => l.completion_status === 'completed').length / recentLogs.length
      : 0.5;

    // Calculate streak
    const sortedLogs = [...recentLogs].sort((a: { scheduled_date?: string }, b: { scheduled_date?: string }) =>
      new Date(b.scheduled_date || 0).getTime() - new Date(a.scheduled_date || 0).getTime()
    );
    let streakDays = 0;
    for (const log of sortedLogs) {
      if ((log as { completion_status: string }).completion_status === 'completed') {
        streakDays++;
      } else {
        break;
      }
    }

    // Predict with actual metrics
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
        totalRecentTasks: recentLogs.length,
      }
    });
  } catch (error) {
    console.error('Error predicting task completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
