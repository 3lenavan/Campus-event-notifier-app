-- Opt-in default: a user's RSVPs/likes are only visible to followers in the
-- activity feed if they explicitly turn this on. Exposes real schedule/location
-- info, so default-off is the safer choice.
alter table public.user_profiles add column if not exists activity_visible boolean not null default false;
