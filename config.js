// =============================================================
//  반 설정 — 이 파일만 고치면 돼요
// =============================================================

// Supabase 프로젝트 주소와 publishable(anon) 키
// 비워 두면 기록은 각 컴퓨터에만 저장돼요.
export const SUPABASE_URL = 'https://gkvpdrindcowubudzdku.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_JkJ3soFv3kwrmX5vgzvu_w_OYnHWa-g';

// 반 목록 — dokdoday.vercel.app/41 처럼 반 번호를 붙이면 그 반으로 들어가요
//   key  : 주소에 쓰는 이름
//   code : 기록을 묶는 이름표 (한 번 정하면 바꾸지 마세요 — 바꾸면 기록이 따로 모여요)
//   pin  : 선생님 현황판·퀴즈 대결 비밀번호
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const CLASSES = [
  { key: '4-1', code: 'dongsung-4-1', name: '4학년 1반', numbers: range(1, 30), pin: '1025' },
  { key: '4-2', code: 'dongsung-our-class', name: '4학년 2반', numbers: [...range(1, 16), ...range(41, 51), 53], pin: '1025' },
  { key: '4-3', code: 'dongsung-4-3', name: '4학년 3반', numbers: range(1, 30), pin: '1025' },
  { key: '4-4', code: 'dongsung-4-4', name: '4학년 4반', numbers: range(1, 30), pin: '1025' },
];
const DEFAULT_KEY = '4-2';

// 우리 학교 마스코트 이름 (이야기 안내자·변신 아이템 이름에 쓰여요)
export const MASCOT_NAME = '파동';

// ---------- 지금 어느 반인지 정하기 ----------
// 1) 주소의 /41  2) 이 컴퓨터가 기억한 반  3) 예전부터 쓰던 기기(4학년 2반)  4) 처음 온 기기 → 등록 때 반 고르기
const CLASS_KEY_STORE = 'dokdoday-class-key';
function readParam() {
  try {
    // 1) 주소 경로: /41 · /41/class · /41/quiz
    const seg = location.pathname.split('/').filter(Boolean)[0] || '';
    const byPath = CLASSES.find(c => c.key.replace('-', '') === seg);
    if (byPath) return byPath.key;
    // 2) 예전 방식: ?반=4-1
    const q = new URLSearchParams(location.search);
    return q.get('반') || q.get('class') || q.get('ban');
  } catch (e) { return null; }
}
function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* 저장 불가 */ } }
function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

let key = readParam();
let source = 'url';
if (!CLASSES.find(c => c.key === key)) {
  key = read(CLASS_KEY_STORE);
  source = 'saved';
  if (!CLASSES.find(c => c.key === key)) {
    // 반을 기억하지 못하지만 이미 탐험가로 등록한 기기는 4학년 2반이에요
    key = DEFAULT_KEY;
    source = read('dokdoday-profile-v1') ? 'legacy' : 'unknown';
  }
}
if (source === 'url') store(CLASS_KEY_STORE, key);

const CUR = CLASSES.find(c => c.key === key);
export const CLASS_KEY = CUR.key;
export const CLASS_CODE = CUR.code;
export const CLASS_NAME = CUR.name;
export const CLASS_NUMBERS = CUR.numbers;
export const TEACHER_PIN = CUR.pin;
export const CLASS_KNOWN = source !== 'unknown';   // false 면 등록할 때 반을 골라요
export function chooseClass(k) { store(CLASS_KEY_STORE, k); }
// 반 주소: /41 (게임) · /41/class (현황판) · /41/quiz (퀴즈 대결)
export const CLASS_PATH = `/${CUR.key.replace('-', '')}`;
export function classPath(k) { return `/${k.replace('-', '')}`; }
