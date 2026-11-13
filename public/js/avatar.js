// 프로시저럴 3D 캐릭터 v2: 둥근 코트(Lathe), 큰 머리, 장갑/부츠, 툰 셰이딩 + 외곽선.
// 모든 모델은 three.js 도형으로만 만들고, 코스튬은 켜고 끌 수 있는 부품으로 분리해 둠.
import * as THREE from 'three';
import { sanitizeLook } from './data.js';

// ---- 툰 셰이딩 ----
let _ramp;
function ramp() {
  if (_ramp) return _ramp;
  const d = new Uint8Array([120, 190, 255]);
  _ramp = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  _ramp.minFilter = _ramp.magFilter = THREE.NearestFilter;
  _ramp.generateMipmaps = false;
  _ramp.needsUpdate = true;
  return _ramp;
}
const mats = new Map();
const T = (color, o = {}) => {
  const k = color + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshToonMaterial({ color, gradientMap: ramp(), ...o }));
  return mats.get(k);
};
const OUT = new THREE.MeshBasicMaterial({ color: '#3a2230', side: THREE.BackSide });
const OUT_SOFT = new THREE.MeshBasicMaterial({ color: '#7a4a3a', side: THREE.BackSide });

// ---- 공유 지오메트리 ----
const G = {
  sph: new THREE.SphereGeometry(1, 28, 20),
  torus: (r, t) => new THREE.TorusGeometry(r, t, 12, 32),
};
const coatProfile = [[0.0, 0.0], [0.5, 0.0], [0.6, 0.12], [0.58, 0.4], [0.5, 0.72], [0.4, 0.95], [0.3, 1.08], [0.0, 1.12]].map(([x, y]) => new THREE.Vector2(x, y));
G.coat = new THREE.LatheGeometry(coatProfile, 36);
G.sleeve = new THREE.CapsuleGeometry(0.14, 0.3, 6, 14);

function part(parent, geo, mat, { p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], outline = 0.05, soft = false, cast = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p); m.scale.set(...s); m.rotation.set(...r);
  m.castShadow = cast;
  parent.add(m);
  if (outline) {
    const o = new THREE.Mesh(geo, soft ? OUT_SOFT : OUT);
    o.scale.setScalar(1 + outline);
    m.add(o);
  }
  return m;
}

