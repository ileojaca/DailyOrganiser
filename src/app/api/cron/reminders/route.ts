import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'app@dailyorganiser.com';

const vapidConfigured = vapidPublicKey && vapidPrivateKey;

if (vapidConfigured) {
  webpush.setVapidDetails('mailto:' + vapidEmail, vapidPublicKey, vapidPrivateKey);
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const usersSnap = await db.collection('users').limit(200).get();
  let processed = 0;
  let notified = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    processed++;

    const goalsSnap = await db
      .collection('users')
      .doc(uid)
      .collection('goals')
      .where('status', '!=', 'completed')
      .get();

    const urgentGoals = goalsSnap.docs.filter((d) => {
      const deadline = d.data().deadline;
      if (!deadline) return false;
      const deadlineDate = new Date(deadline);
      return deadlineDate >= now && deadlineDate <= in24h;
    });

    if (urgentGoals.length === 0) continue;

    const subsSnap = await db.collection(`users/${uid}/pushSubscriptions`).get();
    if (subsSnap.empty) continue;

    if (!vapidConfigured) {
      console.warn('[CRON] VAPID keys not configured, skipping notifications');
      continue;
    }

    for (const goalDoc of urgentGoals) {
      const goal = goalDoc.data();
      const payload = JSON.stringify({
        title: 'Goal deadline approaching',
        body: `"${goal.title || 'A goal'}" is due within 24 hours`,
        icon: '/icon-192.png',
        data: { url: '/planner' },
      });

      for (const subDoc of subsSnap.docs) {
        const sub = subDoc.data() as PushSubscriptionData;
        try {
          await webpush.sendNotification(sub, payload);
          notified++;
        } catch (err) {
          console.error('[CRON] Push send failed:', err);
          if ((err as { statusCode?: number }).statusCode === 410) {
            await subDoc.ref.delete();
          }
        }
      }
    }
  }

  return NextResponse.json({ processed, notified });
}
