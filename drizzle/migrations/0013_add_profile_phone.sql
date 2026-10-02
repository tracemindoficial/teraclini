ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.profiles.phone IS 'Administrative contact phone supplied by the professional; never clinical content.';