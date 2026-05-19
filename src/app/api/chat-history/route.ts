import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decodedToken = await verifyAuthToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const db = getAdminDb();
    const chatRef = db.collection('users').doc(userId).collection('aiChats').doc(date);
    const doc = await chatRef.get();

    if (!doc.exists) {
      return NextResponse.json({ messages: [] });
    }

    const data = doc.data();
    const messages = data?.messages || [];

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Chat history retrieval error:', error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decodedToken = await verifyAuthToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { role, content, timestamp } = body;

    if (!role || !content) {
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
    }

    const date = new Date(timestamp || new Date()).toISOString().split('T')[0];
    const db = getAdminDb();
    const chatRef = db.collection('users').doc(userId).collection('aiChats').doc(date);

    await chatRef.set(
      {
        messages: FieldValue.arrayUnion({
          role,
          content,
          timestamp: timestamp || new Date().toISOString(),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat history save error:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
