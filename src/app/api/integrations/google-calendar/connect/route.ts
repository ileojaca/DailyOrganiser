import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyAuthToken } from '@/lib/firebaseAdmin';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: uid,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[GCal connect] Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate authorization URL' }, { status: 500 });
  }
}
