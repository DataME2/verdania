-- Saved scenarios record the engine's input and output fingerprints, so a re-run can prove it
-- reproduced the same numbers. A scenario's inputs are fixed once saved: only its title,
-- description and visibility can change (edit a copy to try different levers).

alter table public.simulation_scenarios
  add column input_hash  text check (input_hash ~ '^[0-9a-f]{64}$'),
  add column output_hash text check (output_hash ~ '^[0-9a-f]{64}$');

grant insert (input_hash, output_hash) on public.simulation_scenarios to authenticated;

revoke update on public.simulation_scenarios from authenticated;
grant update (title, description, visibility) on public.simulation_scenarios to authenticated;

-- Listing pages: a user's own scenarios, newest first (also serves plain owner lookups).
create index simulation_scenarios_owner_created_idx on public.simulation_scenarios (owner_id, created_at desc);
drop index public.simulation_scenarios_owner_idx;
