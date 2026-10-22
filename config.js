// =============================================================
//  우리 반 설정 — 이 파일만 고치면 돼요
// =============================================================

// Supabase 프로젝트 주소와 anon(public) 키
// (Supabase → Project Settings → API 에서 복사. 북트리 프로젝트를 그대로 써도 돼요)
// 비워 두면 기록은 각 컴퓨터에만 저장돼요.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// 우리 반 이름 (기록을 묶는 이름표 · 다른 반과 겹치지 않게)
export const CLASS_CODE = 'dongsung-our-class';
export const CLASS_NAME = '우리 반';

// 우리 반 출석번호 (학생 등록 화면과 선생님 현황판에 쓰여요)
export const CLASS_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 53,
];

// 선생님 현황판(class.html) 비밀번호 — 학생들이 우연히 열지 않도록 하는 간단한 잠금이에요
export const TEACHER_PIN = '1025';
