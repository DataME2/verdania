-- RLS + virtual-ledger checks. Any failure raises and aborts the run.
-- Runs after the reference-data migration; fixtures live in a separate 'testland' country
-- so counts below never depend on the real Verdania data.
-- Users: 1 = Ana, 2 = Ben, 3 = admin, 4..8 = extra participants.

create schema if not exists test;
grant usage on schema test to anon, authenticated;
create or replace function test.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', label; end if;
end $$;
create function test.u(n int) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid
$$;
create function test.p(n int) returns uuid language sql immutable as $$
  select format('00000000-0000-0000-0001-%s', lpad(n::text, 12, '0'))::uuid
$$;
create function test.as_user(n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', case when n is null then '' else test.u(n)::text end, false);
end $$;
grant execute on all functions in schema test to anon, authenticated;

-- ------------------------------------------------------------ fixtures (service side)
insert into public.country_configurations (id, slug, name, population, base_year, model_version, config, is_published)
values ('00000000-0000-0000-0002-000000000001', 'testland', 'Testland', 1000, 2026, '0.1.0',
        '{"virtual_grant_units": 100000}', true);
insert into public.investment_projects (id, country_id, slug, title, summary, category, funding_target,
  private_return_low, private_return_central, private_return_high, jobs_per_million,
  social_return_note, environmental_note, risk_level, horizon_years, is_published)
select test.p(g), '00000000-0000-0000-0002-000000000001', 'project-' || g, 'Project ' || g, 'Test', 'agriculture',
       1000000, 0.01, 0.04, 0.08, 12, 'n/a', 'n/a', 'medium', 10, g <= 6
from generate_series(1, 9) g;
insert into auth.users (id, raw_user_meta_data)
select test.u(g), case g when 1 then '{"full_name": "Ana"}'::jsonb
                         when 2 then '{"name": "Ben", "avatar_url": "http://insecure.example"}'::jsonb
                         else '{}'::jsonb end
from generate_series(1, 8) g;

select test.ok((select count(*) from public.profiles) = 8, 'a profile is created for every new user');
select test.ok((select display_name from public.profiles where id = test.u(2)) = 'Ben', 'display name taken from Google name');
select test.ok((select avatar_url from public.profiles where id = test.u(2)) is null, 'non-https avatar is dropped');
select test.ok((select bool_and(not is_public) from public.profiles), 'profiles start private');

-- ------------------------------------------------------------ anonymous visitor
set role anon;
select test.as_user(null);
select test.ok((select count(*) from public.investment_projects
                where country_id = '00000000-0000-0000-0002-000000000001') = 6, 'anon reads only published projects');
select test.ok(exists (select 1 from public.country_configurations where slug = 'testland'), 'anon reads a published country');
select test.ok((select count(*) from public.profiles) = 0, 'anon reads no profiles');
select test.ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
               and not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
               'trigger functions are not callable through the API');
do $$ begin
  insert into public.model_versions (version, notes) values ('9.9.9', 'x');
  raise exception 'FAIL: anon wrote reference data';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.join_virtual_market();
  raise exception 'FAIL: anon joined the market';
exception when insufficient_privilege then null; end $$;

-- ------------------------------------------------------------ Ana: profile
set role authenticated;
select test.as_user(1);
select test.ok((select count(*) from public.profiles) = 1, 'user reads only own profile');
update public.profiles set display_name = 'Ana V' where id = test.u(1);
update public.profiles set display_name = 'hijacked' where id = test.u(2); -- RLS: 0 rows
do $$ begin
  update public.profiles set status = 'active';
  raise exception 'FAIL: user could write own account status';
exception when insufficient_privilege then null; end $$;

-- ------------------------------------------------------------ Ana: virtual market
select public.join_virtual_market();
select public.join_virtual_market(); -- second join is a no-op
select test.ok((select count(*) from public.virtual_portfolios) = 1, 'one portfolio per account');
select test.ok((select unallocated_units from public.virtual_portfolios) = 100000, 'configured grant of 100,000 units');
select test.ok((select count(*) from public.virtual_ledger_entries where entry_type = 'grant') = 1, 'grant recorded once');

