-- SpeckyAI initial schema + RLS
-- Safe to run multiple times where possible.

create extension if not exists "pgcrypto";

-- =========================
-- Core recording tables
-- =========================

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  status text not null default 'idle',
  full_transcript text,
  created_at timestamptz not null default now()
);

alter table public.recordings enable row level security;

drop policy if exists recordings_select_own on public.recordings;
create policy recordings_select_own
on public.recordings
for select
using (user_id = auth.uid());

drop policy if exists recordings_insert_own on public.recordings;
create policy recordings_insert_own
on public.recordings
for insert
with check (user_id = auth.uid());

drop policy if exists recordings_update_own on public.recordings;
create policy recordings_update_own
on public.recordings
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists recordings_delete_own on public.recordings;
create policy recordings_delete_own
on public.recordings
for delete
using (user_id = auth.uid());


create table if not exists public.transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  chunk_index integer not null,
  text text not null default '',
  created_at timestamptz not null default now(),
  unique (recording_id, chunk_index)
);

alter table public.transcript_chunks enable row level security;

drop policy if exists transcript_chunks_select_own on public.transcript_chunks;
create policy transcript_chunks_select_own
on public.transcript_chunks
for select
using (
  exists (
    select 1
    from public.recordings r
    where r.id = transcript_chunks.recording_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists transcript_chunks_insert_own on public.transcript_chunks;
create policy transcript_chunks_insert_own
on public.transcript_chunks
for insert
with check (
  exists (
    select 1
    from public.recordings r
    where r.id = transcript_chunks.recording_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists transcript_chunks_update_own on public.transcript_chunks;
create policy transcript_chunks_update_own
on public.transcript_chunks
for update
using (
  exists (
    select 1
    from public.recordings r
    where r.id = transcript_chunks.recording_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recordings r
    where r.id = transcript_chunks.recording_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists transcript_chunks_delete_own on public.transcript_chunks;
create policy transcript_chunks_delete_own
on public.transcript_chunks
for delete
using (
  exists (
    select 1
    from public.recordings r
    where r.id = transcript_chunks.recording_id
      and r.user_id = auth.uid()
  )
);


create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references public.recordings (id) on delete cascade,
  summary text not null default '',
  action_items jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  notes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.meeting_notes enable row level security;

drop policy if exists meeting_notes_select_own on public.meeting_notes;
create policy meeting_notes_select_own
on public.meeting_notes
for select
using (
  exists (
    select 1
    from public.recordings r
    where r.id = meeting_notes.recording_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists meeting_notes_insert_own on public.meeting_notes;
create policy meeting_notes_insert_own
on public.meeting_notes
for insert
with check (
  exists (
    select 1
    from public.recordings r
    where r.id = meeting_notes.recording_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists meeting_notes_update_own on public.meeting_notes;
create policy meeting_notes_update_own
on public.meeting_notes
for update
using (
  exists (
    select 1
    from public.recordings r
    where r.id = meeting_notes.recording_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recordings r
    where r.id = meeting_notes.recording_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists meeting_notes_delete_own on public.meeting_notes;
create policy meeting_notes_delete_own
on public.meeting_notes
for delete
using (
  exists (
    select 1
    from public.recordings r
    where r.id = meeting_notes.recording_id
      and r.user_id = auth.uid()
  )
);


-- =========================
-- Workspaces / Team
-- =========================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Members can view workspaces they belong to
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

-- Workspace creator can insert a workspace row for themselves
drop policy if exists workspaces_insert_self on public.workspaces;
create policy workspaces_insert_self
on public.workspaces
for insert
with check (created_by = auth.uid());

-- Only owner/admin can update/delete a workspace
drop policy if exists workspaces_update_admin on public.workspaces;
create policy workspaces_update_admin
on public.workspaces
for update
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspaces_delete_owner on public.workspaces;
create policy workspaces_delete_owner
on public.workspaces
for delete
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);

-- Workspace members: any member can see membership list for their workspace
drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member
on public.workspace_members
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Only owner/admin can add/remove/update members
drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin
on public.workspace_members
for insert
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
  or (
    workspace_members.user_id = auth.uid()
    and workspace_members.role = 'owner'
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.created_by = auth.uid()
    )
  )
);

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin
on public.workspace_members
for update
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
);

drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin
on public.workspace_members
for delete
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
);


create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','admin','member','viewer')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.workspace_invites enable row level security;

drop policy if exists workspace_invites_admin_only on public.workspace_invites;
create policy workspace_invites_admin_only
on public.workspace_invites
for all
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
);


create table if not exists public.recording_shares (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  shared_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recording_id, workspace_id)
);

alter table public.recording_shares enable row level security;

-- Only recording owner can share it
drop policy if exists recording_shares_insert_owner on public.recording_shares;
create policy recording_shares_insert_owner
on public.recording_shares
for insert
with check (
  exists (
    select 1
    from public.recordings r
    where r.id = recording_shares.recording_id
      and r.user_id = auth.uid()
  )
);

-- Workspace members can view shares for their workspaces
drop policy if exists recording_shares_select_member on public.recording_shares;
create policy recording_shares_select_member
on public.recording_shares
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = recording_shares.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Only owner/admin can delete shares in their workspace
drop policy if exists recording_shares_delete_admin on public.recording_shares;
create policy recording_shares_delete_admin
on public.recording_shares
for delete
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = recording_shares.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin')
  )
);


create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  target jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- Only workspace members can read logs for that workspace.
drop policy if exists audit_logs_select_member on public.audit_logs;
create policy audit_logs_select_member
on public.audit_logs
for select
using (
  workspace_id is null
  or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = audit_logs.workspace_id
      and wm.user_id = auth.uid()
  )
);

