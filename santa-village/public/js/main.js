// 메인: 렌더러, 카메라(돌하우스 시점), 입력, 네트워크 연결, 흐름 제어
import * as THREE from 'three';
import { Room } from './room.js';
import { DEFAULT_LOOK, sanitizeLook, GIFT_ITEMS, ORNAMENTS, WORLD } from './data.js';
import { createAvatar, applyLook, animateAvatar, startEmote } from './avatar.js';
import { World, SPOTS } from './world.js';
import { textSprite } from './gfx.js';
import { connect } from './net.js';
import { toast, closeModal, modalOpen, costumeControls, costumeModal, giftWizard, ornamentPicker, emotePicker, letterModal } from './ui.js';

void Room;
const $ = (s) => document.querySelector(s);
const t0 = performance.now();
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

// ---------- 별빛 로딩 화면(배경 별) ----------
(function loadingStars() {
  const c = $('#stars'), x = c.getContext('2d');
  let w, h, stars = [], on = true;
  const fit = () => {
    w = c.width = innerWidth; h = c.height = innerHeight;
    stars = Array.from({ length: Math.round((w * h) / 4200) }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.92, r: Math.random() * 1.7 + 0.3, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.8 }));
  };
  fit(); addEventListener('resize', fit);
  const loop = (t) => {
    if (!on) return;
    x.clearRect(0, 0, w, h);
    for (const s of stars) {
      x.globalAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
      x.fillStyle = '#fff6df';
      x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__stopLoadingStars = () => { on = false; };
})();

// ---------- three.js ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1c2150');
scene.fog = new THREE.Fog('#4a4f8f', 70, 190);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 900);
const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

const world = new World(scene, camera);

// ---------- 플레이어 ----------
const look = sanitizeLook(ls.get('santa-look') ? JSON.parse(ls.get('santa-look')) : DEFAULT_LOOK);
const cid = ls.get('santa-cid') || (crypto.randomUUID?.() || Math.random().toString(36).slice(2)) ;
ls.set('santa-cid', cid);

const players = new Map(); // id -> {av, label, x, z, ry, tx, tz, moving}
function mkPlayer(p, mine = false) {
  const av = createAvatar();
  applyLook(av, p.look);
  const label = textSprite(p.name, { w: 384, h: 96, size: 46, scale: 3.2, bg: mine ? 'rgba(214,48,49,.85)' : 'rgba(24,26,70,.8)' });
  label.position.set(0, 3.5, 0);
  av.add(label);
  av.position.set(p.x, 0, p.z);
  av.rotation.y = p.ry || 0;
  scene.add(av);
  return { av, label, x: p.x, z: p.z, ry: p.ry || 0, tx: p.x, tz: p.z, moving: false, name: p.name };
}
const me = { id: null, p: null, x: 0, z: 10, ry: 0, target: null, pending: null, name: '' }; // ry 0 = 카메라 쪽(+z)을 봄

// ---------- 카메라: 선택 화면(클로즈업) → 돌하우스 시점 ----------
let camMode = 'loading';
let zoom = 1.3;
const camPos = new THREE.Vector3(0, 8, 30), camLook = new THREE.Vector3(0, 3, 0);
function cameraGoal() {
  const f = new THREE.Vector3(me.x, 0, me.z);
  if (camMode === 'select') {
    // 왼쪽 패널에 가리지 않도록 캐릭터가 화면 오른쪽에 오게 카메라를 왼쪽으로 평행이동 (모바일은 패널이 아래라 위로)
    const wide = innerWidth > 760, side = wide ? 2.1 : 0, up = wide ? 0 : -1.2;
    return { pos: new THREE.Vector3(f.x - side, 2.6 + up, f.z + 6.6), look: new THREE.Vector3(f.x - side, 1.6 + up, f.z) };
  }
  if (camMode === 'intro') return { pos: new THREE.Vector3(0, 34, 62), look: new THREE.Vector3(0, 0, -2) };
  // 돌하우스 시점: 위에서 비스듬히 내려다보는 고정 각도, 캐릭터를 따라감
  const d = 30 * zoom;
  // (look.y 를 조금 높여서 화면 위쪽에 밤하늘과 별이 보이게 함)
  return { pos: new THREE.Vector3(f.x, 12 * zoom + 3, f.z + d * 0.92), look: new THREE.Vector3(f.x, 6, f.z - 3) };
}
canvas.addEventListener('wheel', (e) => { zoom = Math.min(1.5, Math.max(0.6, zoom + Math.sign(e.deltaY) * 0.07)); }, { passive: true });

