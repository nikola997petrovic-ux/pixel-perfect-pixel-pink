ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence text,
  ADD COLUMN IF NOT EXISTS last_completed_date date;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_recurrence_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_recurrence_check CHECK (recurrence IS NULL OR recurrence = 'daily');