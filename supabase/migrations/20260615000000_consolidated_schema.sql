-- =====================================================================
-- Nayra — Consolidated Database Schema
-- Enterprise RAG Knowledge Assistant
-- =====================================================================
-- This single migration sets up the complete database schema:
-- tables, indexes, RLS policies, triggers, and RPC functions.
-- Run this on a fresh Supabase project (Postgres 15+ with pgvector).
-- =====================================================================

-- Required extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================================
-- TABLES
-- =====================================================================

-- Departments / workspaces (Engineering, Finance, Marketing, HR, All)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#7C6EF8',
  created_at timestamptz DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text DEFAULT 'Employee',          -- 'Employee' | 'HR Admin'
  workspace_name text,                    -- matches workspaces.name
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Whitelist of emails allowed to register as HR Admin
CREATE TABLE IF NOT EXISTS public.hr_whitelist (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Uploaded documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  size bigint DEFAULT 0,
  pages integer DEFAULT 0,
  status text DEFAULT 'processing',       -- 'processing' | 'indexed' | 'error'
  storage_path text,
  created_at timestamptz DEFAULT now()
);

-- Vector-embedded document chunks for RAG retrieval
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  content text NOT NULL,
  chunk_index integer NOT NULL,
  page_number integer DEFAULT 1,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  workspace_id uuid REFERENCES public.workspaces(id),
  title text DEFAULT 'New Chat',
  created_at timestamptz DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,                     -- 'user' | 'assistant'
  content text NOT NULL,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notifications (announcements + document upload alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('announcement', 'document_upload', 'system')),
  title text NOT NULL,
  message text,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL = visible to everyone
  target_role text,                       -- NULL = all roles, or 'Employee' / 'HR Admin'
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-user notification read receipts
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- =====================================================================
-- INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON public.notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace ON public.document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.messages(session_id);

-- =====================================================================
-- SEED DATA — default workspaces
-- =====================================================================
INSERT INTO public.workspaces (id, name, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'All', '#6366F1'),
  (gen_random_uuid(), 'Engineering', '#8B5CF6'),
  (gen_random_uuid(), 'Finance', '#F59E0B'),
  (gen_random_uuid(), 'Marketing', '#EC4899'),
  (gen_random_uuid(), 'HR', '#10B981')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- workspaces: readable by everyone signed in
DROP POLICY IF EXISTS "Workspaces readable by authenticated users" ON public.workspaces;
CREATE POLICY "Workspaces readable by authenticated users"
  ON public.workspaces FOR SELECT TO authenticated USING (true);

-- hr_whitelist: readable by everyone (used during signup to detect HR emails)
DROP POLICY IF EXISTS "Anyone can read whitelist" ON public.hr_whitelist;
CREATE POLICY "Anyone can read whitelist"
  ON public.hr_whitelist FOR SELECT USING (true);

-- profiles
DROP POLICY IF EXISTS "All authenticated can view profiles" ON public.profiles;
CREATE POLICY "All authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- HR Admin can update anyone's profile (department/role changes)
DROP POLICY IF EXISTS "HR Admin can update all profiles" ON public.profiles;
CREATE POLICY "HR Admin can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'HR Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'HR Admin'));

-- documents
DROP POLICY IF EXISTS "Users can view workspace documents" ON public.documents;
CREATE POLICY "Users can view workspace documents"
  ON public.documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- document_chunks (searched via service role in edge functions; open SELECT for RPC use)
DROP POLICY IF EXISTS "Anyone can search chunks by workspace" ON public.document_chunks;
CREATE POLICY "Anyone can search chunks by workspace"
  ON public.document_chunks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can insert chunks" ON public.document_chunks;
CREATE POLICY "Service role can insert chunks"
  ON public.document_chunks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete chunks" ON public.document_chunks;
CREATE POLICY "Service role can delete chunks"
  ON public.document_chunks FOR DELETE USING (true);

-- chat_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.chat_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own sessions"
  ON public.chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- HR Admin can view all sessions (for analytics)
DROP POLICY IF EXISTS "HR Admin can view all sessions" ON public.chat_sessions;
CREATE POLICY "HR Admin can view all sessions"
  ON public.chat_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'HR Admin'));

-- messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT TO authenticated
  USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));

-- HR Admin can view all messages (for analytics)
DROP POLICY IF EXISTS "HR Admin can view all messages" ON public.messages;
CREATE POLICY "HR Admin can view all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'HR Admin'));