// ---------- 네트워크 ----------
let net, used = { ornament: false }, letters = [], isOwner = false, joined = false;
const letterCtx = { letters, owner: false, used, render: null, onSend: (m) => net.send({ t: 'letter', ...m }), onAuth: (k) => net.send({ t: 'auth', key: k }) };
const refreshCount = () => { $('#count').textContent = `👥 ${players.size + (joined ? 1 : 0)}명`; };

function onMsg(m) {
  switch (m.t) {
    case 'init': {
      me.id = m.id;
      isOwner = m.owner; used.ornament = m.used.ornament;
      letters.splice(0, letters.length, ...m.letters);
      letterCtx.owner = isOwner;
      m.players.forEach((p) => players.set(p.id, mkPlayer(p)));
      m.gifts.forEach((g) => world.addGift(g, false));
      m.ornaments.forEach((o) => world.addOrnament(o, false));
      joined = true; refreshCount(); updateStats();
      break;
    }
    case 'join': players.set(m.p.id, mkPlayer(m.p)); toast(`🎅 ${m.p.name} 님이 마을에 왔어요`); refreshCount(); break;
    case 'leave': { const p = players.get(m.id); if (p) { scene.remove(p.av); players.delete(m.id); refreshCount(); } break; }
    case 'move': { const p = players.get(m.id); if (p) { p.tx = m.x; p.tz = m.z; p.ry = m.ry; } break; }
    case 'look': { const p = players.get(m.id); if (p) applyLook(p.av, m.look); break; }
    case 'emote': { const p = players.get(m.id); if (p) startEmote(p.av, m.e); break; }
    case 'gift': world.addGift(m.gift, true); toast(`🎁 ${m.gift.nick} 님이 선물을 놓았어요`); updateStats(); break;
    case 'ornament': world.addOrnament(m.o, true); toast(`🎄 ${m.o.nick} 님이 트리를 꾸몄어요`); updateStats(); break;
    case 'letter': letters.push(m.letter); letterCtx.render?.(); updateStats(); break;
    case 'letters': letters.splice(0, letters.length, ...m.letters); isOwner = m.owner; letterCtx.owner = isOwner; toast('🔑 공방 주인 모드가 켜졌어요'); letterCtx.render?.(); break;
    case 'used': if (m.ornament) used.ornament = true; refreshButtons(); letterCtx.render?.(); break;
    case 'event': m.kind === 'sleigh' ? world.triggerSleigh() : world.fireworkShow(); if (m.kind === 'sleigh') toast('🦌 하늘을 봐요! 산타가 지나가요'); break;
    case 'firework': world.launchFirework(m.x, m.z); break;
    case 'err': toast(m.msg); break;
    default:
  }
}

function updateStats() { $('#stats').textContent = `🎁 ${world.gifts.length}  🎄 ${world.ornGroup.children.length}  ✉️ ${letters.length}`; }
function refreshButtons() {
  $('[data-act=ornament]').classList.toggle('used', used.ornament);
}

// ---------- 입력/이동 ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); e.preventDefault(); }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
const toNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };

let placing = null; // 오너먼트 배치 모드 {kind, pos}
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointermove', (e) => {
  if (!placing || e.pointerType === 'touch') return;
  toNdc(e);
  const p = world.pickTree(ray);
  if (p) { placing.hover = p; world.moveGhost(p); }
});
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || (camMode !== 'play' && camMode !== 'tree') || modalOpen()) return;
  if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return; // 드래그는 무시
  toNdc(e);
  if (placing) {
    const p = world.pickTree(ray);
    if (p) { placing.pos = p; world.moveGhost(p); $('#place-ok').disabled = false; }
    return;
  }
  const hits = ray.intersectObjects(world.pickables, true);
  for (const h of hits) {
    let o = h.object;
    while (o) {
      if (o.userData.station) return goTo(o.userData.station);
      if (o.userData.gift) { const g = o.userData.gift, it = GIFT_ITEMS.find((i) => i.id === g.item); return toast(`🎁 ${g.nick} 님이 보낸 ${it?.name || '선물'}`); }
      if (o.userData.ornament) { const r = o.userData.ornament; return toast(`${r.emoji} ${r.nick} 님이 단 ${r.name}`); }
      o = o.parent;
    }
  }
  if (ray.ray.intersectPlane(plane, hitP)) { me.target = [hitP.x, hitP.z]; me.pending = null; marker(hitP.x, hitP.z); }
});

