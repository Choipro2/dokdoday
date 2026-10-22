// =============================================================
//  강치와 독도 · 바다 세계 (물리 · 생물 · 장 진행)
// =============================================================
import { CREATURE, STAGES, FREE_LEVELS, POWERUPS, POSTCARD } from './data.js';
import * as A from './art.js';
import { sfx } from './audio.js';

const VIEW_H = 720;
const PX_PER_M = 1.6;

export class World {
  constructor(cfg, hooks) {
    this.cfg = cfg;          // 장 설정 또는 자유 탐험 설정
    this.hooks = hooks;      // main.js 로 알리는 콜백 모음
    this.mode = cfg.mode;    // 'story' | 'free'
    this.t = 0;
    this.width = cfg.width;
    this.floorBase = cfg.floorBase;
    this.tint = cfg.tint;
    this.storm = !!cfg.storm;
    this.rocks = [];
    this.creatures = [];
    this.cards = [];
    this.nets = [];
    this.boats = [];
    this.popups = [];
    this.bubbles = [];
    this.powerups = [];
    this.effects = {};
    this.ink = 0;
    this.trail = [];
    this.family = [];
    this.paused = false;
    this.portal = null;
    this.input = { left: false, right: false, up: false, down: false, dash: false };
    this.pressed = {};
    this.observing = null;
    this.cam = { x: 0, y: 0 };
    this.stats = { food: 0, observed: new Set(), cards: 0, eatenIds: new Set(), hits: 0, faints: 0 };
    this.tutorial = null;
    this.mentorMsg = null;

    this.buildRocks();
    const st = cfg.stage ?? 0;
    this.player = {
      x: cfg.startX ?? 260, y: 60, vx: 0, vy: 0, dir: 1, state: 'swim', rock: null,
      stage: st, health: 100, boost: 3, boostMax: 3, hurt: 0, slow: 0, angle: 0,
      dashing: false, mood: 'normal', moodT: 0,
    };
    this.checkpoint = { x: this.player.x, y: 60 };
    this.player.r = 24 * STAGES[st].scale;
    this.spawnCreatures();
    if (this.mode === 'story') this.setupStory();
    else this.setupFree();
    this.cam.x = this.player.x;
    this.cam.y = 120;
  }

  // ---------- 지형 ----------
  floorY(x) {
    return this.floorBase + (A.noise1(x / 320) - 0.5) * 110 + (A.noise1(x / 70 + 9) - 0.5) * 22;
  }
  buildRocks() {
    const defs = this.cfg.rocks || [];
    for (const d of defs) {
      const bottom = this.floorY(d.x) + 40;
      const halfTop = d.w / 2;
      const spread = (bottom - d.top) * 0.28;
      this.rocks.push({
        name: d.name || '', x: d.x, top: d.top, bottom,
        x0: d.x - halfTop, x1: d.x + halfTop, x0b: d.x - halfTop - spread, x1b: d.x + halfTop + spread,
        seed: d.x * 0.013 + 1,
      });
    }
  }
  rockEdges(r, y) {
    const k = Math.max(0, Math.min(1, (y - r.top) / (r.bottom - r.top)));
    return [A.lerp(r.x0, r.x0b, k), A.lerp(r.x1, r.x1b, k)];
  }

