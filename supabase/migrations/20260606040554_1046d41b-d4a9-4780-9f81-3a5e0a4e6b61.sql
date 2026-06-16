
-- Fix search_path for SECURITY DEFINER trigger functions and match_chunks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding vector, match_workspace_id uuid, match_user_id uuid, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, document_id uuid, content text, page_number integer, chunk_index integer, similarity double precision, document_name text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
begin
  return query
  select dc.id, dc.document_id, dc.content, dc.page_number, dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity, d.name as document_name
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where dc.workspace_id = match_workspace_id
    and dc.user_id = match_user_id
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$function$;

-- Lock down EXECUTE: trigger funcs and RPC should not be callable by anon / authenticated.
-- match_chunks is invoked via the service-role key in the chat edge function.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_chunks(vector, uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector, uuid, uuid, integer) TO service_role;

-- Allow users to update their own chat sessions (e.g. rename title)
CREATE POLICY "Users can update own sessions"
  ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
