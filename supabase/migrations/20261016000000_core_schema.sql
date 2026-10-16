-- Verdania core schema, model v0.1
--
-- Access model
--   * Shared fictional data (country, regions, synthetic population, projects, presets,
--     parameters): readable by everyone when published, writable only by service_role.
--   * User data (profiles, scenarios, portfolios): owner-only through RLS.
--   * Virtual capital changes ONLY through SECURITY DEFINER functions that lock the
--     portfolio row; clients have no direct write access to balances or the ledger.
--   * Roles are granted only by admins through grant_role(); never from the browser.
-- All money-like values are VIRTUAL units of a fictional currency. Nothing here can hold,
-- move or redeem real money.

-- ---------------------------------------------------------------- types
create type public.app_role as enum ('admin', 'researcher', 'moderator');
create type public.visibility as enum ('private', 'public');
create type public.ledger_entry_type as enum ('grant', 'allocate', 'withdraw');
create type public.data_kind as enum ('synthetic', 'empirical');
create type public.evidence_kind as enum ('empirical-range', 'contested', 'theoretical', 'synthetic');
create type public.run_status as enum ('queued', 'running', 'succeeded', 'failed');

-- ---------------------------------------------------------------- shared reference data
create table public.model_versions (
  version      text primary key check (version ~ '^\d+\.\d+\.\d+$'),
  released_at  timestamptz not null default now(),
  is_current   boolean not null default false,
  notes        text not null
);
create unique index model_versions_one_current on public.model_versions (is_current) where is_current;