  // ---------- 생물 배치 ----------
  spawnCreatures() {
    const list = this.cfg.spawn || [];
    for (const [id, n] of list) {
      for (let i = 0; i < n; i++) this.addCreature(id, i);
    }
  }
  randomSpot(def, i) {
    const W = this.width;
    const margin = 300;
    const pickX = () => margin + Math.random() * (W - margin * 2);
    let x = this.cfg.areaFor ? this.cfg.areaFor(def.id) : pickX();
    let y;
    switch (def.zone) {
      case 'rock': {
        const above = this.rocks.filter(r => r.top < -20);
        if (above.length) {
          const r = above[(i + Math.floor(Math.random() * above.length)) % above.length];
          x = r.x0 + 16 + Math.random() * (r.x1 - r.x0 - 32);
          y = r.top - 2;
          return { x, y, rock: r };
        }
        y = 20; break;
      }
      case 'floor': {
        for (let k = 0; k < 8 && this.insideRock(x, this.floorY(x) - 10); k++) x = this.cfg.areaFor ? this.cfg.areaFor(def.id) : pickX();
        y = this.floorY(x) - 2; break;
      }
      case 'reef': {
        const r = this.rocks[Math.floor(Math.random() * this.rocks.length)];
        if (r && !this.cfg.areaFor) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const yy = Math.max(60, r.top + 40) + Math.random() * (this.floorY(r.x) - Math.max(60, r.top + 40) - 60);
          const [l, rr] = this.rockEdges(r, yy);
          x = side < 0 ? l - 40 - Math.random() * 90 : rr + 40 + Math.random() * 90;
          y = yy;
        } else y = 90 + Math.random() * (this.floorY(x) - 160);
        break;
      }
      case 'deep': y = this.floorY(x) - 40 - Math.random() * 90; break;
      case 'open': y = 40 + Math.random() * Math.min(260, this.floorY(x) - 120); break;
      default: y = 50 + Math.random() * (this.floorY(x) - 130);
    }
    return { x, y: Math.max(26, y) };
  }
  insideRock(x, y, pad = 0) {
    for (const r of this.rocks) {
      if (y < r.top || y > r.bottom) continue;
      const [l, rr] = this.rockEdges(r, y);
      if (x > l - pad && x < rr + pad) return r;
    }
    return null;
  }
  addCreature(id, i = 0) {
    const def = CREATURE[id];
    const spot = this.randomSpot(def, i);
    const c = {
      id, def, x: spot.x, y: spot.y, hx: spot.x, hy: spot.y, vx: 0, vy: 0,
      tx: spot.x, ty: spot.y, dir: Math.random() < 0.5 ? -1 : 1, phase: Math.random() * 10,
      alive: true, respawn: 0, size: def.size, rock: spot.rock || null, inked: false, cool: 0, flying: false,
    };
    // 멸치·꽁치·오징어·자리돔은 작은 무리
    if (['anchovy', 'saury', 'squid', 'damsel'].includes(id)) c.school = true;
    this.creatures.push(c);
    return c;
  }

  // ---------- 장 준비 ----------
  setupStory() {
    const cfg = this.cfg;
    // 엽서 배치
    const ids = cfg.cards;
    const n = ids.length;
    ids.forEach((id, i) => {
      const x = cfg.escape ? [1700, 3100, 4500][i] : 700 + ((this.width - 1400) * (i + 0.5)) / n + (Math.random() - 0.5) * 200;
      let y = 120 + Math.random() * (this.floorY(x) - 240);
      // 바위 위 엽서 하나 (1장)
      const rk = this.rocks.find(r => r.top < -20 && Math.abs(r.x - x) < 500);
      if (cfg.n === 1 && i === 1 && rk) { this.cards.push({ id, x: rk.x, y: rk.top - 40, got: false }); return; }
      const rr = this.insideRock(x, y, 60);
      if (rr) {
        if (rr.top > 60 && rr.top - 60 > 60) y = rr.top - 60;           // 물속 바위면 그 위로
        else { const [l, r2] = this.rockEdges(rr, y); x = x < rr.x ? l - 90 : r2 + 90; }
      }
      y = Math.max(60, Math.min(this.floorY(x) - 70, y));
      this.cards.push({ id, x, y, got: false });
    });
    if (cfg.escape) {
      this.phase = 'scout';
      this.boats = [
        { x: 1500, dir: 1, speed: 70, min: 1100, max: 2300, warn: 0 },
        { x: 3100, dir: -1, speed: 90, min: 2500, max: 3700, warn: 0 },
        { x: 4400, dir: 1, speed: 110, min: 3900, max: 5000, warn: 0 },
      ];
      this.familyRock = this.rocks[0];
      this.family = [
        { kind: 'mom', x: 230, y: this.familyRock ? this.familyRock.top - 20 : 40, onRock: true, delay: 26 },
        { kind: 'grand', x: 300, y: this.familyRock ? this.familyRock.top - 20 : 40, onRock: true, delay: 52 },
      ];
    } else {
      this.family = [{ kind: 'mom', x: this.player.x - 80, y: 60, onRock: false, delay: 34, mentor: true }];
    }
    if (cfg.n === 1 && cfg.tutorial) {
      this.tutorial = {
        step: 0, dist: 0,
        steps: [
          { msg: '먼저 천천히 헤엄쳐 보렴', key: 'W A S D · 방향키' },
          { msg: '이번엔 힘차게 돌진해 보렴', key: 'Shift를 누른 채 이동' },
          { msg: '물 위로 올라가 볼까?', key: 'W · ↑ 로 위로 헤엄' },
          { msg: '앞에 있는 멸치에게 다가가 먹어 보렴', key: '멸치에 닿으면 냠냠!' },
          { msg: '가까운 바다 친구를 관찰해 보렴', key: 'E 키를 한 번 눌러요' },
        ],
      };
      // 튜토리얼용 멸치를 가까이
      const a = this.creatures.find(c => c.id === 'anchovy');
      if (a) { a.hx = a.tx = a.x = this.player.x + 420; a.hy = a.ty = a.y = 90; }
    }
  }
  setupFree() {
    this.free = { level: 0, xp: 0, start: performance.now(), elapsed: 0, done: false, finalEaten: 0 };
    this.player.stage = 0;
    this.player.r = 24 * STAGES[0].scale;
    // 구역 경계 (물살 벽)
    this.gates = [2100, 4200, 6300];
    this.spawnPowerups();
  }
  spawnPowerups() {
    for (let i = 0; i < 9; i++) {
      const p = POWERUPS[i % POWERUPS.length];
      const x = 400 + Math.random() * (this.width - 800);
      this.powerups.push({ ...p, x, y: 80 + Math.random() * (this.floorY(x) - 180), alive: true, respawn: 0 });
    }
  }

  // ---------- 입력 ----------
  press(key) { this.pressed[key] = true; }

  // ---------- 업데이트 ----------
  update(dt) {
    if (this.paused) return;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const p = this.player;
    if (this.observing) this.updateObserve(dt);
    else this.updatePlayer(dt);
    this.updateCreatures(dt);
    this.updateFamily(dt);
    this.updateCards();
    if (this.mode === 'story' && this.cfg.escape) this.updateEscape(dt);
    if (this.mode === 'free') this.updateFree(dt);
    this.updatePortal();
    this.updateTutorial(dt);
    // 효과
    for (const k of Object.keys(this.effects)) { this.effects[k] -= dt; if (this.effects[k] <= 0) delete this.effects[k]; }
    this.ink = Math.max(0, this.ink - dt * 0.6);
    p.hurt = Math.max(0, p.hurt - dt);
    p.slow = Math.max(0, p.slow - dt);
    p.moodT = Math.max(0, p.moodT - dt); if (p.moodT <= 0) p.mood = 'normal';
    // 팝업·물방울
    this.popups = this.popups.filter(q => (q.t += dt) < 1.4);
    if (Math.random() < 0.25 && p.y > 0) this.bubbles.push({ x: p.x - p.dir * 20, y: p.y - 6, r: 2 + Math.random() * 3, vy: -30 - Math.random() * 40, life: 2 });
    if (Math.random() < 0.15) { const bx = this.cam.x + (Math.random() - 0.5) * 1400; this.bubbles.push({ x: bx, y: this.floorY(bx) - 4, r: 1.5 + Math.random() * 2.5, vy: -25, life: 6 }); }
    this.bubbles = this.bubbles.filter(b => { b.y += b.vy * dt; b.x += Math.sin(this.t * 3 + b.r) * 0.3; b.life -= dt; return b.life > 0 && b.y > 0; });
    // 카메라
    const lookAhead = p.vx * 0.25;
    this.cam.x += (p.x + lookAhead - this.cam.x) * Math.min(1, dt * 3);
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 3);
    this.cam.y = Math.max(-140, Math.min(this.floorBase - 120, this.cam.y));
    this.pressed = {};
  }

  canDash() {
    if (this.mode === 'story' && this.cfg.escape && this.phase === 'lead') return false;
    return true;
  }

  updatePlayer(dt) {
    const p = this.player, inp = this.input;
    const st = STAGES[p.stage];
    const ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const ay = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    if (ax) p.dir = ax;
    const boostOn = inp.dash && p.boost > 0.05 && this.canDash() && (ax || ay);
    if (inp.dash && !this.canDash() && (ax || ay) && !this._noDashMsg) { this.toast('가족과 함께일 때는 돌진할 수 없어요'); this._noDashMsg = 3; }
    if (this._noDashMsg) this._noDashMsg = Math.max(0, this._noDashMsg - dt) || 0;
    if (boostOn && !p.dashing) sfx('dash');
    p.dashing = boostOn;
    if (boostOn) p.boost = Math.max(0, p.boost - dt);
    else p.boost = Math.min(p.boostMax, p.boost + dt * 0.55);
    const speedMul = st.speed * (this.effects.speed ? 1.35 : 1) * (p.slow > 0 ? 0.45 : 1);

    if (this.pressed.observe) this.tryObserve();

    if (p.state === 'rock') {
      const r = p.rock;
      p.vx = ax * 150 * speedMul;
      p.x += p.vx * dt;
      p.y = r.top - p.r * 0.7;
      p.vy = 0;
      p.angle = 0;
      if (p.x < r.x0 || p.x > r.x1) { p.state = 'air'; p.vy = -60; p.rock = null; }
      if (this.pressed.climb || (inp.down && !this._rockHold)) {
        // 가까운 가장자리로 뛰어내리기
        const toL = p.x - r.x0, toR = r.x1 - p.x;
        const d = toL < toR ? -1 : 1;
        if (Math.min(toL, toR) < 70 || this.pressed.climb) {
          p.dir = d; p.state = 'air'; p.vx = d * 230; p.vy = -220; p.rock = null;
          p.x = d < 0 ? Math.min(p.x, r.x0 + 2) : Math.max(p.x, r.x1 - 2);
          sfx('click');
        } else if (!this._edgeMsg) { this.toast('바위 가장자리로 가서 아래로'); this._edgeMsg = 2; }
      }
      this._rockHold = inp.down;
      if (this._edgeMsg) this._edgeMsg = Math.max(0, this._edgeMsg - dt) || 0;
      return;
    }

    if (p.state === 'air') {
      p.vy += 980 * dt;
      p.vx *= 1 - 0.4 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.angle = Math.atan2(p.vy, Math.abs(p.vx) + 60) * 0.6;
      // 바위 위 착지
      for (const r of this.rocks) {
        if (r.top < 0 && p.vy > 0 && p.x > r.x0 && p.x < r.x1 && p.y >= r.top - p.r && p.y < r.top + 20) {
          p.state = 'rock'; p.rock = r; p.y = r.top - p.r * 0.7; sfx('bump');
          this.onRockLand(r);
          return;
        }
      }
      this.collideRocks(p);
      if (p.y > 0) { p.state = 'swim'; p.vy *= 0.4; sfx('splash'); this.splash(p.x); }
      return;
    }

    // ---- 물속 ----
    const accel = (boostOn ? 1700 : 900) * speedMul;
    const maxV = (boostOn ? 430 : 230) * speedMul;
    p.vx += ax * accel * dt;
    p.vy += ay * accel * dt;
    const drag = 1 - Math.min(1, 2.6 * dt);
    p.vx *= drag; p.vy *= drag;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > maxV) { p.vx *= maxV / sp; p.vy *= maxV / sp; }
    // 수면 근처에서 둥둥
    if (p.y < 16 && !inp.down) {
      if (boostOn && inp.up && p.vy < -260) {
        // 수면 위로 훌쩍
        p.state = 'air'; p.vy = Math.min(p.vy, -420); sfx('splash'); this.splash(p.x);
        this.popup(p.x, p.y - 40, '훌쩍!', '#fff');
      } else {
        p.y = Math.max(p.y, 2 + Math.sin(this.t * 2.5) * 2);
        if (p.vy < 0) p.vy *= 0.6;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.angle = Math.atan2(p.vy, Math.abs(p.vx) + 40) * 0.8;
    // 바위 오르기: 수면에서 바위 옆 + F 또는 바위 쪽으로 위
    if (p.y < 30) {
      for (const r of this.rocks) {
        if (r.top >= -10) continue;
        const [l, rr] = this.rockEdges(r, 0);
        const near = (p.x < r.x && l - p.x < 60 && l - p.x > -10) || (p.x > r.x && p.x - rr < 60 && p.x - rr > -10);
        if (near && (this.pressed.climb || (inp.up && ((p.x < r.x && ax > 0) || (p.x > r.x && ax < 0))))) {
          p.state = 'rock'; p.rock = r;
          p.x = p.x < r.x ? r.x0 + 20 : r.x1 - 20;
          p.y = r.top - p.r * 0.7; sfx('bark');
          this.popup(p.x, p.y - 50, '영차!', '#fff');
          this.onRockLand(r);
          return;
        }
      }
    }
    this.collideRocks(p);
    // 바닥
    const fy = this.floorY(p.x) - p.r;
    if (p.y > fy) { p.y = fy; p.vy = Math.min(0, p.vy); }
    // 세계 경계
    p.x = Math.max(60, Math.min(this.width - 60, p.x));
    // 자유 탐험 구역 경계
    if (this.mode === 'free') {
      for (let i = 0; i < this.gates.length; i++) {
        const gx = this.gates[i];
        if (this.free.level <= i && p.x > gx - p.r) {
          p.x = gx - p.r; p.vx = -80;
          if (!this._gateMsg) { this.toast('아직 작아요! 더 자라야 다음 바다로 갈 수 있어요'); this._gateMsg = 2.5; }
        }
      }
      if (this._gateMsg) this._gateMsg = Math.max(0, this._gateMsg - dt) || 0;
    }
    this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 200) this.trail.shift();
    if (this.tutorial) this.tutorial.dist += Math.hypot(p.vx, p.vy) * dt;
  }

  onRockLand(r) {
    if (this.tutorial) return;
    this.hooks.mentor?.('바위 위에서는 ← → 로 걷고, 가장자리에서 ↓ 로 바다에 들어가요');
  }

  collideRocks(p) {
    for (const r of this.rocks) {
      if (p.y < r.top - p.r * 0.5 || p.y > r.bottom) continue;
      const [l, rr] = this.rockEdges(r, Math.max(p.y, r.top));
      if (p.x > l - p.r && p.x < rr + p.r) {
        if (p.y < r.top + 10 && p.state !== 'swim') continue;
        const dl = p.x - (l - p.r), dr = rr + p.r - p.x;
        if (dl < dr) { p.x = l - p.r; if (p.vx > 0) p.vx = 0; }
        else { p.x = rr + p.r; if (p.vx < 0) p.vx = 0; }
      }
    }
  }

  splash(x) {
    for (let i = 0; i < 12; i++) this.bubbles.push({ x: x + (Math.random() - 0.5) * 40, y: 8 + Math.random() * 20, r: 2 + Math.random() * 3, vy: -20 - Math.random() * 30, life: 1 });
  }

  // ---------- 관찰 ----------
  tryObserve() {
    const p = this.player;
    const near = this.creatures
      .filter(c => c.alive && Math.hypot(c.x - p.x, c.y - p.y) < 170 + c.size)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const uniq = [];
    for (const c of near) if (!uniq.find(u => u.id === c.id)) uniq.push(c);
    if (!uniq.length) { this.toast('가까이에 관찰할 친구가 없어요'); return; }
    if (uniq.length === 1) this.startObserve(uniq[0]);
    else {
      this.paused = true;
      this.hooks.chooseObserve(uniq.slice(0, 4).map(c => c.id), (id) => {
        this.paused = false;
        if (id) this.startObserve(uniq.find(c => c.id === id));
      });
    }
  }
  startObserve(c) {
    this.observing = { c, t: 0 };
    this.player.vx *= 0.2; this.player.vy *= 0.2;
  }
  updateObserve(dt) {
    const o = this.observing;
    o.t += dt;
    const p = this.player;
    p.vx *= 0.9; p.vy *= 0.9;
    if (p.state === 'swim') { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (o.t > 1.1) {
      this.observing = null;
      const id = o.c.id;
      const first = !this.stats.observed.has(id);
      this.stats.observed.add(id);
      sfx('observe');
      this.popup(o.c.x, o.c.y - 30, `${o.c.def.name} 관찰 성공`, '#bff3ff');
      p.mood = 'happy'; p.moodT = 1.5;
      if (this.mode === 'free' && first) { this.addXp(2); this.popup(p.x, p.y - 60, '새 친구 보너스!', '#ffe08a'); }
      this.hooks.observed(id, first);
      if (this.tutorial && this.tutorial.step === 4) this.tutorial.step = 5;
    }
  }

  // ---------- 생물 ----------
  updateCreatures(dt) {
    const p = this.player;
    const pStage = this.mode === 'free' ? this.free.level : p.stage;
    for (const c of this.creatures) {
      if (!c.alive) {
        c.respawn -= dt;
        if (c.respawn <= 0) {
          const s = this.randomSpot(c.def, Math.floor(Math.random() * 9));
          Object.assign(c, { x: s.x, y: s.y, hx: s.x, hy: s.y, tx: s.x, ty: s.y, alive: true, inked: false, rock: s.rock || null });
        }
        continue;
      }
      c.phase += dt;
      c.cool = Math.max(0, c.cool - dt);
      const def = c.def;
      const dx = c.x - p.x, dy = c.y - p.y;
      const dist = Math.hypot(dx, dy);
      const moving = ['mid', 'open', 'reef', 'deep'].includes(def.zone) || c.id === 'jelly';
      if (moving) {
        // 목표 지점 바꾸기
        if (Math.hypot(c.tx - c.x, c.ty - c.y) < 20 || Math.random() < dt * 0.25) {
          c.tx = c.hx + (Math.random() - 0.5) * 500;
          c.ty = Math.max(30, Math.min(this.floorY(c.tx) - 40, c.hy + (Math.random() - 0.5) * 160));
        }
        let spd = c.id === 'jelly' ? 18 : def.zone === 'open' ? 70 : 50;
        let fx = c.tx - c.x, fy = c.ty - c.y;
        const fl = Math.hypot(fx, fy) || 1;
        fx /= fl; fy /= fl;
        // 강치를 피해 도망 (먹이)
        const canEat = def.role === 'food' && pStage >= def.minStage;
        if (canEat && dist < 140 && c.id !== 'jelly') {
          fx = dx / (dist || 1); fy = dy / (dist || 1); spd *= 1.8;
        }
        // 방어: 작은 강치에게 다가와 위협
        if (c.id === 'yellowtail' && !canEat && dist < 220) { fx = -dx / dist; fy = -dy / dist; spd = 60; }
        c.vx += (fx * spd - c.vx) * Math.min(1, dt * 2);
        c.vy += (fy * spd - c.vy) * Math.min(1, dt * 2);
        if (c.id === 'jelly') c.vy += Math.sin(c.phase * 1.3) * 8 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.y = Math.max(24, Math.min(this.floorY(c.x) - 18, c.y));
        if (Math.abs(c.vx) > 3) c.dir = c.vx > 0 ? 1 : -1;
        // 바위 밖으로 밀기
        const r = this.insideRock(c.x, c.y, 10);
        if (r) { const [l, rr] = this.rockEdges(r, c.y); c.x = c.x - l < rr - c.x ? l - 12 : rr + 12; c.tx = c.hx = c.x + (c.x < r.x ? -150 : 150); }
      }
      if (c.id === 'gull' && c.rock) {
        // 강치가 가까이 오면 잠깐 날아오름
        if (dist < 90 && !c.flying) { c.flying = true; c.fly = 0; }
        if (c.flying) {
          c.fly += dt;
          c.y = c.rock.top - 2 - Math.sin(Math.min(1, c.fly / 2) * Math.PI) * 70;
          if (c.fly > 2) { c.flying = false; c.y = c.rock.top - 2; }
        }
      }
      // 문어 먹물
      if (c.id === 'octopus' && !c.inked && dist < 110) {
        c.inked = true; this.ink = 1.6; this.toast('문어가 먹물을 뿜었어요! 얼른 뒤로!');
        c.y -= 30; c.x += dx > 0 ? 80 : -80;
      }
      // 충돌
      if (dist < p.r + def.size * 0.5 && !this.observing && p.state !== 'rock') this.touchCreature(c, pStage);
    }
  }

  touchCreature(c, pStage) {
    const p = this.player, def = c.def;
    if (def.role === 'food') {
      if (pStage >= def.minStage) {
        c.alive = false; c.respawn = this.mode === 'free' ? 3 : 7;
        const first = !this.stats.eatenIds.has(c.id);
        this.stats.eatenIds.add(c.id);
        this.stats.food++;
        sfx('eat');
        p.mood = 'happy'; p.moodT = 0.8;
        p.health = Math.min(100, p.health + 4);
        this.popup(c.x, c.y - 20, '냠냠!', '#ffe08a');
        if (this.mode === 'free') {
          const lv = FREE_LEVELS[this.free.level];
          if (lv.food.includes(c.id)) this.addXp(this.effects.double ? 2 : 1);
          if (this.free.level === 3 && c.id === 'yellowtail') this.free.finalEaten++;
        }
        this.hooks.eaten(c.id, first);
        if (this.tutorial && this.tutorial.step === 3 && c.id === 'anchovy') this.tutorial.step = 4;
      } else if (c.cool <= 0) {
        c.cool = 1.2;
        if (c.id === 'yellowtail') this.damage(14, c, `${def.name} 반격! 옆으로 피해요`);
        else { this.knock(c, 160); this.toast('앗, 아직 너무 커! 더 자라면 먹을 수 있어요'); sfx('bump'); }
      }
    } else if (def.role === 'hazard') {
      if (c.cool <= 0) { c.cool = 1.4; this.damage(c.id === 'urchin' ? 12 : 10, c, c.id === 'urchin' ? '앗, 따끔! 가시 조심' : '앗, 따끔! 해파리 조심'); }
    }
  }
  knock(c, f) {
    const p = this.player;
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
    p.vx = (dx / d) * f; p.vy = (dy / d) * f;
  }
  damage(n, src, msg) {
    const p = this.player;
    if (p.hurt > 0) return;
    if (this.effects.shield) { this.popup(p.x, p.y - 40, '보호막!', '#bff3ff'); delete this.effects.shield; p.hurt = 0.8; return; }
    p.health -= n; p.hurt = 1.2; this.stats.hits++;
    sfx('hurt');
    if (src) this.knock(src, 240);
    if (msg) this.toast(msg);
    this.popup(p.x, p.y - 40, '앗!', '#ffb3a7');
    if (p.health <= 0) this.faint();
  }
  faint() {
    const p = this.player;
    this.stats.faints++;
    p.health = 100;
    p.x = this.checkpoint.x; p.y = this.checkpoint.y; p.vx = p.vy = 0; p.state = 'swim'; p.rock = null;
    this.toast('바위 틈에서 숨을 고르고 다시 출발! 모은 기록은 그대로예요');
    if (this.cfg.escape && this.phase === 'lead') this.family.forEach((f, i) => { f.x = p.x - 60 - i * 50; f.y = p.y; });
  }

  // ---------- 가족 (따라오기) ----------
  updateFamily(dt) {
    const p = this.player;
    for (const f of this.family) {
      if (f.onRock) {
        f.y = (this.familyRock ? this.familyRock.top : 0) - 18;
        continue;
      }
      const idx = Math.max(0, this.trail.length - 1 - f.delay);
      const target = this.trail[idx] || { x: p.x - 80, y: p.y };
      const spd = f.kind === 'grand' ? 2.2 : 3;
      const ox = f.mentor ? -p.dir * 30 : 0;
      f.vx = (target.x + ox - f.x) * spd;
      f.vy = (target.y - 30 - f.y) * spd;
      // 강이와 너무 붙지 않게 거리 두기
      const dpx = f.x - p.x, dpy = f.y - p.y, dd = Math.hypot(dpx, dpy);
      if (dd < 100) { f.vx += (dpx / (dd || 1)) * (100 - dd) * 3; f.vy += (dpy / (dd || 1)) * (100 - dd) * 1.5; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.y = Math.max(4, Math.min(this.floorY(f.x) - 20, f.y));
      if (Math.abs(f.vx) > 4) f.dir = f.vx > 0 ? 1 : -1;
    }
  }

  // ---------- 엽서 ----------
  updateCards() {
    const p = this.player;
    for (const c of this.cards) {
      if (c.got) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < p.r + 30) {
        c.got = true; this.stats.cards++;
        sfx('card');
        this.checkpoint = { x: c.x, y: Math.max(40, c.y) };
        this.hooks.card(c.id, this);
      }
    }
  }

  goalsMet() {
    const g = this.cfg.goals;
    return this.stats.food >= g.food && this.stats.observed.size >= g.observe && this.stats.cards >= g.cards;
  }

  updatePortal() {
    if (this.mode !== 'story') return;
    const p = this.player;
    if (this.cfg.escape) {
      if (this.phase === 'lead' && !this.portal) this.portal = { x: this.width - 220, y: 160 };
    } else if (!this.portal && this.goalsMet()) {
      // 강치 앞쪽에 포털 열기
      let x = Math.min(this.width - 200, p.x + 520);
      if (x > this.width - 300) x = p.x - 520;
      let y = 160;
      while (this.insideRock(x, y, 70)) x += 120;
      this.portal = { x, y };
      sfx('portal');
      this.hooks.portalOpen?.();
    }
    if (this.portal && Math.hypot(this.portal.x - p.x, this.portal.y - p.y) < 60 && !this._portalUsed) {
      if (this.cfg.escape) {
        const allNear = this.family.every(f => Math.hypot(f.x - p.x, f.y - p.y) < 260);
        if (!allNear) { if (!this._waitMsg) { this.toast('가족이 아직 뒤에 있어요! 함께 들어가요'); this._waitMsg = 2; } return; }
      }
      this._portalUsed = true;
      sfx('portal');
      this.hooks.portal();
    }
    if (this._waitMsg) this._waitMsg = Math.max(0, this._waitMsg - 1 / 60) || 0;
  }

  // ---------- 4장: 정찰과 피난 ----------
  updateEscape(dt) {
    const p = this.player;
    // 배 움직임
    for (const b of this.boats) {
      if (this.phase === 'scout') {
        b.x += b.dir * b.speed * dt;
        if (b.x > b.max) b.dir = -1;
        if (b.x < b.min) b.dir = 1;
      } else {
        // 쫓아오기
        const target = p.x - 380;
        b.dir = target > b.x ? 1 : -1;
        b.x += Math.sign(target - b.x) * Math.min(Math.abs(target - b.x), (this.phase === 'return' ? 120 : 95) * dt * 1.2);
      }
      // 그림자 안에 있으면 그물
      const inShadow = p.state === 'swim' && Math.abs(p.x - b.x) < 70 && p.y < 230;
      if (inShadow) {
        b.warn += dt;
        if (b.warn > 0.7) {
          b.warn = -1.5;
          this.nets.push({ x: p.x - 60, y: -10, w: 120, h: 90, vy: 220, life: 3, hit: false });
          this.toast('앗, 배 그림자 아래는 위험해! 그물이 내려와요');
        }
      } else if (b.warn > 0) b.warn = Math.max(0, b.warn - dt);
      else b.warn = Math.min(0, b.warn + dt);
    }
    // 피난 중 앞쪽에 그물 내리기
    if (this.phase === 'lead' || this.phase === 'return') {
      this._netT = (this._netT || 0) - dt;
      if (this._netT <= 0) {
        this._netT = this.phase === 'lead' ? 2.6 : 3.4;
        const ahead = p.x + (this.phase === 'lead' ? 1 : -1) * (300 + Math.random() * 300);
        this.nets.push({ x: ahead - 70, y: -10, w: 140, h: 100, vy: 120, life: 6, hit: false });
      }
    }
    for (const n of this.nets) {
      n.y += n.vy * dt; n.life -= dt;
      const floor = this.floorY(n.x + n.w / 2) - n.h;
      if (n.y > floor) { n.y = floor; n.vy = 0; }
      if (!n.hit && p.x > n.x && p.x < n.x + n.w && p.y > n.y && p.y < n.y + n.h) {
        n.hit = true;
        p.slow = 1.4;
        this.damage(12, null, n.vy === 0 ? '바닥에도 그물이 있어! 앗, 그물에 걸렸어!' : '앗, 그물에 걸렸어! 휴, 빠져나왔다!');
      }
    }
    this.nets = this.nets.filter(n => n.life > 0);
    // 단계 전환
    if (this.phase === 'scout' && this.cards.every(c => c.got)) {
      this.phase = 'return';
      this.hooks.mentor?.('앗, 배가 그물을 끌며 따라와! 왼쪽 가족 바위까지 서둘러 돌아가요');
      this.toast('귀환 질주 · 가족에게 돌아가기');
    }
    if (this.phase === 'return' && this.familyRock && p.x < this.familyRock.x1 + 260) {
      this.phase = 'lead_wait';
      this.hooks.returned();
    }
  }
  startLead() {
    this.phase = 'lead';
    const p = this.player;
    this.nets = [];
    this.boats.forEach((b, i) => { b.x = p.x - 700 - i * 250; });
    this.family.forEach((f, i) => { f.onRock = false; f.x = p.x - 60 - i * 40; f.y = 40; });
    this.trail = [];
    for (let i = 0; i < 80; i++) this.trail.push({ x: p.x - 2 * (80 - i), y: p.y });
    this.checkpoint = { x: p.x, y: 60 };
  }

  // ---------- 자유 탐험 ----------
  addXp(n) {
    const f = this.free;
    if (f.done) return;
    f.xp += n;
    const lv = FREE_LEVELS[f.level];
    if (f.level < 3 && f.xp >= lv.xp) {
      f.level++; f.xp = 0;
      const p = this.player;
      p.stage = f.level;
      p.r = 24 * STAGES[f.level].scale;
      sfx('grow');
      this.hooks.levelUp(f.level);
    }
  }
  updateFree(dt) {
    const f = this.free;
    if (!f.done) f.elapsed += dt * 1000;
    // 구역별 색
    const area = Math.min(3, Math.floor(this.player.x / 2100));
    const tint = FREE_LEVELS[area].tint;
    this.tint = tint;
    // 아이템
    const p = this.player;
    for (const u of this.powerups) {
      if (!u.alive) { u.respawn -= dt; if (u.respawn <= 0) { u.alive = true; } continue; }
      if (Math.hypot(u.x - p.x, u.y - p.y) < p.r + 22) {
        u.alive = false; u.respawn = 12;
        sfx('card');
        if (u.id === 'heal') p.health = 100;
        else this.effects[u.id] = u.dur;
        this.popup(u.x, u.y - 30, u.name, '#ffe08a');
      }
    }
    if (f.level === 3 && f.finalEaten >= FREE_LEVELS[3].xp && !f.done) {
      f.done = true;
      this.hooks.freeDone(Math.round(f.elapsed));
    }
  }

  // ---------- 튜토리얼 ----------
  updateTutorial(dt) {
    const tu = this.tutorial;
    if (!tu) return;
    const p = this.player;
    if (tu.step === 0 && tu.dist > 260) tu.step = 1;
    else if (tu.step === 1 && p.dashing) { tu.step = 2; }
    else if (tu.step === 2 && p.y < 10) tu.step = 3;
    if (tu.step >= 5) {
      this.tutorial = null;
      this.hooks.mentor?.('좋아! 이제 바다에 떨어진 낱말 엽서를 찾아보자');
      this.hooks.tutorialDone?.();
    }
  }

  toast(msg) { this.hooks.toast(msg); }
  popup(x, y, text, color) { this.popups.push({ x, y, text, color, t: 0 }); }

  // =============================================================
  //  그리기
  // =============================================================
  draw(ctx, cw, ch) {
    const scale = ch / VIEW_H;
    const vw = cw / scale;
    const camX = Math.max(vw / 2, Math.min(this.width - vw / 2, this.cam.x));
    const camY = this.cam.y;
    const left = camX - vw / 2;
    const top = camY - VIEW_H / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-left, -top);
    const t = this.t;

    // 하늘
    if (top < 0) {
      ctx.save();
      ctx.translate(left, 0);
      A.drawSky(ctx, vw, top, 0, this.tint, this.storm);
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 420 - left * 0.15 + t * 6) % (vw + 300) + vw + 300) % (vw + 300) - 150;
        A.drawCloud(ctx, cx, -230 + (i % 3) * 40, 0.8 + (i % 2) * 0.4);
      }
      // 먼 섬 (패럴랙스)
      A.drawFarIslands(ctx, vw * 0.6 - (left * 0.08) % 2400, 0, 1.15);
      ctx.restore();
    }

    // 바다 (깊이 그라데이션)
    const seaBottom = this.floorBase + 200;
    const g = ctx.createLinearGradient(0, 0, 0, seaBottom);
    g.addColorStop(0, this.tint[0]);
    g.addColorStop(0.35, this.tint[1]);
    g.addColorStop(1, this.tint[2]);
    ctx.fillStyle = g;
    ctx.fillRect(left, 0, vw, seaBottom - 0 + 400);

    // 빛줄기
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const bx = left + ((i * 260 + t * 12 - left * 0.3) % (vw + 260) + vw + 260) % (vw + 260) - 130;
      const lg = ctx.createLinearGradient(0, 0, 0, 360);
      lg.addColorStop(0, 'rgba(255,255,255,0.09)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 60, 0); ctx.lineTo(bx + 140, 360); ctx.lineTo(bx + 40, 360); ctx.fill();
    }
    ctx.restore();

    // 먼 해조 실루엣
    ctx.fillStyle = 'rgba(0,20,30,0.18)';
    for (let x = Math.floor(left / 90) * 90; x < left + vw + 90; x += 90) {
      const fy = this.floorY(x) - 10;
      const hh = 60 + A.hash(x) * 90;
      const sw = Math.sin(t + x) * 8;
      ctx.beginPath(); ctx.moveTo(x - 6, fy); ctx.quadraticCurveTo(x + sw, fy - hh / 2, x + sw * 1.4, fy - hh); ctx.quadraticCurveTo(x + 6 + sw, fy - hh / 2, x + 6, fy); ctx.fill();
    }

    // 바닥
    ctx.fillStyle = '#c9b48a';
    ctx.beginPath();
    ctx.moveTo(left - 20, seaBottom + 400);
    for (let x = left - 20; x <= left + vw + 20; x += 20) ctx.lineTo(x, this.floorY(x));
    ctx.lineTo(left + vw + 20, seaBottom + 400);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,30,50,0.35)';
    ctx.fill();
    ctx.fillStyle = 'rgba(90,70,40,0.35)';
    for (let x = Math.floor(left / 46) * 46; x < left + vw; x += 46) {
      const fy = this.floorY(x);
      ctx.beginPath(); ctx.ellipse(x + A.hash(x) * 20, fy + 8, 7 + A.hash(x + 1) * 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    }

    // 자유 탐험 물살 벽
    if (this.mode === 'free') {
      this.gates.forEach((gx, i) => {
        if (this.free.level > i) return;
        const wave = ctx.createLinearGradient(gx - 40, 0, gx + 10, 0);
        wave.addColorStop(0, 'rgba(255,255,255,0)');
        wave.addColorStop(1, 'rgba(200,240,255,0.35)');
        ctx.fillStyle = wave;
        ctx.fillRect(gx - 40, 0, 50, this.floorBase + 200);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        for (let y = 20; y < this.floorBase; y += 40) {
          ctx.beginPath(); ctx.moveTo(gx - 20 + Math.sin(t * 3 + y) * 6, y); ctx.lineTo(gx + Math.sin(t * 3 + y) * 6, y + 24); ctx.stroke();
        }
        ctx.save();
        ctx.font = '700 20px "Jua", sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(`${FREE_LEVELS[i + 1].name}부터`, gx - 20, 120);
        ctx.restore();
      });
    }

    // 바위
    for (const r of this.rocks) {
      if (r.x1b < left - 200 || r.x0b > left + vw + 200) continue;
      A.drawRock(ctx, r, t);
      if (r.name) {
        ctx.save();
        ctx.font = '700 15px "Jua", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        ctx.strokeText(r.name, r.x, r.top - 46);
        ctx.fillText(r.name, r.x, r.top - 46);
        ctx.restore();
      }
    }

    // 생물
    for (const c of this.creatures) {
      if (!c.alive || c.x < left - 120 || c.x > left + vw + 120) continue;
      const schoolN = c.school ? (c.id === 'anchovy' ? 5 : 3) : 1;
      for (let k = 0; k < schoolN; k++) {
        const ox = k ? Math.sin(k * 2.3 + c.phase * 0.7) * 22 - k * 6 * c.dir : 0;
        const oy = k ? Math.cos(k * 1.7 + c.phase * 0.9) * 14 : 0;
        A.drawCreature(ctx, c.id, c.x + ox, c.y + oy, c.size, { dir: c.dir, t: t + c.phase + k, flying: c.flying });
      }
      // 먹을 수 있는/관찰한 표시
      const near = Math.hypot(c.x - this.player.x, c.y - this.player.y) < 170 + c.size;
      if (near && !this.observing) {
        ctx.save();
        ctx.strokeStyle = this.stats.observed.has(c.id) ? 'rgba(180,255,200,0.6)' : 'rgba(255,255,255,0.55)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(c.x, c.y - (c.def.zone === 'floor' ? 10 : 0), c.size * 0.9 + 8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // 아이템
    for (const u of this.powerups) {
      if (!u.alive) continue;
      const y = u.y + Math.sin(t * 2 + u.x) * 6;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(u.x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff6c8';
      ctx.fillText(u.icon, u.x, y + 1);
      ctx.restore();
    }

    // 엽서
    for (const c of this.cards) if (!c.got) A.drawCardPickup(ctx, c.x, c.y, t + c.x, this.cfg.escape ? '엽서 조각' : '낱말 엽서');

    // 포털
    if (this.portal) A.drawPortal(ctx, this.portal.x, this.portal.y, t, true);

    // 그물
    for (const n of this.nets) A.drawNet(ctx, n.x, n.y, n.w, n.h, Math.min(1, n.life));

    // 가족
    for (const f of this.family) {
      const sc = f.kind === 'grand' ? 0.98 : f.kind === 'mom' ? 1.05 : 0.9;
      A.drawSeal(ctx, f.x, f.y, sc, { kind: f.kind, dir: f.dir || 1, t: t + (f.kind === 'grand' ? 1 : 0), onRock: f.onRock, swim: f.onRock ? 0 : 0.6 });
    }

    // 플레이어
    const p = this.player;
    const sc = STAGES[p.stage].scale;
    if (p.dashing) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(p.x - p.dir * (40 + i * 10) * sc, p.y - 10 + i * 7); ctx.lineTo(p.x - p.dir * (80 + i * 14) * sc, p.y - 10 + i * 7); ctx.stroke(); }
      ctx.restore();
    }
    if (this.effects.shield) {
      ctx.save(); ctx.strokeStyle = 'rgba(160,230,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 22, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    A.drawSeal(ctx, p.x, p.y, sc, { kind: 'kang', dir: p.dir, angle: p.state === 'rock' ? 0 : p.angle, t, swim: p.state === 'rock' ? Math.min(1, Math.abs(p.vx) / 100) : 1, hurt: p.hurt, onRock: p.state === 'rock', mood: p.mood });
    // 이름표
    ctx.save();
    ctx.font = '700 13px "Jua", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('강이', p.x, p.y - 34 * sc - 8);
    ctx.restore();

    // 관찰 중 링
    if (this.observing) {
      const o = this.observing;
      ctx.save();
      ctx.strokeStyle = '#bff3ff';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(o.c.x, o.c.y - 6, o.c.size + 16, -Math.PI / 2, -Math.PI / 2 + (o.t / 1.1) * Math.PI * 2); ctx.stroke();
      ctx.font = '700 15px "Jua", sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('관찰 중…', o.c.x, o.c.y - o.c.size - 26);
      ctx.restore();
    }

    // 배 (수면 위)
    for (const b of this.boats) {
      // 그림자
      const sg = ctx.createLinearGradient(0, 0, 0, 240);
      sg.addColorStop(0, `rgba(0,0,0,${b.warn > 0 ? 0.35 : 0.22})`);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(b.x - 70, 0); ctx.lineTo(b.x + 70, 0); ctx.lineTo(b.x + 90, 240); ctx.lineTo(b.x - 90, 240); ctx.fill();
      if (b.warn > 0) {
        ctx.save(); ctx.font = '700 22px "Jua", sans-serif'; ctx.fillStyle = '#ffdf6b'; ctx.textAlign = 'center';
        ctx.fillText('!', b.x, 60); ctx.restore();
      }
      A.drawBoat(ctx, b.x, -2, b.dir, t, 'fishing');
    }
    // 먼 군함 (4장 분위기)
    if (this.storm && top < 0) A.drawBoat(ctx, left + vw * 0.85 - (left * 0.05) % 600, -6, -1, t, 'warship');

    // 수면 물결
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = left - 20; x <= left + vw + 20; x += 16) {
      const y = Math.sin(x * 0.02 + t * 2) * 3 + Math.sin(x * 0.007 - t) * 2;
      if (x === left - 20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // 물방울
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (const b of this.bubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }

    // 팝업 글자
    for (const q of this.popups) {
      ctx.save();
      ctx.globalAlpha = 1 - q.t / 1.4;
      ctx.font = '700 18px "Jua", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,30,50,0.6)';
      ctx.strokeText(q.text, q.x, q.y - q.t * 40);
      ctx.fillStyle = q.color;
      ctx.fillText(q.text, q.x, q.y - q.t * 40);
      ctx.restore();
    }

    ctx.restore();

    // 먹물
    if (this.ink > 0) {
      ctx.fillStyle = `rgba(10,10,20,${Math.min(0.75, this.ink * 0.5)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    // 깊이에 따른 어둠
    const depth = Math.max(0, p.y);
    const dark = Math.min(0.35, depth / 1600);
    if (dark > 0.02) {
      const vg = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.2, cw / 2, ch / 2, ch * 0.9);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,10,25,${dark * 2})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  depthMeters() { return Math.max(0, Math.round(this.player.y / PX_PER_M)); }
  maxDepth() { return Math.round((this.floorBase + 55) / PX_PER_M); }
  progress() { return this.player.x / this.width; }
}

// ---------- 장 설정 만들기 ----------
export function storyConfig(ch, opt = {}) {
  const floorBase = Math.round(ch.depth * PX_PER_M);
  const rocksByCh = {
    1: [{ x: 640, top: -78, w: 150, name: '가제바위' }, { x: 1750, top: 120, w: 110 }, { x: 2600, top: -40, w: 120, name: '작은 바위섬' }, { x: 3550, top: 160, w: 140 }],
    2: [{ x: 900, top: -50, w: 130, name: '촛대바위' }, { x: 2100, top: 140, w: 160 }, { x: 3000, top: 90, w: 120 }, { x: 3900, top: -60, w: 150, name: '독립문바위' }],
    3: [{ x: 700, top: -40, w: 120, name: '바위섬' }, { x: 2400, top: 300, w: 200 }, { x: 4100, top: 260, w: 170 }],
    4: [{ x: 260, top: -70, w: 200, name: '가족 바위' }, { x: 2050, top: 150, w: 140 }, { x: 3800, top: -40, w: 120 }, { x: 5000, top: -60, w: 140, name: '쉼터 바위' }],
  };
  return {
    mode: 'story', n: ch.n, width: ch.width, floorBase, tint: ch.tint, stage: ch.stage,
    goals: ch.goals, cards: ch.cards, spawn: ch.spawn, escape: !!ch.escape, storm: ch.n === 4,
    rocks: rocksByCh[ch.n], startX: ch.n === 4 ? 520 : 240, tutorial: opt.tutorial,
  };
}

export function freeConfig() {
  const width = 8400;
  // 구역마다 먹이 배치
  const area = (i) => 250 + i * 2100 + Math.random() * 1600;
  const zoneOf = { anchovy: 0, damsel: 0, rockfish: 1, octopus: 1, saury: 2, squid: 2, shrimp: 2, yellowtail: 3, jelly: -1, urchin: -1, kelp: 1, eisenia: 1, starfish: 0, oplegnathus: 1, wrasse: 3, abalone: 1, gull: 0, aster: 0, mussel: 0, seahare: 1 };
  return {
    mode: 'free', width, floorBase: 560, tint: FREE_LEVELS[0].tint, stage: 0,
    goals: { food: 0, observe: 0, cards: 0 }, cards: [],
    rocks: [{ x: 900, top: -60, w: 150, name: '가제바위' }, { x: 2900, top: 120, w: 160 }, { x: 5200, top: 240, w: 180 }, { x: 7400, top: 300, w: 200 }],
    spawn: [['anchovy', 12], ['damsel', 8], ['rockfish', 12], ['octopus', 4], ['saury', 12], ['squid', 10], ['shrimp', 6], ['yellowtail', 8], ['squid', 4], ['jelly', 8], ['urchin', 8], ['kelp', 6], ['eisenia', 6], ['starfish', 3], ['oplegnathus', 3], ['wrasse', 3], ['abalone', 3], ['gull', 2], ['aster', 2], ['mussel', 2], ['seahare', 2]],
    areaFor: (id) => { const z = zoneOf[id]; return z === -1 || z === undefined ? 300 + Math.random() * (width - 600) : area(z); },
    startX: 240,
  };
}
