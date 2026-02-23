do $$
begin
  if exists (select 1 from pg_type where typname = 'plan_tier') then
    begin
      alter type public.plan_tier add value if not exists 'BASIC';
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;

update public.users
set plan_tier = 'PRO'
where plan_tier = 'ENTERPRISE';

update public.subscriptions
set plan_tier = 'PRO'
where plan_tier = 'ENTERPRISE';

update public.payments
set plan = lower(plan)
where plan is not null;

update public.payments
set plan = 'pro'
where plan in ('elite', 'enterprise');

update public.payments
set amount_inr = 199
where plan = 'pro' and (amount_inr is null or amount_inr <= 0);

update public.payments
set amount_inr = 99
where plan = 'basic' and (amount_inr is null or amount_inr <= 0);
