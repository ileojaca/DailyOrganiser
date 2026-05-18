import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { callAI } from '@/lib/aiClient';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  const uid = await verifyAuthToken(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';

  const db = getAdminDb();
  const briefingRef = db.collection('users').doc(uid).collection('briefings').doc(today);

  if (!forceRefresh) {
    const cached = await briefingRef.get();
    if (cached.exists) {
      const data = cached.data()!;
      const generatedAt: Date = data.generatedAt?.toDate?.() ?? new Date(0);
      const ageMs = Date.now() - generatedAt.getTime();
      if (ageMs < 4 * 60 * 60 * 1000) {
        return NextResponse.json({
          briefing: data.text,
          cached: true,
          generatedAt: generatedAt.toISOString(),
        });
      }
    }
  }

  const goalsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('goals')
    .orderBy('createdAt', 'desc')
    .limit(14)
    .get();

  const goals = goalsSnap.docs.map((d) => {
    const data = d.data();
    return {
      title: data.title as string,
      status: data.status as string,
      deadline: data.deadline?.toDate?.() as Date | undefined,
      priority: data.priority as number,
      completedAt: data.completedAt?.toDate?.() as Date | undefined,
    };
  });

  const sleepSnap = await db
    .collection('users')
    .doc(uid)
    .collection('sleepRecords')
    .orderBy('date', 'desc')
    .limit(3)
    .get();

  const sleepRecords = sleepSnap.docs.map((d) => {
    const data = d.data();
    return { hours: (data.duration ?? data.hours ?? 0) as number };
  });

  const energySnap = await db
    .collection('users')
    .doc(uid)
    .collection('energyLogs')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  const energyLogs = energySnap.docs.map((d) => {
    const data = d.data();
    return { level: (data.level ?? data.energyLevel ?? 5) as number };
  });

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const activeGoals = goals.filter((g) => g.status !== 'completed' && g.status !== 'cancelled');
  const overdueGoals = activeGoals.filter(
    (g) => g.deadline && g.deadline < now
  );
  const dueTodayGoals = activeGoals.filter((g) => {
    if (!g.deadline) return false;
    const d = g.deadline.toISOString().split('T')[0];
    return d === today;
  });
  const completedYesterday = goals.filter((g) => {
    if (!g.completedAt) return false;
    return g.completedAt.toISOString().split('T')[0] === yesterdayStr;
  });

  const topPriority = activeGoals.sort((a, b) => b.priority - a.priority)[0];

  const avgSleep =
    sleepRecords.length > 0
      ? (sleepRecords.reduce((sum, r) => sum + r.hours, 0) / sleepRecords.length).toFixed(1)
      : 'unknown';

  const avgEnergy =
    energyLogs.length > 0
      ? (energyLogs.reduce((sum, e) => sum + e.level, 0) / energyLogs.length).toFixed(1)
      : 'unknown';

  const prompt = `You are a personal productivity assistant. Generate a concise, motivating daily briefing (3-4 sentences max) for the user based on their data. Be specific, actionable, and warm.

Today: ${today}
Active tasks: ${activeGoals.length} (${overdueGoals.length} overdue, ${dueTodayGoals.length} due today)
Top priority task: ${topPriority?.title ?? 'none'}
Recent sleep: ${avgSleep}h avg last 3 nights
Recent energy trend: ${avgEnergy}/10
Completed yesterday: ${completedYesterday.length} tasks

Provide: (1) one observation about their current state, (2) one specific recommendation for today, (3) one encouragement.`;

  let text: string | null = null;

  try {
    text = await callAI({
      provider: 'auto',
      model: undefined,
      prompt,
      maxTokens: 200,
    });
  } catch {
    text = null;
  }

  if (!text) {
    const parts: string[] = [];
    if (overdueGoals.length > 0) {
      parts.push(`You have ${overdueGoals.length} overdue task${overdueGoals.length > 1 ? 's' : ''} that need attention.`);
    } else if (activeGoals.length > 0) {
      parts.push(`You have ${activeGoals.length} active task${activeGoals.length > 1 ? 's' : ''} on your plate today.`);
    } else {
      parts.push('Your task list is clear — a great time to plan ahead.');
    }
    if (topPriority) {
      parts.push(`Focus on "${topPriority.title}" as your top priority.`);
    }
    if (completedYesterday.length > 0) {
      parts.push(`Great work completing ${completedYesterday.length} task${completedYesterday.length > 1 ? 's' : ''} yesterday — keep the momentum going!`);
    } else {
      parts.push('Every step forward counts — you have got this!');
    }
    text = parts.join(' ');
  }

  const generatedAt = new Date();
  await briefingRef.set({
    text,
    generatedAt: FieldValue.serverTimestamp(),
    date: today,
  });

  return NextResponse.json({
    briefing: text,
    cached: false,
    generatedAt: generatedAt.toISOString(),
  });
}
