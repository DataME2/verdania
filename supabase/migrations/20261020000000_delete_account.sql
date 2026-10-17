-- Delete my account (PRD §6, Privacy). The caller deletes their own sign-in record; the foreign keys
-- take their profile, roles, scenarios (published ones too), virtual portfolio, allocations and ledger
-- with it. Suggestions they sent stay, unlinked, and lose any name and email given with them. Runs
-- they requested lose the link to them. The audit log keeps only the user id.

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sign-in required' using errcode = '42501';
  end if;
  update public.suggestions set name = null, email = null where user_id = v_uid;
  insert into public.audit_logs (actor_id, action, entity, entity_id) values (v_uid, 'account.deleted', 'auth.users', v_uid::text);
  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