-- notifications
DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.notifications;
CREATE POLICY "Users can view relevant notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    (
      workspace_id IS NULL
      OR workspace_id = (SELECT id FROM public.workspaces WHERE name = (SELECT workspace_name FROM public.profiles WHERE id = auth.uid()))
      OR workspace_id = '00000000-0000-0000-0000-000000000001'
    )
    AND (target_role IS NULL OR target_role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "HR Admin can create notifications" ON public.notifications;
CREATE POLICY "HR Admin can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'HR Admin'));

-- notification_reads
DROP POLICY IF EXISTS "Users manage own read receipts" ON public.notification_reads;
CREATE POLICY "Users manage own read receipts"
  ON public.notification_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================================

-- Auto-create a profile row when a new auth user signs up / is invited.
-- Picks up full_name / role / workspace_name from raw_user_meta_data
-- (set during signup or via the invite-user edge function).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, workspace_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Employee'),
    new.raw_user_meta_data->>'workspace_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    workspace_name = COALESCE(EXCLUDED.workspace_name, public.profiles.workspace_name);
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed a "Welcome Chat" session for every new user
CREATE OR REPLACE FUNCTION public.handle_new_user_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  eng_workspace_id uuid;
begin
  select id into eng_workspace_id from public.workspaces where name = 'Engineering' limit 1;
  insert into public.chat_sessions (user_id, workspace_id, title)
  values (new.id, eng_workspace_id, 'Welcome Chat');
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_session ON auth.users;
CREATE TRIGGER on_auth_user_created_session
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_session();

-- Notify employees in a workspace when a new document finishes indexing
CREATE OR REPLACE FUNCTION public.notify_on_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  ws_name text;
BEGIN
  IF NEW.status = 'indexed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'indexed') THEN
    SELECT name INTO ws_name FROM public.workspaces WHERE id = NEW.workspace_id;

    INSERT INTO public.notifications (type, title, message, workspace_id, target_role, created_by)
    VALUES (
      'document_upload',
      'New document added',
      '"' || NEW.name || '" was added to ' || COALESCE(ws_name, 'your workspace') || '.',
      NEW.workspace_id,
      'Employee',
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_document_upload ON public.documents;
CREATE TRIGGER trg_notify_document_upload
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_document_upload();

-- RAG retrieval RPC: vector similarity search with filters
-- (date range, document name, department/workspace, cross-department search for HR)
CREATE OR REPLACE FUNCTION public.match_chunks_filtered(
  query_embedding vector,
  match_workspace_id uuid,
  match_user_id uuid,
  match_count integer DEFAULT 8,
  filter_workspace_id uuid DEFAULT NULL,
  filter_date_from timestamptz DEFAULT NULL,
  filter_date_to timestamptz DEFAULT NULL,
  filter_doc_name text DEFAULT NULL,
  search_all_workspaces boolean DEFAULT false
)
RETURNS TABLE(
  id uuid, document_id uuid, content text, page_number integer,
  chunk_index integer, similarity double precision, document_name text,
  workspace_id uuid, created_at timestamptz
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_number,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.name AS document_name,
    dc.workspace_id,
    d.created_at
  FROM public.document_chunks dc
  JOIN public.documents d ON d.id = dc.document_id
  WHERE dc.embedding IS NOT NULL
    AND (
      search_all_workspaces
      OR (filter_workspace_id IS NOT NULL AND dc.workspace_id = filter_workspace_id)
      OR (
        filter_workspace_id IS NULL AND (
          dc.workspace_id = match_workspace_id
          OR dc.workspace_id = '00000000-0000-0000-0000-000000000001'
        )
      )
    )
    AND (filter_date_from IS NULL OR d.created_at >= filter_date_from)
    AND (filter_date_to IS NULL OR d.created_at <= filter_date_to)
    AND (filter_doc_name IS NULL OR d.name ILIKE '%' || filter_doc_name || '%')
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- Lock down EXECUTE on trigger functions; RPC is callable by the
-- chat edge function via the service-role key (and authenticated users
-- for Smart Search, which runs through the same edge function).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_document_upload() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks_filtered(vector, uuid, uuid, integer, uuid, timestamptz, timestamptz, text, boolean) TO service_role, authenticated;

-- =====================================================================
-- IMPORTANT MANUAL STEPS (cannot be scripted via SQL):
-- 1. Add your HR Admin email(s) to hr_whitelist:
--      INSERT INTO public.hr_whitelist (email) VALUES ('you@company.com');
-- 2. Deploy the edge functions in supabase/functions/ (chat, ingest-pdf,
--    invite-user, delete-user) with `supabase functions deploy <name>`.
-- 3. Set edge function secrets: GEMINI_API_KEY, and optionally
--    INVITE_REDIRECT_URL (URL users land on after accepting an invite).
-- =====================================================================
