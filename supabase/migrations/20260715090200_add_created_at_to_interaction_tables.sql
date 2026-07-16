-- Needed to sort the friend activity feed by recency. Safe to run whether or not
-- these columns already exist.
alter table public.likes add column if not exists created_at timestamptz not null default now();
alter table public.favorites add column if not exists created_at timestamptz not null default now();
alter table public.event_rsvp add column if not exists created_at timestamptz not null default now();
