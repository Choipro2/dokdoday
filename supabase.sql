-- =============================================================
--  Dokdoday 우리 반 기록용 테이블
--  Supabase → SQL Editor 에 통째로 붙여 넣고 Run 하세요.
--  (북트리와 같은 프로젝트에 만들어도 기존 테이블에는 영향이 없어요)
-- =============================================================

-- 학생별 진행 상황 (기기 하나 = 학생 한 명)
create table if not exists public.dokdo_players (
  id            text primary key,          -- 기기마다 만든 무작위 번호
  class_code    text not null,
  number        int,                       -- 출석번호
  nickname      text not null,
  chapter       int  default 0,            -- 0 프롤로그 · 1~4장 · 5 수료
  cards         int  default 0,            -- 낱말 엽서 수 (20)
  dex           int  default 0,            -- 바다 친구 도감 수 (20)
  done          boolean default false,     -- 수료 여부
  cert_design   text,
  best_free_ms  int,                       -- 자유 탐험 최고 기록 (밀리초)
  updated_at    timestamptz default now()
);
create index if not exists dokdo_players_class on public.dokdo_players (class_code);

-- 자유 탐험 기록
create table if not exists public.dokdo_free_runs (
  id          bigint generated always as identity primary key,
  class_code  text not null,
  player_id   text,
  number      int,
  nickname    text not null,
  ms          int  not null check (ms > 0),
  created_at  timestamptz default now()
);
create index if not exists dokdo_free_runs_class on public.dokdo_free_runs (class_code, ms);

-- 누구나(학생 기기) 읽고 쓸 수 있게 — 이름 대신 별명만 저장해요
alter table public.dokdo_players  enable row level security;
alter table public.dokdo_free_runs enable row level security;

drop policy if exists "dokdo players read"   on public.dokdo_players;
drop policy if exists "dokdo players insert" on public.dokdo_players;
drop policy if exists "dokdo players update" on public.dokdo_players;
drop policy if exists "dokdo runs read"      on public.dokdo_free_runs;
drop policy if exists "dokdo runs insert"    on public.dokdo_free_runs;

create policy "dokdo players read"   on public.dokdo_players  for select using (true);
create policy "dokdo players insert" on public.dokdo_players  for insert with check (char_length(nickname) <= 12);
create policy "dokdo players update" on public.dokdo_players  for update using (true) with check (char_length(nickname) <= 12);
create policy "dokdo runs read"      on public.dokdo_free_runs for select using (true);
create policy "dokdo runs insert"    on public.dokdo_free_runs for insert with check (char_length(nickname) <= 12 and ms > 5000);
