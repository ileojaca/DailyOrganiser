import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decodedToken = await verifyAuthToken(token);
    const uid = decodedToken.uid;

    const body = await request.json();
    const { title, description, estimatedDuration, priority, category } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const goalRef = db.collection('users').doc(uid).collection('goals').doc();

    await goalRef.set({
      id: goalRef.id,
      title: title.trim(),
      description: description?.trim() || '',
      category,
      priority: Math.max(1, Math.min(4, priority || 3)),
      estimatedDuration: Math.max(5, estimatedDuration || 60),
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { goal: { id: goalRef.id, title, description, category, priority, estimatedDuration } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Goal creation error:', error);
    if (error instanceof Error && error.message === 'Auth token is invalid or expired') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