create table public.country_configurations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name          text not null,
  population    integer not null check (population > 0),
  currency_code text not null default 'VRD' check (currency_code = 'VRD'), -- fictional currency only
  base_year     smallint not null,
  model_version text not null references public.model_versions (version),
  config        jsonb not null default '{}' check (jsonb_typeof(config) = 'object'),
  data_kind     public.data_kind not null default 'synthetic' check (data_kind = 'synthetic'),
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.administrative_regions (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references public.country_configurations (id) on delete cascade,
  code        text not null check (code ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  description text,
  population  integer not null check (population >= 0),
  area_km2    numeric(10, 1) check (area_km2 > 0),
  map_path    text, -- SVG path data for the national map
  unique (country_id, code)
);

create table public.economic_sectors (
  code        text primary key check (code ~ '^[a-z_]{2,40}$'),
  name        text not null,
  description text,
  sort_order  smallint not null default 0
);

create table public.synthetic_population_profiles (
  id                bigint generated always as identity primary key,
  country_id        uuid not null references public.country_configurations (id) on delete cascade,
  region_id         uuid not null references public.administrative_regions (id) on delete cascade,
  age_band          text not null check (age_band in ('0-14', '15-64', '65+')),
  gender            text not null check (gender in ('female', 'male')),
  education         text not null check (education in ('not_applicable', 'primary', 'lower_secondary', 'upper_secondary', 'tertiary')),
  sector_code       text references public.economic_sectors (code), -- null = not employed
  person_count      integer not null check (person_count >= 0),
  generator_version text not null,
  generator_seed    bigint not null,
  unique nulls not distinct (country_id, region_id, age_band, gender, education, sector_code, generator_version)
);

create table public.synthetic_people (
  id                bigint generated always as identity primary key,
  country_id        uuid not null references public.country_configurations (id) on delete cascade,
  region_id         uuid not null references public.administrative_regions (id) on delete cascade,
  household_ref     integer not null,
  household_size    smallint not null check (household_size between 1 and 15),
  age               smallint not null check (age between 0 and 110),
  gender            text not null check (gender in ('female', 'male')),
  education         text not null check (education in ('not_applicable', 'primary', 'lower_secondary', 'upper_secondary', 'tertiary')),
  sector_code       text references public.economic_sectors (code),
  occupation        text,
  employment_status text not null check (employment_status in ('employed', 'unemployed', 'inactive', 'retired', 'child', 'student')),
  annual_wage       numeric(12, 2) check (annual_wage >= 0),
  generator_version text not null,
  generator_seed    bigint not null
);
create index synthetic_people_region_idx on public.synthetic_people (region_id);

create table public.skills (
  id       bigint generated always as identity primary key,
  code     text not null unique check (code ~ '^[a-z_]{2,40}$'),
  name     text not null,
  category text not null
);

create table public.person_skills (
  person_id bigint not null references public.synthetic_people (id) on delete cascade,
  skill_id  bigint not null references public.skills (id) on delete cascade,
  level     smallint not null check (level between 1 and 5),
  primary key (person_id, skill_id)
);
create index person_skills_skill_idx on public.person_skills (skill_id);

create table public.investment_projects (
  id                     uuid primary key default gen_random_uuid(),
  country_id             uuid not null references public.country_configurations (id) on delete cascade,
  slug                   text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title                  text not null,
  summary                text not null,
  category               text not null check (category in (
                           'agriculture', 'food_processing', 'renewable_energy', 'infrastructure', 'technology',
                           'housing', 'healthcare', 'education', 'cooperatives', 'sme', 'ppp', 'community', 'public_fund')),
  sector_code            text references public.economic_sectors (code),
  region_id              uuid references public.administrative_regions (id),
  funding_target         numeric(14, 2) not null check (funding_target > 0),
  public_contribution    numeric(14, 2) not null default 0 check (public_contribution between 0 and funding_target),
  private_return_low     numeric(6, 4) not null,
  private_return_central numeric(6, 4) not null,
  private_return_high    numeric(6, 4) not null,
  jobs_per_million       numeric(8, 2) not null check (jobs_per_million >= 0),
  social_return_note     text not null,
  environmental_note     text not null,
  risk_level             text not null check (risk_level in ('low', 'medium', 'high')),
  horizon_years          smallint not null check (horizon_years between 1 and 30),
  assumptions            jsonb not null default '[]' check (jsonb_typeof(assumptions) = 'array'),
  is_published           boolean not null default false,
  created_at             timestamptz not null default now(),
  check (private_return_low <= private_return_central and private_return_central <= private_return_high)
);
create index investment_projects_country_idx on public.investment_projects (country_id);

create table public.agricultural_projects (
  project_id              uuid primary key references public.investment_projects (id) on delete cascade,
  crop                    text not null,
  hectares                numeric(10, 1) not null check (hectares > 0),
  baseline_yield_t_per_ha numeric(8, 2) not null check (baseline_yield_t_per_ha > 0),
  expected_yield_gain_pct numeric(6, 2) not null,
  irrigated               boolean not null default false
);

create table public.public_policy_configurations (
  id            uuid primary key default gen_random_uuid(),
  country_id    uuid not null references public.country_configurations (id) on delete cascade,
  slug          text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name          text not null,
  model_family  char(1) check (model_family in ('A', 'B', 'C', 'D')), -- null = Verdania baseline
  description   text not null,
  levers        jsonb not null check (jsonb_typeof(levers) = 'object'),
  model_version text not null references public.model_versions (version),
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (country_id, slug, model_version)
);

create table public.simulation_parameters (
  id            bigint generated always as identity primary key,
  model_version text not null references public.model_versions (version),
  code          text not null check (code ~ '^[a-z][a-z0-9_]{0,40}$'),
  label         text not null,
  kind          text not null check (kind in ('lever', 'structural')),
  unit          text,
  min_value     numeric not null,
  max_value     numeric not null,
  default_value numeric not null, -- lever baseline, or structural central value
  evidence      public.evidence_kind not null,
  source        text,
  notes         text,
  check (min_value <= default_value and default_value <= max_value),
  unique (model_version, code)
);

create table public.economic_indicators (
  id                bigint generated always as identity primary key,
  country_id        uuid references public.country_configurations (id) on delete cascade, -- null for empirical calibration rows
  region_id         uuid references public.administrative_regions (id) on delete cascade,
  code              text not null,
  label             text not null,
  year              smallint not null,
  value             numeric not null,
  unit              text not null,
  data_kind         public.data_kind not null,
  reference_country text, -- ISO code of the real country an empirical row describes
  source_name       text,
  source_url        text check (source_url ~ '^https?://'),
  source_date       date,
  -- empirical data must always carry its provenance; synthetic rows belong to Verdania
  check (data_kind = 'synthetic' and country_id is not null
         or data_kind = 'empirical' and reference_country is not null and source_name is not null
            and source_url is not null and source_date is not null),
  unique nulls not distinct (country_id, region_id, code, year, data_kind, reference_country)
);

-- ---------------------------------------------------------------- user data
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 1 and 80),
  avatar_url         text check (avatar_url ~ '^https://'),
  preferred_language text not null default 'en' check (preferred_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  preferences        jsonb not null default '{}' check (jsonb_typeof(preferences) = 'object'),
  is_public          boolean not null default false,
  status             text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.simulation_scenarios (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid default auth.uid() references auth.users (id) on delete cascade, -- null = official scenario
  country_id           uuid not null references public.country_configurations (id) on delete cascade,
  title                text not null check (char_length(title) between 1 and 120),
  description          text check (char_length(description) <= 4000),
  challenge_slug       text,
  policy_config_id     uuid references public.public_policy_configurations (id) on delete set null,
  levers               jsonb not null check (jsonb_typeof(levers) = 'object'),
  structural_overrides jsonb not null default '{}' check (jsonb_typeof(structural_overrides) = 'object'),
  horizon              smallint not null check (horizon in (1, 5, 10, 20)),
  model_version        text not null references public.model_versions (version),
  visibility           public.visibility not null default 'private',
  moderation_status    text not null default 'visible' check (moderation_status in ('visible', 'hidden')),
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check ((visibility = 'public') = (published_at is not null))
);
create index simulation_scenarios_owner_idx on public.simulation_scenarios (owner_id);
create index simulation_scenarios_public_idx on public.simulation_scenarios (published_at desc) where visibility = 'public';

create table public.simulation_runs (
  id              uuid primary key default gen_random_uuid(),
  scenario_id     uuid references public.simulation_scenarios (id) on delete set null,
  requested_by    uuid references auth.users (id) on delete set null,
  input_hash      text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  inputs          jsonb not null,
  model_version   text not null references public.model_versions (version),
  engine_git_sha  text,
  population_seed bigint not null,
  mc_seed         bigint not null,
  status          public.run_status not null default 'queued',
  error           text,
  created_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index simulation_runs_hash_idx on public.simulation_runs (input_hash, model_version);
create index simulation_runs_scenario_idx on public.simulation_runs (scenario_id);
create index simulation_runs_requested_by_idx on public.simulation_runs (requested_by);

create table public.simulation_results (
  run_id            uuid primary key references public.simulation_runs (id) on delete cascade,
  indicators        jsonb not null, -- per indicator per year: central, p10, p50, p90
  distribution      jsonb not null, -- deciles: market vs disposable income
  regions           jsonb not null,
  sensitivity       jsonb,
  accounting_checks jsonb not null,
  created_at        timestamptz not null default now()
);

create table public.virtual_portfolios (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references auth.users (id) on delete cascade, -- one per account
  initial_units     numeric(14, 2) not null check (initial_units > 0),
  unallocated_units numeric(14, 2) not null check (unallocated_units >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (unallocated_units <= initial_units)
);

create table public.virtual_portfolio_allocations (
  portfolio_id uuid not null references public.virtual_portfolios (id) on delete cascade,
  project_id   uuid not null references public.investment_projects (id),
  units        numeric(14, 2) not null check (units >= 0),
  updated_at   timestamptz not null default now(),
  primary key (portfolio_id, project_id)
);
create index virtual_portfolio_allocations_project_idx on public.virtual_portfolio_allocations (project_id);

create table public.virtual_ledger_entries (
  id                bigint generated always as identity primary key,
  portfolio_id      uuid not null references public.virtual_portfolios (id) on delete cascade,
  project_id        uuid references public.investment_projects (id),
  entry_type        public.ledger_entry_type not null,
  units             numeric(14, 2) not null check (units > 0),
  unallocated_after numeric(14, 2) not null check (unallocated_after >= 0),
  request_id        uuid not null, -- client idempotency key
  scenario_id       uuid references public.simulation_scenarios (id) on delete set null,
  created_at        timestamptz not null default now(),
  check ((entry_type = 'grant') = (project_id is null)),
  unique (portfolio_id, request_id, entry_type)
);
create index virtual_ledger_entries_portfolio_idx on public.virtual_ledger_entries (portfolio_id, id);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid, -- no FK: the record outlives account deletion
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------- functions & triggers
create function public.has_role(p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = p_role)
$$;

-- Profile on first sign-in. Only a display name and avatar; the profile starts private.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
                  'Verdanian'), 80),
    case when new.raw_user_meta_data ->> 'avatar_url' ~ '^https://' then new.raw_user_meta_data ->> 'avatar_url' end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create function public.scenario_publish_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.visibility = 'public' then
    new.published_at := case when tg_op = 'UPDATE' and old.visibility = 'public' then old.published_at else now() end;
  else
    new.published_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger simulation_scenarios_publish before insert or update on public.simulation_scenarios
  for each row execute function public.scenario_publish_stamp();

-- Admin-only role assignment, audited.
create function public.grant_role(p_user uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then
    raise exception 'admin privileges required' using errcode = '42501';
  end if;
  insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, auth.uid())
  on conflict do nothing;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'role.granted', 'user_roles', p_user::text, jsonb_build_object('role', p_role));
