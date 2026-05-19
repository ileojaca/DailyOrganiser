import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  const uid = await verifyAuthToken(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const userDoc = await db.doc(`users/${uid}`).get();
    const profile = userDoc.data() ?? {};

    const connected = Boolean(profile.googleCalendarToken);
    const lastSync: string | null = profile.googleCalendarLastSync ?? null;

    return NextResponse.json({ connected, lastSync });
  } catch (error) {
    console.error('[GCal status] Error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
