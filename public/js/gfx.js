// 캔버스 텍스처/스프라이트 헬퍼
import * as THREE from 'three';

export function paperCanvas(p, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const s = size / 128;
  x.fillStyle = p.base;
  x.fillRect(0, 0, size, size);
  x.fillStyle = p.accent;
  x.strokeStyle = p.accent;
  const star = (cx, cy, r) => {
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
  };
  switch (p.pattern) {
    case 'dots':
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        x.beginPath(); x.arc((i + (j % 2 ? 0.75 : 0.25)) * 32 * s, (j + 0.5) * 32 * s, 6 * s, 0, 7); x.fill();
      }
      break;
    case 'stripes':
      for (let i = 0; i < 8; i += 2) x.fillRect(i * 16 * s, 0, 8 * s, size);
      break;
    case 'stars':
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) star((i + (j % 2 ? 0.8 : 0.3)) * 43 * s, (j + 0.5) * 43 * s, 9 * s);
      break;
    case 'snow':
      x.font = `${24 * s}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) x.fillText('❄', (i + (j % 2 ? 0.8 : 0.3)) * 43 * s, (j + 0.5) * 43 * s);
      break;
    case 'trees':
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const cx = (i + (j % 2 ? 0.8 : 0.3)) * 43 * s, cy = (j + 0.5) * 43 * s;
        x.beginPath(); x.moveTo(cx, cy - 11 * s); x.lineTo(cx + 9 * s, cy + 8 * s); x.lineTo(cx - 9 * s, cy + 8 * s); x.closePath(); x.fill();
      }
      break;
    case 'candy':
      x.lineWidth = 9 * s;
      for (let k = -size; k < size * 2; k += 36 * s) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + size, size); x.stroke(); }
      break;
    default:
  }
  return c;
}

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}

export function plankTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#a56d44';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? 'rgba(255,220,170,.10)' : 'rgba(60,30,10,.10)';
    x.fillRect(0, i * 32, 256, 32);
    x.fillStyle = 'rgba(50,25,10,.55)';
    x.fillRect(0, i * 32, 256, 2);
    const off = (i * 77) % 256;
    x.fillRect(off, i * 32, 2, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

// 말풍선 형태의 월드 라벨 (폰트 로드 후 다시 그림)
export function textSprite(text, { w = 512, h = 128, size = 54, color = '#fff', bg = 'rgba(24,26,70,.82)', scale = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = bg;
    roundRect(x, 6, 10, w - 12, h - 20, 40);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.55)';
    x.lineWidth = 4;
    x.stroke();
    x.fillStyle = color;
    x.font = `${size}px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + 3);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(scale, (scale * h) / w, 1);
  sp.renderOrder = 20;
  return sp;
}

export function signTexture(text) {
  const w = 512, h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    x.fillStyle = '#7a4a2a';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e9c58b'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#fff3d6';
    x.font = '64px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + 4);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return tex;
}
