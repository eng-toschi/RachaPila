-- Schema compartilhado do RachaPila (Fase 6 — spec §5.4, §10, §12).
--
-- Espelha as tabelas do SQLite do aparelho (src/db/migrations.ts), mais o que
-- só existe porque agora há mais de um dispositivo: quem pertence a qual
-- viagem (trip_members) e o convite (trip_invites).
--
-- Cole este arquivo inteiro no SQL Editor do Supabase (painel do projeto →
-- SQL Editor → New query). É seguro rodar de novo — tabela/índice/função
-- usam `if not exists`/`or replace`, e cada política tem um `drop policy if
-- exists` na frente (o Postgres não tem `create policy if not exists`; sem
-- o drop, rodar duas vezes esbarra em "policy already exists").
--
-- O que ESTE arquivo NÃO faz — de propósito, é a próxima etapa:
--   - Não grava nada quando uma despesa é criada no aparelho. Isso é o
--     trabalho de sincronização (push/pull do ops_outbox), que só dá para
--     escrever e testar depois que este schema existir de verdade.
--   - `fx_rates` do aparelho não tem tabela aqui: é cache de uma cotação
--     pública, sem dono — cada aparelho pode buscar de novo, não precisa
--     sincronizar. `ops_outbox`, `sync_state` e `device_state` também ficam
--     de fora: são a mecânica de transporte do PRÓPRIO aparelho, nunca saem
--     dele.
--   - Fotos de recibo (`attachments`) ficam para a Fase 7 (Storage) — a
--     coluna já existe no SQLite mas nada no app escreve nela ainda.

-- ---------------------------------------------------------------------------
-- Viagens e quem pode ver cada uma
-- ---------------------------------------------------------------------------

create table if not exists public.trips (
  id            uuid primary key,
  name          text not null,
  base_currency text not null,
  starts_on     date,
  ends_on       date,
  cover_color   text not null default '#6D4AFF',
  archived_at   timestamptz,
  deleted_at    timestamptz,
  lamport       bigint not null default 0,
  actor_id      text not null,
  updated_at    timestamptz not null default now(),
  server_seq    bigserial not null
);

-- Só as moedas escolhidas na abertura da viagem (espelha trip_currencies do
-- aparelho). Sincroniza junto com a viagem: o comando local grava as duas
-- coisas na mesma operação (`entity: 'trip'`, payload com `currencies`).
create table if not exists public.trip_currencies (
  trip_id  uuid not null references public.trips(id),
  code     text not null,
  position integer not null default 0,
  primary key (trip_id, code)
);

-- Quem enxerga a viagem. `role` existe desde já (spec §5.4) mas o app ainda
-- não distingue owner de editor — todo membro pode editar por enquanto.
create table if not exists public.trip_members (
  trip_id   uuid not null references public.trips(id),
  user_id   uuid not null references auth.users(id),
  role      text not null default 'editor' check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Participantes, despesas, partes, acertos — mesmas colunas do aparelho
-- ---------------------------------------------------------------------------

create table if not exists public.participants (
  id           uuid primary key,
  trip_id      uuid not null references public.trips(id),
  display_name text not null,
  user_id      uuid references auth.users(id),   -- NULL = fantasma
  avatar_seed  text not null,
  email        text,
  pix_key      text,
  pix_key_kind text,
  pix_name     text,
  pix_city     text,
  merged_into  uuid references public.participants(id),
  archived_at  timestamptz,
  deleted_at   timestamptz,
  lamport      bigint not null default 0,
  actor_id     text not null,
  updated_at   timestamptz not null default now(),
  server_seq   bigserial not null
);

-- Mesma regra do aparelho (migração 2): uma conta não pode estar vinculada a
-- dois participantes vivos da mesma viagem.
create unique index if not exists uq_participant_user
  on public.participants(trip_id, user_id)
  where user_id is not null and merged_into is null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- Convite (§7.2) — direcionado (aponta para um fantasma) ou genérico
--
-- Vem depois de `participants` de propósito: `participant_id` referencia essa
-- tabela, e o Postgres exige que ela já exista.
-- ---------------------------------------------------------------------------

create table if not exists public.trip_invites (
  token          text primary key,               -- 32 bytes aleatórios, gerado no app
  trip_id        uuid not null references public.trips(id),
  -- NULL = convite genérico (QR da mesa do restaurante): quem entra escolhe
  -- "quem é você?" entre os fantasmas ainda não vinculados (§7.2 regra 2).
  -- Preenchido = convite direcionado: aceitar vincula a ESTE participante e
  -- herda o histórico dele, sem criar ninguém novo (§7.2 regra 1).
  participant_id uuid references public.participants(id),
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '7 days'),
  max_uses       integer not null default 1,
  uses           integer not null default 0
);

