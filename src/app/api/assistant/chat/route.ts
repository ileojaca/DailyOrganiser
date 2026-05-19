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

// Tools defined in Anthropic format (used directly with Anthropic SDK)
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

// Convert Anthropic tools to OpenAI function-calling format for OpenRouter
const OPENAI_TOOLS = TOOLS.map(t => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

// Normalized tool call result shared by both API paths
interface ToolBlock {
  name: string;
  input: Record<string, unknown>;
}

// Call OpenRouter using OpenAI-compatible REST API
async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Anthropic.Messages.MessageParam[]
): Promise<{ text: string; toolBlocks: ToolBlock[] }> {
  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content :
        Array.isArray(m.content) ? (m.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined)?.text || '' : '',
    })),
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://daily-organiser.vercel.app',
      'X-Title': 'DailyOrganiser',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: openaiMessages,
      tools: OPENAI_TOOLS,
      tool_choice: 'auto',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  const text: string = choice?.content || '';
  const toolBlocks: ToolBlock[] = (choice?.tool_calls || []).map((tc: {function: {name: string; arguments: string}}) => ({
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments || '{}'),
  }));

  return { text, toolBlocks };
}

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized — please sign in.' }, { status: 401 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!anthropicKey && !openrouterKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const { message, conversationHistory = [], clientDate, clientTimezone } = await request.json();

    // Load user context — fail gracefully if Firestore unavailable
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

    // Enforce free-tier AI limit (10 requests/day)
    const subscriptionTier = (profile?.subscription_tier as string) || 'free';
    if (subscriptionTier === 'free') {
      const db = getAdminDb();
      const todayKey = new Date().toISOString().split('T')[0];
      const usageRef = db.collection('users').doc(uid).collection('aiUsage').doc(todayKey);
      const usageSnap = await usageRef.get();
      const usageCount = (usageSnap.data()?.count as number) || 0;
      const FREE_DAILY_LIMIT = 10;
      if (usageCount >= FREE_DAILY_LIMIT) {
        return NextResponse.json({
          error: `Daily AI limit reached (${FREE_DAILY_LIMIT} requests/day on Free plan). Upgrade to Pro for unlimited access.`,
          limitReached: true,
        }, { status: 429 });
      }
      // Increment counter
      await usageRef.set({ count: FieldValue.increment(1), date: todayKey }, { merge: true });
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
    // Use the client's local date if provided (avoids timezone mismatch where server date ≠ user date)
    const today = (typeof clientDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
      ? clientDate
      : now.toISOString().split('T')[0];
    const tz = typeof clientTimezone === 'string' ? clientTimezone : 'UTC';
    const overdueTasks = goals.filter(g => { const d = toDate(g.deadline); return d && d < now; });
    const todayTasks = goals.filter(g => {
      const d = toDate(g.deadline);
      return d && d.toISOString().split('T')[0] === today;
    });
    const avgSleep = sleep.length > 0 ? sleep.reduce((s, r) => s + ((r.duration as number) || 7), 0) / sleep.length : 7;
    const currentEnergy = energy.length > 0 ? (energy[0].level as number) : 5;

    const categoryBreakdown = {
      work: goals.filter(g => g.category === 'work').length,
      personal: goals.filter(g => g.category === 'personal').length,
      health: goals.filter(g => g.category === 'health').length,
      learning: goals.filter(g => g.category === 'learning').length,
      social: goals.filter(g => g.category === 'social').length,
      family: goals.filter(g => g.category === 'family').length,
    };
    const workPercent = goals.length > 0 ? Math.round((categoryBreakdown.work / goals.length) * 100) : 0;
    const familyPersonalPercent = goals.length > 0
      ? Math.round(((categoryBreakdown.family + categoryBreakdown.personal) / goals.length) * 100) : 0;
    const isWorkHeavy = workPercent > 60;
    const isLifeNeglected = familyPersonalPercent < 15 && goals.length > 4;

    // Burnout risk signals
    const burnoutSignals: string[] = [];
    if (avgSleep < 6) burnoutSignals.push(`low sleep (${avgSleep.toFixed(1)}h)`);
    if (currentEnergy < 4) burnoutSignals.push(`low energy (${currentEnergy}/10)`);
    if (isWorkHeavy) burnoutSignals.push(`work overload (${workPercent}%)`);
    if (overdueTasks.length >= 3) burnoutSignals.push(`${overdueTasks.length} overdue tasks`);
    if (isLifeNeglected) burnoutSignals.push('no family/personal time scheduled');
    const burnoutRisk = burnoutSignals.length >= 2 ? 'HIGH' : burnoutSignals.length === 1 ? 'MEDIUM' : 'LOW';

    // Today's checkin sleep (more accurate than historical records)
    let todaySleep: number | null = null;
    try {
      const db = getAdminDb();
      const todayStr = now.toISOString().slice(0, 10);
      const checkinSnap = await db.collection('users').doc(uid).collection('dailyCheckin').doc(todayStr).get();
      if (checkinSnap.exists) todaySleep = (checkinSnap.data()?.sleepHours as number) || null;
    } catch { /* ignore */ }

    const sleepDisplay = todaySleep !== null ? `${todaySleep}h (logged today)` : `${avgSleep.toFixed(1)}h avg`;

    const tomorrow = (() => {
      const [y, m, d] = today.split('-').map(Number);
      const t = new Date(y, m - 1, d + 1);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    })();

    const systemPrompt = `You are a proactive, caring personal assistant for ${(profile?.fullName as string) || 'the user'}. You help them stay organized, productive, AND maintain a healthy work-life balance. You care about their wellbeing, not just productivity.

CURRENT CONTEXT (${now.toLocaleString()}):
- User's LOCAL date: ${today} (timezone: ${tz}) — use THIS for "today"/"tomorrow" calculations, NOT the server clock
- Tomorrow's date: ${tomorrow} — when user says "schedule for tomorrow", use targetDate="${tomorrow}"
- Time: ${timeOfDay} (${hour}:00)
- Pending tasks: ${goals.length} (work: ${categoryBreakdown.work}, family: ${categoryBreakdown.family}, personal: ${categoryBreakdown.personal}, health: ${categoryBreakdown.health})
- Balance: ${workPercent}% work ${isWorkHeavy ? '⚠️ TOO MUCH WORK' : '✓ OK'} | Family+Personal: ${familyPersonalPercent}% ${isLifeNeglected ? '⚠️ NEGLECTED' : '✓ OK'}
- Overdue: ${overdueTasks.length} | Due today: ${todayTasks.length}
- Sleep: ${sleepDisplay} | Energy: ${currentEnergy}/10
- 🔥 Burnout risk: ${burnoutRisk}${burnoutSignals.length > 0 ? ` (${burnoutSignals.join(', ')})` : ''}

PENDING TASKS:
${goals.slice(0, 10).map(g => `- [P${g.priority}] ${g.title} (${g.category})${toDate(g.deadline) ? ` due ${toDate(g.deadline)!.toLocaleDateString()}` : ''}`).join('\n')}

PROACTIVE BEHAVIOUR:
- If burnout risk is HIGH, open with a wellbeing check before tasks
- If work > 60%, mention it and suggest adding family/personal/health tasks
- If family+personal < 15%, ask when they last spent quality time with loved ones
- If sleep < 6h, warn them and suggest reducing today's workload
- If energy < 4, suggest lighter tasks and a short walk/rest
- Never schedule back-to-back work tasks without a break
- When planning, always include at least one non-work task if any exist

YOUR STYLE: Warm, direct, honest. Name actual tasks. Offer to DO things. Be brief but complete.

RULES:
- "plan my day" → call schedule_day
- "add [task]" → call create_task immediately
- Always address burnout signals before talking about productivity
- A balanced life IS productive — remind the user of this
- Recurring habits and fixed work blocks are already pre-scheduled by the system before other tasks. Do not schedule over them.`;

    const messages: Anthropic.Messages.MessageParam[] = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    // Resolve provider and model from user profile
    const selectedProvider: string = (profile?.aiProvider as string) || 'auto';
    const selectedModel: string = (profile?.aiModel as string) || '';

    // Determine which backend to use
    const useAnthropic =
      selectedProvider === 'anthropic'
        ? !!anthropicKey
        : selectedProvider === 'openrouter'
        ? false
        : !!anthropicKey; // auto: prefer Anthropic when key is available

    // Call the AI
    let responseText = '';
    let toolBlocks: ToolBlock[] = [];

    if (useAnthropic) {
      const model = selectedModel || 'claude-haiku-4-5-20251001';
      const client = new Anthropic({ apiKey: anthropicKey! });
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
      const textBlock = response.content.find(b => b.type === 'text');
      responseText = textBlock?.type === 'text' ? textBlock.text : '';
      toolBlocks = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => b.type === 'tool_use' ? { name: b.name, input: b.input as Record<string, unknown> } : { name: '', input: {} });
    } else {
      const model = selectedModel || 'anthropic/claude-3.5-haiku';
      const result = await callOpenRouter(openrouterKey!, model, systemPrompt, messages);
      responseText = result.text;
      toolBlocks = result.toolBlocks;
    }

    // Execute tool calls
    const toolResults: Array<{ toolName: string; result: string; data?: unknown }> = [];

    for (const block of toolBlocks) {
      const input = block.input;
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
          toolResults.push({ toolName: 'create_task', result: `Task "${input.title}" created`, data: { id: ref.id } });
        }

        if (block.name === 'schedule_day') {
          const startHour = (input.workHoursStart as number) || 8;
          const endHour = (input.workHoursEnd as number) || 22;
          const pending = goals.filter(g => g.status === 'pending' || g.status === 'in_progress').sort((a, b) => b.priority - a.priority);

          // Determine target date (supports "YYYY-MM-DD"). Falls back to client's local today.
          const rawTarget = (input.targetDate as string) || today;
          let baseDate = new Date();
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawTarget)) {
            const [y, m, d] = rawTarget.split('-').map(Number);
            baseDate = new Date(y, m - 1, d);
          }

          let currentTime = new Date(baseDate);
          currentTime.setHours(startHour, 0, 0, 0);

          const isToday = baseDate.toDateString() === new Date().toDateString();
          if (isToday && currentTime.getTime() < Date.now()) {
            currentTime = new Date();
            currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30, 0, 0);
          }

          const endTime = new Date(baseDate);
          endTime.setHours(endHour, 0, 0, 0);

          // If already past end time today, push to next day
          if (isToday && currentTime >= endTime) {
            const tomorrowDate = new Date(baseDate);
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            currentTime = new Date(tomorrowDate);
            currentTime.setHours(startHour, 0, 0, 0);
            endTime.setDate(endTime.getDate() + 1);
          }

          let scheduled = 0;

          // Load all goals to find recurring ones (habits and blocks)
          const allGoalsSnap = await db.collection('users').doc(uid).collection('goals').get();
          const recurringGoals = allGoalsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((g: Record<string, unknown>) => g.goalType === 'habit' || g.goalType === 'block');

          // Determine day of week for baseDate (0=Sun..6=Sat)
          const targetDow = baseDate.getDay();

          // Filter recurring goals that apply to targetDow
          const applicableRecurring = recurringGoals.filter((g: Record<string, unknown>) => {
            const r = g.recurrence as Record<string, unknown> | undefined;
            if (!r) return false;
            if (r.type === 'daily') return true;
            if (r.type === 'weekdays') return targetDow >= 1 && targetDow <= 5;
            if (r.type === 'weekend') return targetDow === 0 || targetDow === 6;
            if (r.type === 'custom') return Array.isArray(r.days) && (r.days as number[]).includes(targetDow);
            return false;
          });

          // Build blocked intervals from work blocks and habits
          const blockedIntervals: Array<{ start: Date; end: Date }> = [];

          for (const rg of applicableRecurring) {
            const rgData = rg as Record<string, unknown>;
            if (rgData.goalType === 'block') {
              const r = rgData.recurrence as Record<string, unknown>;
              if (r && r.fixedStart && r.fixedEnd) {
                const [sh, sm] = (r.fixedStart as string).split(':').map(Number);
                const [eh, em] = (r.fixedEnd as string).split(':').map(Number);
                const blockStart = new Date(baseDate);
                blockStart.setHours(sh, sm, 0, 0);
                const blockEnd = new Date(baseDate);
                blockEnd.setHours(eh, em, 0, 0);
                blockedIntervals.push({ start: blockStart, end: blockEnd });
                await db.collection('users').doc(uid).collection('goals').doc(rgData.id as string).update({
                  scheduledStart: Timestamp.fromDate(blockStart),
                  scheduledEnd: Timestamp.fromDate(blockEnd),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                scheduled++;
              }
            } else if (rgData.goalType === 'habit') {
              const r = rgData.recurrence as Record<string, unknown>;
              const habitDuration = (rgData.estimatedDuration as number) || 30;
              const timesPerDay = (r?.timesPerDay as number) || 1;
              const preferredTime = r?.preferredTime as string | undefined;
              let habitStart: Date;
              if (preferredTime && /^\d{2}:\d{2}$/.test(preferredTime)) {
                const [hh, mm] = preferredTime.split(':').map(Number);
                habitStart = new Date(baseDate);
                habitStart.setHours(hh, mm, 0, 0);
              } else {
                habitStart = new Date(currentTime);
              }
              for (let t = 0; t < timesPerDay; t++) {
                const habitEnd = new Date(habitStart.getTime() + habitDuration * 60000);
                blockedIntervals.push({ start: habitStart, end: habitEnd });
                await db.collection('users').doc(uid).collection('goals').doc(rgData.id as string).update({
                  scheduledStart: Timestamp.fromDate(habitStart),
                  scheduledEnd: Timestamp.fromDate(habitEnd),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                scheduled++;
                habitStart = new Date(habitEnd.getTime() + 5 * 60000);
              }
            }
          }

          // Helper: check if a time slot overlaps any blocked interval
          function overlapsBlocked(start: Date, end: Date): boolean {
            return blockedIntervals.some(b => start < b.end && end > b.start);
          }

          // Advance currentTime past any blocked intervals at the start
          function advancePastBlocked(time: Date): Date {
            let t = new Date(time);
            let changed = true;
            while (changed) {
              changed = false;
              for (const b of blockedIntervals) {
                if (t >= b.start && t < b.end) {
                  t = new Date(b.end);
                  changed = true;
                }
              }
            }
            return t;
          }

          currentTime = advancePastBlocked(currentTime);

          for (const task of pending.slice(0, 8)) {
            const duration = (task.estimatedDuration as number) || 60;
            let taskEnd = new Date(currentTime.getTime() + duration * 60000);
            if (taskEnd > endTime) break;

            // Skip past blocked intervals
            while (overlapsBlocked(currentTime, taskEnd)) {
              const blocker = blockedIntervals.find(b => currentTime < b.end && taskEnd > b.start);
              if (!blocker) break;
              currentTime = new Date(blocker.end.getTime() + 5 * 60000);
              taskEnd = new Date(currentTime.getTime() + duration * 60000);
            }

            if (taskEnd > endTime) break;

            await db.collection('users').doc(uid).collection('goals').doc(task.id).update({
              scheduledStart: Timestamp.fromDate(currentTime),
              scheduledEnd: Timestamp.fromDate(taskEnd),
              updatedAt: FieldValue.serverTimestamp(),
            });
            currentTime = new Date(taskEnd.getTime() + 15 * 60000);
            scheduled++;
          }
          const scheduledDateISO = endTime.toISOString().split('T')[0];
          toolResults.push({ toolName: 'schedule_day', result: `Scheduled ${scheduled} tasks for ${baseDate.toDateString()}`, data: { scheduled, date: scheduledDateISO } });
        }

        if (block.name === 'complete_task') {
          await db.collection('users').doc(uid).collection('goals').doc(input.taskId as string).update({
            status: 'completed', completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          });
          toolResults.push({ toolName: 'complete_task', result: 'Task marked as completed' });
        }

        if (block.name === 'get_productivity_summary') {
          const completedCount = (await db.collection('users').doc(uid).collection('goals').where('status', '==', 'completed').limit(10).get()).docs.length;
          toolResults.push({ toolName: 'get_productivity_summary', result: `${completedCount} completed, ${goals.length} pending, ${overdueTasks.length} overdue` });
        }
      } catch (toolErr) {
        console.error(`Tool ${block.name} failed:`, toolErr);
        toolResults.push({ toolName: block.name, result: 'Action could not be completed.' });
      }
    }

    // Save chat history (non-critical)
    try {
      const db = getAdminDb();
      await db.collection('users').doc(uid).collection('aiChats').doc(today).set({
        messages: FieldValue.arrayUnion(
          { role: 'user', content: message, timestamp: now.toISOString() },
          { role: 'assistant', content: responseText, timestamp: new Date().toISOString(), toolResults }
        ),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch { /* non-critical */ }

    return NextResponse.json({ response: responseText, toolResults });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Chat API error:', msg);
    return NextResponse.json({ error: `Failed: ${msg.slice(0, 300)}` }, { status: 500 });
  }
}
