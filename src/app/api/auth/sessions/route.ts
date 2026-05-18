import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all sessions for the user from Firestore
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('sessions')
      .orderBy('lastActive', 'desc')
      .get()
      .catch(() => null);

    // Gracefully return empty array if collection doesn't exist yet
    if (!snapshot) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      lastActive: d.data().lastActive?.toDate?.()?.toISOString?.() || d.data().lastActive,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() || d.data().createdAt,
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const logoutAll = searchParams.get('logoutAll') === 'true';

    const adminDb = getAdminDb();
    const sessionsRef = adminDb.collection('users').doc(uid).collection('sessions');

    if (logoutAll) {
      const currentSessionId = searchParams.get('currentSessionId');
      const snapshot = await sessionsRef.get();

      const batch = adminDb.batch();
      for (const doc of snapshot.docs) {
        if (!currentSessionId || doc.id !== currentSessionId) {
          batch.delete(doc.ref);
        }
      }
      await batch.commit();

      return NextResponse.json({ success: true, message: 'Logged out from all devices' });
    } else if (sessionId) {
      await sessionsRef.doc(sessionId).delete();
      return NextResponse.json({ success: true, message: 'Logged out from device' });
    } else {
      return NextResponse.json({ error: 'Session ID or logoutAll parameter required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