create table if not exists public.expenses (
  id             uuid primary key,
  trip_id        uuid not null references public.trips(id),
  description    text not null,
  category       text not null default 'other',
  amount_cents   bigint not null check (amount_cents > 0),
  currency       text not null,
  fx_rate_ppm    bigint not null,
  fx_manual      boolean not null default false,
  fx_as_of       date,
  payment_method text not null default 'no_fx',
  iof_ppm        bigint not null default 0,
  spent_on       date not null,
  -- Instante COM FUSO, como texto — igual ao aparelho (migração 5). Não vira
  -- `timestamptz`: perderia o fuso em que a despesa aconteceu, que é
  -- justamente o que essa coluna existe para preservar (ver DECISIONS.md).
  spent_at       text,
  place_label    text,
  place_lat      double precision,
  place_lon      double precision,
  paid_by        uuid not null references public.participants(id),
  split_type     text not null check (split_type in ('equal', 'exact')),
  note           text,
  created_by     text not null,
  deleted_at     timestamptz,
  lamport        bigint not null default 0,
  actor_id       text not null,
  updated_at     timestamptz not null default now(),
  server_seq     bigserial not null
);

create table if not exists public.expense_shares (
  expense_id     uuid not null references public.expenses(id),
  participant_id uuid not null references public.participants(id),
  input_cents    bigint not null default 0,
  computed_cents bigint not null,
  position       integer not null default 0,
  primary key (expense_id, participant_id)
);

create table if not exists public.settlements (
  id           uuid primary key,
  trip_id      uuid not null references public.trips(id),
  from_id      uuid not null references public.participants(id),
  to_id        uuid not null references public.participants(id),
  amount_cents bigint not null check (amount_cents > 0),
  currency     text not null,
  fx_rate_ppm  bigint not null,
  settled_on   date not null,
  note         text,
  deleted_at   timestamptz,
  lamport      bigint not null default 0,
  actor_id     text not null,
  updated_at   timestamptz not null default now(),
  server_seq   bigserial not null,
  check (from_id <> to_id)
);

create table if not exists public.trip_subgroups (
  id              uuid primary key,
  trip_id         uuid not null references public.trips(id),
  label           text,
  participant_ids text not null,   -- mesmo formato do aparelho: JSON de ids, ordenado
  last_used_at    timestamptz not null default now()
);

create index if not exists idx_expenses_trip_date
  on public.expenses(trip_id, spent_on desc, spent_at desc) where deleted_at is null;
create index if not exists idx_shares_participant on public.expense_shares(participant_id);
create index if not exists idx_settlements_trip on public.settlements(trip_id) where deleted_at is null;
create index if not exists idx_participants_trip on public.participants(trip_id) where deleted_at is null;
create index if not exists idx_subgroups_trip on public.trip_subgroups(trip_id, last_used_at desc);

-- ---------------------------------------------------------------------------
-- RLS — nega por padrão, libera só para quem está em trip_members (§5.4, §12)
-- ---------------------------------------------------------------------------

-- Função helper para não repetir o mesmo EXISTS em toda política. `security
-- definer` porque a política de `trip_members` não pode depender de ler
-- `trip_members` para decidir se pode ler `trip_members` — viraria círculo.
create or replace function public.is_trip_member(check_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = check_trip_id and user_id = auth.uid()
  );
