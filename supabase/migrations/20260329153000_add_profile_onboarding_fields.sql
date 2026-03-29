alter table public.profiles
  add column if not exists name text,
  add column if not exists track text;
