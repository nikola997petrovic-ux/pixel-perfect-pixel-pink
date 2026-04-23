ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS target_count integer,
  ADD COLUMN IF NOT EXISTS unit text;