$$;

alter table public.trips            enable row level security;
alter table public.trip_currencies  enable row level security;
alter table public.trip_members     enable row level security;
alter table public.trip_invites     enable row level security;
alter table public.participants     enable row level security;
alter table public.expenses         enable row level security;
alter table public.expense_shares   enable row level security;
alter table public.settlements      enable row level security;
alter table public.trip_subgroups   enable row level security;

drop policy if exists "member reads trip" on public.trips;
create policy "member reads trip" on public.trips
  for select using (public.is_trip_member(id));
drop policy if exists "member writes trip" on public.trips;
create policy "member writes trip" on public.trips
  for all using (public.is_trip_member(id)) with check (public.is_trip_member(id));
-- Mesmo bootstrap de "become owner of an unowned trip" (mais abaixo), do
-- outro lado da mesma corrente: `trip_members.trip_id` referencia esta
-- tabela, então a viagem precisa existir aqui ANTES de alguém conseguir virar
-- dona dela — o app sempre chama `push_trip` primeiro, depois entra em
-- `trip_members`. Só vale enquanto a viagem não tem dono nenhum ainda.
drop policy if exists "found an unowned trip" on public.trips;
create policy "found an unowned trip" on public.trips
  for insert with check (not exists (select 1 from public.trip_members m where m.trip_id = id));

drop policy if exists "member reads trip_currencies" on public.trip_currencies;
create policy "member reads trip_currencies" on public.trip_currencies
  for select using (public.is_trip_member(trip_id));
drop policy if exists "member writes trip_currencies" on public.trip_currencies;
create policy "member writes trip_currencies" on public.trip_currencies
  for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
-- Mesmo bootstrap de "found an unowned trip": `push_trip` grava a viagem e as
-- moedas juntas, antes de o chamador virar dono em `trip_members` — só vale
-- enquanto a viagem ainda não tem dono.
drop policy if exists "seed currencies of an unowned trip" on public.trip_currencies;
create policy "seed currencies of an unowned trip" on public.trip_currencies
  for insert with check (
    not exists (select 1 from public.trip_members m where m.trip_id = trip_currencies.trip_id)
  );

drop policy if exists "member reads trip_members" on public.trip_members;
create policy "member reads trip_members" on public.trip_members
  for select using (public.is_trip_member(trip_id));
-- Entrar numa viagem QUE JÁ TEM DONO passa pela função de aceitar convite
-- (abaixo), que roda com privilégio de servidor e confere o token antes de
-- inserir a linha — ninguém se auto-adiciona a uma viagem alheia.
--
-- A exceção é fundar: a primeira sincronização de uma viagem criada só no
-- aparelho (Fase 3-5, sem conta nenhuma) precisa de alguém como dono antes
-- de as políticas de `trips`/`participants` (que exigem `is_trip_member`)
-- deixarem esse primeiro push acontecer. Esta política permite exatamente
-- isso — tornar-se dono — e só isso: só serve enquanto NINGUÉM é dono ainda,
-- então não dá para tomar posse de uma viagem que alguém já sincronizou.
drop policy if exists "become owner of an unowned trip" on public.trip_members;
create policy "become owner of an unowned trip" on public.trip_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and not exists (select 1 from public.trip_members m where m.trip_id = trip_members.trip_id)
  );

drop policy if exists "member reads trip_invites" on public.trip_invites;
create policy "member reads trip_invites" on public.trip_invites
  for select using (public.is_trip_member(trip_id));
drop policy if exists "member creates trip_invites" on public.trip_invites;
create policy "member creates trip_invites" on public.trip_invites
  for insert with check (public.is_trip_member(trip_id));

drop policy if exists "member reads participants" on public.participants;
create policy "member reads participants" on public.participants
  for select using (public.is_trip_member(trip_id));
drop policy if exists "member writes participants" on public.participants;
create policy "member writes participants" on public.participants
  for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

drop policy if exists "member reads expenses" on public.expenses;
create policy "member reads expenses" on public.expenses
  for select using (public.is_trip_member(trip_id));
