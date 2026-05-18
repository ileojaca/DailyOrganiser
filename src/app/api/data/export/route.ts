import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);

    const [profileDoc, goalsSnap, sleepSnap, familyMembersSnap, familyEventsSnap] = await Promise.all([
      userRef.get(),
      userRef.collection('goals').orderBy('createdAt', 'desc').get(),
      userRef.collection('sleepRecords').orderBy('date', 'desc').limit(90).get(),
      userRef.collection('familyMembers').get(),
      userRef.collection('familyEvents').get(),
    ]);

    const exportData = {
      profile: profileDoc.data() || {},
      goals: goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      sleepRecords: sleepSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      familyMembers: familyMembersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      familyEvents: familyEventsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      exportedAt: new Date().toISOString(),
    };

    const { format = 'json' } = await request.json().catch(() => ({ format: 'json' }));

    if (format === 'csv') {
      const goalsCsv = [
        'id,title,category,status,priority,createdAt,completedAt',
        ...exportData.goals.map((g: any) =>
          `${g.id},"${g.title || ''}",${g.category || ''},${g.status || ''},${g.priority || ''},${g.createdAt?.toDate?.()?.toISOString() || ''},${g.completedAt?.toDate?.()?.toISOString() || ''}`
        ),
      ].join('\n');
      return new NextResponse(goalsCsv, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="dailyorganiser-export.csv"' },
      });
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="dailyorganiser-export.json"' },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
