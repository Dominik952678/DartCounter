-- ============================================================================
-- Row-level security for public.documents
-- ============================================================================
--
-- Before this migration the table had RLS enabled but no write policy, so every
-- insert/upsert the app made was rejected with:
--   "new row violates row-level security policy for table documents"
--
-- The table also had no way to express ownership: it stores only (id, data), so
-- no policy could say "this row is mine". This migration adds an owner column,
-- scopes every direct client operation to the owner, and moves the four
-- cross-user guest-sync writes behind SECURITY DEFINER functions that validate
-- the guest's auth token on the server.
--
-- That last part is the point: the anti-stat-washing token check used to run in
-- the browser, where anyone could skip it with devtools. It is now enforced by
-- the database.
--
-- Apply once via Supabase Studio -> SQL Editor (or `supabase db push`).
-- Idempotent: safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Ownership column
-- ---------------------------------------------------------------------------

alter table public.documents
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

-- Backfill from the data payload first (profiles/match/sync docs all carry
-- userId), falling back to the uuid embedded in the row id.
update public.documents
set owner_id = coalesce(
      nullif(data ->> 'userId', '')::uuid,
      substring(id from '^(?:profiles|match|user_sync)_([0-9a-fA-F-]{36})')::uuid
    )
where owner_id is null;

-- New rows belong to whoever created them unless stated otherwise.
alter table public.documents
  alter column owner_id set default auth.uid();

create index if not exists documents_owner_id_idx on public.documents (owner_id);

alter table public.documents enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Owner-scoped policies for everything the client touches directly
-- ---------------------------------------------------------------------------
--
-- Covers: profiles_<uid>, match_<uid>_<ts>, sync_code_<code> and
-- user_sync_<uid> when the owner themselves reads or writes them.
-- Host -> guest traffic does NOT go through here; see section 3.

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own"
  on public.documents for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
  on public.documents for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Upsert needs update as well as insert; a missing update policy is the usual
-- cause of an upsert failing while a plain insert works.
drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own"
  on public.documents for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own"
  on public.documents for delete
  to authenticated
  using (owner_id = auth.uid());

-- Deliberately no policy for the `anon` role: guests keep their data in
-- localStorage and never write to the cloud.

-- ---------------------------------------------------------------------------
-- 3. Guest sync: host -> guest operations, validated server-side
-- ---------------------------------------------------------------------------
--
-- These run as SECURITY DEFINER, so they bypass RLS by design. Each one proves
-- the caller is entitled to act before it writes: either by presenting the
-- guest's current auth token, or by redeeming a live, unexpired sync code.

