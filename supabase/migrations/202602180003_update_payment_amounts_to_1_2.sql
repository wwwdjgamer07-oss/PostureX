update public.payments
set amount_inr = 1
where lower(coalesce(plan, '')) = 'basic'
  and amount_inr = 99;

update public.payments
set amount_inr = 2
where lower(coalesce(plan, '')) = 'pro'
  and amount_inr = 199;
