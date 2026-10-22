// =============================================================
//  강치와 독도 · 그림 (캔버스로 직접 그리는 캐릭터·생물·배경)
// =============================================================

const TAU = Math.PI * 2;

export function lerp(a, b, t) { return a + (b - a) * t; }

// 간단한 결정적 노이즈
export function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
export function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}

// ---------- 강치 ----------
// kind: kang / mom / grand / other ; dir: 1(오른쪽) -1(왼쪽)
const SEAL_COLORS = {
  kang: { body: '#8b6a4e', belly: '#d9b892', dark: '#5e4430' },
  mom: { body: '#a07c5c', belly: '#e6c9a5', dark: '#6b4f38' },
  grand: { body: '#8a8580', belly: '#cfc8bf', dark: '#5a5550' },
  other: { body: '#7a6250', belly: '#c9ab8c', dark: '#4e3a2c' },
};

export function drawSeal(ctx, x, y, s, opt = {}) {
  const { kind = 'kang', dir = 1, angle = 0, t = 0, swim = 1, hurt = 0, onRock = false, mood = 'normal' } = opt;
  const c = SEAL_COLORS[kind] || SEAL_COLORS.kang;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.rotate(dir === 1 ? angle : -angle);
  if (hurt > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.5;
  const wig = Math.sin(t * 9) * 0.18 * swim;

  // 뒷지느러미
  ctx.save();
  ctx.translate(-46, 4);
  ctx.rotate(onRock ? 0.6 : wig);
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-18, -14, -26, -10);
  ctx.quadraticCurveTo(-16, 0, -26, 12);
  ctx.quadraticCurveTo(-16, 12, 0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 몸통
  const g = ctx.createLinearGradient(0, -24, 0, 24);
  g.addColorStop(0, c.body);
  g.addColorStop(1, c.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-50, 2);
  ctx.bezierCurveTo(-40, -22, 10, -26, 30, -16);
  ctx.bezierCurveTo(40, -10, 42, 10, 30, 16);
  ctx.bezierCurveTo(10, 24, -36, 20, -50, 6);
  ctx.closePath();
  ctx.fill();
  // 배
  ctx.fillStyle = c.belly;
  ctx.beginPath();
  ctx.moveTo(-36, 12);
  ctx.bezierCurveTo(-10, 22, 20, 20, 32, 10);
  ctx.bezierCurveTo(20, 14, -10, 14, -36, 12);
  ctx.fill();

  // 머리
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.ellipse(36, -12, 20, 17, -0.2, 0, TAU);
  ctx.fill();
  // 주둥이
  ctx.fillStyle = c.belly;
  ctx.beginPath();
  ctx.ellipse(52, -6, 11, 8, 0, 0, TAU);
  ctx.fill();
  // 코
  ctx.fillStyle = '#2b1d14';
  ctx.beginPath();
  ctx.ellipse(61, -9, 3.6, 2.8, 0, 0, TAU);
  ctx.fill();
  // 눈
  ctx.fillStyle = '#1b120c';
  ctx.beginPath();
  ctx.ellipse(41, -18, 4.6, 5.4, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(42.5, -20, 1.7, 0, TAU);
  ctx.fill();
  if (mood === 'happy') {
    ctx.strokeStyle = '#2b1d14';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(53, -2, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 볼 홍조
  ctx.fillStyle = 'rgba(255,140,120,0.35)';
  ctx.beginPath();
  ctx.ellipse(46, -6, 4.5, 3, 0, 0, TAU);
  ctx.fill();
  // 수염
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.9;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(56, -5 + i * 2.5);
    ctx.lineTo(70, -7 + i * 4.5);
    ctx.stroke();
  }
  // 귀(작은 귓바퀴)
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.ellipse(27, -22, 3, 2, -0.6, 0, TAU);
  ctx.fill();
  if (kind === 'grand') {
    // 흰 눈썹
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(36, -26);
    ctx.lineTo(46, -27);
    ctx.stroke();
  }

  // 앞지느러미
  ctx.save();
  ctx.translate(14, 10);
  ctx.rotate(onRock ? -0.2 : 0.5 + wig * 1.6);
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-4, 18, -16, 26);
  ctx.quadraticCurveTo(-4, 24, 8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------- 생물 ----------
function fishShape(ctx, len, h, color, opt = {}) {
  const { stripes = 0, belly = 'rgba(255,255,255,0.45)', eye = true, tailWig = 0, bump = false } = opt;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(len * 0.5, 0);
  ctx.bezierCurveTo(len * 0.35, -h, -len * 0.25, -h * 0.9, -len * 0.38, 0);
  ctx.bezierCurveTo(-len * 0.25, h * 0.9, len * 0.35, h, len * 0.5, 0);
  ctx.fill();
  if (bump) {
    ctx.beginPath();
    ctx.ellipse(len * 0.3, -h * 0.75, len * 0.16, h * 0.45, 0, 0, TAU);
    ctx.fill();
  }
  // 꼬리
  ctx.save();
  ctx.translate(-len * 0.36, 0);
  ctx.rotate(tailWig);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.24, -h * 0.85);
  ctx.lineTo(-len * 0.18, 0);
  ctx.lineTo(-len * 0.24, h * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 배
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(len * 0.05, h * 0.4, len * 0.33, h * 0.32, 0, 0, TAU);
  ctx.fill();
  // 줄무늬
  if (stripes) {
    ctx.fillStyle = 'rgba(20,20,25,0.75)';
    for (let i = 0; i < stripes; i++) {
      const sx = len * 0.28 - i * len * 0.22;
      ctx.fillRect(sx - len * 0.04, -h * 0.85, len * 0.08, h * 1.7);
    }
    ctx.fillStyle = color; // 가장자리 정리
  }
  if (eye) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(len * 0.34, -h * 0.2, Math.max(1.8, h * 0.22), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(len * 0.35, -h * 0.2, Math.max(1, h * 0.13), 0, TAU);
    ctx.fill();
  }
}

export function drawCreature(ctx, id, x, y, size, opt = {}) {
  const { dir = 1, t = 0, alpha = 1, sil = false } = opt;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  const wig = Math.sin(t * 10) * 0.35;
  const col = (c) => (sil ? 'rgba(10,30,45,0.55)' : c);
  switch (id) {
    case 'anchovy':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.6, size * 0.32, col('#a9c9dd'), { tailWig: wig, belly: sil ? 'transparent' : 'rgba(255,255,255,0.7)' });
      break;
    case 'damsel':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.3, size * 0.55, col('#5d6f8c'), { tailWig: wig });
      break;
    case 'rockfish':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.5, size * 0.55, col('#9a6a4f'), { tailWig: wig });
      if (!sil) { ctx.fillStyle = 'rgba(60,30,20,0.5)'; ctx.beginPath(); ctx.ellipse(-2, -size * 0.2, size * 0.3, size * 0.12, 0, 0, TAU); ctx.fill(); }
      break;
    case 'saury':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 2.0, size * 0.28, col('#4f78a8'), { tailWig: wig, belly: sil ? 'transparent' : 'rgba(230,240,255,0.8)' });
      ctx.fillStyle = col('#d8b34a');
      ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(size * 1.25, -1); ctx.lineTo(size, 2); ctx.fill();
      break;
    case 'yellowtail':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.8, size * 0.42, col('#6f8f9f'), { tailWig: wig * 0.6 });
      if (!sil) { ctx.fillStyle = '#e8c94a'; ctx.fillRect(-size * 0.6, -2, size * 1.3, 4); }
      break;
    case 'oplegnathus':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.3, size * 0.62, col('#e2dcc0'), { stripes: sil ? 0 : 3, tailWig: wig });
      break;
    case 'wrasse':
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.6, size * 0.55, col('#b8576a'), { bump: true, tailWig: wig * 0.6 });
      break;
    case 'squid': {
      ctx.scale(dir, 1);
      const pulse = 1 + Math.sin(t * 6) * 0.08;
      ctx.fillStyle = col('#ecb79c');
      ctx.beginPath();
      ctx.moveTo(-size * 0.9 * pulse, 0);
      ctx.quadraticCurveTo(-size * 0.4, -size * 0.38, size * 0.35, -size * 0.2);
      ctx.lineTo(size * 0.35, size * 0.2);
      ctx.quadraticCurveTo(-size * 0.4, size * 0.38, -size * 0.9 * pulse, 0);
      ctx.fill();
      ctx.beginPath(); // 지느러미
      ctx.moveTo(-size * 0.9, 0); ctx.lineTo(-size * 0.6, -size * 0.32); ctx.lineTo(-size * 0.5, 0); ctx.lineTo(-size * 0.6, size * 0.32); ctx.fill();
      ctx.strokeStyle = col('#d99a80');
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(size * 0.35, i * 3);
        ctx.quadraticCurveTo(size * 0.7, i * 4 + Math.sin(t * 8 + i) * 3, size * 0.95, i * 5);
        ctx.stroke();
      }
      if (!sil) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(size * 0.22, -3, 2.4, 0, TAU); ctx.fill(); }
      break;
    }
    case 'octopus': {
      ctx.fillStyle = col('#c96b5b');
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.35, size * 0.42, size * 0.48, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = col('#c96b5b');
      ctx.lineWidth = size * 0.13;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * size * 0.25, 0);
        ctx.quadraticCurveTo(Math.sin(a) * size * 0.6, size * 0.3 + Math.sin(t * 3 + i) * 4, Math.sin(a) * size * 0.9, size * 0.35);
        ctx.stroke();
      }
      if (!sil) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, -size * 0.3, 3.4, 0, TAU); ctx.arc(6, -size * 0.3, 3.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-6, -size * 0.3, 1.8, 0, TAU); ctx.arc(6, -size * 0.3, 1.8, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'shrimp': {
      ctx.scale(dir, 1);
      ctx.fillStyle = col('#e86f6f');
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(size * 0.4 - i * size * 0.22, i * 1.5, size * 0.2, Math.max(1, size * 0.22 - i * size * 0.03), 0, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = col('#f3a3a3');
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(size * 0.55, -2); ctx.quadraticCurveTo(size * 1.1, -size * 0.5, size * 1.4, -size * 0.2 + Math.sin(t * 5) * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(size * 0.55, 0); ctx.quadraticCurveTo(size * 1.1, -size * 0.2, size * 1.3, size * 0.2); ctx.stroke();
      if (!sil) {
        ctx.fillStyle = '#fff'; ctx.fillRect(-size * 0.4, -1, size * 0.8, 1.5);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(size * 0.52, -3, 1.6, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'jelly': {
      const p = Math.sin(t * 3) * 0.12;
      ctx.fillStyle = sil ? 'rgba(10,30,45,0.4)' : 'rgba(225,238,250,0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * (0.6 + p), size * (0.42 - p * 0.5), 0, Math.PI, TAU);
      ctx.fill();
      if (!sil) {
        ctx.strokeStyle = 'rgba(210,170,220,0.9)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-size * 0.3 + i * size * 0.2, -size * 0.18, size * 0.07, 0, TAU); ctx.stroke(); }
      }
      ctx.strokeStyle = sil ? 'rgba(10,30,45,0.4)' : 'rgba(230,240,255,0.6)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size * 0.15, 0);
        ctx.quadraticCurveTo(i * size * 0.15 + Math.sin(t * 4 + i) * 6, size * 0.5, i * size * 0.12, size * 0.9);
        ctx.stroke();
      }
      break;
    }
    case 'urchin': {
      ctx.strokeStyle = col('#4a2f63');
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 18; i++) {
        const a = Math.PI + (i / 17) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3);
        ctx.lineTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = col('#5a3a73');
      ctx.beginPath(); ctx.ellipse(0, 0, size * 0.45, size * 0.38, 0, Math.PI, TAU); ctx.fill();
      break;
    }
    case 'starfish': {
      ctx.rotate(0.2);
      ctx.fillStyle = col('#e39a4c');
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? size * 0.32 : size * 0.7;
        const a = -Math.PI / 2 + (i / 10) * TAU;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6);
      }
      ctx.closePath();
      ctx.fill();
      if (!sil) { ctx.fillStyle = '#c4413a'; ctx.beginPath(); ctx.arc(0, 0, size * 0.12, 0, TAU); ctx.fill(); }
      break;
    }
    case 'abalone': {
      ctx.fillStyle = col('#8a7f6a');
      ctx.beginPath(); ctx.ellipse(0, 0, size * 0.7, size * 0.38, 0, Math.PI, TAU); ctx.fill();
      if (!sil) {
        ctx.fillStyle = '#b6a98c';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-size * 0.4 + i * size * 0.22, -size * 0.2, 2, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(120,200,190,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, size * 0.55, size * 0.28, 0, Math.PI, TAU); ctx.stroke();
      }
      break;
    }
    case 'mussel': {
      ctx.fillStyle = col('#2f2c40');
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(-size * 0.6 + i * size * 0.4, 0);
        ctx.rotate(-0.4 + i * 0.25);
        ctx.beginPath(); ctx.ellipse(0, -size * 0.3, size * 0.17, size * 0.36, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'seahare': {
      ctx.scale(dir, 1);
      ctx.fillStyle = col('#7a6a3a');
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0);
      ctx.bezierCurveTo(-size * 0.5, -size * 0.6, size * 0.4, -size * 0.6, size * 0.6, -size * 0.1);
      ctx.lineTo(size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(size * 0.55, -size * 0.32, 2.5, size * 0.16, 0.3, 0, TAU); ctx.ellipse(size * 0.42, -size * 0.36, 2.5, size * 0.16, -0.2, 0, TAU); ctx.fill();
      if (!sil) { ctx.fillStyle = 'rgba(255,240,200,0.35)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-size * 0.4 + i * size * 0.2, -size * 0.2, 2, 0, TAU); ctx.fill(); } }
      break;
    }
    case 'kelp':
    case 'eisenia': {
      const h = size * 2.2;
      const blades = id === 'kelp' ? 3 : 2;
      for (let b = 0; b < blades; b++) {
        const off = (b - (blades - 1) / 2) * 9;
        const sway = Math.sin(t * 1.3 + b + x * 0.01) * 10;
        ctx.strokeStyle = col(id === 'kelp' ? '#6b5a24' : '#4f5d22');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(off, 0);
        ctx.quadraticCurveTo(off + sway * 0.5, -h * 0.5, off + sway, -h * (id === 'eisenia' ? 0.55 : 0.8));
        ctx.stroke();
        ctx.fillStyle = col(id === 'kelp' ? '#8a7430' : '#62702a');
        const segs = id === 'kelp' ? 1 : 2;
        for (let s2 = 0; s2 < segs; s2++) {
          const tipX = off + sway + (s2 ? -14 : (id === 'eisenia' ? 14 : 0));
          const baseY = -h * (id === 'eisenia' ? 0.55 : 0.75);
          ctx.beginPath();
          ctx.moveTo(off + sway, baseY);
          ctx.quadraticCurveTo(tipX - 12, baseY - h * 0.25, tipX + sway * 0.4, baseY - h * 0.45);
          ctx.quadraticCurveTo(tipX + 12, baseY - h * 0.25, off + sway, baseY);
          ctx.fill();
        }
      }
      break;
    }
    case 'gull': {
      ctx.scale(dir, 1);
      const flap = opt.flying ? Math.sin(t * 12) * 0.6 : 0;
      ctx.fillStyle = col('#f4f4f4');
      ctx.beginPath(); ctx.ellipse(0, 0, size * 0.55, size * 0.3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(size * 0.45, -size * 0.25, size * 0.22, 0, TAU); ctx.fill();
      ctx.fillStyle = col('#5b6470');
      ctx.save(); ctx.translate(-size * 0.05, -size * 0.1); ctx.rotate(-0.2 + flap);
      ctx.beginPath(); ctx.ellipse(-size * 0.15, 0, size * 0.45, size * 0.16, -0.15, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = col('#111'); ctx.fillRect(-size * 0.7, -4, size * 0.2, 6);
      if (!sil) {
        ctx.fillStyle = '#f2c43a'; ctx.beginPath(); ctx.moveTo(size * 0.62, -size * 0.27); ctx.lineTo(size * 0.9, -size * 0.22); ctx.lineTo(size * 0.62, -size * 0.17); ctx.fill();
        ctx.fillStyle = '#d33'; ctx.fillRect(size * 0.8, -size * 0.23, 3, 3);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(size * 0.5, -size * 0.3, 1.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e8b23a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, size * 0.25); ctx.lineTo(0, size * 0.55); ctx.moveTo(6, size * 0.25); ctx.lineTo(6, size * 0.55); ctx.stroke();
      }
      break;
    }
    case 'aster': {
      ctx.strokeStyle = col('#5c7a3a'); ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        const sw = Math.sin(t * 2 + i) * 2;
        ctx.beginPath(); ctx.moveTo(i * 6, 0); ctx.lineTo(i * 8 + sw, -size * 0.9); ctx.stroke();
        ctx.fillStyle = col('#b7a3e0');
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * TAU;
          ctx.beginPath(); ctx.ellipse(i * 8 + sw + Math.cos(a) * 5, -size * 0.9 + Math.sin(a) * 5, 3.4, 1.8, a, 0, TAU); ctx.fill();
        }
        if (!sil) { ctx.fillStyle = '#f2c43a'; ctx.beginPath(); ctx.arc(i * 8 + sw, -size * 0.9, 2.6, 0, TAU); ctx.fill(); }
      }
      break;
    }
    default:
      ctx.scale(dir, 1);
      fishShape(ctx, size * 1.4, size * 0.5, col('#888'), { tailWig: wig });
  }
  ctx.restore();
}

// ---------- 엽서 (바다에 떠 있는 반짝이는 카드) ----------
export function drawCardPickup(ctx, x, y, t, label) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.2) * 5);
  const glow = 0.5 + Math.sin(t * 4) * 0.3;
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  g.addColorStop(0, `rgba(255,240,170,${0.7 * glow})`);
  g.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
  ctx.rotate(Math.sin(t * 1.5) * 0.15);
  ctx.fillStyle = '#fff8e6';
  ctx.strokeStyle = '#e6a93c';
  ctx.lineWidth = 2.5;
  roundRect(ctx, -16, -21, 32, 42, 5);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e6a93c';
  ctx.fillRect(-10, -14, 20, 12);
  ctx.fillStyle = '#7ab8d6';
  ctx.fillRect(-10, -8, 20, 6);
  ctx.fillStyle = '#c9a36a';
  ctx.fillRect(-10, 4, 20, 2.4);
  ctx.fillRect(-10, 10, 14, 2.4);
  ctx.restore();
  if (label) {
    ctx.save();
    ctx.font = '600 13px "Gowun Dodum", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(label, x, y - 34);
    ctx.restore();
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- 바위 ----------
export function drawRock(ctx, r, t) {
  const g = ctx.createLinearGradient(0, r.top, 0, r.bottom);
  g.addColorStop(0, '#8b7d6b');
  g.addColorStop(0.08, '#6f6152');
  g.addColorStop(0.35, '#4b4339');
  g.addColorStop(1, '#2a2622');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(r.x0b, r.bottom);
  // 왼쪽 면 (울퉁불퉁)
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const y = lerp(r.bottom, r.top, k);
    const x = lerp(r.x0b, r.x0, k) + (noise1(r.seed + i * 1.7) - 0.5) * 18;
    ctx.lineTo(x, y);
  }
  // 윗면
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    ctx.lineTo(lerp(r.x0, r.x1, k), r.top - 4 + (noise1(r.seed * 3 + i) - 0.5) * 10);
  }
  for (let i = steps; i >= 0; i--) {
    const k = i / steps;
    const y = lerp(r.bottom, r.top, k);
    const x = lerp(r.x1b, r.x1, k) + (noise1(r.seed + 50 + i * 1.3) - 0.5) * 18;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // 이끼·따개비
  ctx.fillStyle = 'rgba(120,150,80,0.35)';
  for (let i = 0; i < 6; i++) {
    const k = 0.3 + hash(r.seed + i) * 0.6;
    const y = lerp(r.top, r.bottom, k);
    const half = lerp(r.x1 - r.x0, r.x1b - r.x0b, k) / 2;
    const cx = (lerp(r.x0, r.x0b, k) + lerp(r.x1, r.x1b, k)) / 2;
    ctx.beginPath();
    ctx.ellipse(cx + (hash(r.seed * 2 + i) - 0.5) * half * 1.4, y, 14, 6, 0, 0, TAU);
    ctx.fill();
  }
  // 물 위로 나온 부분의 젖은 띠
  if (r.top < 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(r.x0b - 30, -6 + Math.sin(t * 2) * 2, r.x1b - r.x0b + 60, 6);
  }
}

// ---------- 배경: 하늘·먼 섬 ----------
export function drawSky(ctx, vw, top, bottom, tint, storm) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  if (storm) {
    g.addColorStop(0, '#5b6b7a');
    g.addColorStop(1, '#a3b1bd');
  } else {
    g.addColorStop(0, '#5fb2ee');
    g.addColorStop(1, '#cdeeff');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, top, vw, bottom - top);
}

