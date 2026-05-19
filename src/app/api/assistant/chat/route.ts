import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import Anthropic from '@anthropic-ai/sdk';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface GoalData {
  id: string;
  title: string;
  status: string;
  priority: number;
  category: string;
  deadline?: { toDate: () => Date } | Date | string | null;
  estimatedDuration?: number;
}

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task for the user',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title' },
        category: { type: 'string', enum: ['work', 'personal', 'health', 'learning', 'social', 'family'] },
        priority: { type: 'number', description: '1-5, where 5 is critical' },
        estimatedDuration: { type: 'number', description: 'Duration in minutes' },
        deadline: { type: 'string', description: 'ISO date string, optional' },
      },
      required: ['title', 'category', 'priority'],
    },
  },
  {
    name: 'schedule_day',
    description: 'Auto-schedule all pending tasks for a given day. Use targetDate "YYYY-MM-DD" to schedule for a specific day (e.g. tomorrow). Defaults to today.',
    input_schema: {
      type: 'object' as const,
      properties: {
        workHoursStart: { type: 'number', description: 'Start hour (e.g. 8 for 8am)' },
        workHoursEnd: { type: 'number', description: 'End hour (e.g. 22 for 10pm)' },
        targetDate: { type: 'string', description: 'Target date in YYYY-MM-DD format. Omit for today.' },
      },
      required: [],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID to complete' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'reschedule_task',
    description: 'Reschedule a task to a new time',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        scheduledStart: { type: 'string', description: 'ISO datetime string' },
        durationMinutes: { type: 'number', description: 'Duration in minutes' },
      },
      required: ['taskId', 'scheduledStart', 'durationMinutes'],
    },
  },
  {
    name: 'get_productivity_summary',
    description: 'Get a summary of user productivity and insights',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month'] },
      },
      required: ['period'],
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in. Add FIREBASE_SERVICE_ACCOUNT_JSON to enable full auth verification.' },
        { status: 401 }
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!anthropicKey && !openrouterKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const { message, conversationHistory = [] } = await request.json();

    // Load user context from Firestore — gracefully degrade if unavailable
    let goals: GoalData[] = [];
    let sleep: Record<string, unknown>[] = [];
    let energy: Record<string, unknown>[] = [];
    let profile: Record<string, unknown> | undefined;

    try {
      const db = getAdminDb();
      const [goalsSnap, sleepSnap, energySnap, profileSnap] = await Promise.all([
        db.collection('users').doc(uid).collection('goals').where('status', '!=', 'completed').limit(20).get(),
        db.collection('users').doc(uid).collection('sleepRecords').orderBy('date', 'desc').limit(3).get(),
        db.collection('users').doc(uid).collection('energyLogs').orderBy('timestamp', 'desc').limit(5).get(),
        db.collection('users').doc(uid).get(),
      ]);
      goals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as GoalData));
      sleep = sleepSnap.docs.map(d => d.data() as Record<string, unknown>);
      energy = energySnap.docs.map(d => d.data() as Record<string, unknown>);
      profile = profileSnap.data() as Record<string, unknown> | undefined;
    } catch (err) {
      console.warn('Firestore context unavailable:', err);
    }

    const toDate = (v: GoalData['deadline']): Date | null => {
      if (!v) return null;
      if (typeof v === 'string') return new Date(v);
      if (v instanceof Date) return v;
      if (typeof v === 'object' && 'toDate' in v) return v.toDate();
      return null;
    };

    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const today = now.toISOString().split('T')[0];
    const overdueTasks = goals.filter(g => { const d = toDate(g.deadline); return d && d < now; });
    const todayTasks = goals.filter(g => {
      const d = toDate(g.deadline);
      return d && d.toISOString().split('T')[0] === today;
    });
    const avgSleep = sleep.length > 0 ? sleep.reduce((s, r) => s + ((r.duration as number) || 7), 0) / sleep.length : 7;
    const currentEnergy = energy.length > 0 ? (energy[0].level as number) : 5;

    const systemPrompt = `You are a proactive, caring personal assistant for ${(profile?.fullName as string) || 'the user'}. You know everything about their life and help them stay organized, productive, and balanced.

CURRENT CONTEXT (${now.toLocaleString()}):
- Time: ${timeOfDay} (${hour}:00)
- Pending tasks: ${goals.length} total, ${overdueTasks.length} OVERDUE, ${todayTasks.length} due today
- Top priority task: ${goals.sort((a,b) => b.priority - a.priority)[0]?.title || 'none'}
- Recent sleep: ${avgSleep.toFixed(1)} hours average
- Current energy: ${currentEnergy}/10
- Overdue tasks: ${overdueTasks.map(g => g.title).join(', ') || 'none'}

PENDING TASKS:
${goals.slice(0, 10).map(g => `- [P${g.priority}] ${g.title} (${g.category}) ${toDate(g.deadline) ? `due ${toDate(g.deadline)!.toLocaleDateString()}` : ''}`).join('\n')}

YOUR PERSONALITY:
- Warm, direct, and practical — like a trusted personal assistant
- Always specific: name the actual task, not generic advice
- Proactive: if you see problems, call them out
- Action-oriented: offer to DO things, not just advise
- Brief but complete: get to the point fast, be thorough when needed

RULES:
- If user says "plan my day" or "schedule everything", call schedule_day tool
- If user says "add [task]", call create_task tool immediately
- If user asks what to focus on, name the specific highest-priority task
- If overdue tasks exist, always mention them first
- If energy is low (< 4), suggest lighter work and breaks
- If it's evening, suggest winding down and reviewing tomorrow
- Use tools liberally — actually DO things, don't just talk about them`;

    const client = anthropicKey
      ? new Anthropic({ apiKey: anthropicKey })
      : new Anthropic({
          apiKey: openrouterKey!,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://daily-organiser.vercel.app',
            'X-Title': 'DailyOrganiser',
          },
        });

    const model = anthropicKey ? 'claude-haiku-4-5-20251001' : 'claude-3-5-haiku';

    const recentHistory = conversationHistory.slice(-10);
    const messages: Anthropic.Messages.MessageParam[] = [
      ...recentHistory,
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    const toolResults: Array<{ toolName: string; result: string; data?: unknown }> = [];

    // Only run tool actions if we have Firestore access
    const hasDb = goals.length > 0 || profile !== undefined;

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      const input = block.input as Record<string, unknown>;

      try {
        const db = getAdminDb();

        if (block.name === 'create_task') {
          const taskData = {
            userId: uid,
            title: input.title,
            category: input.category || 'personal',
            priority: input.priority || 3,
            estimatedDuration: input.estimatedDuration || 30,
            deadline: input.deadline ? new Date(input.deadline as string) : null,
            status: 'pending',
            aiAdjustedPriority: false,
            context: {},
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          const ref = await db.collection('users').doc(uid).collection('goals').add(taskData);
          toolResults.push({ toolName: 'create_task', result: `Task "${input.title}" created`, data: { id: ref.id, title: input.title } });
        }

        if (block.name === 'schedule_day') {
          const startHour = (input.workHoursStart as number) || 8;
          const endHour = (input.workHoursEnd as number) || 22;
          const pendingGoals = goals.filter(g => g.status === 'pending' || g.status === 'in_progress');
          const sortedByPriority = pendingGoals.sort((a, b) => b.priority - a.priority);

          // Determine target date (default today, supports "YYYY-MM-DD" for tomorrow etc.)
          let baseDate = new Date();
          if (typeof input.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
            const [y, m, d] = (input.targetDate as string).split('-').map(Number);
            baseDate = new Date(y, m - 1, d);
          }

          // Start from work start hour on the target date
          let currentTime = new Date(baseDate);
          currentTime.setHours(startHour, 0, 0, 0);

          // If scheduling for today and start time is in the past, start from now (rounded up)
          const isToday = baseDate.toDateString() === new Date().toDateString();
          if (isToday && currentTime.getTime() < Date.now()) {
            currentTime = new Date();
            currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30, 0, 0);
          }

          const endTime = new Date(baseDate);
          endTime.setHours(endHour, 0, 0, 0);

          // If current time is already past endHour today, push to next day at startHour
          if (isToday && currentTime >= endTime) {
            const tomorrow = new Date(baseDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            currentTime = new Date(tomorrow);
            currentTime.setHours(startHour, 0, 0, 0);
            endTime.setDate(endTime.getDate() + 1);
          }

          let scheduled = 0;
          for (const task of sortedByPriority.slice(0, 8)) {
            const duration = (task.estimatedDuration as number) || 60;
            const taskEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
            if (taskEnd > endTime) break;
            await db.collection('users').doc(uid).collection('goals').doc(task.id as string).update({
              scheduledStart: Timestamp.fromDate(currentTime),
              scheduledEnd: Timestamp.fromDate(taskEnd),
              updatedAt: FieldValue.serverTimestamp(),
            });
            currentTime = new Date(taskEnd.getTime() + 15 * 60 * 1000);
            scheduled++;
          }
          const scheduledDate = currentTime.toDateString();
          toolResults.push({ toolName: 'schedule_day', result: `Scheduled ${scheduled} tasks for ${scheduledDate}`, data: { scheduled } });
        }

        if (block.name === 'complete_task') {
          await db.collection('users').doc(uid).collection('goals').doc(input.taskId as string).update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          toolResults.push({ toolName: 'complete_task', result: 'Task marked as completed' });
        }

        if (block.name === 'reschedule_task') {
          const start = new Date(input.scheduledStart as string);
          const end = new Date(start.getTime() + (input.durationMinutes as number) * 60 * 1000);
          await db.collection('users').doc(uid).collection('goals').doc(input.taskId as string).update({
            scheduledStart: Timestamp.fromDate(start),
            scheduledEnd: Timestamp.fromDate(end),
            updatedAt: FieldValue.serverTimestamp(),
          });
          toolResults.push({ toolName: 'reschedule_task', result: `Task rescheduled to ${start.toLocaleTimeString()}` });
        }

        if (block.name === 'get_productivity_summary') {
          const completedToday = (await db.collection('users').doc(uid).collection('goals')
            .where('status', '==', 'completed').limit(10).get()).docs.length;
          toolResults.push({
            toolName: 'get_productivity_summary',
            result: `${completedToday} tasks completed, ${goals.length} pending, ${overdueTasks.length} overdue`,
          });
        }
      } catch (toolErr) {
        console.error(`Tool ${block.name} failed:`, toolErr);
        toolResults.push({ toolName: block.name, result: 'Action could not be completed — please try again.' });
      }
    }

    const textContent = response.content.find(b => b.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : '';

    // Save chat history — non-critical, ignore failures
    try {
      const db = getAdminDb();
      const chatRef = db.collection('users').doc(uid).collection('aiChats').doc(today);
      await chatRef.set({
        messages: FieldValue.arrayUnion(
          { role: 'user', content: message, timestamp: now.toISOString() },
          { role: 'assistant', content: responseText, timestamp: new Date().toISOString(), toolResults }
        ),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch {
      // Non-critical — chat history not saved
    }

    return NextResponse.json({
      response: responseText,
      toolResults,
      stopReason: response.stop_reason,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