const clickMark = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 28), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false }));
clickMark.rotation.x = -Math.PI / 2; clickMark.position.y = 0.06; scene.add(clickMark);
let markT = 0;
function marker(x, z) { clickMark.position.x = x; clickMark.position.z = z; markT = 1; }

function goTo(st) {
  me.target = [...SPOTS[st]];
  me.pending = st;
  marker(...SPOTS[st]);
}
function runStation(st) {
  if (st === 'gift') giftWizard((g) => { net.send({ t: 'gift', ...g }); toast('🎁 선물을 하트 더미에 놓았어요!'); });
  else if (st === 'letter') letterModal(letterCtx);
  else if (st === 'tree') {
    if (used.ornament) return toast('오너먼트는 한 번만 달 수 있어요 🎄 (이미 달았어요)');
    ornamentPicker(startPlacing);
  }
}

function startPlacing(kind) {
  placing = { kind, pos: null, hover: null };
  world.setGhost(kind);
  $('#place').hidden = false; $('#place-ok').disabled = true;
  camMode = 'tree';
}
function stopPlacing() { placing = null; world.setGhost(null); $('#place').hidden = true; camMode = 'play'; }
$('#place-ok').onclick = () => {
  if (!placing?.pos) return;
  net.send({ t: 'ornament', kind: placing.kind, h: placing.pos.h, th: placing.pos.th });
  stopPlacing();
};
$('#place-cancel').onclick = stopPlacing;

// ---------- HUD ----------
document.querySelector('#hud').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || camMode !== 'play' && camMode !== 'tree') return;
  if (placing) return;
  switch (b.dataset.act) {
    case 'gift': goTo('gift'); break;
    case 'ornament': if (used.ornament) toast('오너먼트는 한 번만 달 수 있어요 🎄'); else goTo('tree'); break;
    case 'letter': goTo('letter'); break;
    case 'costume': costumeModal(look, (l) => { applyLook(me.player.av, l); ls.set('santa-look', JSON.stringify(l)); net.send({ t: 'look', look: l }); }); break;
    case 'emote': emotePicker((id) => { startEmote(me.player.av, id); net.send({ t: 'emote', e: id }); }); break;
    case 'firework': net.send({ t: 'firework', x: me.x, z: me.z - 6 }); break;
    default:
  }
});

// ---------- 시작 화면(코스튬 선택) ----------
function showStart() {
  me.player = mkPlayer({ name: '나', look, x: me.x, z: me.z, ry: 0 }, true);
  me.player.av.remove(me.player.label);
  const slot = $('#start-costume');
  slot.appendChild(costumeControls(look, (l) => applyLook(me.player.av, l)));
  const nick = $('#nick');
  nick.value = ls.get('santa-nick') || '';
  $('#start').hidden = false;
  camMode = 'select';
  $('#enter').onclick = () => {
    me.name = (nick.value.trim() || '산타친구').slice(0, 10);
    ls.set('santa-nick', me.name); ls.set('santa-look', JSON.stringify(look));
    $('#start').hidden = true;
    // 이름표
    me.player.label = textSprite(me.name, { w: 384, h: 96, size: 46, scale: 3.2, bg: 'rgba(214,48,49,.85)' });
    me.player.label.position.set(0, 3.5, 0);
    me.player.av.add(me.player.label);
    net.send({ t: 'join', cid, name: me.name, look, x: me.x, z: me.z });
    camMode = 'play';
    $('#hud').hidden = false;
    refreshButtons();
    toast(net.mode === 'online' ? '🎄 산타 마을에 입장했어요! 바닥을 클릭하거나 WASD로 이동해요' : '🎄 체험 모드로 입장! (서버 없이 이 브라우저에서만 저장돼요)', 4200);
    if (net.mode === 'local') setTimeout(() => toast('💡 체험 모드의 공방 주인 열쇠는 demo 예요', 5200), 4800);
    setTimeout(() => world.triggerSleigh(), 3000);
  };
}