export function drawFarIslands(ctx, ox, baseY, scale = 1) {
  // 서도 (높은 섬, 왼쪽) · 동도 (낮은 섬, 오른쪽, 등대)
  ctx.save();
  ctx.translate(ox, baseY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#5f7f8c';
  ctx.beginPath();
  ctx.moveTo(-260, 0);
  ctx.lineTo(-230, -40); ctx.lineTo(-200, -70); ctx.lineTo(-175, -118); ctx.lineTo(-150, -150);
  ctx.lineTo(-128, -132); ctx.lineTo(-110, -100); ctx.lineTo(-85, -80); ctx.lineTo(-60, -30); ctx.lineTo(-40, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6c8d99';
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(55, -35); ctx.lineTo(80, -58); ctx.lineTo(110, -78); ctx.lineTo(140, -70); ctx.lineTo(170, -50); ctx.lineTo(200, -20); ctx.lineTo(225, 0);
  ctx.closePath(); ctx.fill();
  // 등대
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(132, -98, 7, 22);
  ctx.fillStyle = '#d65b4a'; ctx.fillRect(131, -102, 9, 5);
  // 작은 바위들
  ctx.fillStyle = '#58747f';
  [[-20, 14, 16], [0, 10, 10], [250, 18, 20], [-290, 12, 14]].forEach(([x, w, h]) => {
    ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x, -h); ctx.lineTo(x + w, 0); ctx.fill();
  });
  ctx.restore();
}

export function drawCloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, TAU);
  ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, TAU);
  ctx.arc(x + 44 * s, y, 18 * s, 0, TAU);
  ctx.rect(x, y, 44 * s, 18 * s);
  ctx.fill();
}

