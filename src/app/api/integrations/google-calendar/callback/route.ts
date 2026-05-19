import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&status=error&reason=not_configured', request.url)
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const uid = searchParams.get('state');

  if (!code || !uid) {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&status=error&reason=missing_params', request.url)
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      console.error('[GCal callback] No refresh token returned');
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&status=error&reason=no_refresh_token', request.url)
      );
    }

    const db = getAdminDb();
    await db.doc(`users/${uid}`).set(
      {
        googleCalendarToken: refreshToken,
        googleCalendarConnectedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.redirect(
      new URL('/settings?tab=integrations&status=connected', request.url)
    );
  } catch (error) {
    console.error('[GCal callback] Error exchanging code for tokens:', error);
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&status=error&reason=token_exchange_failed', request.url)
    );
  }
}
