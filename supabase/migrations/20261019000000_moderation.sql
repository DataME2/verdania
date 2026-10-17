-- Moderation: staff (admins and moderators) read and triage suggestions, and hide or restore published
-- scenarios. Tables gain no grants or policies; every staff action goes through a SECURITY DEFINER
-- function that checks the role and writes the audit log. Private scenarios stay private, even to staff.

create function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('admin') or public.has_role('moderator')
$$;

create function public.require_moderator() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'moderator privileges required' using errcode = '42501';
  end if;
end $$;

create function public.list_suggestions(p_limit int default 100) returns setof public.suggestions
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_moderator();
  return query select * from public.suggestions order by created_at desc limit least(greatest(p_limit, 1), 500);
end $$;

create function public.set_suggestion_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_moderator();
  update public.suggestions set status = p_status where id = p_id;
  if not found then
    raise exception 'suggestion not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'suggestion.status', 'suggestions', p_id::text, jsonb_build_object('status', p_status));
end $$;

-- Published scenarios only, hidden ones included, so staff can restore what they hid.
create function public.list_published_scenarios(p_limit int default 100) returns setof public.simulation_scenarios
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_moderator();
  return query select * from public.simulation_scenarios where visibility = 'public'
               order by published_at desc nulls last limit least(greatest(p_limit, 1), 500);
end $$;

create function public.moderate_scenario(p_id uuid, p_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_moderator();
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'a reason of 3 to 500 characters is required' using errcode = '22023';
  end if;
  update public.simulation_scenarios set moderation_status = p_status where id = p_id and visibility = 'public';
  if not found then
    raise exception 'published scenario not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'scenario.moderated', 'simulation_scenarios', p_id::text,
          jsonb_build_object('status', p_status, 'reason', btrim(p_reason)));
end $$;

revoke execute on function public.is_moderator(), public.require_moderator(), public.list_suggestions(int),
  public.set_suggestion_status(uuid, text), public.list_published_scenarios(int),
  public.moderate_scenario(uuid, text, text) from public, anon;
grant execute on function public.is_moderator(), public.list_suggestions(int), public.set_suggestion_status(uuid, text),
  public.list_published_scenarios(int), public.moderate_scenario(uuid, text, text) to authenticated;
revoke execute on function public.require_moderator() from authenticated; -- internal helper
