// =============================================================
//  강치와 독도 · 화면 흐름 (메뉴 · 이야기 · 모달 · 저장)
// =============================================================
import { STAGES, CREATURES, CREATURE, POSTCARDS, POSTCARD, CHAPTERS, QUIZZES, STORY, SPEAKERS, GUIDE, CERT_DESIGNS, FREE_LEVELS } from './data.js';
import * as A from './art.js';
import * as Snd from './audio.js';
import { World, storyConfig, freeConfig } from './game.js';
import * as Net from './online.js';
import { CLASS_NAME, CLASS_NUMBERS } from './config.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SAVE_KEY = 'dokdoday-save-v1';
const RANK_KEY = 'dokdoday-ranking-v1';
const HALL_KEY = 'dokdoday-hall-v1';
const VOL_KEY = 'dokdoday-volume-v1';

// ---------- 저장 ----------
function loadJSON(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } }
function freshSave() { return { chapter: 1, started: false, cards: [], dex: {}, done: false, tutorialDone: false, cert: null }; }
let save = Object.assign(freshSave(), loadJSON(SAVE_KEY, {}));
function persist() { saveJSON(SAVE_KEY, save); syncNow(); }

// ---------- 우리 반 탐험가 (기기마다 한 명) ----------
const PROFILE_KEY = 'dokdoday-profile-v1';
let profile = loadJSON(PROFILE_KEY, null);
function newId() { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)); }
function syncNow() {
  if (!profile) return;
  Net.syncProgress({
    id: profile.id, number: profile.number, nickname: profile.nickname,
    chapter: save.done ? 5 : (save.started ? save.chapter : 0),
    cards: save.cards.length, dex: Object.keys(save.dex).length, done: !!save.done,
    cert_design: (save.cert && save.cert.public !== false) ? save.cert.design : null, best_free_ms: profile.best || null,
  });
}
function profileLabel() { return profile ? `${profile.number}번 ${profile.nickname}` : ''; }
function ensureProfile(next, force = false) {
  if (profile && !force) return next();
  const used = profile?.number;
  openModal(`<div class="eyebrow">${CLASS_NAME} 독도 탐험가 등록</div><h2>나는 누구일까요?</h2>
    <p class="muted">번호와 별명을 정하면 선생님 화면에 우리 반 기록이 함께 모여요. 실명 대신 별명을 써요.</p>
    <div class="field">출석번호<div class="nums">${CLASS_NUMBERS.map(n => `<button data-n="${n}" class="${n === used ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <label class="field">별명 (12글자까지)<input id="pNick" maxlength="12" value="${profile ? esc(profile.nickname) : ''}" placeholder="예: 바다탐험가"></label>
    <p class="muted" id="pMsg"></p>
    <div class="modal-actions"><button class="pill dark big" id="pOk">탐험가 등록</button></div>`, { cls: 'narrow' });
  let num = used || null;
  $$('.nums button', modalBox).forEach(b => b.addEventListener('click', () => { num = +b.dataset.n; $$('.nums button', modalBox).forEach(x => x.classList.toggle('on', x === b)); }));
  $('#pOk').addEventListener('click', () => {
    const nick = $('#pNick').value.trim();
    if (!num) { $('#pMsg').textContent = '출석번호를 골라 주세요.'; return; }
    if (!nick) { $('#pMsg').textContent = '별명을 적어 주세요.'; return; }
    const changedPerson = profile && profile.number !== num;
    profile = { id: changedPerson || !profile ? newId() : profile.id, number: num, nickname: nick, best: changedPerson ? null : profile?.best || null };
    saveJSON(PROFILE_KEY, profile);
    if (changedPerson) { save = freshSave(); saveJSON(SAVE_KEY, save); }
    syncNow();
    refreshTitle();
    closeModal();
    next();
  });
}
Snd.loadVolume(loadJSON(VOL_KEY, {}));

// ---------- 화면 전환 ----------
let screen = 'title';
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  screen = id;
  document.body.classList.toggle('need-landscape', id === 'game' || id === 'story');
  resize();
}

// 터치 기기
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('is-touch');

// ---------- 캔버스 크기 ----------
const titleCanvas = $('#titleCanvas');
const gameCanvas = $('#gameCanvas');
const storyCanvas = $('#storyCanvas');
let DPR = Math.min(2, window.devicePixelRatio || 1);
function fit(c) {
  const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
  if (c.width !== Math.round(w * DPR) || c.height !== Math.round(h * DPR)) { c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); }
}
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); [titleCanvas, gameCanvas, storyCanvas].forEach(fit); }
addEventListener('resize', resize);

// =============================================================
//  처음 화면 그림
// =============================================================
function drawTitle(t) {
  const c = titleCanvas, ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  const sea = h * 0.48;
  const sky = ctx.createLinearGradient(0, 0, 0, sea);
  sky.addColorStop(0, '#2e9bf0'); sky.addColorStop(1, '#bfe8ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, sea);
  for (let i = 0; i < 6; i++) {
    const x = ((i * w * 0.23 + t * 12 * DPR) % (w + 300 * DPR)) - 150 * DPR;
    A.drawCloud(ctx, x, sea * (0.2 + (i % 3) * 0.12), DPR * (0.9 + (i % 2) * 0.5));
  }
  A.drawFarIslands(ctx, w * 0.5, sea, (h / 720) * 1.9);
  const sg = ctx.createLinearGradient(0, sea, 0, h);
  sg.addColorStop(0, '#3fa7dc'); sg.addColorStop(0.4, '#1b74a6'); sg.addColorStop(1, '#0d3f5c');
  ctx.fillStyle = sg; ctx.fillRect(0, sea, w, h - sea);
  // 물결
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3 * DPR;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = sea + k * 18 * DPR + Math.sin(x * 0.012 / DPR + t * 1.6 + k) * 5 * DPR;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.globalAlpha = 0.6 - k * 0.12; ctx.stroke(); ctx.globalAlpha = 1;
  }
  // 강치 가족
  const s = h / 720;
  A.drawSeal(ctx, w * 0.16, sea + 40 * s + Math.sin(t * 1.5) * 6 * s, 1.5 * s, { kind: 'mom', t, swim: 0.4 });
  A.drawSeal(ctx, w * 0.3, sea + 70 * s + Math.sin(t * 1.7 + 1) * 6 * s, 1.0 * s, { kind: 'kang', t, swim: 0.6, mood: 'happy' });
  A.drawSeal(ctx, w * 0.84, sea + 50 * s + Math.sin(t * 1.3 + 2) * 6 * s, 1.6 * s, { kind: 'grand', dir: -1, t, swim: 0.3 });
  // 갈매기
  for (let i = 0; i < 3; i++) A.drawCreature(ctx, 'gull', ((t * 40 * s + i * w * 0.4) % (w + 100)) - 50, sea * (0.3 + i * 0.1), 22 * s, { t: t + i, flying: true });
  // 물속 물고기
  for (let i = 0; i < 8; i++) A.drawCreature(ctx, i % 3 ? 'anchovy' : 'damsel', ((i * w * 0.17 - t * 30 * s) % (w + 80) + w + 80) % (w + 80) - 40, sea + h * (0.18 + (i % 4) * 0.07), 16 * s, { dir: -1, t: t + i });
}

// =============================================================
//  게임 루프
// =============================================================
let world = null;
let chapter = null;
let last = performance.now();
let hudT = 0;
function loop(now) {
  const dt = (now - last) / 1000; last = now;
  const t = now / 1000;
  try {
    if (screen === 'title') drawTitle(t);
    if (screen === 'story') drawStoryBg(t);
  } catch (err) { console.error(err); }
  try {
    if (screen === 'game' && world) {
      if (!modalOpen()) world.update(dt);
      const ctx = gameCanvas.getContext('2d');
      world.draw(ctx, gameCanvas.width, gameCanvas.height);
      hudT -= dt;
      if (hudT <= 0) { updateHud(); hudT = 0.1; }
    }
  } catch (err) { console.error(err); }
  if (mentorT > 0) { mentorT -= dt; if (mentorT <= 0) $('#mentor').classList.remove('show'); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- 키보드 ----------
const keymap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ShiftLeft: 'dash', ShiftRight: 'dash' };
addEventListener('keydown', (e) => {
  Snd.startAudio();
  if (screen === 'story' && !modalOpen()) {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); storyAdvance(); }
    return;
  }
  if (screen !== 'game' || !world) return;
  if (e.code === 'Escape') { if (modalOpen()) { if (modalEscClose) closeModal(); } else openPause(); return; }
  if (modalOpen()) return;
  const k = keymap[e.code];
  if (k) { world.input[k] = true; e.preventDefault(); }
  if (e.code === 'KeyE') world.press('observe');
  if (e.code === 'KeyF') world.press('climb');
});
addEventListener('keyup', (e) => {
  if (!world) return;
  const k = keymap[e.code];
  if (k) world.input[k] = false;
});
addEventListener('blur', () => { if (world) Object.keys(world.input).forEach(k => world.input[k] = false); });
addEventListener('pointerdown', () => Snd.startAudio(), { once: false });

// ---------- 터치 조작 ----------
(function setupTouch() {
  const stick = $('#stick'), knob = $('#stickKnob');
  let id = null, cx = 0, cy = 0;
  const setDir = (dx, dy) => {
    if (!world) return;
    const dead = 14;
    world.input.left = dx < -dead; world.input.right = dx > dead;
    world.input.up = dy < -dead; world.input.down = dy > dead;
  };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
  const move = (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy), m = 48;
    if (d > m) { dx *= m / d; dy *= m / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    setDir(dx, dy);
  };
  stick.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; setDir(0, 0); };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); }); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); };
  hold($('#tDash'), () => world && (world.input.dash = true), () => world && (world.input.dash = false));
  $('#tObserve').addEventListener('pointerdown', (e) => { e.preventDefault(); world && world.press('observe'); });
  $('#tClimb').addEventListener('pointerdown', (e) => { e.preventDefault(); world && world.press('climb'); });
})();

// =============================================================
//  HUD
// =============================================================
function dexCount() { return Object.keys(save.dex).length; }
function updateHud() {
  const w = world, p = w.player;
  $('#hudDex').textContent = `${dexCount()} / ${CREATURES.length}`;
  const hearts = Math.ceil(p.health / 20);
  $('#hudHearts').innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < hearts ? '' : 'off'}">♥</span>`).join('');
  $('#hudBoost').style.setProperty('--w', `${(p.boost / p.boostMax) * 100}%`);
  const d = w.depthMeters(), max = w.maxDepth();
  $('#hudDepth').textContent = `${d}m`;
  $('#hudDepthBar').style.top = `${Math.min(1, d / max) * 174}px`;
  $('#hudDepthMax').textContent = `${max}m`;
  const goals = $('#hudGoals');
  let html = '';
  const bar = (label, a, b) => `<div class="goal ${a >= b ? 'done' : ''}"><span>${label} ${Math.min(a, b)}/${b}</span><i><b style="width:${Math.min(100, (a / b) * 100)}%"></b></i></div>`;
  if (w.mode === 'free') {
    const f = w.free, lv = FREE_LEVELS[f.level];
    const need = f.level === 3 ? lv.xp : lv.xp;
    const have = f.level === 3 ? f.finalEaten : f.xp;
    html += `<div class="phase">${lv.name} · ${lv.area}</div>`;
    html += bar(f.level === 3 ? '마지막 먹이 (방어)' : '성장 경험치', have, need);
    html += `<div>먹을 수 있는 먹이: ${lv.food.map(id => CREATURE[id].name).join(' · ')}</div>`;
    html += `<div>탐험 시간 <b class="jua">${fmtTime(f.elapsed)}</b></div>`;
    const eff = Object.entries(w.effects).map(([k, v]) => `${{ double: '먹이 두 배', speed: '쌩쌩 헤엄', shield: '먹물 보호막' }[k] || k} ${Math.ceil(v)}초`);
    if (eff.length) html += `<div>✦ ${eff.join(' · ')}</div>`;
  } else if (chapter.escape) {
    const phaseText = { scout: '대장 강이의 정찰 · 배 그림자를 피해요', return: '귀환 질주 · 가족 바위로 돌아가요', lead_wait: '가족과 이야기 중', lead: '가족 안내 · 쉼터 포털로 (돌진 금지)' }[w.phase];
    html += `<div class="phase">${phaseText}</div>`;
    html += bar('엽서 조각', w.stats.cards, chapter.goals.cards);
  } else {
    const g = chapter.goals;
    html += bar('먹이 먹기', w.stats.food, g.food);
    html += bar('생물 관찰', w.stats.observed.size, g.observe);
    html += bar('낱말 엽서', w.stats.cards, g.cards);
    if (w.portal) html += `<div class="phase">포털이 열렸어요! 빛나는 고리로 가요 ›</div>`;
  }
  goals.innerHTML = html;
  // 튜토리얼 안내
  if (w.tutorial) {
    const s = w.tutorial.steps[w.tutorial.step];
    if (s) showMentor('mom', s.msg, s.key, 999);
  }
}
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 100))}`;
}

// 멘토 말풍선
let mentorT = 0;
function showMentor(who, text, key = '', dur = 4.5) {
  const m = $('#mentor');
  if ($('#mentorText').textContent !== text) {
    $('#mentorText').textContent = text;
    $('#mentorKey').textContent = key;
    $('#mentorName').textContent = SPEAKERS[who]?.name || '엄마 강치';
    drawFace($('#mentorFace'), who);
  }
  m.classList.add('show');
  mentorT = dur;
}
function drawFace(c, who) {
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, '#cfeefa'); g.addColorStop(1, '#8bcbe6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  if (who === 'nar') return;
  const s = c.width / 88;
  A.drawSeal(ctx, c.width * 0.18, c.height * 0.72, 1.25 * s, { kind: who === 'kang' ? 'kang' : who, t: 0, swim: 0, mood: 'happy' });
}

// 토스트
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// =============================================================
//  모달
// =============================================================
const modal = $('#modal'), modalBox = $('#modalBox');
let modalOnClose = null;
let modalEscClose = true;
function modalOpen() { return modal.classList.contains('show'); }
function openModal(html, { cls = '', onClose = null, closable = true } = {}) {
  modalBox.className = 'modal-box ' + cls;
  modalBox.innerHTML = (closable ? '<button class="modal-close" data-close>✕</button>' : '') + html;
  modal.classList.add('show');
  modalOnClose = onClose;
  modalEscClose = closable;
  modalBox.scrollTop = 0;
  $$('[data-close]', modalBox).forEach(b => b.addEventListener('click', () => closeModal()));
  if (world) Object.keys(world.input).forEach(k => world.input[k] = false);
}
function closeModal(result) {
  modal.classList.remove('show');
  modalBox.innerHTML = '';
  const cb = modalOnClose; modalOnClose = null;
  if (cb) cb(result);
}

// ---------- 엽서 모달 ----------
function bold(s) { return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
function postcardHTML(pc) {
  return `
    <div class="eyebrow">${pc.cat}</div>
    <h2>${pc.word} · <span style="font-size:.8em">${pc.title}</span></h2>
    <canvas class="pc-art" width="960" height="420"></canvas>
    <p class="pc-key">${bold(pc.key)}</p>
    <div class="pc-points">${pc.points.map(([a, b]) => `<div><small>${a}</small>${b}</div>`).join('')}</div>
    <div class="pc-body">${pc.body.map(b => `<p>${b}</p>`).join('')}</div>
    <div class="pc-words">${pc.words.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('')}</div>
    <div class="pc-remember">${pc.remember}</div>
    <div class="pc-caution">※ ${pc.caution} 그림은 이해를 돕기 위한 개념 그림이에요. 정확한 내용은 공식 자료로 확인해요.</div>
    <details class="pc-think"><summary>생각해 보기 · ${pc.q}</summary><p>${pc.a}</p></details>`;
}
function openPostcard(id, { timed = true, onClose = null } = {}) {
  const pc = POSTCARD[id];
  const readSec = timed ? 6 : 0;
  openModal(`${postcardHTML(pc)}<div class="modal-actions"><button class="pill dark" id="pcDone" ${readSec ? 'disabled' : ''}>${readSec ? `천천히 읽어요 · ${readSec}초` : '닫기'}</button></div>`,
    { cls: 'wide', onClose, closable: !timed });
  const cv = $('.pc-art', modalBox);
  A.drawPostcardArt(cv, pc.art, { t: 1 });
  const btn = $('#pcDone');
  btn.addEventListener('click', () => closeModal());
  if (readSec) {
    let left = readSec;
    const iv = setInterval(() => {
      left--;
      if (!document.body.contains(btn)) { clearInterval(iv); return; }
      if (left <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = '읽었어요 · 계속 탐험하기'; }
      else btn.textContent = `천천히 읽어요 · ${left}초`;
    }, 1000);
  }
}
function collectCard(id) {
  if (!save.cards.includes(id)) { save.cards.push(id); persist(); }
}

// ---------- 생물 카드 ----------
function openCreatureCard(id, { title = '관찰 성공!', onClose = null } = {}) {
  const c = CREATURE[id];
  openModal(`
    <div class="eyebrow">${title} ${save.dex[id] ? '· 도감 등록 ✓' : ''}</div>
    <div class="cr">
      <canvas width="600" height="450"></canvas>
      <div>
        <h2>${c.name}</h2>
        <span class="tag">${c.tag}</span>
        <dl><dt>사는 곳</dt><dd>${c.habitat}</dd><dt>찾는 요령</dt><dd>${c.tip}</dd></dl>
        <p class="desc">${c.desc}</p>
        <p class="muted">그림과 게임 속 배치·크기는 관찰을 돕는 표현이에요. 실제 모습과 서식지는 도감 사진과 공식 자료로 확인해요.</p>
      </div>
    </div>
    <div class="modal-actions"><button class="pill dark" data-close>기억했어요 · 계속 헤엄치기</button></div>`, { onClose });
  A.drawDexArt($('canvas', modalBox), id, true, 1);
}

// ---------- 관찰 대상 고르기 ----------
function chooseObserve(ids, cb) {
  openModal(`<div class="eyebrow">관찰할 친구 선택</div><h2>살펴볼 친구를 골라요</h2>
    <div class="choose">${ids.map(id => `<button data-id="${id}"><canvas width="240" height="180"></canvas>${CREATURE[id].name} 관찰하기</button>`).join('')}</div>
    <div class="modal-actions"><button class="pill" data-close>취소 ✕</button></div>`, { cls: 'narrow', onClose: (r) => cb(r || null) });
  $$('.choose button', modalBox).forEach(b => {
    A.drawDexArt($('canvas', b), b.dataset.id, true, 1);
    b.addEventListener('click', () => closeModal(b.dataset.id));
  });
}

// ---------- 도감 ----------
function openDex(onClose) {
  openModal(`<div class="eyebrow">강치와 독도 · 독도 생물 도감</div><h2>바다 친구 도감 <span class="muted">${dexCount()} / ${CREATURES.length}</span></h2>
    <p class="muted">친구를 만나면 기록이 쌓여요. 아직 만나지 못한 친구는 힌트를 따라 찾아봐요.</p>
    <div class="dex-grid">${CREATURES.map(c => `<button class="${save.dex[c.id] ? 'known' : ''}" data-id="${c.id}"><canvas width="240" height="180"></canvas><span>${save.dex[c.id] ? c.name : '아직 만나지 못한 친구'}</span><small>${save.dex[c.id] ? c.tag : '힌트 · ' + c.habitat}</small></button>`).join('')}</div>`, { cls: 'wide', onClose });
  $$('.dex-grid button', modalBox).forEach(b => {
    const id = b.dataset.id;
    A.drawDexArt($('canvas', b), id, !!save.dex[id], 1);
    b.addEventListener('click', () => {
      if (save.dex[id]) openCreatureCard(id, { title: '나의 생물 카드', onClose: () => openDex(onClose) });
      else toast(`힌트 · ${CREATURE[id].tip}`);
    });
  });
}

// ---------- 기록책 ----------
function openBook(tab = 'cards', onClose) {
  const tabs = `<div class="tabs"><button data-tab="cards" class="${tab === 'cards' ? 'on' : ''}">낱말 엽서 ${save.cards.length}/${POSTCARDS.length}</button><button data-tab="dex" class="${tab === 'dex' ? 'on' : ''}">바다 친구 도감 ${dexCount()}/${CREATURES.length}</button><button data-tab="cert" class="${tab === 'cert' ? 'on' : ''}">나의 수료증</button></div>`;
  let body = '';
  if (tab === 'cards') {
    const groups = [[1, '1장 · 두 섬, 하나의 집'], [2, '2장 · 해조숲 탐험'], [3, '3장 · 먼바다로'], [4, '4장 · 가족의 물길'], [0, '이야기에서 만난 기록'], [5, '이야기의 기록 · 에필로그']];
    body = groups.map(([n, label]) => `<h3 style="margin:18px 0 0;color:#123d4d">${label}</h3><div class="card-grid">${POSTCARDS.filter(p => p.chapter === n).map(p => {
      const got = save.cards.includes(p.id);
      return `<button class="${got ? '' : 'locked'}" data-card="${p.id}"><small>${got ? p.cat : '아직 찾지 못했어요'}</small><b>${got ? p.word : '？'}</b></button>`;
    }).join('')}</div>`).join('');
  } else if (tab === 'dex') {
    body = `<div class="dex-grid">${CREATURES.map(c => `<button class="${save.dex[c.id] ? 'known' : ''}" data-id="${c.id}"><canvas width="240" height="180"></canvas><span>${save.dex[c.id] ? c.name : '？'}</span></button>`).join('')}</div>`;
  } else {
    body = save.cert ? `<p>나의 수료증이 있어요. 다시 꾸미거나 PNG로 내려받을 수 있어요.</p><canvas id="bookCert" width="1600" height="1130" style="width:100%;border-radius:12px"></canvas><div class="modal-actions"><button class="pill dark" id="bookCertEdit">수료증 다시 꾸미기</button></div>` : `<p class="empty">모든 장과 퀴즈를 마치면 나만의 독도 탐험 수료증을 받을 수 있어요.</p>`;
  }
  openModal(`<div class="eyebrow">강치의 작은 바다 기록</div><h2>독도 단어 기록책</h2><p class="muted">바다에서 만난 낱말과 친구들을 다시 펼쳐 봐요.</p>${tabs}${body}`, { cls: 'wide', onClose });
  $$('.tabs button', modalBox).forEach(b => b.addEventListener('click', () => openBook(b.dataset.tab, onClose)));
  $$('[data-card]', modalBox).forEach(b => b.addEventListener('click', () => {
    if (save.cards.includes(b.dataset.card)) openPostcard(b.dataset.card, { timed: false, onClose: () => openBook('cards', onClose) });
  }));
  $$('.dex-grid button', modalBox).forEach(b => {
    A.drawDexArt($('canvas', b), b.dataset.id, !!save.dex[b.dataset.id], 1);
    b.addEventListener('click', () => { if (save.dex[b.dataset.id]) openCreatureCard(b.dataset.id, { title: '나의 생물 카드', onClose: () => openBook('dex', onClose) }); });
  });
  if (tab === 'cert' && save.cert) {
    drawCertificate($('#bookCert'), save.cert);
    $('#bookCertEdit').addEventListener('click', () => openCertificate(onClose));
  }
}

// ---------- 일시정지 / 설정 ----------
function settingsHTML() {
  const v = Snd.getVolume();
  const sl = (k, label) => `<label class="slider"><span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${v[k]}" data-vol="${k}"><span>${Math.round(v[k] * 100)}</span></label>`;
  return `<h3 style="margin:18px 0 0">소리 크기</h3>${sl('master', '전체 음량')}${sl('music', '음악')}${sl('amb', '파도·환경음')}${sl('sfx', '울음·효과음')}`;
}
function bindSettings() {
  $$('[data-vol]', modalBox).forEach(inp => inp.addEventListener('input', () => {
    Snd.setVolume(inp.dataset.vol, +inp.value);
    inp.nextElementSibling.textContent = Math.round(inp.value * 100);
    saveJSON(VOL_KEY, Snd.getVolume());
  }));
}
function openPause() {
  if (!world) return;
  openModal(`<div class="eyebrow">강치와 독도 · 잠시 쉼</div><h2>잠깐 쉬어 가요</h2><p class="muted">독도 바다에서, 다시 만나요.</p>
    ${settingsHTML()}
    <div class="modal-actions">
      <button class="pill dark" data-close>계속 탐험하기</button>
      <button class="pill" id="pFull">전체화면으로 보기</button>
      ${world.mode === 'story' ? '<button class="pill" id="pRestart">이 장 처음 위치로</button>' : ''}
      <button class="pill coral" id="pHome">처음 화면으로</button>
    </div>
    <p class="muted" style="margin-top:14px"><kbd>←↑↓→</kbd> 이동 · <kbd>Shift</kbd> 돌진 · <kbd>E</kbd> 관찰 · <kbd>F</kbd> 오르내리기 · <kbd>Esc</kbd> 일시정지</p>`, { cls: 'narrow' });
  bindSettings();
  $('#pFull').addEventListener('click', toggleFull);
  $('#pHome').addEventListener('click', () => { closeModal(); goTitle(); });
  $('#pRestart')?.addEventListener('click', () => { closeModal(); world.faint(); world.player.x = world.cfg.startX; world.player.y = 60; });
}
function openSettings() {
  openModal(`<div class="eyebrow">환경설정</div><h2>둘러보기 설정</h2>${settingsHTML()}
    <h3 style="margin:22px 0 0">탐험가</h3>
    <p>${profile ? esc(profileLabel()) : '아직 등록하지 않았어요.'} <button class="pill" id="sWho" style="margin-left:8px;padding:6px 14px;font-size:15px">탐험가 바꾸기</button></p>
    <p class="muted">${Net.online ? `기록이 ${CLASS_NAME} 현황판에 모여요.` : '온라인 기록이 꺼져 있어요. (config.js에 Supabase 정보를 넣으면 반 전체 기록이 모여요)'}</p>
    <h3 style="margin:22px 0 0">진행 기록</h3>
    <p class="muted">진행 기록은 이 브라우저에 저장돼요. 다른 컴퓨터에서는 처음부터 시작해요.</p>
    <div class="modal-actions"><button class="pill" id="sFull">전체화면으로 보기</button><button class="pill coral" id="sReset">진행 기록 지우기</button><button class="pill dark" data-close>닫기</button></div>`, { cls: 'narrow' });
  bindSettings();
  $('#sFull').addEventListener('click', toggleFull);
  $('#sWho').addEventListener('click', () => { closeModal(); ensureProfile(() => {}, true); });
  $('#sReset').addEventListener('click', () => {
    if (!confirm('엽서·도감·수료증 진행 기록을 모두 지울까요?')) return;
    save = freshSave(); persist(); refreshTitle(); toast('진행 기록을 지웠어요');
  });
}
function toggleFull() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
}
$('#btnFull').addEventListener('click', toggleFull);

