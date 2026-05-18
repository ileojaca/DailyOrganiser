import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getAdminDb();
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within next 24 hours that aren't completed
    const goalsSnap = await db
      .collection('users').doc(uid)
      .collection('goals')
      .where('status', '!=', 'completed')
      .get();

    const upcoming = goalsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((g: any) => {
        if (!g.dueDate && !g.scheduledDate) return false;
        const due = g.dueDate?.toDate?.() || g.scheduledDate?.toDate?.() || new Date(g.dueDate || g.scheduledDate);
        return due >= now && due <= in24h;
      });

    if (upcoming.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No upcoming deadlines' });
    }

    // Get user email
    const userRecord = await getAdminAuth().getUser(uid);
    if (!userRecord.email) {
      return NextResponse.json({ sent: 0, message: 'No email on file' });
    }

    const taskList = upcoming.map((g: any) => `• ${g.title}`).join('\n');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await fetch(`${appUrl}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-call': 'true' },
      body: JSON.stringify({
        to: userRecord.email,
        subject: `${upcoming.length} task${upcoming.length > 1 ? 's' : ''} due in the next 24 hours`,
        body: `You have tasks due soon:\n\n${taskList}\n\nStay on track!`,
        type: 'task_reminder',
        userId: uid,
      }),
    });

    return NextResponse.json({ sent: upcoming.length, tasks: upcoming.map((g: any) => g.title) });
  } catch (error) {
    console.error('Reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
