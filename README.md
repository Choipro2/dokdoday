# Dokdoday · 강치와 독도

10월 25일 독도의 날 수업용 웹 게임입니다. 강치 가족과 함께 독도의 지리·역사·생태를 탐험해요.
빌드 과정이 없는 정적 웹페이지(HTML·CSS·JS)라서 그대로 Vercel에 올리면 됩니다.

## 구성

| 메뉴 | 내용 |
|---|---|
| 게임 시작 | 프롤로그(1901) → 1장 두 섬, 하나의 집 → 2장 해조숲 → 3장 먼바다 → 4장 가족의 물길 → 에필로그 → 수료증 |
| 이어 하기 | 마지막으로 하던 장부터 다시 시작 (브라우저에 자동 저장) |
| 랭킹 보기 | 자유 탐험 기록, 명예의 전당(수료증) — 이 컴퓨터에 저장 |
| 자유 탐험 | 성장 타임어택: 아기 강이 → 대장 강이, 약 10분 |
| 독도가 궁금해요 | 학습 자료 12쪽 |
| 기록책 | 낱말 엽서 20장 · 바다 친구 도감 20종 · 나의 수료증 |

조작: `WASD`/방향키 이동 · `Shift` 돌진 · `E` 관찰 · `F` 바위 오르내리기 · `Esc` 일시정지. 터치 기기에서는 화면 조이스틱이 나타납니다.

## Vercel 배포

### 방법 1. GitHub 저장소로 (추천)
1. GitHub에서 새 저장소(예: `dokdoday`)를 만들고 이 폴더의 파일을 모두 올립니다. (`index.html`이 저장소 맨 위에 있어야 해요)
2. vercel.com → **Add New… → Project** → 방금 만든 저장소 **Import**
3. Framework Preset은 **Other**, Build Command·Output Directory는 비워 두고 **Deploy**

### 방법 2. Vercel CLI
```bash
npm i -g vercel
cd dokdoday
vercel --prod
```

## 우리 반 기록 모으기 (Supabase)
학생들 기록을 선생님 현황판(`/class.html`) 한 화면에서 보려면:
1. Supabase 프로젝트를 엽니다. (북트리 프로젝트를 그대로 써도 돼요. 새 테이블만 추가돼요)
2. **SQL Editor**에 `supabase.sql` 내용을 붙여 넣고 **Run**
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 `config.js`에 붙여 넣기
4. 필요하면 `CLASS_NAME`(예: '4학년 1반'), `TEACHER_PIN`(현황판 비밀번호, 기본 1025)도 바꾸기
5. GitHub에 다시 올리면 Vercel이 자동으로 새로 배포해요

- 학생은 처음 시작할 때 **출석번호 + 별명**을 골라요. 이후 진행(장·엽서·도감·수료·자유 탐험 기록)이 자동으로 올라가요.
- 선생님은 `배포주소/class.html` 을 열고 비밀번호를 넣으면 28명 전체 현황과 자유 탐험 랭킹이 20초마다 새로고침돼요.
- `config.js`를 비워 두면 예전처럼 각 컴퓨터에만 저장돼요.

## 파일
- `index.html` — 화면 구조
- `style.css` — 디자인
- `data.js` — 이야기·엽서·도감·퀴즈·학습 자료 (내용 수정은 여기서)
- `game.js` — 바다 세계와 게임 규칙
- `art.js` — 캐릭터·생물·배경 그림 (모두 코드로 그림)
- `audio.js` — 음악·파도·효과음 (파일 없이 생성)
- `main.js` — 화면 흐름·저장·수료증·랭킹
- `config.js` — 우리 반 설정 (Supabase 주소·키, 반 이름, 출석번호, 현황판 비밀번호)
- `online.js` — 반 기록 올리기·불러오기
- `class.html` — 선생님 현황판
- `supabase.sql` — 기록용 테이블 만들기

## 참고
- 진행 기록은 각 컴퓨터 브라우저에도 저장되고, Supabase를 연결하면 반 전체 기록이 함께 모여요.
- 강치 가족 이야기는 창작이며, 역사·지리 내용은 외교부 독도 누리집, 동북아역사재단, KIOST 자료를 바탕으로 정리했습니다.

## 업그레이드 (별점 · 꾸미기 · 협동 목표 · 퀴즈 대결)
- Supabase SQL Editor에서 `supabase-upgrade.sql`을 한 번 실행하세요.
- **별점**: 장마다 ★1 끝까지 탐험 · ★2 다친 횟수 3번 이하(쓰러지지 않기) · ★3 퀴즈 첫 번에 모두 맞히기. 처음 화면 ‘장 고르기’에서 다시 도전해요.
- **강치 꾸미기**: 별·수료·자유 탐험 기록·우리 반 목표로 아이템 10가지가 열려요.
- **우리 반 협동 목표**: 반 전체 낱말 엽서 150 · 300 · 480장마다 모두에게 아이템이 열려요.
- **퀴즈 대결**: 선생님은 `quiz.html`(현황판 비밀번호)에서 대결을 열고, 학생은 게임 화면 위 노란 알림을 눌러 참여해요.

## 여러 반에서 함께 쓰기
주소 뒤에 반 번호만 붙이면 반마다 따로 기록이 모여요. 반 목록·번호·비밀번호는 `config.js`의 `CLASSES`, 주소 연결은 `vercel.json`에 있어요.

| 반 | 학생 링크 | 선생님 현황판 | 퀴즈 대결 | 비밀번호 |
|---|---|---|---|---|
| 4학년 1반 | dokdoday.vercel.app/41 | dokdoday.vercel.app/41/class | dokdoday.vercel.app/41/quiz | 7351 |
| 4학년 2반 | dokdoday.vercel.app/42 | dokdoday.vercel.app/42/class | dokdoday.vercel.app/42/quiz | 1025 |
| 4학년 3반 | dokdoday.vercel.app/43 | dokdoday.vercel.app/43/class | dokdoday.vercel.app/43/quiz | 2968 |
| 4학년 4반 | dokdoday.vercel.app/44 | dokdoday.vercel.app/44/class | dokdoday.vercel.app/44/quiz | 5847 |

- 링크로 한 번 들어온 기기는 반을 기억해요. 링크 없이 처음 들어온 기기는 탐험가 등록 때 반을 골라요.
