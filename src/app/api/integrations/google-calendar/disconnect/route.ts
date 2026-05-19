import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  const uid = await verifyAuthToken(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    await db.doc(`users/${uid}`).update({
      googleCalendarToken: FieldValue.delete(),
      googleCalendarConnectedAt: FieldValue.delete(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[GCal disconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 });
  }
}
