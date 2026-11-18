CREATE TABLE public."Created_At_Locations" (
  user_no bigint PRIMARY KEY REFERENCES public.profiles(user_no) ON DELETE CASCADE,
  country_name text NOT NULL,
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."Created_At_Locations" IS
  'Public profile account-creation location overrides, editable by project admins in Supabase.';
COMMENT ON COLUMN public."Created_At_Locations".country_name IS
  'Country name as used by world-atlas countries-50m, e.g. Indonesia or Singapore.';
COMMENT ON COLUMN public."Created_At_Locations".country_code IS
  'ISO 3166-1 alpha-2 uppercase code for FlagCDN, e.g. ID or SG.';

ALTER TABLE public."Created_At_Locations" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."Created_At_Locations" TO service_role;
