-- Seed sanity, run after migrations + seed.sql on a fresh database.
create schema test;
grant usage on schema test to anon;
create function test.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', label; end if;
end $$;
grant execute on function test.ok to anon;

select test.ok((select sum(population) from public.administrative_regions) = 2000000, 'regions sum to 2,000,000 people');
select test.ok((select sum(person_count) from public.synthetic_population_profiles) = 2000000, 'profiles sum to 2,000,000 people');
select test.ok((select sum(person_count) filter (where gender = 'female') * 2 - sum(person_count)
                from public.synthetic_population_profiles) between -1000 and 1000, 'women and men 50/50');
select test.ok((select count(*) from public.simulation_parameters where kind = 'lever') = 16, '16 levers');
select test.ok((select count(*) from public.public_policy_configurations) = 5, 'baseline + presets A-D');

set role anon;
select test.ok((select count(*) from public.investment_projects) = 13, 'anon reads 13 published projects');
select test.ok((select count(distinct category) from public.investment_projects) = 13, 'one project per category');
select test.ok((select count(*) from public.economic_indicators where region_id is null) > 0, 'anon reads baseline indicators');
reset role;
select 'SEED CHECKS PASSED' as result;
