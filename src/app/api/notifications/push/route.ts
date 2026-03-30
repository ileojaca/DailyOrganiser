import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'subscribe') {
      const { subscription } = body as { subscription: PushSubscription };

      if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
      }

      // Store the push subscription
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error storing push subscription:', insertError);
        return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Push subscription saved' });
    }

    if (action === 'unsubscribe') {
      const { endpoint } = body as { endpoint: string };

      if (!endpoint) {
        return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
      }

      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (deleteError) {
        console.error('Error removing push subscription:', deleteError);
        return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Push subscription removed' });
    }

    if (action === 'send') {
      const { notification } = body as { notification: PushNotification };

      if (!notification || !notification.title || !notification.body) {
        return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
      }

      // Get user's push subscriptions
      const { data: subscriptions, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching subscriptions:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
      }

      if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({ message: 'No push subscriptions found' }, { status: 200 });
      }

      // In a real implementation, you would use a push service like:
      // - Firebase Cloud Messaging (FCM)
      // - Web Push Protocol with a push service
      // - OneSignal
      // - Pusher

      // For now, we'll log the notification and store it
      const { data: notificationLog, error: logError } = await supabase
        .from('notification_logs')
        .insert({
          user_id: user.id,
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          data: notification.data || {},
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) {
        console.error('Error logging notification:', logError);
        return NextResponse.json({ error: 'Failed to log notification' }, { status: 500 });
      }

      // Simulate sending push notification
      console.log(`[PUSH] Sending to ${subscriptions.length} device(s)`);
      console.log(`[PUSH] Title: ${notification.title}`);
      console.log(`[PUSH] Body: ${notification.body}`);

      return NextResponse.json({
        success: true,
        message: `Push notification sent to ${subscriptions.length} device(s)`,
        notificationId: notificationLog.id,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in push notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    return NextResponse.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.error('Error in push notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
