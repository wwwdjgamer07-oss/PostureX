-- Extend users table with profile details
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS height numeric(5,2),
ADD COLUMN IF NOT EXISTS weight numeric(5,2),
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS work_type text DEFAULT 'desk',
ADD COLUMN IF NOT EXISTS screen_time integer DEFAULT 8,
ADD COLUMN IF NOT EXISTS posture_goal text,
ADD COLUMN IF NOT EXISTS avatar_type text DEFAULT 'initials',
ADD COLUMN IF NOT EXISTS avatar_frame text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS avatar_bg text DEFAULT '#2962FF';

-- Create preferences table if not exists (or extend if it does)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_coach_enabled boolean DEFAULT false,
  break_reminders_enabled boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true,
  dark_mode_enabled boolean DEFAULT true,
  ai_sensitivity_level integer DEFAULT 5,
  units_system text DEFAULT 'metric',
  updated_at timestamptz DEFAULT now()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, type)
);

-- RLS for new tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger to create preferences on user signup is already handled by handle_new_user logic if extended