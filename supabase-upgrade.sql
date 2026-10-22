-- =============================================================
--  Dokdoday 업그레이드 (별점 · 협동 목표 · 실시간 퀴즈 대결)
--  Supabase → SQL Editor 에 통째로 붙여 넣고 Run 하세요. 여러 번 실행해도 괜찮아요.
-- =============================================================

-- 1) 학생 별점 합계
alter table public.dokdo_players add column if not exists stars int default 0;

-- 2) 퀴즈 대결 진행 상태 (반마다 한 줄)
create table if not exists public.dokdo_quiz (
  class_code    text primary key,
  session       text,
  status        text default 'idle',      -- idle · lobby · question · reveal · end
  q_index       int  default -1,
  qs            jsonb default '[]'::jsonb, -- 이번 대결에 낼 문제 번호 순서
  q_started_at  timestamptz,
  updated_at    timestamptz default now()
);

-- 문제가 열리는 순간의 시간을 서버 시계로 기록해요
create or replace function public.dokdo_quiz_touch() returns trigger language plpgsql as $$
begin
  if new.status = 'question' and (tg_op = 'INSERT' or old.status is distinct from 'question' or old.q_index is distinct from new.q_index) then
    new.q_started_at := now();
  end if;
  return new;
end $$;
drop trigger if exists dokdo_quiz_touch on public.dokdo_quiz;
create trigger dokdo_quiz_touch before insert or update on public.dokdo_quiz
  for each row execute function public.dokdo_quiz_touch();

-- 3) 학생 답 (q_index = -1 은 참가 신청)
create table if not exists public.dokdo_quiz_answers (
  id          bigint generated always as identity primary key,
  class_code  text not null,
  session     text not null,
  q_index     int  not null,
  player_id   text not null,
  number      int,
  nickname    text,
  choice      int,
  ms          int,
  created_at  timestamptz default now(),
  unique (session, q_index, player_id)
);
create index if not exists dokdo_quiz_answers_session on public.dokdo_quiz_answers (class_code, session);

-- 답이 들어오는 순간 서버에서 걸린 시간(ms)을 재고, 열린 문제에만 답하게 해요
create or replace function public.dokdo_answer_check() returns trigger language plpgsql security definer as $$
declare st record;
begin
  select * into st from public.dokdo_quiz where class_code = new.class_code;
  if st is null or st.session is distinct from new.session then
    raise exception 'quiz closed';
  end if;
  if new.q_index = -1 then
    if st.status = 'idle' then raise exception 'quiz closed'; end if;
    new.ms := null;
  else
    if st.status <> 'question' or st.q_index <> new.q_index then raise exception 'question closed'; end if;
    new.ms := (extract(epoch from (now() - st.q_started_at)) * 1000)::int;
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists dokdo_answer_check on public.dokdo_quiz_answers;
create trigger dokdo_answer_check before insert on public.dokdo_quiz_answers
  for each row execute function public.dokdo_answer_check();

alter table public.dokdo_quiz enable row level security;
alter table public.dokdo_quiz_answers enable row level security;

drop policy if exists "dokdo quiz read"    on public.dokdo_quiz;
drop policy if exists "dokdo quiz insert"  on public.dokdo_quiz;
drop policy if exists "dokdo quiz update"  on public.dokdo_quiz;
drop policy if exists "dokdo answers read" on public.dokdo_quiz_answers;
drop policy if exists "dokdo answers insert" on public.dokdo_quiz_answers;

create policy "dokdo quiz read"    on public.dokdo_quiz for select using (true);
create policy "dokdo quiz insert"  on public.dokdo_quiz for insert with check (true);
create policy "dokdo quiz update"  on public.dokdo_quiz for update using (true) with check (true);
create policy "dokdo answers read"   on public.dokdo_quiz_answers for select using (true);
create policy "dokdo answers insert" on public.dokdo_quiz_answers for insert with check (char_length(coalesce(nickname, '')) <= 12);
