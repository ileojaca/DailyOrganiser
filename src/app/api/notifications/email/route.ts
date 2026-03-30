import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: 'task_reminder' | 'deadline_warning' | 'productivity_insight' | 'team_invite' | 'subscription_update';
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, body: emailBody, type } = body as EmailNotification;

    if (!to || !subject || !emailBody || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user has email notifications enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    const preferences = profile?.preferences as Record<string, unknown> | null;
    if (preferences?.emailNotifications === false) {
      return NextResponse.json({ message: 'Email notifications disabled' }, { status: 200 });
    }

    // In a real implementation, you would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Resend

    // For now, we'll log the email and store it in the database
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        user_id: user.id,
        recipient: to,
        subject,
        body: emailBody,
        type,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging email:', logError);
      return NextResponse.json({ error: 'Failed to log email' }, { status: 500 });
    }

    // Simulate email sending (in production, replace with actual email service)
    console.log(`[EMAIL] Sending to: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Type: ${type}`);

    return NextResponse.json({
      success: true,
      message: 'Email notification sent',
      emailId: emailLog.id,
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: emails, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching email logs:', error);
      return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
    }

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