// =============================================================
//  이야기 재생
// =============================================================
let story = null;
function playStory(key, onDone) {
  const s = STORY[key];
  story = { key, s, i: -1, onDone, log: [], typing: null, waitChoice: false, pendingReply: null, bg: s.bg };
  $('#storyTitle').textContent = s.title;
  $('#storyYear').textContent = s.year;
  show('story');
  storyAdvance();
}
function typeText(el, text) {
  if (story.typing) clearInterval(story.typing);
  el.textContent = '';
  let i = 0;
  story.full = text;
  story.typing = setInterval(() => {
    i += 2;
    el.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(story.typing); story.typing = null; }
  }, 22);
}
function setLine(who, text, cls = '') {
  const d = $('#dialog');
  d.classList.toggle('nar', who === 'nar' || who === 'scene');
  $('#speaker').textContent = who === 'scene' ? '' : (SPEAKERS[who]?.name || '');
  const p = $('#line');
  p.className = cls;
  typeText(p, text);
  if (who !== 'nar' && who !== 'scene') drawFace($('#speakerFace'), who);
  story.log.push(`${who === 'scene' || who === 'nar' ? '' : SPEAKERS[who].name + ': '}${text}`);
  if (who === 'kang') Snd.sfx('bark');
}
function storyAdvance() {
  if (!story || modalOpen()) return;
  if (story.typing) { clearInterval(story.typing); story.typing = null; $('#line').textContent = story.full; return; }
  if (story.waitChoice) return;
  if (story.pendingReply) { const [w, t] = story.pendingReply; story.pendingReply = null; $('#choices').innerHTML = ''; setLine(w, t); return; }
  $('#choices').innerHTML = '';
  story.i++;
  const line = story.s.lines[story.i];
  if (!line) { endStory(); return; }
  if (Array.isArray(line)) { setLine(line[0], line[1]); return; }
  if (line.scene) { setLine('scene', line.scene, 'scene'); return; }
  if (line.card) {
    collectCard(line.card);
    Snd.sfx('card');
    openPostcard(line.card, { timed: true, onClose: () => storyAdvance() });
    return;
  }
  if (line.choice) {
    story.waitChoice = true;
    $('#speaker').textContent = SPEAKERS.kang.name;
    $('#dialog').classList.remove('nar');
    drawFace($('#speakerFace'), 'kang');
    $('#line').textContent = '';
    $('#line').className = '';
    $('#choices').innerHTML = `<div class="ask">강이는 뭐라고 대답할까요?</div>` + line.choice.map((c, i) => `<button data-i="${i}">${c[0]}</button>`).join('');
    $$('#choices button').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = line.choice[+b.dataset.i];
      story.waitChoice = false;
      $('#choices').innerHTML = '';
      setLine('kang', c[0]);
      story.pendingReply = c[1];
      Snd.sfx('click');
    }));
  }
}
function endStory() {
  const cb = story.onDone;
  if (story.typing) clearInterval(story.typing);
  story = null;
  cb && cb();
}
$('#storyNext').addEventListener('click', (e) => { e.stopPropagation(); storyAdvance(); });
$('#dialog').addEventListener('click', () => storyAdvance());
$('#storySkip').addEventListener('click', () => {
  if (!story) return;
  // 건너뛰어도 이야기 속 엽서는 기록책에 남겨요
  story.s.lines.forEach(l => { if (l && l.card) collectCard(l.card); });
  endStory();
});
$('#storyLog').addEventListener('click', () => {
  if (!story) return;
  openModal(`<div class="eyebrow">대화 기록</div><h2>${story.s.title}</h2>${story.log.map(l => `<p style="margin:8px 0;line-height:1.6">${l}</p>`).join('')}`, { cls: 'narrow' });
});