select public.move_virtual_units(null, test.p(1), 30000, test.u(101));
select public.move_virtual_units(null, test.p(1), 30000, test.u(101)); -- retry of the same request
select test.ok((select unallocated_units from public.virtual_portfolios) = 70000, 'retried request applied once');
select public.move_virtual_units(test.p(1), test.p(2), 10000, test.u(102)); -- reallocate
select public.move_virtual_units(test.p(2), null, 5000, test.u(103));       -- withdraw
select test.ok((select units from public.virtual_portfolio_allocations where project_id = test.p(1)) = 20000, 'P1 = 20,000');
select test.ok((select units from public.virtual_portfolio_allocations where project_id = test.p(2)) = 5000, 'P2 = 5,000');
select test.ok((select unallocated_units from public.virtual_portfolios) = 75000, 'unallocated = 75,000');

do $$
declare bad record;
begin
  for bad in select * from (values
      (null::uuid, test.p(1), 75000.01::numeric, 'more than unallocated'),
      (null, test.p(1), -1, 'negative amount'),
      (null, test.p(1), 0.001, 'sub-cent amount'),
      (test.p(3), test.p(1), 1, 'empty source project'),
      (null, test.p(9), 1, 'unpublished project'),
      (test.p(1), test.p(1), 1, 'same source and destination')) v(f, t, units, label)
  loop
    begin
      perform public.move_virtual_units(bad.f, bad.t, bad.units, gen_random_uuid());
      raise exception 'FAIL: accepted %', bad.label;
    exception when invalid_parameter_value then null;
    end;
  end loop;
end $$;

select test.ok((select p.initial_units = p.unallocated_units + (select sum(units) from public.virtual_portfolio_allocations)
                from public.virtual_portfolios p), 'initial = unallocated + allocated');
select test.ok((select unallocated_after from public.virtual_ledger_entries order by id desc limit 1)
               = (select unallocated_units from public.virtual_portfolios), 'ledger tail matches balance');

do $$ begin
  update public.virtual_portfolios set unallocated_units = 1e9;
  raise exception 'FAIL: user edited own balance';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.virtual_ledger_entries (portfolio_id, entry_type, units, unallocated_after, request_id)
  select id, 'grant', 1e6, 1e6, gen_random_uuid() from public.virtual_portfolios;
  raise exception 'FAIL: user wrote the ledger';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.user_roles (user_id, role) values (test.u(1), 'admin');
  raise exception 'FAIL: user granted self a role';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.grant_role(test.u(1), 'admin');
  raise exception 'FAIL: non-admin used grant_role';
exception when insufficient_privilege then null; end $$;
select test.ok((select count(*) from public.audit_logs) = 0, 'ordinary user reads no audit log');

-- ------------------------------------------------------------ Ana: scenarios
insert into public.simulation_scenarios (country_id, title, levers, horizon, model_version)
values ('00000000-0000-0000-0002-000000000001', 'Ana private', '{"tau_top": 0.5}', 10, '0.1.0');
insert into public.simulation_scenarios (country_id, title, levers, horizon, model_version, visibility)
values ('00000000-0000-0000-0002-000000000001', 'Ana public', '{"tau_top": 0.4}', 10, '0.1.0', 'public');
do $$ begin
  insert into public.simulation_scenarios (country_id, title, levers, horizon, model_version, moderation_status)
  values ('00000000-0000-0000-0002-000000000001', 'x', '{}', 5, '0.1.0', 'visible');
  raise exception 'FAIL: user set moderation status';
exception when insufficient_privilege then null; end $$;
select test.ok((select count(*) from public.simulation_scenarios) = 2, 'owner sees both scenarios');
select test.ok((select published_at is not null from public.simulation_scenarios where title = 'Ana public'), 'publish stamped');
insert into public.simulation_scenarios (country_id, title, levers, horizon, model_version, input_hash, output_hash)
values ('00000000-0000-0000-0002-000000000001', 'Ana hashed', '{}', 10, '0.1.0', repeat('a', 64), repeat('b', 64));
do $$ begin
  update public.simulation_scenarios set levers = '{"tau_top": 0.7}' where title = 'Ana hashed';
  raise exception 'FAIL: saved scenario inputs were editable';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.simulation_scenarios (country_id, title, levers, horizon, model_version, output_hash)
  values ('00000000-0000-0000-0002-000000000001', 'bad hash', '{}', 10, '0.1.0', 'not-a-hash');
  raise exception 'FAIL: accepted a malformed fingerprint';