drop policy if exists "member writes expenses" on public.expenses;
create policy "member writes expenses" on public.expenses
  for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

drop policy if exists "member reads expense_shares" on public.expense_shares;
create policy "member reads expense_shares" on public.expense_shares
  for select using (
    exists (select 1 from public.expenses e
            where e.id = expense_id and public.is_trip_member(e.trip_id))
  );
drop policy if exists "member writes expense_shares" on public.expense_shares;
create policy "member writes expense_shares" on public.expense_shares
  for all using (
    exists (select 1 from public.expenses e
            where e.id = expense_id and public.is_trip_member(e.trip_id))
  ) with check (
    exists (select 1 from public.expenses e
            where e.id = expense_id and public.is_trip_member(e.trip_id))
  );

drop policy if exists "member reads settlements" on public.settlements;
create policy "member reads settlements" on public.settlements
  for select using (public.is_trip_member(trip_id));
drop policy if exists "member writes settlements" on public.settlements;
create policy "member writes settlements" on public.settlements
  for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

drop policy if exists "member reads trip_subgroups" on public.trip_subgroups;
create policy "member reads trip_subgroups" on public.trip_subgroups
  for select using (public.is_trip_member(trip_id));
drop policy if exists "member writes trip_subgroups" on public.trip_subgroups;
create policy "member writes trip_subgroups" on public.trip_subgroups
  for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

-- ---------------------------------------------------------------------------
-- Aceitar convite (§7.2) — a ÚNICA porta de entrada em trip_members
-- ---------------------------------------------------------------------------

-- `security definer`: quem ainda não é membro não passaria pela RLS de
-- `trip_members`/`trip_invites` para se inserir sozinho — é por isso que
-- "ninguém escreve em trip_members direto" acima é uma regra de verdade, não
-- só um comentário. Confere token, validade e limite de usos antes de tudo.
create or replace function public.accept_trip_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.trip_invites;
begin
  select * into invite from public.trip_invites where token = invite_token for update;

  if invite is null then
    raise exception 'convite não encontrado' using errcode = 'P0002';
  end if;
  if invite.expires_at < now() then
    raise exception 'convite expirado' using errcode = 'P0001';
  end if;
  if invite.uses >= invite.max_uses then
    raise exception 'convite já usado' using errcode = 'P0001';
  end if;

  update public.trip_invites set uses = uses + 1 where token = invite_token;

  insert into public.trip_members (trip_id, user_id)
  values (invite.trip_id, auth.uid())
  on conflict (trip_id, user_id) do nothing;

  -- Convite direcionado: vincula ao fantasma e devolve o id dele, para o
  -- app saber "você é este participante" sem uma segunda pergunta.
  if invite.participant_id is not null then
    update public.participants
    set user_id = auth.uid()
    where id = invite.participant_id and user_id is null and merged_into is null;
  end if;

  return invite.trip_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Push (§10) — o aparelho manda o estado ATUAL de uma linha, nunca um diff
--
-- `security invoker` (padrão, sem cláusula): quem chama já precisa ser membro
-- da viagem para a política "member writes X" deixar a linha entrar — estas
-- funções não abrem exceção nenhuma de segurança, só concentram a resolução
-- de conflito (LWW por `(lamport, actor_id)`, §10) que um `.upsert()` comum
-- do cliente não sabe expressar.
--
-- Cada uma corresponde a exatamente um `entity` do `ops_outbox` do aparelho
-- (`src/sync/outbox.ts`). O app relê a linha inteira do SQLite local na hora
-- de empurrar — nunca reenvia o payload antigo gravado na operação — então
-- só existe uma forma de cada linha chegar aqui.
-- ---------------------------------------------------------------------------