function drawStoryBg(t) {
  if (!story) return;
  const c = storyCanvas, ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  const bg = story.bg;
  const storm = bg === 'storm';
  const today = bg === 'today';
  const sea = h * (bg === 'kelp' || bg === 'open' ? 0.22 : 0.52);
  const sky = ctx.createLinearGradient(0, 0, 0, sea);
  if (storm) { sky.addColorStop(0, '#4f5d6b'); sky.addColorStop(1, '#9aa8b4'); }
  else if (today) { sky.addColorStop(0, '#f7a46b'); sky.addColorStop(1, '#ffe2b8'); }
  else { sky.addColorStop(0, '#3ca4ef'); sky.addColorStop(1, '#c6ecff'); }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, sea);
  const s = h / 720;
  if (bg !== 'kelp' && bg !== 'open') A.drawFarIslands(ctx, w * 0.62, sea, 1.6 * s);
  const sg = ctx.createLinearGradient(0, sea, 0, h);
  sg.addColorStop(0, storm ? '#40708a' : bg === 'kelp' ? '#2c8c88' : '#3b9fd4');
  sg.addColorStop(1, storm ? '#13283a' : bg === 'kelp' ? '#0d3a3c' : '#0c3a58');
  ctx.fillStyle = sg; ctx.fillRect(0, sea, w, h - sea);
  if (storm) {
    A.drawBoat(ctx, w * 0.78, sea - 4 * s, -1, t, 'warship');
    A.drawBoat(ctx, w * 0.35 + Math.sin(t * 0.3) * 30 * s, sea, 1, t, 'fishing');
  }
  if (bg === 'kelp') for (let i = 0; i < 14; i++) A.drawCreature(ctx, i % 2 ? 'kelp' : 'eisenia', w * (i / 13), h, 160 * s, { t: t + i });
  if (bg === 'kelp' || bg === 'open') for (let i = 0; i < 10; i++) A.drawCreature(ctx, bg === 'kelp' ? (i % 2 ? 'rockfish' : 'oplegnathus') : (i % 2 ? 'saury' : 'squid'), ((i * w * 0.13 + t * 30 * s * (i % 2 ? 1 : -1)) % (w + 100) + w + 100) % (w + 100) - 50, h * (0.3 + (i % 5) * 0.08), 20 * s, { dir: i % 2 ? 1 : -1, t: t + i });
  // 바위와 가족
  if (bg === 'rock' || bg === 'sea' || bg === 'today' || bg === 'storm') {
    ctx.fillStyle = '#5a4b3c';
    ctx.beginPath(); ctx.moveTo(w * 0.04, h); ctx.lineTo(w * 0.1, sea - 50 * s); ctx.lineTo(w * 0.25, sea - 80 * s); ctx.lineTo(w * 0.42, sea - 60 * s); ctx.lineTo(w * 0.5, h); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(w * 0.08, sea - 4, w * 0.4, 6);
    if (today) {
      A.drawCreature(ctx, 'gull', w * 0.2, sea - 88 * s, 30 * s, { t });
      A.drawCreature(ctx, 'gull', w * 0.33, sea - 84 * s, 26 * s, { t: t + 1, dir: -1 });
      A.drawCreature(ctx, 'aster', w * 0.14, sea - 60 * s, 30 * s, { t });
    } else {
      A.drawSeal(ctx, w * 0.12, sea - 92 * s, 1.4 * s, { kind: 'mom', onRock: true, t });
      A.drawSeal(ctx, w * 0.39, sea - 80 * s, 1.35 * s, { kind: 'grand', dir: -1, onRock: true, t: t + 1 });
      A.drawSeal(ctx, w * 0.235 + Math.sin(t) * 4 * s, sea - 100 * s, 0.95 * s, { kind: 'kang', onRock: true, t, mood: 'happy' });
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3 * DPR;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 14) { const y = sea + Math.sin(x * 0.01 / DPR + t * 1.6) * 4 * DPR; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
}

// =============================================================
//  장 진행
// =============================================================
const worldHooks = {
  toast,
  mentor: (text) => showMentor('mom', text, '', 5),
  card: (id, w) => {
    collectCard(id);
    w.paused = true;
    openPostcard(id, { timed: true, onClose: () => { w.paused = false; } });
  },
  observed: (id, first) => {
    const newDex = !save.dex[id];
    save.dex[id] = true; persist();
    if (newDex) { world.paused = true; openCreatureCard(id, { title: `${CREATURE[id].name}, 발견!`, onClose: () => { world.paused = false; } }); }
    else toast(`${CREATURE[id].name} 관찰 성공 · 도감 기록 완료`);
  },
  eaten: (id, first) => {
    if (!save.dex[id]) { save.dex[id] = true; persist(); toast(`${CREATURE[id].name} 먹었어요 · 도감에 등록!`); }
  },
  chooseObserve,
  portalOpen: () => { toast('포탈이 열렸어요! 빛나는 고리로 가요'); showMentor('mom', '목표를 모두 이뤘구나! 빛나는 고리로 가 보자', '', 5); },
  portal: () => finishChapter(),
  returned: () => {
    world.paused = true;
    playStory('ch4_mid', () => { show('game'); world.paused = false; world.startLead(); showMentor('mom', '서로 보이는 곳까지만 앞서가렴. 오른쪽 쉼터 포털까지 함께 가자!', '가족과 함께일 때는 돌진 금지', 6); });
  },
  tutorialDone: () => { save.tutorialDone = true; persist(); },
  levelUp: (lv) => {
    const L = FREE_LEVELS[lv];
    toast(`${L.name}로 자랐어요! 다음 바다 · ${L.area}`);
    showMentor('mom', lv === 3 ? '대장 강이가 되었구나! 이제 방어를 잡아 무리를 이끌어 보렴' : `${L.name}로 자랐구나! 물살을 넘어 ${L.area}로 가 보자`, `먹이: ${L.food.map(i => CREATURE[i].name).join(' · ')}`, 6);
  },
  freeDone: (ms) => openFreeResult(ms),
};

function startChapter(n) {
  chapter = CHAPTERS[n - 1];
  save.chapter = n; save.started = true; persist();
  const tutorial = n === 1 && !save.tutorialDone;
  world = new World(storyConfig(chapter, { tutorial }), worldHooks);
  $('#hudChapter').textContent = `${chapter.n}장 · ${chapter.label}`;
  $('#hudPlace').textContent = `독도, ${chapter.year} · ${chapter.place}`;
  show('game');
  showMentor('mom', chapter.hint, '', 5);
}

function finishChapter() {
  const n = chapter.n;
  world.paused = true;
  playStory(`ch${n}_end`, () => {
    runQuiz(n, () => {
      if (n < 4) {
        save.chapter = n + 1; persist();
        playStory(`ch${n + 1}_start`, () => startChapter(n + 1));
      } else {
        save.chapter = 5; persist();
        playStory('epilogue', () => { save.done = true; persist(); world = null; show('title'); openCertificate(() => goTitle()); });
      }
    });
  });
}

// ---------- 퀴즈 ----------
function runQuiz(n, done) {
  const qs = QUIZZES[n];
  let i = 0;
  const ask = () => {
    const q = qs[i];
    openModal(`<div class="eyebrow">${n}장 · 바다에서 배운 것 · 쉼터 포털</div>
      <h2>엄마와 생각 나누기</h2>
      <div class="quiz-prog">엽서에서 알아본 기록을 떠올려 봐요 · ${i + 1} / ${qs.length}문제</div>
      <div class="quiz-q">${q.q}</div>
      <div class="quiz-o">${q.o.map((o, k) => `<button data-k="${k}">${'①②③'[k]} ${o}</button>`).join('')}</div>
      <div id="qfb"></div>`, { cls: 'narrow', closable: false });
    $$('.quiz-o button', modalBox).forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k;
      const fb = $('#qfb');
      if (k === q.a) {
        Snd.sfx('right');
        $$('.quiz-o button', modalBox).forEach(x => x.disabled = true);
        b.classList.add('right');
        fb.innerHTML = `<div class="quiz-fb ok"><b class="jua">맞았어요! 함께 기억해요</b><br>${q.why}</div><div class="modal-actions"><button class="pill dark" id="qNext">${i + 1 < qs.length ? '다음 문제로' : '쉼터로 들어가기'}</button></div>`;
        $('#qNext').addEventListener('click', () => { i++; if (i < qs.length) ask(); else { closeModal(); done(); } });
      } else {
        Snd.sfx('wrong');
        b.classList.add('wrong'); b.disabled = true;
        fb.innerHTML = `<div class="quiz-fb no"><b class="jua">다시 생각해요</b> · 엽서에서 힌트를 찾아볼까?</div><div class="modal-actions"><button class="pill" id="qCard">관련 엽서 펼치기</button></div>`;
        $('#qCard').addEventListener('click', () => {
          collectCard(q.card);
          openPostcard(q.card, { timed: false, onClose: () => ask() });
        });
      }
    }));
  };
  ask();
}

