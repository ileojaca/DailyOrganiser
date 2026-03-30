import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const assigneeId = searchParams.get('assigneeId');

    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Error in goals API:', error);
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
    const { title, description, category, priority, estimatedDuration, deadline, energyRequired, context } = body;

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        priority: priority || 3,
        estimated_duration: estimatedDuration,
        deadline,
        energy_required: energyRequired,
        context: context || {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Error in goals API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
