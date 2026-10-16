-- Security-advisor follow-ups after the first deploy.

-- Trigger functions run only as triggers; nobody should reach them through the API.
-- (Supabase grants EXECUTE to `authenticated` directly, so the earlier revoke from PUBLIC/anon was not enough.)
revoke execute on function public.handle_new_user(), public.touch_updated_at(), public.scenario_publish_stamp()
  from anon, authenticated;

-- The public-profiles view ran with its owner's rights (advisor: security_definer_view). Nothing reads it
-- yet; community features will add a narrow read path when they need one.
drop view public.public_profiles;