// =============================================================
//  수료증
// =============================================================
function drawCertificate(canvas, cert) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const d = CERT_DESIGNS.find(x => x.id === cert.design) || CERT_DESIGNS[0];
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, d.bg[0]); g.addColorStop(1, d.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 테두리
  ctx.strokeStyle = d.accent; ctx.lineWidth = 14;
  A.roundRect(ctx, 40, 40, W - 80, H - 80, 40); ctx.stroke();
  ctx.lineWidth = 3;
  A.roundRect(ctx, 66, 66, W - 132, H - 132, 30); ctx.stroke();
  // 장식
  if (d.id === 'night') for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,246,200,${0.3 + A.hash(i) * 0.6})`; ctx.beginPath(); ctx.arc(A.hash(i * 3) * W, A.hash(i * 7) * H * 0.6, 1.5 + A.hash(i) * 3, 0, 7); ctx.fill(); }
  if (d.id === 'chart') { ctx.strokeStyle = 'rgba(138,90,43,.25)'; ctx.lineWidth = 2; for (let x = 120; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, H - 80); ctx.stroke(); } for (let y = 120; y < H; y += 120) { ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W - 80, y); ctx.stroke(); } }
  // 아래 바다와 섬
  ctx.save();
  ctx.beginPath(); A.roundRect(ctx, 66, 66, W - 132, H - 132, 30); ctx.clip();
  const sea = H - 250;
  ctx.fillStyle = d.id === 'night' ? '#1b2a5a' : 'rgba(30,123,176,.25)';
  ctx.fillRect(0, sea, W, H - sea);
  A.drawFarIslands(ctx, W * 0.78, sea, 1.4);
  A.drawSeal(ctx, W * 0.17, sea - 40, 1.9, { kind: 'mom', onRock: false, t: 0, swim: 0 });
  A.drawSeal(ctx, W * 0.3, sea - 10, 1.3, { kind: 'kang', onRock: false, t: 0, swim: 0, mood: 'happy' });
  ctx.restore();
  ctx.fillStyle = d.ink; ctx.textAlign = 'center';
  ctx.font = '48px "Jua", sans-serif';
  ctx.fillText('10.25 독도의 날 · Dokdo-day', W / 2, 170);
  ctx.font = '108px "Jua", sans-serif';
  ctx.fillText('독도 탐험 수료증', W / 2, 300);
  ctx.font = '64px "Jua", sans-serif';
  ctx.fillStyle = d.accent;
  const nick = (cert.nickname || '').trim() || '탐험가';
  ctx.fillText(`${cert.school ? cert.school + ' ' : ''}${nick}`, W / 2, 420);
  ctx.fillStyle = d.ink;
  ctx.font = '40px "Gowun Dodum", sans-serif';
  const lines = ['위 탐험가는 강치 가족과 함께 독도의 지리·역사·생태를 살펴보고', '낱말 엽서와 바다 친구 기록을 모아 독도 탐험을 마쳤기에', '강치가 인정한 독도 탐험가로 이 수료증을 드립니다.'];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 520 + i * 60));
  ctx.font = '34px "Gowun Dodum", sans-serif';
  ctx.fillText(`낱말 엽서 ${cert.cards ?? save.cards.length}장 · 바다 친구 ${cert.dex ?? dexCount()}종`, W / 2, 735);
  ctx.font = '40px "Jua", sans-serif';
  ctx.fillText(cert.date, W / 2, 805);
  ctx.font = '36px "Jua", sans-serif';
  ctx.fillText(`${d.name} · 잊지말아야 할 우리의 땅`, W / 2, H - 110);
  // 도장
  ctx.save();
  ctx.translate(W - 250, 760); ctx.rotate(-0.15);
  ctx.strokeStyle = '#c94f4f'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, 78, 0, 7); ctx.stroke();
  ctx.fillStyle = '#c94f4f'; ctx.font = '34px "Jua", sans-serif';
  ctx.fillText('강치', 0, -6); ctx.fillText('인정', 0, 34);
  ctx.restore();
}
function todayStr() { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; }
function openCertificate(onClose) {
  const cert = Object.assign({ nickname: profile?.nickname || '', school: CLASS_NAME === '우리 반' ? '' : CLASS_NAME, design: 'letter', date: todayStr() }, save.cert || {});
  cert.date = save.cert?.date || todayStr();
  openModal(`<div class="eyebrow">모든 탐험과 퀴즈 완료</div><h2>나만의 독도 탐험 수료증</h2>
    <div class="cert-wrap">
      <canvas id="certCanvas" width="1600" height="1130"></canvas>
      <div>
        <label class="field">나의 별명 <small>(12글자까지 · 실명 대신 별명)</small><input id="cNick" maxlength="12" value="${cert.nickname}" placeholder="별명을 적어 주세요"></label>
        <label class="field">학교·반 (선택)<input id="cSchool" maxlength="14" value="${cert.school || ''}" placeholder="예: 동성초 4학년"></label>
        <div class="field">마음에 드는 수료증을 골라요<div class="designs">${CERT_DESIGNS.map(d => `<button data-d="${d.id}" class="${d.id === cert.design ? 'on' : ''}" style="background:linear-gradient(${d.bg[0]},${d.bg[1]});color:${d.ink}">${d.name}</button>`).join('')}</div></div>
        <label class="check"><input type="checkbox" id="cHall" checked> ${Net.online ? `${CLASS_NAME} 명예의 전당에 남기기` : '명예의 전당에 남기기 (이 컴퓨터)'}</label>
        <div class="modal-actions" style="justify-content:flex-start">
          <button class="pill dark" id="cSave">수료 기록 저장</button>
          <button class="pill" id="cPng">PNG로 내려받기</button>
        </div>
        <p class="muted" id="cMsg">별명을 적으면 수료증이 완성돼요.</p>
      </div>
    </div>
    <div class="modal-actions"><button class="pill" id="cBook">기록책 펼치기</button><button class="pill" id="cAgain">다시 탐험하기</button><button class="pill coral" data-close>처음 화면으로</button></div>`, { cls: 'wide', onClose });
  const cv = $('#certCanvas');
  const redraw = () => { cert.nickname = $('#cNick').value; cert.school = $('#cSchool').value; drawCertificate(cv, { ...cert, cards: save.cards.length, dex: dexCount() }); };
  redraw();
  document.fonts?.ready.then(redraw);
  $('#cNick').addEventListener('input', redraw);
  $('#cSchool').addEventListener('input', redraw);
  $$('.designs button', modalBox).forEach(b => b.addEventListener('click', () => { cert.design = b.dataset.d; $$('.designs button', modalBox).forEach(x => x.classList.toggle('on', x === b)); redraw(); }));
  $('#cSave').addEventListener('click', () => {
    if (!cert.nickname.trim()) { $('#cMsg').textContent = '별명을 먼저 적어 주세요.'; return; }
    save.cert = { ...cert, cards: save.cards.length, dex: dexCount(), public: $('#cHall').checked }; persist();
    if ($('#cHall').checked) {
      const hall = loadJSON(HALL_KEY, []);
      hall.unshift({ nickname: cert.nickname.trim(), school: cert.school.trim(), design: cert.design, date: cert.date });
      saveJSON(HALL_KEY, hall.slice(0, 100));
      $('#cMsg').textContent = `수료증을 ${Net.online ? CLASS_NAME + ' ' : ''}명예의 전당에 남겼어요!`;
    } else $('#cMsg').textContent = '수료 기록을 비공개로 저장했어요.';
    Snd.sfx('portal');
  });
  $('#cPng').addEventListener('click', () => {
    if (!cert.nickname.trim()) { $('#cMsg').textContent = '별명을 먼저 적어 주세요.'; return; }
    cv.toBlob((blob) => {
      if (!blob) { $('#cMsg').textContent = 'PNG를 만들지 못했어요. 다시 눌러 주세요.'; return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `독도-탐험가-${cert.nickname.trim().replace(/[\\/:*?"<>|]/g, '')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      $('#cMsg').textContent = '수료증 PNG를 준비했어요!';
    });
  });
  $('#cBook').addEventListener('click', () => openBook('cards', onClose));
  $('#cAgain').addEventListener('click', () => { modalOnClose = null; closeModal(); newGame(true); });
}

