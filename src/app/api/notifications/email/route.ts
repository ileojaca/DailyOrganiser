import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { Resend } from 'resend';

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: 'task_reminder' | 'deadline_warning' | 'productivity_insight' | 'team_invite' | 'subscription_update';
}

export async function POST(request: NextRequest) {
  try {
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    let uid: string | null = null;
    let parsedBody: EmailNotification & { userId?: string };

    if (isInternalCall) {
      parsedBody = await request.json();
      uid = parsedBody.userId || null;
    } else {
      uid = await verifyAuthToken(request);
      if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      parsedBody = await request.json();
    }

    const { to, subject, body: emailBody, type } = parsedBody as EmailNotification;

    if (!to || !subject || !emailBody || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user has email notifications enabled
    const adminDb = getAdminDb();
    if (uid) {
      const profileDoc = await adminDb.collection('users').doc(uid).get();
      const preferences = profileDoc.data()?.preferences;
      if (preferences?.emailNotifications === false) {
        return NextResponse.json({ message: 'Email notifications disabled' }, { status: 200 });
      }
    }

    // Send email via Resend if API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'DailyOrganiser <notifications@dailyorganiser.app>',
        to,
        subject,
        text: emailBody,
      });
    } else {
      // Log to console if no API key configured
      console.log(`[EMAIL] Sending to: ${to}`);
      console.log(`[EMAIL] Subject: ${subject}`);
      console.log(`[EMAIL] Type: ${type}`);
    }

    // Log email to Firestore if we have a uid
    let emailId: string | undefined;
    if (uid) {
      const emailLogRef = await adminDb.collection('users').doc(uid).collection('emailLogs').add({
        recipient: to,
        subject,
        body: emailBody,
        type,
        status: resendApiKey ? 'sent' : 'logged',
        sentAt: new Date(),
      });
      emailId = emailLogRef.id;
    }

    return NextResponse.json({
      success: true,
      message: 'Email notification sent',
      emailId,
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('emailLogs')
      .orderBy('sentAt', 'desc')
      .limit(limit)
      .get();

    const emails = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      sentAt: d.data().sentAt?.toDate?.()?.toISOString?.() || d.data().sentAt,
    }));

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
