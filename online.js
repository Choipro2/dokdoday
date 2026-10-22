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
  try {
    await req('dokdo_players?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(body),
    });
  } catch (e) { console.warn('기록 올리기 실패', e); pending = pending || body; }
}
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

// 학생별 최고 기록만 남기기
export function bestPerPlayer(runs) {
  const best = new Map();
  for (const r of runs || []) {
    const k = r.player_id || r.nickname;
    if (!best.has(k) || best.get(k).ms > r.ms) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => a.ms - b.ms);
}
