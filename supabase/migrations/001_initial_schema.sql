-- Initial Schema for DailyOrganiser
-- Optimized for Supabase Free Tier (500MB limit)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    chronotype VARCHAR(20) DEFAULT 'intermediate', -- lark, owl, intermediate
    energy_pattern JSONB DEFAULT '{}', -- {peak_hours: [], low_hours: []}
    preferences JSONB DEFAULT '{}', -- notification settings, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'personal', -- work, personal, health, learning, social
    priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3, -- 1=minimal, 5=critical
    ai_adjusted_priority BOOLEAN DEFAULT FALSE,
    adjustment_reason TEXT,
    estimated_duration INTEGER, -- minutes
    deadline TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, deferred
    context JSONB DEFAULT '{}', -- location, tools, network status
    energy_required INTEGER CHECK (energy_required BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Time blocks table
CREATE TABLE IF NOT EXISTS public.time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    block_type VARCHAR(20) DEFAULT 'flexible', -- fixed, flexible, protected
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER / 60
    ) STORED,
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sunday, 6=Saturday
    energy_level VARCHAR(10) DEFAULT 'medium', -- high, medium, low
    preferred_task_types TEXT[],
    is_protected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accomplishment logs table (space-optimized for AI learning)
CREATE TABLE IF NOT EXISTS public.accomplishment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_hour INTEGER CHECK (scheduled_hour BETWEEN 0 AND 23),
    actual_duration INTEGER, -- minutes actually spent
    completion_status VARCHAR(20), -- completed, partial, abandoned
    energy_level_at_start INTEGER CHECK (energy_level_at_start BETWEEN 1 AND 10),
    context_snapshot JSONB DEFAULT '{}', -- location, tools used
    efficiency_score FLOAT CHECK (efficiency_score BETWEEN 0 AND 1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_scheduled ON public.goals(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON public.goals(priority DESC);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user ON public.time_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_accomplishment_user_date ON public.accomplishment_logs(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_accomplishment_goal ON public.accomplishment_logs(goal_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accomplishment_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Goals table policies
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Time blocks table policies
CREATE POLICY "Users can view own time blocks" ON public.time_blocks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own time blocks" ON public.time_blocks
    FOR ALL USING (auth.uid() = user_id);

-- Accomplishment logs table policies
CREATE POLICY "Users can view own accomplishment logs" ON public.accomplishment_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own accomplishment logs" ON public.accomplishment_logs
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at
    BEFORE UPDATE ON public.time_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate efficiency score
CREATE OR REPLACE FUNCTION calculate_efficiency_score(
    p_estimated_duration INTEGER,
    p_actual_duration INTEGER,
    p_completion_status VARCHAR
)
RETURNS FLOAT AS $$
DECLARE
    v_time_efficiency FLOAT;
    v_completion_factor FLOAT;
BEGIN
    -- Time efficiency (closer to 1.0 is better)
    IF p_actual_duration > 0 THEN
        v_time_efficiency := LEAST(p_estimated_duration::FLOAT / p_actual_duration, 1.5) / 1.5;
    ELSE
        v_time_efficiency := 0.0;
    END IF;
    
    -- Completion factor
    v_completion_factor := CASE p_completion_status
        WHEN 'completed' THEN 1.0
        WHEN 'partial' THEN 0.5
        WHEN 'abandoned' THEN 0.0
        ELSE 0.0
    END;
    
    RETURN (v_time_efficiency * 0.4) + (v_completion_factor * 0.6);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATA ARCHIVING (Space Optimization)
-- ============================================

-- Archive table for old accomplishment logs
CREATE TABLE IF NOT EXISTS public.accomplishment_logs_archive (
    LIKE public.accomplishment_logs INCLUDING ALL
);

-- Function to archive old data
CREATE OR REPLACE FUNCTION archive_old_accomplishment_logs()
RETURNS void AS $$
BEGIN
    -- Move records older than 90 days to archive
    INSERT INTO public.accomplishment_logs_archive
    SELECT * FROM public.accomplishment_logs
    WHERE scheduled_date < CURRENT_DATE - INTERVAL '90 days';
    
    -- Delete archived records from main table
    DELETE FROM public.accomplishment_logs
    WHERE scheduled_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule archiving (run daily at 3 AM)
-- Note: Use Supabase cron extension or external scheduler

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Default time block templates
INSERT INTO public.time_blocks (name, block_type, start_time, end_time, days_of_week, energy_level, is_protected)
VALUES
    ('Morning Deep Work', 'flexible', '09:00', '11:00', ARRAY[1,2,3,4,5], 'high', false),
    ('Lunch Break', 'protected', '12:00', '13:00', ARRAY[0,1,2,3,4,5,6], 'low', true),
    ('Afternoon Work', 'flexible', '14:00', '17:00', ARRAY[1,2,3,4,5], 'medium', false),
    ('Evening Study', 'flexible', '19:00', '21:00', ARRAY[1,2,3,4,5], 'medium', false)
ON CONFLICT DO NOTHING;