end $$;

-- Join the virtual investment market: one portfolio per account, granted once.
create function public.join_virtual_market() returns public.virtual_portfolios
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_grant numeric;
  v_p     public.virtual_portfolios;
begin
  if v_uid is null then
    raise exception 'sign-in required' using errcode = '42501';
  end if;

  select coalesce((config ->> 'virtual_grant_units')::numeric, 100000) into v_grant
  from public.country_configurations where is_published order by created_at limit 1;
  if v_grant is null then
    raise exception 'no published country configuration' using errcode = 'P0002';
  end if;

  insert into public.virtual_portfolios (owner_id, initial_units, unallocated_units)
  values (v_uid, v_grant, v_grant)
  on conflict (owner_id) do nothing
  returning * into v_p;

  if v_p.id is null then -- already joined: return the existing portfolio unchanged
    select * into v_p from public.virtual_portfolios where owner_id = v_uid;
    return v_p;
  end if;

  insert into public.virtual_ledger_entries (portfolio_id, entry_type, units, unallocated_after, request_id)
  values (v_p.id, 'grant', v_grant, v_grant, gen_random_uuid());
  insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (v_uid, 'portfolio.created', 'virtual_portfolios', v_p.id::text);
  return v_p;
end $$;

-- The only way virtual units move.
--   p_from null -> allocate from unallocated units to p_to
--   p_to   null -> withdraw from p_from back to unallocated units
--   both set    -> reallocate between projects
-- The portfolio row lock serialises concurrent calls; p_request_id makes retries no-ops.
create function public.move_virtual_units(p_from uuid, p_to uuid, p_units numeric, p_request_id uuid)
returns public.virtual_portfolios
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_p   public.virtual_portfolios;
begin
  if v_uid is null then
    raise exception 'sign-in required' using errcode = '42501';
  end if;
  if p_units is null or p_units <= 0 or p_units <> round(p_units, 2) then
    raise exception 'units must be positive with at most 2 decimals' using errcode = '22023';
  end if;
  if p_request_id is null or p_from is not distinct from p_to then
    raise exception 'request id required and source must differ from destination' using errcode = '22023';
  end if;

  select * into v_p from public.virtual_portfolios where owner_id = v_uid for update;
  if not found then
    raise exception 'join the virtual market first' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.virtual_ledger_entries
             where portfolio_id = v_p.id and request_id = p_request_id) then
    return v_p; -- retry of an applied request
  end if;

  if p_to is not null and not exists (select 1 from public.investment_projects where id = p_to and is_published) then
    raise exception 'unknown project' using errcode = '22023';
  end if;

  if p_from is null then
    if v_p.unallocated_units < p_units then
      raise exception 'not enough unallocated virtual units' using errcode = '22023';
    end if;
    update public.virtual_portfolios set unallocated_units = unallocated_units - p_units, updated_at = now()
    where id = v_p.id returning * into v_p;
  else
    update public.virtual_portfolio_allocations set units = units - p_units, updated_at = now()
    where portfolio_id = v_p.id and project_id = p_from and units >= p_units;
    if not found then
      raise exception 'not enough virtual units in the source project' using errcode = '22023';
    end if;
    if p_to is null then
      update public.virtual_portfolios set unallocated_units = unallocated_units + p_units, updated_at = now()
      where id = v_p.id returning * into v_p;
    end if;
    insert into public.virtual_ledger_entries (portfolio_id, project_id, entry_type, units, unallocated_after, request_id)
    values (v_p.id, p_from, 'withdraw', p_units, v_p.unallocated_units, p_request_id);
  end if;

  if p_to is not null then
    insert into public.virtual_portfolio_allocations as a (portfolio_id, project_id, units)
    values (v_p.id, p_to, p_units)
    on conflict (portfolio_id, project_id) do update set units = a.units + excluded.units, updated_at = now();
    insert into public.virtual_ledger_entries (portfolio_id, project_id, entry_type, units, unallocated_after, request_id)
    values (v_p.id, p_to, 'allocate', p_units, v_p.unallocated_units, p_request_id);
  end if;

  return v_p;
