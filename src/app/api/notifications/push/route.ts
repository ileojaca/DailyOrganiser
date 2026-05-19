import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import webpush from 'web-push';
import crypto from 'crypto';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'app@dailyorganiser.com';

const vapidConfigured = vapidPublicKey && vapidPrivateKey;

if (vapidConfigured) {
  webpush.setVapidDetails('mailto:' + vapidEmail, vapidPublicKey, vapidPrivateKey);
}

interface PushSubscriptionBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const uid = await verifyAuthToken(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body as { action: string };
  const db = getAdminDb();

  if (action === 'subscribe') {
    const { subscription } = body as { subscription: PushSubscriptionBody };
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    const hash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 20);
    await db.doc(`users/${uid}/pushSubscriptions/${hash}`).set({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'unsubscribe') {
    const { endpoint } = body as { endpoint: string };
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }
    const hash = crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 20);
    await db.doc(`users/${uid}/pushSubscriptions/${hash}`).delete();
    return NextResponse.json({ success: true });
  }

  if (action === 'send') {
    const { notification } = body as { notification: NotificationPayload };
    if (!notification?.title || !notification?.body) {
      return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
    }
    const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();
    if (subsSnap.empty) {
      return NextResponse.json({ message: 'No subscriptions found' });
    }
    if (!vapidConfigured) {
      console.warn('[PUSH] VAPID keys not configured, skipping send');
      return NextResponse.json({ success: true, sent: 0 });
    }
    let sent = 0;
    const payload = JSON.stringify(notification);
    for (const doc of subsSnap.docs) {
      const sub = doc.data() as PushSubscriptionBody;
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        console.error('[PUSH] Failed to send to', sub.endpoint, err);
        if ((err as { statusCode?: number }).statusCode === 410) {
          await doc.ref.delete();
        }
      }
    }
    return NextResponse.json({ success: true, sent });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const uid = await verifyAuthToken(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getAdminDb();
  const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();
  const endpoints = subsSnap.docs.map((d) => (d.data() as PushSubscriptionBody).endpoint);
  return NextResponse.json({ count: endpoints.length, endpoints });
}