export function createAvatar() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const u = { rig, phase: Math.random() * 6, walk: 0, emote: null, coat: [], cheeks: [], arms: [], feet: [] };
  root.userData = u;

  const skin = T('#ffd8c0');
  const coat = T('#d63031');
  const white = T('#fffdf7');
  const dark = T('#2a1d22');

  // ----- 몸 -----
  const body = part(rig, G.coat, coat, { p: [0, 0.14, 0], s: [1, 1, 0.92], outline: 0.035 });
  u.coat.push(body);
  const hem = part(rig, G.torus(0.52, 0.085), white, { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1], outline: 0.12 });
  part(rig, new THREE.CapsuleGeometry(0.075, 0.78, 6, 12), white, { p: [0, 0.72, 0.5], s: [1, 1, 0.5], outline: 0.1 });
  const belt = part(rig, G.torus(0.5, 0.06), dark, { p: [0, 0.6, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1], outline: 0.2 });
  part(rig, new THREE.BoxGeometry(0.22, 0.2, 0.06), T('#ffd24a', { emissive: '#7a5a10', emissiveIntensity: 0.3 }), { p: [0, 0.6, 0.53], outline: 0.12 });
  for (const y of [0.88, 0.38]) part(rig, G.sph, dark, { p: [0.0, y, 0.5], s: [0.045, 0.045, 0.03], outline: 0 });
  void belt; void hem;

  // ----- 머리 -----
  const head = new THREE.Group();
  head.position.set(0, 1.64, 0);
  rig.add(head);
  part(head, G.sph, skin, { s: [0.62, 0.57, 0.58], outline: 0.045, soft: true });
  for (const sx of [-1, 1]) part(head, G.sph, skin, { p: [sx * 0.6, -0.02, 0], s: [0.1, 0.13, 0.08], outline: 0.1, soft: true }); // 귀
  // 머리카락(뒤/위)
  part(head, new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, 1.2), T('#6b4631'), { p: [0, 0.02, -0.05], s: [0.65, 0.6, 0.62], r: [-0.45, 0, 0], outline: 0.04 });
  // 눈 + 하이라이트 + 눈썹
  for (const sx of [-1, 1]) {
    part(head, G.sph, T('#231a24'), { p: [sx * 0.21, 0.02, 0.5], s: [0.075, 0.1, 0.05], outline: 0 });
    part(head, G.sph, T('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), { p: [sx * 0.21 + 0.022, 0.06, 0.545], s: [0.03, 0.035, 0.02], outline: 0, cast: false });
    const brow = part(head, new THREE.CapsuleGeometry(0.014, 0.1, 4, 8), T('#5a3a2a'), { p: [sx * 0.22, 0.17, 0.5], r: [0, 0, Math.PI / 2 + sx * 0.18], outline: 0, cast: false });
    void brow;
    const ch = part(head, G.sph, T('#ff9fb4'), { p: [sx * 0.36, -0.12, 0.42], s: [0.1, 0.065, 0.04], outline: 0, cast: false });
    u.cheeks.push(ch);
  }
  const plainNose = part(head, G.sph, skin, { p: [0, -0.06, 0.55], s: [0.06, 0.055, 0.06], outline: 0 });
  u.plainNose = plainNose;
  const smile = part(head, new THREE.TorusGeometry(0.08, 0.014, 6, 16, Math.PI), T('#9a4a4a'), { p: [0, -0.13, 0.52], r: [0, 0, Math.PI], outline: 0, cast: false });
  void smile;

  // 루돌프 빨간 코
  const redNose = part(head, G.sph, T('#ff2d2d', { emissive: '#aa0000', emissiveIntensity: 0.7 }), { p: [0, -0.06, 0.58], s: [0.12, 0.11, 0.11], outline: 0.08 });
  u.redNose = redNose;

  // 산타 콧수염
  const mus = new THREE.Group();
  mus.position.set(0, -0.1, 0.52);
  for (const sx of [-1, 1]) {
    part(mus, G.sph, white, { p: [sx * 0.11, 0, 0], s: [0.15, 0.08, 0.08], r: [0, 0, -sx * 0.3], outline: 0.1 });
    part(mus, G.sph, white, { p: [sx * 0.25, 0.05, -0.01], s: [0.07, 0.055, 0.06], outline: 0.1 });
  }
  head.add(mus);
  u.mustache = mus;

  // 산타 모자
  const hat = new THREE.Group();
  hat.position.set(0, 0.4, -0.04);
  const tip = new THREE.Group();
  tip.rotation.x = -0.42;
  part(tip, new THREE.ConeGeometry(0.46, 0.95, 24), T('#d63031'), { p: [0, 0.45, 0], outline: 0.05 });
  part(tip, G.sph, white, { p: [0, 0.97, 0], s: [0.14, 0.14, 0.14], outline: 0.12 });
  hat.add(tip);
  part(hat, G.torus(0.5, 0.115), white, { r: [Math.PI / 2 - 0.1, 0, 0], outline: 0.1 });
  head.add(hat);
  u.hat = hat;

  // 루돌프 머리띠
  const ant = new THREE.Group();
  part(ant, new THREE.TorusGeometry(0.6, 0.04, 8, 28, Math.PI), T('#5a3a22'), { p: [0, 0.0, 0], r: [0, 0, 0], outline: 0.2 });
  for (const sx of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(sx * 0.5, 0.33, 0);
    g.rotation.z = -sx * 0.4;
    const brown = T('#8a5a2b');
    part(g, new THREE.CylinderGeometry(0.035, 0.05, 0.5, 10), brown, { p: [0, 0.24, 0], outline: 0.2 });
    part(g, new THREE.CylinderGeometry(0.025, 0.035, 0.26, 8), brown, { p: [sx * 0.1, 0.33, 0], r: [0, 0, -sx * 0.9], outline: 0.2 });
    part(g, G.sph, T('#ff4d4d'), { p: [0, 0.52, 0], s: [0.06, 0.06, 0.06], outline: 0.15 });
    ant.add(g);
  }
  ant.rotation.x = -0.12;
  head.add(ant);
  u.antlers = ant;

  // 목도리
  const scarf = new THREE.Group();
  part(scarf, G.torus(0.42, 0.11), T('#e63946'), { p: [0, 1.15, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.9, 1], outline: 0.1 });
  part(scarf, G.sph, T('#e63946'), { p: [0.2, 1.08, 0.4], s: [0.15, 0.15, 0.13], outline: 0.1 });
  part(scarf, new THREE.BoxGeometry(0.17, 0.5, 0.07), T('#2e9e5b'), { p: [0.24, 0.84, 0.47], r: [0, 0, 0.12], outline: 0.1 });
  rig.add(scarf);
  u.scarf = scarf;

  // ----- 팔(소매 + 흰 털 커프 + 장갑) -----
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.58, 1.02, 0);
    const a = part(arm, G.sleeve, coat, { p: [0, -0.22, 0], outline: 0.07 });
    u.coat.push(a);
    part(arm, G.torus(0.14, 0.05), white, { p: [0, -0.46, 0], r: [Math.PI / 2, 0, 0], outline: 0.15 });
    part(arm, G.sph, white, { p: [0, -0.56, 0], s: [0.14, 0.14, 0.14], outline: 0.1 });
    rig.add(arm);
    u.arms.push(arm);
  }

  // ----- 부츠 -----
  for (const sx of [-1, 1]) {
    const f = new THREE.Group();
    f.position.set(sx * 0.24, 0.1, 0.08);
    part(f, G.sph, T('#4a2f26'), { p: [0, 0, 0.04], s: [0.2, 0.14, 0.3], outline: 0.08 });
    part(f, new THREE.CylinderGeometry(0.13, 0.14, 0.2, 14), T('#4a2f26'), { p: [0, 0.14, -0.04], outline: 0.08 });
    part(f, G.torus(0.13, 0.04), white, { p: [0, 0.25, -0.04], r: [Math.PI / 2, 0, 0], outline: 0.2, cast: false });
    rig.add(f);
    u.feet.push(f);
  }
  // 바닥 그림자 블롭
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: '#0a0c30', transparent: true, opacity: 0.28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
  root.add(blob);
  return root;
}