// =============================================================
//  자유 탐험 · 랭킹
// =============================================================
function openFreeIntro() {
  openModal(`<div class="eyebrow">자유 탐험 · 성장 타임어택</div><h2>강이와 함께 자라요</h2>
    <p>먹이를 먹고 바다 친구를 관찰하며, 무리를 이끄는 대장 강이가 되어 보세요.</p>
    <div class="level-path">${FREE_LEVELS.map(l => `<span>${l.name} · ${l.area}</span>`).join('<span style="background:none">›</span>')}</div>
    <p class="muted" style="margin-top:14px">· 자기 크기에 맞는 먹이를 먹으면 성장 경험치가 쌓여요.<br>· 다 자라면 물살을 넘어 다음 바다로 갈 수 있어요.<br>· 처음 만난 친구를 관찰(E)하면 보너스! 반짝이는 방울은 특별한 힘을 줘요.<br>· 약 10분 · 강치가 자라 무리를 이끄는 모습은 게임 속 이야기예요.</p>
    <div class="modal-actions"><button class="pill dark big" id="fStart">탐험 시작</button><button class="pill mint" id="fRank">랭킹 보기</button></div>`, { cls: 'narrow' });
  $('#fStart').addEventListener('click', () => { closeModal(); startFree(); });
  $('#fRank').addEventListener('click', () => openRanking());
}
function startFree() {
  chapter = null;
  world = new World(freeConfig(), worldHooks);
  $('#hudChapter').textContent = '자유 탐험 · 성장';
  $('#hudPlace').textContent = '얕은 물길부터 깊은 바다까지';
  show('game');
  showMentor('mom', '먼저 멸치와 자리돔을 먹으며 쑥쑥 자라 보렴!', 'W A S D · Shift 돌진 · E 관찰', 6);
}
function openFreeResult(ms) {
  world.paused = true;
  const local = loadJSON(RANK_KEY, []);
  const myBest = profile?.best ?? null;
  const isBest = myBest == null || ms < myBest;
  openModal(`<div class="eyebrow">성장 완료!</div><h2>대장 강이가 되었어요</h2>
    <p>얕은 물길부터 깊은 바다까지 지나 무리를 이끌게 되었어요.</p>
    <div class="big-time">${fmtTime(ms)}</div>
    ${isBest ? '<p style="text-align:center" class="jua">🎉 나의 최고 기록!</p>' : `<p style="text-align:center" class="muted">나의 최고 기록 ${fmtTime(myBest)}</p>`}
    <p style="text-align:center">${esc(profileLabel())}</p>
    <div class="modal-actions"><button class="pill dark" id="rSave">랭킹에 기록하기</button><button class="pill" id="rAgain">다시 도전</button><button class="pill coral" id="rHome">처음 화면으로</button></div>
    <p class="muted" id="rMsg">${Net.online ? `${CLASS_NAME} 랭킹에 함께 올라가요.` : '기록은 이 컴퓨터에 저장돼요.'}</p>`, { cls: 'narrow', closable: false });
  let saved = false;
  $('#rSave').addEventListener('click', async () => {
    if (saved) return;
    saved = true;
    $('#rSave').disabled = true;
    const rec = { nick: profile.nickname, number: profile.number, ms, date: new Date().toISOString().slice(0, 10), id: Date.now() };
    local.push(rec); local.sort((x, y) => x.ms - y.ms);
    saveJSON(RANK_KEY, local.slice(0, 50));
    if (isBest) { profile.best = ms; saveJSON(PROFILE_KEY, profile); syncNow(); }
    if (Net.online) {
      $('#rMsg').textContent = '우리 반 랭킹에 올리는 중…';
      const ok = await Net.addFreeRun({ player_id: profile.id, number: profile.number, nickname: profile.nickname, ms });
      if (!ok) toast('인터넷 연결이 불안정해 이 컴퓨터에만 저장했어요');
    }
    closeModal();
    world = null;
    show('title');
    openRanking('free', profile.id);
  });
  $('#rAgain').addEventListener('click', () => { closeModal(); startFree(); });
  $('#rHome').addEventListener('click', () => { closeModal(); goTitle(); });
}
async function openRanking(tab = 'free', highlight = null) {
  const tabs = `<div class="tabs"><button data-t="free" class="${tab === 'free' ? 'on' : ''}">자유 탐험 · 성장 타임어택</button><button data-t="hall" class="${tab === 'hall' ? 'on' : ''}">명예의 전당 · 수료</button></div>`;
  const frame = (body, note) => `<div class="eyebrow">랭킹 보기</div><h2>${Net.online ? CLASS_NAME + ' ' : ''}독도 탐험가 기록</h2><p class="muted">${note}</p>${tabs}${body}
    <div class="modal-actions"><button class="pill dark" id="goFree">자유 탐험 도전</button><button class="pill" data-close>닫기</button></div>`;
  const bind = () => {
    $$('.tabs button', modalBox).forEach(b => b.addEventListener('click', () => openRanking(b.dataset.t, highlight)));
    $('#goFree').addEventListener('click', () => { closeModal(); ensureProfile(() => openFreeIntro()); });
  };
  const freeTable = (rows) => rows.length ? `<table class="rank"><tr><th>순위</th><th>번호</th><th>별명</th><th>최고 기록</th></tr>${rows.slice(0, 40).map((r, i) => `<tr class="${(r.player_id || r.id) === highlight ? 'me' : ''}"><td class="no">${i + 1}</td><td>${r.number ?? ''}</td><td>${esc(r.nickname || r.nick)}</td><td class="jua">${fmtTime(r.ms)}</td></tr>`).join('')}</table>` : '<p class="empty">아직 기록이 없어요. 자유 탐험에 도전해 보세요!</p>';
  const hallTable = (rows) => rows.length ? `<table class="rank"><tr><th></th><th>번호</th><th>별명</th><th>수료증</th></tr>${rows.map((r, i) => `<tr><td class="no">${i + 1}</td><td>${r.number ?? ''}</td><td>${esc(r.nickname)}</td><td>${(CERT_DESIGNS.find(d => d.id === (r.cert_design || r.design)) || CERT_DESIGNS[0]).name}</td></tr>`).join('')}</table>` : '<p class="empty">아직 수료한 탐험가가 없어요. 이야기를 끝까지 탐험해 보세요!</p>';

  if (Net.online) {
    openModal(frame('<p class="empty">우리 반 기록을 불러오고 있어요…</p>', `${CLASS_NAME} 친구들의 기록이 함께 모여요.`), { cls: 'wide' });
    bind();
    try {
      let body;
      if (tab === 'free') body = freeTable(await Net.fetchFreeBoard());
      else body = hallTable((await Net.fetchPlayers()).filter(p => p.done && p.cert_design));
      if (!modalOpen()) return;
      openModal(frame(body, `${CLASS_NAME} 친구들의 기록이 함께 모여요.`), { cls: 'wide' });
      bind();
      return;
    } catch (e) {
      toast('우리 반 기록을 불러오지 못했어요. 이 컴퓨터 기록을 보여 줄게요');
    }
  }
  const local = loadJSON(RANK_KEY, []);
  const hall = loadJSON(HALL_KEY, []);
  const body = tab === 'free' ? freeTable(local.map(r => ({ ...r, nickname: r.nick }))) : hallTable(hall);
  openModal(frame(body, '이 컴퓨터(브라우저)에 저장된 기록이에요.'), { cls: 'wide' });
  bind();
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// =============================================================
//  독도가 궁금해요
// =============================================================
const GUIDE_ART = ['map', 'islands', 'volcano', 'scroll', 'boat', 'scroll', 'ship', 'scroll', 'gull', 'seal', 'zones', 'gull'];
function openGuide(i = 0) {
  const g = GUIDE[i];
  openModal(`<div class="eyebrow">독도가 궁금해요 · ${g.s}</div><h2>${g.t}</h2>
    <div class="guide"><canvas width="800" height="500"></canvas><div>${g.b.map(b => `<p>${b}</p>`).join('')}<div class="ask">🤔 ${g.ask}</div></div></div>
    <p class="muted" style="margin-top:12px">그림은 이해를 돕는 개념 그림이에요. 실제 지도·기록은 외교부 독도 누리집, 동북아역사재단, 국가기록원 자료로 확인해요.</p>
    <div class="guide-nav"><button class="pill" id="gPrev" ${i === 0 ? 'disabled' : ''}>‹ 이전</button><div class="dots">${GUIDE.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="pill dark" id="gNext">${i < GUIDE.length - 1 ? '다음 ›' : '닫기'}</button></div>`, { cls: 'wide' });
  A.drawPostcardArt($('canvas', modalBox), GUIDE_ART[i], { t: 1 });
  $('#gPrev').addEventListener('click', () => openGuide(i - 1));
  $('#gNext').addEventListener('click', () => (i < GUIDE.length - 1 ? openGuide(i + 1) : closeModal()));
}

// =============================================================
//  메뉴
// =============================================================
function refreshTitle() {
  $('#btnContinue').disabled = !save.started;
  const tag = $('#whoTag');
  tag.style.display = profile ? '' : 'none';
  tag.textContent = profile ? `탐험가 · ${profileLabel()} (바꾸기)` : '';
}
$('#whoTag').addEventListener('click', () => ensureProfile(() => {}, true));
function goTitle() {
  world = null;
  show('title');
  refreshTitle();
}
function newGame(skipConfirm = false) {
  const go = () => {
    const keep = { cert: save.cert };
    save = freshSave();
    save.cert = keep.cert;
    save.started = true;
    persist();
    playStory('prologue', () => playStory('ch1_start', () => startChapter(1)));
  };
  if (!skipConfirm && save.started && !save.done) {
    openModal(`<h2>처음부터 시작할까요?</h2><p>지금까지 모은 엽서와 도감 기록이 지워지고 프롤로그부터 다시 시작해요. 이어서 하려면 ‘이어 하기’를 눌러요.</p>
      <div class="modal-actions"><button class="pill coral" id="ngYes">처음부터 시작</button><button class="pill dark" id="ngCont">이어 하기</button></div>`, { cls: 'narrow' });
    $('#ngYes').addEventListener('click', () => { closeModal(); go(); });
    $('#ngCont').addEventListener('click', () => { closeModal(); continueGame(); });
    return;
  }
  go();
}
function continueGame() {
  if (!save.started) return newGame(true);
  if (save.done || save.chapter > 4) { openCertificate(() => goTitle()); return; }
  playStory(`ch${save.chapter}_start`, () => startChapter(save.chapter));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  Snd.startAudio();
  Snd.sfx('click');
  const act = b.dataset.act;
  switch (act) {
    case 'new': ensureProfile(() => newGame()); break;
    case 'continue': ensureProfile(() => continueGame()); break;
    case 'ranking': openRanking(); break;
    case 'settings': openSettings(); break;
    case 'guide': openGuide(0); break;
    case 'free': ensureProfile(() => openFreeIntro()); break;
    case 'book': openBook('cards'); break;
    case 'dex': openDex(); break;
    case 'pause': openPause(); break;
    case 'mute': { const m = Snd.toggleMute(); b.textContent = m ? '소리 꺼짐' : '소리 켜짐'; saveJSON(VOL_KEY, Snd.getVolume()); break; }
  }
});
$('#btnMute').textContent = Snd.isMuted() ? '소리 꺼짐' : '소리 켜짐';

modal.addEventListener('click', (e) => { if (e.target === modal && modalEscClose) closeModal(); });

refreshTitle();
resize();

// 테스트·디버그용
window.__dokdo = { get world() { return world; }, startChapter, startFree, playStory, save: () => save, openCertificate, finishChapter };
