-- Add hero background URL to site settings for configurable hero images
alter table public.site_settings
  add column if not exists hero_bg_url text;
