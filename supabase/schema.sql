-- Evolve : schéma Supabase pour la sauvegarde / synchro entre appareils.
-- À exécuter une fois dans Supabase > SQL Editor.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Chaque utilisateur ne voit et ne modifie que sa propre ligne.
alter table public.user_state enable row level security;

drop policy if exists "lecture de ses données" on public.user_state;
create policy "lecture de ses données" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "création de ses données" on public.user_state;
create policy "création de ses données" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "mise à jour de ses données" on public.user_state;
create policy "mise à jour de ses données" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "suppression de ses données" on public.user_state;
create policy "suppression de ses données" on public.user_state
  for delete using (auth.uid() = user_id);