end $$;

-- Public participation dashboard: totals only, hidden below 5 participants per project.
create function public.public_allocation_totals()
returns table (category text, project_id uuid, participants bigint, units numeric)
language sql stable security definer set search_path = '' as $$
  select p.category, p.id, count(*), sum(a.units)
  from public.virtual_portfolio_allocations a
  join public.investment_projects p on p.id = a.project_id and p.is_published
  where a.units > 0
  group by p.category, p.id
  having count(*) >= 5
$$;

create view public.public_profiles as
  select id, display_name, avatar_url from public.profiles where is_public and status = 'active';

-- ---------------------------------------------------------------- privileges
revoke execute on function public.has_role, public.handle_new_user, public.touch_updated_at,
  public.scenario_publish_stamp, public.grant_role, public.join_virtual_market,
  public.move_virtual_units, public.public_allocation_totals from public, anon;
grant execute on function public.has_role, public.grant_role, public.join_virtual_market,
  public.move_virtual_units to authenticated;
grant execute on function public.public_allocation_totals to anon, authenticated;

-- Reference data and service-written tables: read-only for clients.
revoke insert, update, delete, truncate on
  public.model_versions, public.country_configurations, public.administrative_regions, public.economic_sectors,
  public.synthetic_population_profiles, public.synthetic_people, public.skills, public.person_skills,
  public.investment_projects, public.agricultural_projects, public.public_policy_configurations,
  public.simulation_parameters, public.economic_indicators, public.user_roles, public.simulation_runs,
  public.simulation_results, public.virtual_portfolios, public.virtual_portfolio_allocations,
  public.virtual_ledger_entries, public.audit_logs