-- 3a. Redeem a 6-digit code. Called by the host device.
--
-- The sync_code_* row is never readable by the client under the policies above,
-- which is intentional: a readable table of codes would let anyone enumerate
-- them, and a code grants access to a profile.
create or replace function public.redeem_sync_code(p_code text, p_host_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc        jsonb;
  v_row_id     text;
  v_host       jsonb;
  v_updated    jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Nicht angemeldet.');
  end if;

  v_row_id := 'sync_code_' || regexp_replace(coalesce(p_code, ''), '\s', '', 'g');

  select data into v_doc from public.documents where id = v_row_id;

  if v_doc is null then
    return jsonb_build_object('success', false, 'error', 'Code nicht gefunden oder abgelaufen.');
  end if;

  if coalesce((v_doc ->> 'syncEnabled')::boolean, true) is not true then
    return jsonb_build_object('success', false, 'error', 'Der Nutzer hat den Gast-Sync aktuell deaktiviert.');
  end if;

  if coalesce((v_doc ->> 'expiresAt')::timestamptz, 'epoch'::timestamptz) <= now() then
    return jsonb_build_object('success', false, 'error', 'Dieser Sync-Code ist abgelaufen. Bitte neuen Code generieren.');
  end if;

  -- Exactly one active host at a time; redeeming displaces the previous device.
  v_host := jsonb_build_object(
    'hostId',   auth.uid()::text,
    'hostName', coalesce(nullif(p_host_name, ''), 'Unbekanntes Gerät'),
    'linkedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  v_updated := v_doc
    || jsonb_build_object('activeHost', v_host)
    || jsonb_build_object('activeHosts', jsonb_build_array(v_host));

  update public.documents set data = v_updated where id = v_row_id;
  update public.documents set data = v_updated
    where id = 'user_sync_' || (v_doc ->> 'userId');

  return jsonb_build_object(
    'success',   true,
    'userId',    v_doc ->> 'userId',
    'username',  v_doc ->> 'username',
    'authToken', v_doc ->> 'authToken',
    'profile',   coalesce(v_doc -> 'profileSnapshot', '{}'::jsonb),
    'matches',   coalesce(v_doc -> 'matchesSnapshot', '[]'::jsonb)
  );
end;
$$;

-- 3b. Is this host still authorised? Used by the pre-flight check before a
--     match and by the in-match watcher.
create or replace function public.guest_sync_status(p_guest_id uuid, p_auth_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('valid', false, 'aborted', false, 'reason', 'unauthenticated');
  end if;

  select data into v_doc from public.documents
   where id = 'user_sync_' || p_guest_id::text;

  if v_doc is null then
    return jsonb_build_object('valid', false, 'aborted', false, 'reason', 'missing');
  end if;

  return jsonb_build_object(
    'valid',
      (v_doc ->> 'authToken') = p_auth_token
      and coalesce((v_doc ->> 'syncEnabled')::boolean, true) is true
      and coalesce((v_doc ->> 'expiresAt')::timestamptz, 'epoch'::timestamptz) > now(),
    'aborted', coalesce((v_doc -> 'liveMatch' ->> 'isAborted')::boolean, false),
    'reason', 'ok'
  );
end;
$$;

-- 3c. Publish/clear the "a match is running on someone else's device" banner.
create or replace function public.set_guest_live_match(
  p_guest_id   uuid,
  p_auth_token text,
  p_host_name  text,
  p_game_type  text,
  p_active     boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc     jsonb;
  v_live    jsonb;
  v_updated jsonb;
begin
  if auth.uid() is null then
    return false;
  end if;

  select data into v_doc from public.documents
   where id = 'user_sync_' || p_guest_id::text;

  -- A stale token must not be able to touch the banner.
  if v_doc is null or (v_doc ->> 'authToken') is distinct from p_auth_token then
    return false;
  end if;

  if p_active then
    v_live := jsonb_build_object(
      'hostId',    auth.uid()::text,
      'hostName',  coalesce(nullif(p_host_name, ''), 'Host-Gerät'),
      'startedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'gameType',  coalesce(nullif(p_game_type, ''), 'standard'),
      'isAborted', false
    );
  else
    v_live := 'null'::jsonb;
  end if;

  v_updated := v_doc || jsonb_build_object('liveMatch', v_live);

  update public.documents set data = v_updated
   where id = 'user_sync_' || p_guest_id::text;

  if (v_doc ->> 'code') is not null and (v_doc ->> 'code') <> '' then
    update public.documents set data = v_updated
     where id = 'sync_code_' || (v_doc ->> 'code');
  end if;

  return true;
end;
$$;

-- 3d. Book a finished match onto the guest's own account.
--
-- The host submits the match record and the server derives the stat changes
-- from the guest's own row in it. The host cannot post arbitrary totals, which
-- is what makes the anti-stat-washing guarantee real rather than advisory.
create or replace function public.sync_guest_match_result(
  p_guest_id     uuid,
  p_auth_token   text,
  p_match        jsonb,
  p_player_name  text,
  p_is_winner    boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sync        jsonb;
  v_stat        jsonb;
  v_profiles_id text;
  v_profiles    jsonb;
  v_key         text;
  v_prof        jsonb;
  v_seg         jsonb;
  v_match_id    text;
  seg_key       text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select data into v_sync from public.documents
   where id = 'user_sync_' || p_guest_id::text;

  if v_sync is null or (v_sync ->> 'authToken') is distinct from p_auth_token then
    return false;
  end if;
  if coalesce((v_sync ->> 'syncEnabled')::boolean, true) is not true then
    return false;
  end if;

  -- The guest's own line in the submitted match.
  select elem.value into v_stat
    from jsonb_array_elements(coalesce(p_match -> 'players', '[]'::jsonb)) as elem
   where elem.value ->> 'name' = p_player_name
   limit 1;

  if v_stat is null then
    return false;
  end if;

  -- 1. Store the match under the guest's account.
  v_match_id := 'match_' || p_guest_id::text || '_'
                || (extract(epoch from clock_timestamp()) * 1000)::bigint::text || '_guest';

  insert into public.documents (id, data, owner_id)
  values (
    v_match_id,
    p_match || jsonb_build_object('_id', v_match_id, 'type', 'match', 'isGuestMatch', true),
    p_guest_id
  )
  on conflict (id) do nothing;

  -- 2. Fold the result into the guest's profile.
  v_profiles_id := 'profiles_' || p_guest_id::text;
  select data into v_profiles from public.documents where id = v_profiles_id;
  v_profiles := coalesce(v_profiles, jsonb_build_object('profiles', '{}'::jsonb));

  v_key := coalesce(
    case when (v_profiles -> 'profiles') ? p_player_name then p_player_name end,
    case when (v_profiles -> 'profiles') ? (v_sync ->> 'username') then v_sync ->> 'username' end,
    p_player_name
  );

  v_prof := coalesce(v_profiles -> 'profiles' -> v_key, '{}'::jsonb);

  v_prof := v_prof || jsonb_build_object(
    'matches',           coalesce((v_prof ->> 'matches')::int, 0) + 1,
    'wins',              coalesce((v_prof ->> 'wins')::int, 0) + (case when p_is_winner then 1 else 0 end),
    'dartsThrown',       coalesce((v_prof ->> 'dartsThrown')::int, 0) + coalesce((v_stat ->> 'matchDarts')::int, 0),
    'pointsScored',      coalesce((v_prof ->> 'pointsScored')::int, 0) + coalesce((v_stat ->> 'matchPts')::int, 0),
    'sixtyPlus',         coalesce((v_prof ->> 'sixtyPlus')::int, 0) + coalesce((v_stat ->> 'sixtyPlus')::int, 0),
    'hundredPlus',       coalesce((v_prof ->> 'hundredPlus')::int, 0) + coalesce((v_stat ->> 'hundredPlus')::int, 0),
    'oneFortyPlus',      coalesce((v_prof ->> 'oneFortyPlus')::int, 0) + coalesce((v_stat ->> 'oneFortyPlus')::int, 0),
    'oneEighty',         coalesce((v_prof ->> 'oneEighty')::int, 0) + coalesce((v_stat ->> 'oneEighty')::int, 0),
    'checkoutAttempts',  coalesce((v_prof ->> 'checkoutAttempts')::int, 0) + coalesce((v_stat ->> 'checkoutAttempts')::int, 0),
    'checkoutSuccesses', coalesce((v_prof ->> 'checkoutSuccesses')::int, 0) + coalesce((v_stat ->> 'checkoutSuccesses')::int, 0),
    'first9Pts',         coalesce((v_prof ->> 'first9Pts')::int, 0) + coalesce((v_stat ->> 'first9Pts')::int, 0),
    'first9Darts',       coalesce((v_prof ->> 'first9Darts')::int, 0) + coalesce((v_stat ->> 'first9Darts')::int, 0),
    'triplesHit',        coalesce((v_prof ->> 'triplesHit')::int, 0) + coalesce((v_stat ->> 'triplesHit')::int, 0),
    'highestCheckout',   greatest(coalesce((v_prof ->> 'highestCheckout')::int, 0), coalesce((v_stat ->> 'highestCheckout')::int, 0)),
    'lastSyncedAt',      to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  -- Fewer darts is a better leg, so this one is a minimum, not a maximum.
  if coalesce((v_stat ->> 'bestMatchLeg')::int, 0) > 0 then
    v_prof := v_prof || jsonb_build_object(
      'bestLegDarts',
      least(
        nullif(coalesce((v_prof ->> 'bestLegDarts')::int, 0), 0),
        (v_stat ->> 'bestMatchLeg')::int
      )
    );
  end if;

  if coalesce((v_stat ->> 'oneEighty')::int, 0) > 0
     and coalesce((v_prof ->> 'highestThrow')::int, 0) < 180 then
    v_prof := v_prof || jsonb_build_object('highestThrow', 180);
  end if;

  -- Merge the dartboard heat map segment by segment.
  v_seg := coalesce(v_prof -> 'segmentHits', '{}'::jsonb);
  for seg_key in select jsonb_object_keys(coalesce(v_stat -> 'segmentHits', '{}'::jsonb)) loop
    v_seg := v_seg || jsonb_build_object(
      seg_key,
      coalesce((v_seg ->> seg_key)::int, 0)
        + coalesce((v_stat -> 'segmentHits' ->> seg_key)::int, 0)
    );
  end loop;
  v_prof := v_prof || jsonb_build_object('segmentHits', v_seg);

  v_profiles := v_profiles || jsonb_build_object(
    'profiles', (v_profiles -> 'profiles') || jsonb_build_object(v_key, v_prof)
  );

  insert into public.documents (id, data, owner_id)
  values (v_profiles_id, v_profiles || jsonb_build_object('userId', p_guest_id::text, 'type', 'profiles'), p_guest_id)
  on conflict (id) do update set data = excluded.data;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Execution grants
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER functions are only safe if the anon role cannot call them.

revoke all on function public.redeem_sync_code(text, text) from public, anon;
revoke all on function public.guest_sync_status(uuid, text) from public, anon;
revoke all on function public.set_guest_live_match(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.sync_guest_match_result(uuid, text, jsonb, text, boolean) from public, anon;

grant execute on function public.redeem_sync_code(text, text) to authenticated;
grant execute on function public.guest_sync_status(uuid, text) to authenticated;
grant execute on function public.set_guest_live_match(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.sync_guest_match_result(uuid, text, jsonb, text, boolean) to authenticated;

commit;

-- ============================================================================
-- Rollback (paste separately if this migration causes trouble):
--
--   begin;
--   drop function if exists public.sync_guest_match_result(uuid, text, jsonb, text, boolean);
--   drop function if exists public.set_guest_live_match(uuid, text, text, text, boolean);
--   drop function if exists public.guest_sync_status(uuid, text);
--   drop function if exists public.redeem_sync_code(text, text);
--   drop policy if exists "documents_select_own" on public.documents;
--   drop policy if exists "documents_insert_own" on public.documents;
--   drop policy if exists "documents_update_own" on public.documents;
--   drop policy if exists "documents_delete_own" on public.documents;
--   -- Temporary catch-all so the app keeps working while you investigate:
--   create policy "documents_all_authenticated" on public.documents
--     for all to authenticated using (true) with check (true);
--   commit;
-- ============================================================================