-- `push_trip` NÃO usa `insert ... on conflict do update`: o Postgres exige as
-- políticas de RLS de INSERT *e* UPDATE juntas (com E) numa instrução dessas,
-- mesmo quando o conflito não acontece — o que quebraria exatamente o
-- bootstrap que "found an unowned trip" existe para viabilizar (o dono ainda
-- não é membro no instante do INSERT, então o `using` de UPDATE de
-- "member writes trip" reprovaria a linha nova). Por isso: tenta inserir,
-- e só cai para UPDATE (com o mesmo portão de LWW) se a linha já existir.
create or replace function public.push_trip(
  p_id uuid, p_name text, p_base_currency text, p_starts_on date, p_ends_on date,
  p_cover_color text, p_archived_at timestamptz, p_deleted_at timestamptz,
  p_lamport bigint, p_actor_id text, p_updated_at timestamptz,
  p_currencies text[]
) returns void language plpgsql set search_path = public as $$
declare
  applied int;
begin
  begin
    insert into public.trips
      (id, name, base_currency, starts_on, ends_on, cover_color, archived_at, deleted_at,
       lamport, actor_id, updated_at)
    values
      (p_id, p_name, p_base_currency, p_starts_on, p_ends_on, p_cover_color, p_archived_at, p_deleted_at,
       p_lamport, p_actor_id, p_updated_at);
    applied := 1;
  exception when unique_violation then
    update public.trips set
      name = p_name, base_currency = p_base_currency, starts_on = p_starts_on, ends_on = p_ends_on,
      cover_color = p_cover_color, archived_at = p_archived_at, deleted_at = p_deleted_at,
      lamport = p_lamport, actor_id = p_actor_id, updated_at = p_updated_at
    where id = p_id and (p_lamport, p_actor_id) > (public.trips.lamport, public.trips.actor_id);
    get diagnostics applied = row_count;
  end;

  if applied > 0 then
    delete from public.trip_currencies where trip_id = p_id;
    insert into public.trip_currencies (trip_id, code, position)
    select p_id, code, ord - 1 from unnest(p_currencies) with ordinality as t(code, ord);
  end if;
end;
$$;

create or replace function public.push_participant(
  p_id uuid, p_trip_id uuid, p_display_name text, p_user_id uuid, p_avatar_seed text,
  p_email text, p_pix_key text, p_pix_key_kind text, p_pix_name text, p_pix_city text,
  p_merged_into uuid, p_archived_at timestamptz, p_deleted_at timestamptz,
  p_lamport bigint, p_actor_id text, p_updated_at timestamptz
) returns void language plpgsql set search_path = public as $$
begin
  insert into public.participants
    (id, trip_id, display_name, user_id, avatar_seed, email, pix_key, pix_key_kind, pix_name,
     pix_city, merged_into, archived_at, deleted_at, lamport, actor_id, updated_at)
  values
    (p_id, p_trip_id, p_display_name, p_user_id, p_avatar_seed, p_email, p_pix_key, p_pix_key_kind,
     p_pix_name, p_pix_city, p_merged_into, p_archived_at, p_deleted_at, p_lamport, p_actor_id, p_updated_at)
  on conflict (id) do update set
    display_name = excluded.display_name, user_id = excluded.user_id, avatar_seed = excluded.avatar_seed,
    email = excluded.email, pix_key = excluded.pix_key, pix_key_kind = excluded.pix_key_kind,
    pix_name = excluded.pix_name, pix_city = excluded.pix_city, merged_into = excluded.merged_into,
    archived_at = excluded.archived_at, deleted_at = excluded.deleted_at, lamport = excluded.lamport,
    actor_id = excluded.actor_id, updated_at = excluded.updated_at
  where (excluded.lamport, excluded.actor_id) > (public.participants.lamport, public.participants.actor_id);
end;
$$;

