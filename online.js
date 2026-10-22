// =============================================================
//  우리 반 온라인 기록 (Supabase REST)
// =============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY, CLASS_CODE } from './config.js';

export const online = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

function headers(extra = {}) {
  const h = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...extra };
  // 예전 anon 키(eyJ…)일 때만 Authorization 을 함께 보내요. 새 publishable 키(sb_publishable_…)는 apikey 만으로 돼요.
  if (SUPABASE_ANON_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  return h;
}
const base = () => `${SUPABASE_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')}/rest/v1`;

async function req(path, opt = {}) {
  const r = await fetch(`${base()}/${path}`, { ...opt, headers: headers(opt.headers) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => '')}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// 학생 진행 상황 올리기 (기기 하나 = 학생 한 명)
let pending = null, timer = null;
export function syncProgress(row) {
  if (!online || !row || !row.id) return;
  pending = { ...row, class_code: CLASS_CODE, updated_at: new Date().toISOString() };
  clearTimeout(timer);
  timer = setTimeout(flush, 1200);
}
async function flush() {
  if (!pending) return;
  const body = pending; pending = null;
  const send = (b) => req('dokdo_players?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(b),
  });
  try {
    if (noStarsCol) { const { stars, ...rest } = body; await send(rest); }
    else await send(body);
  } catch (e) {
    // 업그레이드 SQL을 아직 실행하지 않아 stars 칸이 없으면 별 없이 다시 보내요
    if (!noStarsCol && /stars/.test(String(e))) {
      noStarsCol = true;
      try { const { stars, ...rest } = body; await send(rest); return; } catch (e2) { /* 아래로 */ }
    }
    console.warn('기록 올리기 실패', e); pending = pending || body;
  }
}
let noStarsCol = false;
addEventListener('pagehide', () => { if (pending) flush(); });

// 자유 탐험 기록 올리기
export async function addFreeRun(run) {
  if (!online) return false;
  try {
    await req('dokdo_free_runs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...run, class_code: CLASS_CODE }),
    });
    return true;
  } catch (e) { console.warn('랭킹 올리기 실패', e); return false; }
}

// 반 전체 학생 진행 상황
export async function fetchPlayers() {
  if (!online) return null;
  return req(`dokdo_players?class_code=eq.${encodeURIComponent(CLASS_CODE)}&select=*&order=number.asc`);
}

// 반 전체 자유 탐험 기록
export async function fetchFreeRuns() {
  if (!online) return null;
  return req(`dokdo_free_runs?class_code=eq.${encodeURIComponent(CLASS_CODE)}&select=*&order=ms.asc&limit=300`);
}

// 랭킹판: 자유 탐험 기록 + 학생별 최고 기록(best_free_ms)을 합쳐서 보여 줘요
// (기록 올리기가 한 번 실패해도 학생 진행 정보에 남은 최고 기록으로 채워져요)
export async function fetchFreeBoard() {
  if (!online) return null;
  const [runs, players] = await Promise.all([fetchFreeRuns(), fetchPlayers()]);
  const list = [...(runs || [])];
  for (const p of players || []) if (p.best_free_ms) list.push({ player_id: p.id, number: p.number, nickname: p.nickname, ms: p.best_free_ms });
  return bestPerPlayer(list);
}

// 학생별 최고 기록만 남기기
export function bestPerPlayer(runs) {
  const best = new Map();
  for (const r of runs || []) {
    const k = r.player_id || r.nickname;
    if (!best.has(k) || best.get(k).ms > r.ms) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => a.ms - b.ms);
}

// =============================================================
//  우리 반 협동 목표
// =============================================================
// 같은 번호로 여러 기기 기록이 있으면 가장 많이 한 기록을 써요
export function mergeByNumber(list) {
  const by = new Map();
  const score = (x) => (x.done ? 1000 : 0) + (x.chapter || 0) * 100 + (x.cards || 0) + (x.dex || 0);
  for (const p of list || []) {
    if (p.number == null) continue;
    const cur = by.get(p.number);
    if (!cur) { by.set(p.number, { ...p }); continue; }
    const best = score(p) > score(cur) ? { ...p } : { ...cur };
    best.updated_at = new Date(p.updated_at) > new Date(cur.updated_at) ? p.updated_at : cur.updated_at;
    best.stars = Math.max(p.stars || 0, cur.stars || 0);
    const bf = [p.best_free_ms, cur.best_free_ms].filter(Boolean);
    best.best_free_ms = bf.length ? Math.min(...bf) : null;
    by.set(p.number, best);
  }
  return by;
}
export async function fetchClassProgress() {
  if (!online) return null;
  const by = mergeByNumber(await fetchPlayers());
  const rows = [...by.values()];
  return {
    players: rows.length,
    cards: rows.reduce((s, p) => s + (p.cards || 0), 0),
    stars: rows.reduce((s, p) => s + (p.stars || 0), 0),
    done: rows.filter(p => p.done).length,
  };
}

// =============================================================
//  실시간 퀴즈 대결
// =============================================================
export async function getQuiz() {
  if (!online) return null;
  const r = await req(`dokdo_quiz?class_code=eq.${encodeURIComponent(CLASS_CODE)}&select=*`);
  return r && r[0] ? r[0] : null;
}
export async function setQuiz(fields) {
  return req('dokdo_quiz?on_conflict=class_code', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ class_code: CLASS_CODE, ...fields, updated_at: new Date().toISOString() }),
  });
}
export async function sendAnswer(a) {
  return req('dokdo_quiz_answers', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ class_code: CLASS_CODE, ...a }),
  });
}
export async function getAnswers(session) {
  return req(`dokdo_quiz_answers?class_code=eq.${encodeURIComponent(CLASS_CODE)}&session=eq.${encodeURIComponent(session)}&select=*&order=created_at.asc`);
}
// 점수: 맞히면 500~1000점 (빨리 맞힐수록 높아요)
export function answerPoints(a, correctIdx) {
  if (a.choice !== correctIdx) return 0;
  const ms = Math.max(0, Math.min(20000, a.ms ?? 20000));
  return Math.round(1000 - ms / 40);
}
export function quizScores(answers, qs, bank, uptoIndex = Infinity) {
  const by = new Map();
  for (const a of answers || []) {
    if (a.q_index < 0) {
      if (!by.has(a.player_id)) by.set(a.player_id, { player_id: a.player_id, number: a.number, nickname: a.nickname, score: 0, right: 0 });
      continue;
    }
    if (a.q_index > uptoIndex) continue;
    const q = bank[qs[a.q_index]];
    if (!q) continue;
    const row = by.get(a.player_id) || { player_id: a.player_id, number: a.number, nickname: a.nickname, score: 0, right: 0 };
    const pts = answerPoints(a, q.a);
    row.score += pts; if (pts) row.right++;
    by.set(a.player_id, row);
  }
  return [...by.values()].sort((x, y) => y.score - x.score || x.number - y.number);
}
