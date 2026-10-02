CREATE TYPE public.help_visibility AS ENUM ('all', 'professional', 'admin');
CREATE TYPE public.help_event_type AS ENUM ('view', 'search', 'no_results', 'completed', 'guide_started', 'guide_skipped');

CREATE TABLE public.help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'book-open',
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.help_categories TO authenticated;
GRANT ALL ON public.help_categories TO service_role;
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read active help categories" ON public.help_categories FOR SELECT TO authenticated USING (is_active);

CREATE TABLE public.help_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.help_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description TEXT NOT NULL CHECK (char_length(short_description) BETWEEN 10 AND 300),
  objective TEXT NOT NULL CHECK (char_length(objective) BETWEEN 10 AND 500),
  content TEXT NOT NULL DEFAULT '',
  expected_result TEXT NOT NULL DEFAULT '',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  route_path TEXT,
  visibility public.help_visibility NOT NULL DEFAULT 'professional',
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.help_tutorials TO authenticated;
GRANT ALL ON public.help_tutorials TO service_role;
ALTER TABLE public.help_tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals read active help tutorials" ON public.help_tutorials FOR SELECT TO authenticated USING (is_active AND visibility IN ('all', 'professional'));
CREATE INDEX help_tutorials_category_order_idx ON public.help_tutorials(category_id, order_index);
CREATE INDEX help_tutorials_keywords_idx ON public.help_tutorials USING gin(keywords);

CREATE TABLE public.help_tutorial_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES public.help_tutorials(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 140),
  instruction TEXT NOT NULL CHECK (char_length(instruction) BETWEEN 5 AND 1000),
  target_selector TEXT,
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tutorial_id, order_index)
);
GRANT SELECT ON public.help_tutorial_steps TO authenticated;
GRANT ALL ON public.help_tutorial_steps TO service_role;
ALTER TABLE public.help_tutorial_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals read steps of visible tutorials" ON public.help_tutorial_steps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.help_tutorials t WHERE t.id = tutorial_id));
CREATE INDEX help_tutorial_steps_tutorial_idx ON public.help_tutorial_steps(tutorial_id, order_index);

CREATE TABLE public.help_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.help_tutorials(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  introduction_seen BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tutorial_id)
);
GRANT SELECT, INSERT, UPDATE ON public.help_progress TO authenticated;
GRANT ALL ON public.help_progress TO service_role;
ALTER TABLE public.help_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own help progress" ON public.help_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own help progress" ON public.help_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own help progress" ON public.help_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX help_progress_user_idx ON public.help_progress(user_id, updated_at DESC);

CREATE TABLE public.help_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutorial_id UUID REFERENCES public.help_tutorials(id) ON DELETE SET NULL,
  event_type public.help_event_type NOT NULL,
  search_term TEXT CHECK (search_term IS NULL OR char_length(search_term) <= 120),
  has_results BOOLEAN,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.help_events TO authenticated;
GRANT ALL ON public.help_events TO service_role;
ALTER TABLE public.help_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users record own help events" ON public.help_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX help_events_occurred_idx ON public.help_events(occurred_at DESC);
CREATE INDEX help_events_tutorial_idx ON public.help_events(tutorial_id, event_type);

COMMENT ON TABLE public.help_events IS 'Minimal non-clinical help analytics; never stores patient or clinical content.';