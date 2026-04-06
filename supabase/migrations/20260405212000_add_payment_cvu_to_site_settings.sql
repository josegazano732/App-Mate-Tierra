-- Add payment CVU to site settings for dynamic transfer QR generation
alter table public.site_settings
  add column if not exists payment_cvu text;