export function applyLook(av, look) {
  const l = sanitizeLook(look);
  const u = av.userData;
  u.look = l;
  const coat = T(l.body);
  for (const m of u.coat) m.material = coat;
  u.hat.visible = l.head === 'santaHat';
  u.antlers.visible = l.head === 'antlers';
  u.mustache.visible = l.mustache;
  u.redNose.visible = l.nose;
  u.plainNose.visible = !l.nose;
  u.scarf.visible = l.scarf;
  u.cheeks.forEach((c) => (c.visible = l.cheeks));
}

const EMOTE_TIME = { wave: 2.4, dance: 3.2, jump: 1.4, heart: 2.4, cheer: 2.2 };
export function startEmote(av, name) { av.userData.emote = { name, t: 0 }; }

export function animateAvatar(av, dt, moving, t) {
  const u = av.userData;
  const rig = u.rig;
  u.walk = moving ? u.walk + dt * 11 : u.walk;
  const s = Math.sin(u.walk);
  let y = moving ? Math.abs(s) * 0.13 : Math.sin(t * 2 + u.phase) * 0.025;
  let spin = 0;
  let armL = moving ? s * 0.9 : 0, armR = moving ? -s * 0.9 : 0;
  let zL = 0, zR = 0;

  const e = u.emote;
  if (e) {
    e.t += dt;
    if (e.t > (EMOTE_TIME[e.name] || 2)) u.emote = null;
    else if (e.name === 'wave') { zR = 2.4 + Math.sin(e.t * 12) * 0.35; armR = 0; }
    else if (e.name === 'dance') { spin = e.t * 6; y = Math.abs(Math.sin(e.t * 8)) * 0.22; zL = -2.2 + Math.sin(e.t * 10) * 0.4; zR = 2.2 - Math.sin(e.t * 10) * 0.4; armL = armR = 0; }
    else if (e.name === 'jump') { y = Math.abs(Math.sin((e.t * Math.PI) / 0.7)) * 0.95; zL = -1.2; zR = 1.2; armL = armR = 0; }
    else if (e.name === 'heart') { y = Math.abs(Math.sin(e.t * 5)) * 0.1; zL = -2.6; zR = 2.6; armL = armR = 0; }
    else if (e.name === 'cheer') { y = Math.abs(Math.sin(e.t * 9)) * 0.2; zL = -2.7 + Math.sin(e.t * 14) * 0.2; zR = 2.7 - Math.sin(e.t * 14) * 0.2; armL = armR = 0; }
  }
  rig.position.y = y;
  rig.rotation.y = spin;
  rig.rotation.z = moving ? s * 0.05 : 0;
  u.arms[0].rotation.set(armL, 0, zL);
  u.arms[1].rotation.set(armR, 0, zR);
  u.feet[0].position.z = 0.08 + (moving ? s * 0.22 : 0);
  u.feet[1].position.z = 0.08 + (moving ? -s * 0.22 : 0);
  u.feet[0].position.y = 0.1 + (moving ? Math.max(0, s) * 0.12 : 0);
  u.feet[1].position.y = 0.1 + (moving ? Math.max(0, -s) * 0.12 : 0);
}
