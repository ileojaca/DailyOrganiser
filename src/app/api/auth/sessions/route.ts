import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all sessions for the user
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const logoutAll = searchParams.get('logoutAll') === 'true';

    if (logoutAll) {
      // Logout from all devices except current session
      const currentSessionId = searchParams.get('currentSessionId');
      
      if (currentSessionId) {
        // Delete all sessions except current
        const { error: deleteError } = await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', user.id)
          .neq('id', currentSessionId);

        if (deleteError) {
          console.error('Error deleting sessions:', deleteError);
          return NextResponse.json({ error: 'Failed to logout from other devices' }, { status: 500 });
        }
      } else {
        // Delete all sessions
        const { error: deleteError } = await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error deleting sessions:', deleteError);
          return NextResponse.json({ error: 'Failed to logout from all devices' }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, message: 'Logged out from all devices' });
    } else if (sessionId) {
      // Logout from specific session
      const { error: deleteError } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting session:', deleteError);
        return NextResponse.json({ error: 'Failed to logout from device' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Logged out from device' });
    } else {
      return NextResponse.json({ error: 'Session ID or logoutAll parameter required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
