import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user data
    const [profileData, goalsData, timeBlocksData, logsData, teamsData] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('time_blocks').select('*').eq('user_id', user.id),
      supabase.from('accomplishment_logs').select('*').eq('user_id', user.id),
      supabase.from('team_members').select('teams(*)').eq('user_id', user.id),
    ]);

    const exportData = {
      profile: profileData.data,
      goals: goalsData.data || [],
      timeBlocks: timeBlocksData.data || [],
      accomplishmentLogs: logsData.data || [],
      teams: teamsData.data?.map((tm: { teams: unknown }) => tm.teams) || [],
      exportedAt: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dailyorganiser-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
