-- Areas
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✨',
  color TEXT NOT NULL DEFAULT '#6A7B82',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL UNIQUE REFERENCES public.areas(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_area ON public.goals(area_id);
CREATE INDEX idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX idx_tasks_area ON public.tasks(area_id);
CREATE INDEX idx_tasks_user_due ON public.tasks(user_id, due_date);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- RLS: owner-only
CREATE POLICY "areas_owner" ON public.areas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_owner" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_owner" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_owner" ON public.streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_streaks_updated BEFORE UPDATE ON public.streaks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create streak row when area is created
CREATE OR REPLACE FUNCTION public.create_streak_for_area()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.streaks (user_id, area_id) VALUES (NEW.user_id, NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_areas_streak AFTER INSERT ON public.areas FOR EACH ROW EXECUTE FUNCTION public.create_streak_for_area();

-- Recalculate streak when a task is completed/uncompleted
CREATE OR REPLACE FUNCTION public.update_area_streak()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_area_id UUID;
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_last DATE;
  v_current INTEGER;
  v_longest INTEGER;
BEGIN
  v_area_id := COALESCE(NEW.area_id, OLD.area_id);
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Only recalc when completion status meaningfully changed
  IF (TG_OP = 'UPDATE' AND OLD.completed = NEW.completed) THEN
    RETURN NEW;
  END IF;

  SELECT current_streak, longest_streak, last_active_date
    INTO v_current, v_longest, v_last
  FROM public.streaks WHERE area_id = v_area_id;

  IF NOT FOUND THEN
    INSERT INTO public.streaks(user_id, area_id) VALUES (v_user_id, v_area_id);
    v_current := 0; v_longest := 0; v_last := NULL;
  END IF;

  IF NEW.completed = true THEN
    IF v_last IS NULL OR v_last < v_today THEN
      IF v_last = v_today - INTERVAL '1 day' THEN
        v_current := v_current + 1;
      ELSE
        v_current := 1;
      END IF;
      v_last := v_today;
      IF v_current > v_longest THEN v_longest := v_current; END IF;
      UPDATE public.streaks SET current_streak = v_current, longest_streak = v_longest, last_active_date = v_last WHERE area_id = v_area_id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_tasks_streak
AFTER INSERT OR UPDATE OF completed ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_area_streak();