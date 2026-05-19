import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

interface GoalDoc {
  title: string;
  scheduledStart?: Timestamp;
  scheduledEnd?: Timestamp;
  category?: string;
  googleCalendarEventId?: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
      { status: 503 }
    );
  }

  const uid = await verifyAuthToken(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // Fetch user profile for the refresh token
    const userDoc = await db.doc(`users/${uid}`).get();
    const profile = userDoc.data() ?? {};
    const refreshToken: string | undefined = profile.googleCalendarToken;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch all goals that have a scheduledStart
    const goalsSnap = await db.collection(`users/${uid}/goals`).get();
    const scheduledGoals = goalsSnap.docs.filter((d) => {
      const data = d.data() as GoalDoc;
      return Boolean(data.scheduledStart);
    });

    let syncedTasks = 0;

    for (const goalDoc of scheduledGoals) {
      const data = goalDoc.data() as GoalDoc;
      const startDate = data.scheduledStart!.toDate();
      const endDate = data.scheduledEnd
        ? data.scheduledEnd.toDate()
        : new Date(startDate.getTime() + 60 * 60 * 1000); // default 1h

      const eventBody = {
        summary: data.title,
        description: data.category ? `Category: ${data.category}` : undefined,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      };

      try {
        let calendarEventId: string;

        if (data.googleCalendarEventId) {
          // Update existing event
          const updated = await calendar.events.update({
            calendarId: 'primary',
            eventId: data.googleCalendarEventId,
            requestBody: eventBody,
          });
          calendarEventId = updated.data.id!;
        } else {
          // Create new event
          const created = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventBody,
          });
          calendarEventId = created.data.id!;
        }

        // Store event ID back to Firestore
        await goalDoc.ref.update({ googleCalendarEventId: calendarEventId });
        syncedTasks++;
      } catch (eventError) {
        console.error(`[GCal sync] Failed to sync goal ${goalDoc.id}:`, eventError);
      }
    }

    // Update last sync timestamp
    await db.doc(`users/${uid}`).set(
      { googleCalendarLastSync: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ syncedTasks });
  } catch (error) {
    console.error('[GCal sync] Error:', error);
    return NextResponse.json({ error: 'Failed to sync with Google Calendar' }, { status: 500 });
  }
}
