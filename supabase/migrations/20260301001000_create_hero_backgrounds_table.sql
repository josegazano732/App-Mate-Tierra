-- Create dedicated table to store hero background images
create table if not exists public.hero_backgrounds (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

-- Ensure updated_at tracks modifications
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hero_backgrounds_set_updated_at
before update on public.hero_backgrounds
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.hero_backgrounds enable row level security;

-- Public read access (hero image is public)
create policy "Public read access for hero backgrounds"
  on public.hero_backgrounds for select
  to public
  using (true);

-- Admin access for writes
create policy "Admin access for hero backgrounds"
  on public.hero_backgrounds for all
  to authenticated
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Seed singleton row for convenience
insert into public.hero_backgrounds (id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (id) do nothing;
