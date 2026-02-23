-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  plan_tier TEXT DEFAULT 'FREE' CHECK (plan_tier IN ('FREE', 'PRO', 'ENTERPRISE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  avg_alignment NUMERIC(5,2),
  avg_symmetry NUMERIC(5,2),
  avg_stability NUMERIC(5,2),
  avg_fatigue NUMERIC(5,2),
  peak_risk TEXT,
  duration_seconds INTEGER DEFAULT 0
);

-- Posture Records (High-frequency data)
CREATE TABLE public.posture_records (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES public.sessions ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  alignment NUMERIC(5,2),
  symmetry NUMERIC(5,2),
  stability NUMERIC(5,2),
  fatigue NUMERIC(5,2),
  score NUMERIC(5,2),
  risk_level TEXT
);

-- Risk Events (Anomalies for analytics)
CREATE TABLE public.risk_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  session_id UUID REFERENCES public.sessions NOT NULL,
  level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (Stripe sync)
CREATE TABLE public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  status TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_end TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posture_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own records" ON public.posture_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own records" ON public.posture_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND user_id = auth.uid())
);