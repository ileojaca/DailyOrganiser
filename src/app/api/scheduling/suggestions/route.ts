import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generatePlanningSuggestions, Task, TaskContext, EnergyLevel, Chronotype } from '@/utils/contextAwarePlanning';

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tasks, userEnergy, context, availableTimeBlocks, chronotype } = body;

    // Validate required fields
    if (!tasks || !userEnergy || !context || !availableTimeBlocks) {
      return NextResponse.json(
        { error: 'Missing required fields: tasks, userEnergy, context, availableTimeBlocks' },
        { status: 400 }
      );
    }

    // Generate planning suggestions
    const suggestions = generatePlanningSuggestions(
      tasks as Task[],
      (userEnergy as EnergyLevel).value,
      context as TaskContext,
      availableTimeBlocks,
      chronotype as Chronotype
    );

    return NextResponse.json({
      success: true,
      suggestions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating scheduling suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate scheduling suggestions' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Fetch user's tasks for the specified date
    const { data: tasks, error: tasksError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .or(`scheduled_date.eq.${date},deadline.eq.${date}`)
      .order('priority', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // Fetch user's energy pattern
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('energy_pattern, chronotype')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Fetch user's time blocks for the date
    const { data: timeBlocks, error: blocksError } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });

    if (blocksError) {
      console.error('Error fetching time blocks:', blocksError);
    }

    // Determine current context based on time of day
    const hour = new Date().getHours();
    const currentContext: TaskContext = {
      location: 'home',
      tools: ['computer'],
      networkStatus: 'online',
      deviceType: 'desktop',
    };

    // Simple context inference based on time
    if (hour >= 9 && hour < 17) {
      currentContext.location = 'office';
    } else if (hour >= 17 && hour < 20) {
      currentContext.location = 'home';
    }

    // Get user's current energy level (default to moderate)
    const userEnergy: EnergyLevel = profile?.energy_pattern?.current || {
      level: 5,
      label: 'Moderate',
      description: 'Standard energy level',
      suitableFor: ['communication', 'planning', 'administrative'],
    };

    // Generate suggestions if we have tasks
    let suggestions: unknown[] = [];
    if (tasks && tasks.length > 0) {
      const availableTimeBlocks = timeBlocks?.map((block: { start_time: string; end_time: string }) => ({
        start: new Date(`${date}T${block.start_time}`),
        end: new Date(`${date}T${block.end_time}`),
      })) || [];

      suggestions = generatePlanningSuggestions(
        tasks as Task[],
        userEnergy.value,
        currentContext,
        availableTimeBlocks,
        profile?.chronotype as Chronotype
      );
    }

    return NextResponse.json({
      success: true,
      date,
      tasks: tasks || [],
      suggestions,
      timeBlocks: timeBlocks || [],
      currentContext,
      userEnergy,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in scheduling suggestions API:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduling request' },
      { status: 500 }
    );
  }
}