// ---------- 메인 루프 ----------
const clock = new THREE.Clock();
const SPEED = 7.2;
let sendT = 0, lastSent = '';
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (me.player) {
    const pl = me.player;
    let dx = 0, dz = 0;
    if (camMode === 'play' && !modalOpen()) {
      if (keys.has('w') || keys.has('arrowup')) dz -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dz += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (dx || dz) { me.target = null; me.pending = null; }
      else if (me.target) {
        const ex = me.target[0] - me.x, ez = me.target[1] - me.z, d = Math.hypot(ex, ez);
        if (d < 0.25) { const st = me.pending; me.target = null; me.pending = null; if (st) runStation(st); }
        else { dx = ex / d; dz = ez / d; }
      }
    }
    const moving = !!(dx || dz);
    if (moving) {
      const l = Math.hypot(dx, dz);
      const [nx, nz] = world.resolve(me.x + (dx / l) * SPEED * dt, me.z + (dz / l) * SPEED * dt);
      me.ry = Math.atan2(dx, dz);
      // 막혀서 제자리면 목표 해제(스테이션 근처 도달 보정)
      if (Math.hypot(nx - me.x, nz - me.z) < SPEED * dt * 0.15 && me.target) {
        const st = me.pending; me.target = null; me.pending = null; if (st) runStation(st);
      }
      me.x = nx; me.z = nz;
    }
    pl.av.position.set(me.x, 0, me.z);
    let da = me.ry - pl.av.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    pl.av.rotation.y += da * Math.min(1, dt * 12);
    animateAvatar(pl.av, dt, moving, t);

    sendT += dt;
    if (joined && sendT > 0.15) {
      sendT = 0;
      const s = `${me.x.toFixed(2)},${me.z.toFixed(2)},${me.ry.toFixed(2)}`;
      if (s !== lastSent) { lastSent = s; net.send({ t: 'move', x: me.x, z: me.z, ry: me.ry }); }
    }
  }
  for (const p of players.values()) {
    const ox = p.x, oz = p.z;
    p.x += (p.tx - p.x) * Math.min(1, dt * 8); p.z += (p.tz - p.z) * Math.min(1, dt * 8);
    p.moving = Math.hypot(p.x - ox, p.z - oz) > dt * 0.8;
    p.av.position.set(p.x, 0, p.z);
    let da = p.ry - p.av.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    p.av.rotation.y += da * Math.min(1, dt * 10);
    animateAvatar(p.av, dt, p.moving, t);
  }

  if (markT > 0) { markT = Math.max(0, markT - dt * 1.4); clickMark.material.opacity = markT; clickMark.scale.setScalar(1.6 - markT * 0.8); }

  // 카메라
  let goal;
  if (camMode === 'tree') goal = { pos: new THREE.Vector3(-14 + 4, 9, 3 + 25), look: new THREE.Vector3(-14, 6, 3) };
  else goal = cameraGoal();
  const k = camMode === 'loading' ? 1 : Math.min(1, dt * (camMode === 'select' ? 2.2 : 3));
  camPos.lerp(goal.pos, k); camLook.lerp(goal.look, k);
  camera.position.copy(camPos); camera.lookAt(camLook);

  world.update(dt, new THREE.Vector3(me.x, 0, me.z));
  // 카메라는 항상 내 캐릭터를 따라가며 고정 (하늘 이벤트 중에도 시점을 바꾸지 않음)
  renderer.render(scene, camera);
}

// 개발용 점검 훅 (?debug 로 접속했을 때만)
if (/[?&]debug/.test(location.search)) {
  window.__santa = {
    me, world, runStation, goTo, players,
    project: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; },
    teleport: (x, z) => { me.x = x; me.z = z; },
  };
}

// ---------- 시작 ----------
(async function boot() {
  const bar = $('#bar'), msg = $('#loadmsg');
  const setP = (v, t) => { bar.style.width = `${v}%`; if (t) msg.textContent = t; };
  setP(15, '밤하늘에 별을 켜는 중…');
  net = await connect({ timeout: 1500 });
  net.onmessage = onMsg;
  net.onclose = () => toast('연결이 끊겼어요. 새로고침 해주세요 🔌', 8000);
  $('#mode').textContent = net.mode === 'online' ? '🟢 온라인' : '🧪 체험 모드';
  setP(55, '산타 공방에 불을 붙이는 중…');
  showStart();
  frame();
  setP(90, '루돌프가 썰매를 준비해요…');
  // 로딩 연출을 최소 4.2초는 보여줌 (산타 썰매 그림자)
  const wait = Math.max(0, 4200 - (performance.now() - t0));
  await new Promise((r) => setTimeout(r, wait));
  setP(100, '출발!');
  setTimeout(() => {
    $('#loading').classList.add('gone');
    window.__stopLoadingStars?.();
    setTimeout(() => $('#loading').remove(), 1200);
  }, 350);
})().catch((error) => {
  console.error('Santa Village startup failed:', error);
  const message = $('#loadmsg');
  if (message) message.textContent = '마을을 여는 중 문제가 생겼어요. 페이지를 새로고침해 주세요.';
  $('#loading')?.classList.add('gone');
  if ($('#start')) $('#start').hidden = false;
});
