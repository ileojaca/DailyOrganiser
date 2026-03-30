import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;
  deadlineWarnings: boolean;
  productivityInsights: boolean;
  teamUpdates: boolean;
  subscriptionAlerts: boolean;
  reminderTime: number;
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('notification_preferences')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    const defaultPreferences: NotificationPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      deadlineWarnings: true,
      productivityInsights: true,
      teamUpdates: true,
      subscriptionAlerts: true,
      reminderTime: 24,
    };

    const preferences = profile?.notification_preferences || defaultPreferences;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error in notification preferences API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body as { preferences: NotificationPreferences };

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Error in notification preferences API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