create or replace function public.push_expense(
  p_id uuid, p_trip_id uuid, p_description text, p_category text, p_amount_cents bigint,
  p_currency text, p_fx_rate_ppm bigint, p_fx_manual boolean, p_fx_as_of date,
  p_payment_method text, p_iof_ppm bigint, p_spent_on date, p_spent_at text,
  p_place_label text, p_place_lat double precision, p_place_lon double precision,
  p_paid_by uuid, p_split_type text, p_note text, p_created_by text,
  p_deleted_at timestamptz, p_lamport bigint, p_actor_id text, p_updated_at timestamptz,
  -- Array de objetos {participant_id, input_cents, computed_cents, position} —
  -- as partes são substituídas em bloco junto com a despesa-mãe (§10), nunca
  -- mescladas linha a linha.
  p_shares jsonb
) returns void language plpgsql set search_path = public as $$
declare
  applied int;
begin
  insert into public.expenses
    (id, trip_id, description, category, amount_cents, currency, fx_rate_ppm, fx_manual, fx_as_of,
     payment_method, iof_ppm, spent_on, spent_at, place_label, place_lat, place_lon, paid_by,
     split_type, note, created_by, deleted_at, lamport, actor_id, updated_at)
  values
    (p_id, p_trip_id, p_description, p_category, p_amount_cents, p_currency, p_fx_rate_ppm, p_fx_manual,
     p_fx_as_of, p_payment_method, p_iof_ppm, p_spent_on, p_spent_at, p_place_label, p_place_lat,
     p_place_lon, p_paid_by, p_split_type, p_note, p_created_by, p_deleted_at, p_lamport, p_actor_id,
     p_updated_at)
  on conflict (id) do update set
    description = excluded.description, category = excluded.category, amount_cents = excluded.amount_cents,
    currency = excluded.currency, fx_rate_ppm = excluded.fx_rate_ppm, fx_manual = excluded.fx_manual,
    fx_as_of = excluded.fx_as_of, payment_method = excluded.payment_method, iof_ppm = excluded.iof_ppm,
    spent_on = excluded.spent_on, spent_at = excluded.spent_at, place_label = excluded.place_label,
    place_lat = excluded.place_lat, place_lon = excluded.place_lon, paid_by = excluded.paid_by,
    split_type = excluded.split_type, note = excluded.note, deleted_at = excluded.deleted_at,
    lamport = excluded.lamport, actor_id = excluded.actor_id, updated_at = excluded.updated_at
  where (excluded.lamport, excluded.actor_id) > (public.expenses.lamport, public.expenses.actor_id);

  get diagnostics applied = row_count;
  if applied > 0 then
    delete from public.expense_shares where expense_id = p_id;
    insert into public.expense_shares (expense_id, participant_id, input_cents, computed_cents, position)
    select
      p_id,
      (s->>'participant_id')::uuid,
      (s->>'input_cents')::bigint,
      (s->>'computed_cents')::bigint,
      (s->>'position')::integer
    from jsonb_array_elements(p_shares) as s;
  end if;
end;
$$;

create or replace function public.push_settlement(
  p_id uuid, p_trip_id uuid, p_from_id uuid, p_to_id uuid, p_amount_cents bigint,
  p_currency text, p_fx_rate_ppm bigint, p_settled_on date, p_note text,
  p_deleted_at timestamptz, p_lamport bigint, p_actor_id text, p_updated_at timestamptz
) returns void language plpgsql set search_path = public as $$
begin
  insert into public.settlements
    (id, trip_id, from_id, to_id, amount_cents, currency, fx_rate_ppm, settled_on, note,
     deleted_at, lamport, actor_id, updated_at)
  values
    (p_id, p_trip_id, p_from_id, p_to_id, p_amount_cents, p_currency, p_fx_rate_ppm, p_settled_on, p_note,
     p_deleted_at, p_lamport, p_actor_id, p_updated_at)
  on conflict (id) do update set
    from_id = excluded.from_id, to_id = excluded.to_id, amount_cents = excluded.amount_cents,
    currency = excluded.currency, fx_rate_ppm = excluded.fx_rate_ppm, settled_on = excluded.settled_on,
    note = excluded.note, deleted_at = excluded.deleted_at, lamport = excluded.lamport,
    actor_id = excluded.actor_id, updated_at = excluded.updated_at
  where (excluded.lamport, excluded.actor_id) > (public.settlements.lamport, public.settlements.actor_id);
end;
$$;
