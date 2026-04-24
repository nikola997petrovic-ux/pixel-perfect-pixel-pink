ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Seed sort_order based on existing updated_at order per user
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM public.areas
)
UPDATE public.areas a SET sort_order = ordered.rn
FROM ordered WHERE ordered.id = a.id;