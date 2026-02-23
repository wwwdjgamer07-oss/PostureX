create table if not exists public.user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name text,
  work_type text,
  pain_points jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  motivation_style text,
  posture_history jsonb not null default '[]'::jsonb,
  emotional_patterns jsonb not null default '{}'::jsonb,
  fatigue_trends jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  conversation_summary text,
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  emotion text,
  posture_context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversation_log_user_id_created_at_idx
  on public.conversation_log(user_id, created_at desc);

create table if not exists public.emotion_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_emotion text not null default 'neutral',
  intensity numeric not null default 0.4,
  confidence numeric not null default 0.5,
  triggers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.posture_context (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alignment_score numeric not null default 0,
  session_time integer not null default 0,
  fatigue_level numeric not null default 0,
  risk_level text not null default 'LOW',
  trend jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_memory enable row level security;
alter table public.conversation_log enable row level security;
alter table public.emotion_state enable row level security;
alter table public.posture_context enable row level security;

drop policy if exists "user_memory_owner_all" on public.user_memory;
create policy "user_memory_owner_all"
  on public.user_memory
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversation_log_owner_all" on public.conversation_log;
create policy "conversation_log_owner_all"
  on public.conversation_log
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "emotion_state_owner_all" on public.emotion_state;
create policy "emotion_state_owner_all"
  on public.emotion_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "posture_context_owner_all" on public.posture_context;
create policy "posture_context_owner_all"
  on public.posture_context
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

