-- Drop the constraint entirely; recurrence format is validated in application code.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_check;