// ---------- 배 (강치를 잡는 배 / 먼 군함) ----------
export function drawBoat(ctx, x, y, dir = 1, t = 0, kind = 'fishing') {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.8) * 3);
  ctx.scale(dir, 1);
  ctx.rotate(Math.sin(t * 1.4) * 0.03);
  if (kind === 'warship') {
    ctx.fillStyle = '#3d454d';
    ctx.beginPath(); ctx.moveTo(-90, -6); ctx.lineTo(95, -6); ctx.lineTo(75, 10); ctx.lineTo(-80, 10); ctx.closePath(); ctx.fill();
    ctx.fillRect(-30, -22, 50, 16);
    ctx.fillRect(-6, -48, 10, 28);
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath(); ctx.arc(-2, -60 - Math.sin(t) * 4, 9, 0, TAU); ctx.arc(-14, -72, 11, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#6b4a2e';
    ctx.beginPath(); ctx.moveTo(-70, -10); ctx.lineTo(78, -14); ctx.quadraticCurveTo(70, 12, 40, 14); ctx.lineTo(-56, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a6440'; ctx.fillRect(-60, -14, 120, 5);
    ctx.fillStyle = '#4a3320'; ctx.fillRect(-4, -80, 5, 70);
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(1, -78); ctx.lineTo(46, -24); ctx.lineTo(1, -20); ctx.closePath(); ctx.fill();
    // 사람 실루엣
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath(); ctx.arc(-34, -24, 5, 0, TAU); ctx.fill(); ctx.fillRect(-38, -20, 8, 12);
  }
  ctx.restore();
}

// 그물
export function drawNet(ctx, x, y, w, h, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(230,220,190,0.75)';
  ctx.lineWidth = 1.4;
  const step = 12;
  for (let i = 0; i <= w; i += step) {
    ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 6, y + h); ctx.stroke();
  }
  for (let j = 0; j <= h; j += step) {
    ctx.beginPath(); ctx.moveTo(x, y + j); ctx.lineTo(x + w, y + j); ctx.stroke();
  }
  ctx.fillStyle = '#e0b04a';
  for (let i = 0; i <= w; i += 30) { ctx.beginPath(); ctx.arc(x + i, y, 4, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// 포털 (빛나는 고리)
export function drawPortal(ctx, x, y, t, open = true) {
  ctx.save();
  ctx.translate(x, y);
  const a = open ? 1 : 0.25;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${i === 1 ? '255,230,140' : '170,240,255'},${(0.8 - i * 0.2) * a})`;
    ctx.lineWidth = 6 - i * 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 44 + i * 9 + Math.sin(t * 3 + i) * 3, 66 + i * 10, 0, 0, TAU);
    ctx.stroke();
  }
  if (open) {
    const g = ctx.createRadialGradient(0, 0, 5, 0, 0, 60);
    g.addColorStop(0, 'rgba(255,255,220,0.7)');
    g.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 44, 66, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const ang = t * 1.5 + (i / 8) * TAU;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(Math.cos(ang) * 50, Math.sin(ang) * 74, 2.5, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- 엽서·도감용 작은 삽화 (카드 머리 그림) ----------
export function drawPostcardArt(canvas, art, opt = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const t = opt.t || 0;
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9fdcff');
  sky.addColorStop(0.5, '#d9f3ff');
  sky.addColorStop(0.5, '#3a95c4');
  sky.addColorStop(1, '#0f4a6e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sea = h * 0.5;
  ctx.save();
  switch (art) {
    case 'islands':
      drawFarIslands(ctx, w * 0.5, sea, w / 700);
      ctx.font = `700 ${w / 26}px "Jua", sans-serif`;
      ctx.fillStyle = '#123d4d'; ctx.textAlign = 'center';
      ctx.fillText('서도', w * 0.5 - w * 0.16, sea - h * 0.32);
      ctx.fillText('동도', w * 0.5 + w * 0.13, sea - h * 0.2);
      break;
    case 'volcano': {
      ctx.fillStyle = '#0f4a6e'; ctx.fillRect(0, sea, w, h - sea);
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath(); ctx.moveTo(w * 0.1, h); ctx.lineTo(w * 0.42, sea - h * 0.18); ctx.lineTo(w * 0.58, sea - h * 0.12); ctx.lineTo(w * 0.9, h); ctx.fill();
      ctx.fillStyle = 'rgba(230,120,60,0.6)';
      ctx.beginPath(); ctx.moveTo(w * 0.47, h); ctx.lineTo(w * 0.5, sea + h * 0.05); ctx.lineTo(w * 0.53, h); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, sea); ctx.lineTo(w, sea); ctx.stroke(); ctx.setLineDash([]);
      break;
    }
    case 'kelp':
    case 'fry':
    case 'fish': {
      ctx.fillStyle = '#165e6e'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) drawCreature(ctx, i % 2 ? 'kelp' : 'eisenia', w * (0.08 + i * 0.11), h, h * 0.32, { t: t + i });
      if (art !== 'kelp') for (let i = 0; i < 7; i++) drawCreature(ctx, art === 'fry' ? 'oplegnathus' : (i % 2 ? 'rockfish' : 'anchovy'), w * (0.2 + hash(i) * 0.6), h * (0.25 + hash(i + 9) * 0.45), art === 'fry' ? 9 : 14, { t: t + i, dir: i % 2 ? 1 : -1 });
      break;
    }
    case 'current': {
      ctx.fillStyle = '#16557c'; ctx.fillRect(0, 0, w, h);
      const arrows = [['#f08a5d', h * 0.32, 1], ['#6ec6f0', h * 0.66, -1]];
      arrows.forEach(([c, y, d]) => {
        ctx.strokeStyle = c; ctx.lineWidth = h * 0.08; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(w * 0.15, y); ctx.bezierCurveTo(w * 0.4, y - h * 0.12 * d, w * 0.6, y + h * 0.12 * d, w * 0.85, y); ctx.stroke();
      });
      ctx.font = `700 ${w / 24}px "Jua", sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('난류', w * 0.5, h * 0.18); ctx.fillText('한류', w * 0.5, h * 0.9);
      break;
    }
    case 'map':
    case 'zones': {
      ctx.fillStyle = '#2f86b8'; ctx.fillRect(0, 0, w, h);
      if (art === 'zones') {
        ctx.fillStyle = '#5aa9d6'; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.5, w * 0.62, h * 0.9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8bd0ef'; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.5, w * 0.32, h * 0.62, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#9ccc7a'; ctx.beginPath(); ctx.ellipse(w * 0.1, h * 0.5, w * 0.16, h * 0.45, 0, 0, TAU); ctx.fill();
        ctx.font = `700 ${w / 26}px "Jua", sans-serif`; ctx.fillStyle = '#123d4d'; ctx.textAlign = 'center';
        ctx.fillText('영토', w * 0.1, h * 0.52); ctx.fillText('영해', w * 0.36, h * 0.52); ctx.fillStyle = '#fff'; ctx.fillText('EEZ', w * 0.66, h * 0.52);
        ctx.font = `${w / 40}px "Gowun Dodum", sans-serif`; ctx.fillText('가상 해안 개념도 · 실제 경계 아님', w * 0.7, h * 0.92);
      } else {
        ctx.fillStyle = '#9ccc7a';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.22, 0); ctx.lineTo(w * 0.28, h * 0.35); ctx.lineTo(w * 0.2, h * 0.7); ctx.lineTo(w * 0.25, h); ctx.lineTo(0, h); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.55, h * 0.35, w * 0.035, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(w * 0.8, h * 0.58, w * 0.014, 0, TAU); ctx.arc(w * 0.82, h * 0.585, w * 0.011, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w * 0.57, h * 0.38); ctx.lineTo(w * 0.79, h * 0.56); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = `700 ${w / 26}px "Jua", sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText('울릉도', w * 0.55, h * 0.25); ctx.fillText('독도', w * 0.82, h * 0.72); ctx.fillText('87.4km', w * 0.66, h * 0.42);
        ctx.font = `${w / 40}px "Gowun Dodum", sans-serif`; ctx.fillText('위치 개념도 · 실제 축척 아님', w * 0.72, h * 0.92);
      }
      break;
    }
    case 'scroll': {
      ctx.fillStyle = '#3a5c6e'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f3e3bd'; roundRect(ctx, w * 0.2, h * 0.14, w * 0.6, h * 0.72, 8); ctx.fill();
      ctx.fillStyle = '#9b6a3a'; ctx.fillRect(w * 0.16, h * 0.1, w * 0.68, h * 0.06); ctx.fillRect(w * 0.16, h * 0.84, w * 0.68, h * 0.06);
      ctx.fillStyle = 'rgba(80,50,20,0.55)';
      for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.68 - i * 0.08), h * 0.24, w * 0.02, h * (0.3 + hash(i) * 0.25));
      ctx.font = `${w / 40}px "Gowun Dodum", sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('기록 개념 삽화 · 원본 아님', w * 0.5, h * 0.97);
      break;
    }
    case 'ship': {
      drawFarIslands(ctx, w * 0.3, sea, w / 900);
      drawBoat(ctx, w * 0.72, sea - 4, -1, t, 'warship');
      break;
    }
    case 'boat': {
      ctx.fillStyle = '#e9b98a'; ctx.fillRect(0, 0, w, sea);
      ctx.fillStyle = '#2f6b8f'; ctx.fillRect(0, sea, w, h - sea);
      drawBoat(ctx, w * 0.5, sea - 2, 1, t, 'fishing');
      break;
    }
    case 'seal': {
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath(); ctx.moveTo(w * 0.15, sea + 8); ctx.lineTo(w * 0.3, sea - h * 0.12); ctx.lineTo(w * 0.7, sea - h * 0.14); ctx.lineTo(w * 0.85, sea + 8); ctx.fill();
      drawSeal(ctx, w * 0.42, sea - h * 0.2, w / 520, { kind: 'mom', onRock: true, t });
      drawSeal(ctx, w * 0.6, sea - h * 0.19, w / 760, { kind: 'kang', dir: -1, onRock: true, t });
      break;
    }
    case 'ice': {
      ctx.fillStyle = '#0b2f4a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3b3328'; ctx.fillRect(0, h * 0.7, w, h * 0.3);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = 'rgba(220,240,255,0.85)';
        ctx.beginPath(); ctx.moveTo(w * (0.2 + i * 0.12), h * 0.72); ctx.lineTo(w * (0.24 + i * 0.12), h * 0.6); ctx.lineTo(w * (0.28 + i * 0.12), h * 0.72); ctx.fill();
      }
      ctx.font = `${w / 40}px "Gowun Dodum", sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText('개념 삽화 · 실제 매장 위치 아님', w * 0.5, h * 0.95);
      break;
    }
    case 'gull': {
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath(); ctx.moveTo(w * 0.1, sea + 8); ctx.lineTo(w * 0.35, sea - h * 0.18); ctx.lineTo(w * 0.65, sea - h * 0.2); ctx.lineTo(w * 0.9, sea + 8); ctx.fill();
      drawCreature(ctx, 'gull', w * 0.45, sea - h * 0.26, w * 0.05, { t });
      drawCreature(ctx, 'gull', w * 0.58, sea - h * 0.27, w * 0.04, { t, dir: -1 });
      drawCreature(ctx, 'aster', w * 0.36, sea - h * 0.18, w * 0.04, { t });
      break;
    }
    default:
      drawFarIslands(ctx, w * 0.5, sea, w / 700);
  }
  ctx.restore();
}

// 도감 카드용 생물 그림
export function drawDexArt(canvas, id, known, t = 0) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, known ? '#2b86b4' : '#24485c');
  g.addColorStop(1, known ? '#0f4a6e' : '#132a38');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const floorKinds = ['kelp', 'eisenia', 'urchin', 'abalone', 'mussel', 'starfish', 'octopus', 'aster', 'gull', 'seahare'];
  const y = floorKinds.includes(id) ? h * 0.85 : h * 0.55;
  let size = Math.min(w, h) * 0.2;
  if (id === 'kelp' || id === 'eisenia') size = h * 0.32;
  if (id === 'gull') { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(0, h * 0.85, w, h * 0.15); }
  if (id === 'aster') { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(0, h * 0.85, w, h * 0.15); size = h * 0.45; }
  drawCreature(ctx, id, w * 0.5, id === 'gull' ? h * 0.62 : y, size, { t, sil: !known });
}
