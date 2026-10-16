-- Content fingerprint of the reference data. Run locally and against production: the rows must match.
select t, n, h from (
  select 1 o, 'profiles' t, count(*) n,
         md5(string_agg(concat_ws('|', r.code, p.age_band, p.gender, p.education, p.sector_code, p.person_count), ','
             order by r.code collate "C", p.age_band collate "C", p.gender collate "C", p.education collate "C",
                      p.sector_code collate "C" nulls first)) h
  from public.synthetic_population_profiles p join public.administrative_regions r on r.id = p.region_id
  union all
  select 2, 'parameters', count(*), md5(string_agg(concat_ws('|', code, kind, min_value, max_value, default_value, evidence), ','
             order by code collate "C"))
  from public.simulation_parameters
  union all
  select 3, 'indicators', count(*), md5(string_agg(concat_ws('|', coalesce(r.code, '-'), i.code, i.value), ','
             order by coalesce(r.code, '-') collate "C", i.code collate "C"))
  from public.economic_indicators i left join public.administrative_regions r on r.id = i.region_id
  union all
  select 4, 'projects', count(*), md5(string_agg(concat_ws('|', slug, funding_target, public_contribution,
             private_return_low, private_return_central, private_return_high, jobs_per_million), ',' order by slug collate "C"))
  from public.investment_projects
  union all
  select 5, 'presets', count(*), md5(string_agg(slug || '|' || levers::text, ',' order by slug collate "C"))
  from public.public_policy_configurations
  union all
  select 6, 'regions', count(*), md5(string_agg(concat_ws('|', code, population, area_km2), ',' order by code collate "C"))
  from public.administrative_regions
) x order by o;
