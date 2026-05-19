import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import Anthropic from '@anthropic-ai/sdk';
import { FieldValue } from 'firebase-admin/firestore';

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
    description: 'Auto-schedule all pending tasks for today',
    input_schema: {
      type: 'object' as const,
      properties: {
        workHoursStart: { type: 'number', description: 'Start hour (e.g. 8 for 8am)' },
        workHoursEnd: { type: 'number', description: 'End hour (e.g. 18 for 6pm)' },
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
      model: 'anthropic/claude-3.5-haiku',
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

    const { message, conversationHistory = [] } = await request.json();

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

    const systemPrompt = `You are a proactive, caring personal assistant for ${(profile?.fullName as string) || 'the user'}. You help them stay organized, productive, and balanced.

CURRENT CONTEXT (${now.toLocaleString()}):
- Time: ${timeOfDay} (${hour}:00)
- Pending tasks: ${goals.length} total, ${overdueTasks.length} OVERDUE, ${todayTasks.length} due today
- Top priority task: ${goals.sort((a,b) => b.priority - a.priority)[0]?.title || 'none'}
- Recent sleep: ${avgSleep.toFixed(1)} hours average
- Current energy: ${currentEnergy}/10
- Overdue tasks: ${overdueTasks.map(g => g.title).join(', ') || 'none'}

PENDING TASKS:
${goals.slice(0, 10).map(g => `- [P${g.priority}] ${g.title} (${g.category}) ${toDate(g.deadline) ? `due ${toDate(g.deadline)!.toLocaleDateString()}` : ''}`).join('\n')}

YOUR STYLE: Warm, direct, practical. Always specific — name actual tasks, not generic advice. Offer to DO things, not just advise. Be brief but complete.

RULES:
- If user says "plan my day", call schedule_day tool
- If user says "add [task]", call create_task immediately
- If overdue tasks exist, mention them first
- If energy < 4, suggest lighter work`;

    const messages: Anthropic.Messages.MessageParam[] = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    // Call the AI
    let responseText = '';
    let toolBlocks: ToolBlock[] = [];

    if (anthropicKey) {
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
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
      const result = await callOpenRouter(openrouterKey!, systemPrompt, messages);
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
          const endHour = (input.workHoursEnd as number) || 18;
          const pending = goals.filter(g => g.status === 'pending' || g.status === 'in_progress').sort((a, b) => b.priority - a.priority);
          let currentTime = new Date();
          currentTime.setHours(startHour, 0, 0, 0);
          if (currentTime.getTime() < Date.now()) {
            currentTime = new Date();
            currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30, 0, 0);
          }
          const endTime = new Date(); endTime.setHours(endHour, 0, 0, 0);
          let scheduled = 0;
          for (const task of pending.slice(0, 8)) {
            const duration = (task.estimatedDuration as number) || 60;
            const taskEnd = new Date(currentTime.getTime() + duration * 60000);
            if (taskEnd > endTime) break;
            await db.collection('users').doc(uid).collection('goals').doc(task.id).update({
              scheduledStart: currentTime, scheduledEnd: taskEnd, updatedAt: FieldValue.serverTimestamp(),
            });
            currentTime = new Date(taskEnd.getTime() + 15 * 60000);
            scheduled++;
          }
          toolResults.push({ toolName: 'schedule_day', result: `Scheduled ${scheduled} tasks for today` });
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