exception when check_violation then null; end $$;
update public.simulation_scenarios set title = 'Ana hashed (renamed)', visibility = 'public' where title = 'Ana hashed';
select test.ok((select published_at is not null from public.simulation_scenarios where title = 'Ana hashed (renamed)'),
               'title and visibility stay editable');
delete from public.simulation_scenarios where title = 'Ana hashed (renamed)';

-- ------------------------------------------------------------ Ben: isolation
select test.as_user(2);
select test.ok((select count(*) from public.virtual_portfolios) = 0, 'Ben cannot see Ana''s portfolio');
select test.ok((select count(*) from public.virtual_portfolio_allocations) = 0, 'Ben cannot see Ana''s allocations');
select test.ok((select count(*) from public.virtual_ledger_entries) = 0, 'Ben cannot see Ana''s ledger');
select test.ok((select count(*) from public.simulation_scenarios) = 1, 'Ben sees only the public scenario');
update public.simulation_scenarios set title = 'defaced'; -- RLS: 0 rows
do $$ begin
  insert into public.simulation_scenarios (owner_id, country_id, title, levers, horizon, model_version)
  values (test.u(1), '00000000-0000-0000-0002-000000000001', 'forged', '{}', 5, '0.1.0');
  raise exception 'FAIL: Ben created a scenario as Ana';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.move_virtual_units(null, test.p(1), 1, gen_random_uuid());
  raise exception 'FAIL: moved units without a portfolio';
exception when no_data_found then null; end $$;

reset role;
select test.ok((select display_name from public.profiles where id = test.u(2)) = 'Ben', 'Ben''s profile untouched by Ana');
select test.ok((select display_name from public.profiles where id = test.u(1)) = 'Ana V', 'Ana edited her own name');
select test.ok(not exists (select 1 from public.simulation_scenarios where title = 'defaced'), 'Ben could not edit Ana''s scenario');

set role anon;
select test.as_user(null);
select test.ok((select count(*) from public.simulation_scenarios) = 1, 'anon sees only the public scenario');

-- ------------------------------------------------------------ admin
reset role;
insert into public.user_roles (user_id, role) values (test.u(3), 'admin'); -- bootstrap, service side
set role authenticated;
select test.as_user(3);
select public.grant_role(test.u(1), 'researcher');
select test.ok((select count(*) from public.audit_logs where action = 'role.granted') = 1, 'admin reads the audit log');
select test.as_user(1);
select test.ok((select array_agg(role::text) from public.user_roles) = array['researcher'], 'Ana sees her granted role');

-- ------------------------------------------------------------ public participation totals
do $$ begin
  for i in 4..8 loop
    perform test.as_user(i);
    perform public.join_virtual_market();
    perform public.move_virtual_units(null, test.p(1), 1000, gen_random_uuid());
  end loop;
end $$;
set role anon;
select test.as_user(null);
select test.ok((select count(*) from public.public_allocation_totals()) = 1, 'projects with < 5 participants are hidden');
select test.ok((select participants from public.public_allocation_totals() where project_id = test.p(1)) = 6, 'P1 shows 6 participants');

-- ------------------------------------------------------------ suggestions
select test.ok(public.submit_suggestion('model', '  Psi looks too low to me  ', ' ', ' X@Example.org ') is not null,
               'anyone can send a suggestion');
do $$ begin
  perform public.submit_suggestion('model', 'too short');
  raise exception 'FAIL: a message under 10 characters was accepted';
exception when check_violation then null; end $$;
do $$ begin
  perform public.submit_suggestion('spam', 'a message of valid length');
  raise exception 'FAIL: an unknown topic was accepted';
exception when check_violation then null; end $$;
do $$ begin
  perform public.submit_suggestion('other', 'a message of valid length', null, 'not-an-email');
  raise exception 'FAIL: a malformed email was accepted';
exception when check_violation then null; end $$;
do $$ begin
  perform count(*) from public.suggestions;
  raise exception 'FAIL: anon read suggestions';