from anon, authenticated;

-- Profiles: users edit only their own safe columns (not status).
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, preferred_language, preferences, is_public) on public.profiles to authenticated;

-- Scenarios: users write their own; moderation_status/published_at are server-controlled.
revoke insert, update, delete, truncate on public.simulation_scenarios from anon, authenticated;
grant insert (country_id, title, description, challenge_slug, policy_config_id, levers, structural_overrides,
              horizon, model_version, visibility) on public.simulation_scenarios to authenticated;
grant update (title, description, challenge_slug, policy_config_id, levers, structural_overrides,
              horizon, model_version, visibility) on public.simulation_scenarios to authenticated;
grant delete on public.simulation_scenarios to authenticated;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.model_versions                enable row level security;
alter table public.country_configurations        enable row level security;
alter table public.administrative_regions        enable row level security;
alter table public.economic_sectors              enable row level security;
alter table public.synthetic_population_profiles enable row level security;
alter table public.synthetic_people              enable row level security;
alter table public.skills                        enable row level security;
alter table public.person_skills                 enable row level security;
alter table public.investment_projects           enable row level security;
alter table public.agricultural_projects         enable row level security;
alter table public.public_policy_configurations  enable row level security;
alter table public.simulation_parameters         enable row level security;
alter table public.economic_indicators           enable row level security;
alter table public.profiles                      enable row level security;
alter table public.user_roles                    enable row level security;
alter table public.simulation_scenarios          enable row level security;
alter table public.simulation_runs               enable row level security;
alter table public.simulation_results            enable row level security;
alter table public.virtual_portfolios            enable row level security;
alter table public.virtual_portfolio_allocations enable row level security;
alter table public.virtual_ledger_entries        enable row level security;
alter table public.audit_logs                    enable row level security;

