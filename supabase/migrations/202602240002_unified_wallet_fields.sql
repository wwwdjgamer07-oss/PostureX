alter table public.users
add column if not exists "walletCoins" integer not null default 0,
add column if not exists "walletGems" integer not null default 0,
add column if not exists "walletXP" integer not null default 0;

update public.users
set
  "walletCoins" = greatest(0, floor(coalesce(px_coins, 0))),
  "walletGems" = greatest(
    0,
    floor(
      coalesce((px_gems ->> 'blue')::numeric, 0)
      + coalesce((px_gems ->> 'purple')::numeric, 0)
      + coalesce((px_gems ->> 'gold')::numeric, 0)
    )
  ),
  "walletXP" = coalesce("walletXP", 0)
where coalesce("walletCoins", 0) = 0
  and coalesce("walletGems", 0) = 0;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_wallet_coins_non_negative'
  ) then
    alter table public.users
      add constraint users_wallet_coins_non_negative
      check ("walletCoins" >= 0);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_wallet_gems_non_negative'
  ) then
    alter table public.users
      add constraint users_wallet_gems_non_negative
      check ("walletGems" >= 0);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_wallet_xp_non_negative'
  ) then
    alter table public.users
      add constraint users_wallet_xp_non_negative
      check ("walletXP" >= 0);
  end if;
end
$$;
