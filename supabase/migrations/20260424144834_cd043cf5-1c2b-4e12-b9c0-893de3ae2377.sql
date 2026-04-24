-- Status enum
CREATE TYPE public.post_status AS ENUM ('pending', 'posted', 'failed', 'cancelled');

-- Scheduled posts table
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status public.post_status NOT NULL DEFAULT 'pending',
  external_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Reusable timestamp trigger (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scheduled_posts_updated
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_scheduled_posts_user_due
  ON public.scheduled_posts(user_id, scheduled_at);
CREATE INDEX idx_scheduled_posts_pending
  ON public.scheduled_posts(scheduled_at) WHERE status = 'pending';