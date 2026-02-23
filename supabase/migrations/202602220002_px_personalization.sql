alter table public.users
add column if not exists px_coins integer not null default 0,
add column if not exists px_gems jsonb not null default '{"blue":0,"purple":0,"gold":0}'::jsonb,
add column if not exists px_inventory jsonb not null default '[]'::jsonb,
add column if not exists px_equipped_items jsonb not null default '{"theme":"neon-core","uiSkin":"glass-ui","aiStyle":"coach","avatar":"px-cadet","frame":"none"}'::jsonb,
add column if not exists px_theme_id text not null default 'neon-core',
add column if not exists px_ui_skin text not null default 'glass-ui',
add column if not exists px_ai_style text not null default 'coach',
add column if not exists px_avatar text not null default 'px-cadet',
add column if not exists px_frame text not null default 'none',
add column if not exists px_custom_themes jsonb not null default '[]'::jsonb,
add column if not exists px_dashboard_layout jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_px_coins_non_negative'
  ) then
    alter table public.users
      add constraint users_px_coins_non_negative
      check (px_coins >= 0);
  end if;
end
$$;