-- Published fictional data
create policy "read" on public.model_versions        for select to anon, authenticated using (true);
create policy "read" on public.economic_sectors      for select to anon, authenticated using (true);
create policy "read" on public.skills                for select to anon, authenticated using (true);
create policy "read" on public.simulation_parameters for select to anon, authenticated using (true);
create policy "read published" on public.country_configurations for select to anon, authenticated using (is_published);
create policy "read published" on public.administrative_regions for select to anon, authenticated
  using (exists (select 1 from public.country_configurations c where c.id = country_id and c.is_published));
create policy "read published" on public.synthetic_population_profiles for select to anon, authenticated
  using (exists (select 1 from public.country_configurations c where c.id = country_id and c.is_published));
create policy "read published" on public.synthetic_people for select to anon, authenticated
  using (exists (select 1 from public.country_configurations c where c.id = country_id and c.is_published));
create policy "read published" on public.person_skills for select to anon, authenticated
  using (exists (select 1 from public.synthetic_people p where p.id = person_id));
create policy "read published" on public.investment_projects for select to anon, authenticated using (is_published);
create policy "read published" on public.agricultural_projects for select to anon, authenticated
  using (exists (select 1 from public.investment_projects p where p.id = project_id and p.is_published));
create policy "read published" on public.public_policy_configurations for select to anon, authenticated using (is_published);
create policy "read published" on public.economic_indicators for select to anon, authenticated
  using (country_id is null
         or exists (select 1 from public.country_configurations c where c.id = country_id and c.is_published));

-- Own account
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own roles" on public.user_roles for select to authenticated using (user_id = (select auth.uid()));

-- Scenarios: public ones for everyone, private ones for their owner
create policy "read public or own" on public.simulation_scenarios for select to anon, authenticated
  using ((visibility = 'public' and moderation_status = 'visible') or owner_id = (select auth.uid()));
create policy "create own" on public.simulation_scenarios for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "edit own" on public.simulation_scenarios for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own" on public.simulation_scenarios for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Runs/results: written by the server; readable if anonymous cache, own, or via a readable scenario
create policy "read visible runs" on public.simulation_runs for select to anon, authenticated
  using ((scenario_id is null and requested_by is null)
         or requested_by = (select auth.uid())
         or exists (select 1 from public.simulation_scenarios s where s.id = scenario_id));
create policy "read visible results" on public.simulation_results for select to anon, authenticated
  using (exists (select 1 from public.simulation_runs r where r.id = run_id));

-- Virtual capital: owners read; all writes go through move_virtual_units()
create policy "own portfolio" on public.virtual_portfolios for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "own allocations" on public.virtual_portfolio_allocations for select to authenticated
  using (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.owner_id = (select auth.uid())));
create policy "own ledger" on public.virtual_ledger_entries for select to authenticated
  using (exists (select 1 from public.virtual_portfolios p where p.id = portfolio_id and p.owner_id = (select auth.uid())));

-- Audit log: admins read; nobody but SECURITY DEFINER functions writes
create policy "admins read" on public.audit_logs for select to authenticated using (public.has_role('admin'));
