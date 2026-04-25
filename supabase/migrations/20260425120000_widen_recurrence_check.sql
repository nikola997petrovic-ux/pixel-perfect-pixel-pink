ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_recurrence_check
  CHECK (recurrence IS NULL OR recurrence = 'daily' OR recurrence ~ '^weekly:[0-6](,[0-6])*$');