exception when insufficient_privilege then null; end $$;
set role authenticated;
select test.as_user(1);
select test.ok(public.submit_suggestion('data', 'A source for the wage data') is not null, 'signed-in users can send too');
do $$ begin
  perform count(*) from public.suggestions;
  raise exception 'FAIL: a signed-in user read suggestions';
exception when insufficient_privilege then null; end $$;
reset role;
select test.ok((select count(*) from public.suggestions) = 2, 'only valid suggestions are stored');
select test.ok((select (message, name, email) is not distinct from ('Psi looks too low to me', null::text, 'x@example.org')
                from public.suggestions where topic = 'model'), 'message trimmed, blank name dropped, email normalised');
select test.ok((select user_id from public.suggestions where topic = 'data') = test.u(1)
               and (select user_id from public.suggestions where topic = 'model') is null, 'the sender is recorded only when signed in');
insert into public.suggestions (topic, message) select 'other', 'filler message' from generate_series(1, 198);
set role anon;
select test.as_user(null);
do $$ begin
  perform public.submit_suggestion('other', 'one message too many');
  raise exception 'FAIL: the hourly cap was not enforced';
exception when sqlstate '54000' then null; end $$;

-- ------------------------------------------------------------ moderation
reset role;
insert into public.user_roles (user_id, role) values (test.u(4), 'moderator'); -- bootstrap, service side
create table test.ids as select id, title from public.simulation_scenarios;
grant select on test.ids to authenticated;
set role authenticated;
select test.as_user(2); -- Ben: no staff role
select test.ok(not public.is_moderator(), 'Ben is not staff');
do $$ begin
  perform public.list_suggestions();
  raise exception 'FAIL: a non-moderator listed suggestions';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.moderate_scenario((select id from test.ids where title = 'Ana public'), 'hidden', 'spam');
  raise exception 'FAIL: a non-moderator hid a scenario';
exception when insufficient_privilege then null; end $$;
select test.as_user(1); -- Ana is a researcher, which is not a moderation role
select test.ok(not public.is_moderator(), 'a researcher is not staff');

select test.as_user(4); -- moderator
select test.ok((select count(*) from public.list_suggestions(500)) = 200, 'a moderator lists suggestions');
select public.set_suggestion_status((select id from public.list_suggestions(500) where topic = 'data'), 'done');
do $$ begin
  perform public.set_suggestion_status((select id from public.list_suggestions(500) where topic = 'data'), 'archived');
  raise exception 'FAIL: an unknown status was accepted';
exception when check_violation then null; end $$;
do $$ begin
  perform public.moderate_scenario((select id from test.ids where title = 'Ana public'), 'hidden', '');
  raise exception 'FAIL: hidden without a reason';
exception when invalid_parameter_value then null; end $$;
select public.moderate_scenario((select id from test.ids where title = 'Ana public'), 'hidden', 'test of moderation');
select test.ok((select moderation_status from public.list_published_scenarios() where title = 'Ana public') = 'hidden',
               'staff still see a hidden scenario, to restore it');
select test.ok(not exists (select 1 from public.list_published_scenarios() where title = 'Ana private'), 'staff never see private scenarios');
do $$ begin
  perform public.moderate_scenario((select id from test.ids where title = 'Ana private'), 'hidden', 'not allowed');
  raise exception 'FAIL: a private scenario was moderated';
exception when no_data_found then null; end $$;
select test.ok((select count(*) from public.audit_logs) = 0, 'the audit log stays admin-only');

set role anon;
select test.as_user(null);
select test.ok((select count(*) from public.simulation_scenarios) = 0, 'a hidden scenario disappears from public view');
do $$ begin
  perform public.list_published_scenarios();
  raise exception 'FAIL: anon called a moderation function';
exception when insufficient_privilege then null; end $$;

reset role;
select test.ok((select count(*) from public.audit_logs where action in ('scenario.moderated', 'suggestion.status')) = 2,
               'every moderation action is audited');
select test.ok((select (actor_id, details ->> 'reason') = (test.u(4), 'test of moderation') from public.audit_logs
                where action = 'scenario.moderated'), 'the audit log keeps who and why');
select test.ok((select status from public.suggestions where topic = 'data') = 'done', 'the suggestion was triaged');
drop table test.ids;

reset role;
select 'ALL CHECKS PASSED' as result;
