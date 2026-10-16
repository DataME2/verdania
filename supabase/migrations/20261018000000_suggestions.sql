-- Ideas and suggestions from visitors (the "Contribute" form on /community).
-- Anyone may send one, signed in or not. Nobody reads them through the API: the project owner reads
-- them in the Supabase dashboard. The only write path is submit_suggestion(), which validates the
-- message and caps the overall rate; the website adds a honeypot field and a per-IP limit.

create table public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null check (topic in ('model', 'policy', 'data', 'problem', 'other')),
  message    text not null check (char_length(message) between 10 and 4000),
  name       text check (char_length(name) <= 120),
  email      text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_id    uuid references auth.users (id) on delete set null,
  status     text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);
create index suggestions_created_idx on public.suggestions (created_at desc);
create index suggestions_user_idx on public.suggestions (user_id);

alter table public.suggestions enable row level security; -- no policies: API roles see nothing
revoke all on public.suggestions from anon, authenticated;

create function public.submit_suggestion(p_topic text, p_message text, p_name text default null, p_email text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  -- ponytail: one global cap, since the database never sees senders' IPs; per-sender limits live in the website.
  if (select count(*) from public.suggestions where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'too many suggestions right now' using errcode = '54000';
  end if;
  insert into public.suggestions (topic, message, name, email, user_id)
  values (p_topic, btrim(p_message), nullif(btrim(p_name), ''), nullif(lower(btrim(p_email)), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.submit_suggestion(text, text, text, text) from public;
grant execute on function public.submit_suggestion(text, text, text, text) to anon, authenticated;
