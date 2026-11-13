// 산타 마을 월드: 밤하늘/별, 공방(돌하우스 컷어웨이), 트리, 하트 선물 더미, 썰매/폭죽 이벤트
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PAPERS, RIBBONS, ORNAMENTS, WORLD } from './data.js';
import { paperCanvas, glowTexture, textSprite, plankTexture, signTexture } from './gfx.js';

export const TREE = { x: -14, z: 3, R: 4.3, H: 10.5, y0: 1.4 };
export const HEART = { x: 14, z: 2 };
export const SPOTS = { gift: [-5, -14.2], letter: [5, -14.2], tree: [-8.6, 8.4] };

const rnd = (a, b) => a + Math.random() * (b - a);
const mc = new Map();
const S = (color, o = {}) => {
  const k = color + JSON.stringify(o);
  if (!mc.has(k)) mc.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
  return mc.get(k);
};
const B = (parent, w, h, d, color, x, y, z, o = {}) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || S(color, o.m));
  m.position.set(x, y, z);
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
const SP = (parent, r, color, x, y, z, o = {}) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), o.mat || S(color, o.m));
  m.position.set(x, y, z);
  if (o.sc) m.scale.set(...o.sc);
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
const CY = (parent, rt, rb, h, color, x, y, z, o = {}) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 16), o.mat || S(color, o.m));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
const bulbMats = ['#ff4d4d', '#ffd84d', '#4dff88', '#4da6ff'].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true }));
const bulbGeo = new THREE.SphereGeometry(0.11, 8, 6);

function starGeo(r = 0.32) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
}

function ornamentMesh(def) {
  const g = new THREE.Group();
  const c = def.color;
  const metal = S(c, { roughness: 0.25, metalness: 0.4 });
  switch (def.shape) {
    case 'star': {
      const st = new THREE.Mesh(starGeo(), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 }));
      st.position.z = -0.05;
      g.add(st);
      break;
    }
    case 'bell': {
      const pts = [[0, 0.32], [0.12, 0.3], [0.22, 0.12], [0.3, -0.12], [0.34, -0.2], [0, -0.2]].map(([x, y]) => new THREE.Vector2(x, y));
      g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 14), new THREE.MeshStandardMaterial({ color: c, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })));
      const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), S('#8a5a2b'));
      clapper.position.y = -0.22;
      g.add(clapper);
      break;
    }
    case 'cane': {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), S('#ffffff'));
      stem.position.y = -0.05;
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 8, 14, Math.PI), S('#e63946'));
      hook.position.set(0.14, 0.2, 0);
      g.add(stem, hook);
      for (let i = 0; i < 3; i++) {
        const rg = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 6, 10), S('#e63946'));
        rg.rotation.x = Math.PI / 2;
        rg.position.y = -0.25 + i * 0.15;
        g.add(rg);
      }
      break;
    }
    case 'flake':
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }));
        b.rotation.z = (i * Math.PI) / 3;
        g.add(b);
      }
      break;
    case 'gift':
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), S(c)));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.09, 0.43), S('#ffd24a')));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.43, 0.43), S('#ffd24a')));
      break;
    default: {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), metal));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), S('#ffd24a', { metalness: 0.8, roughness: 0.3 }));
      cap.position.y = 0.32;
      g.add(cap);
    }
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export class World {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.t = 0;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.pickables = [];
    this.boxes = [];
    this.circles = [];
    this.ticks = [];
    this.gifts = [];
    this.falling = [];
    this.bursts = [];
    this.rockets = [];
    this.timers = [];
    this.pop = [];
    this.skyUntil = 0;
    this.skyFocus = 0;
    this.follow = new THREE.Vector3(0, 0, 10);
    this.buildLights();
    this.buildSky();
    this.buildGround();
    this.buildWorkshop();
    this.buildTree();
    this.buildPlaza();
    this.buildSnow();
    this.buildHeart();
    this.buildSparks();
    this.buildSleigh();
  }

  // ---------- 충돌 ----------
  resolve(x, z, r = 0.5) {
    for (const [x1, z1, x2, z2] of this.boxes) {
      const cx = Math.max(x1, Math.min(x, x2)), cz = Math.max(z1, Math.min(z, z2));
      const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); x = cx + (dx / d) * r; z = cz + (dz / d) * r; }
        else {
          const l = x - x1, rr = x2 - x, t = z - z1, b = z2 - z, m = Math.min(l, rr, t, b);
          if (m === l) x = x1 - r; else if (m === rr) x = x2 + r; else if (m === t) z = z1 - r; else z = z2 + r;
        }
      }
    }
    for (const [cx, cz, cr] of this.circles) {
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d < cr + r) { if (d > 1e-6) { x = cx + (dx / d) * (cr + r); z = cz + (dz / d) * (cr + r); } else x = cx + cr + r; }
    }
    const R = WORLD.radius, d = Math.hypot(x, z);
    if (d > R) { x *= R / d; z *= R / d; }
    return [x, z];
  }

  // ---------- 조명 ----------
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x8aa0ff, 0x40305f, 1.25));
    s.add(new THREE.AmbientLight(0xffd7b0, 0.25));
    const moon = new THREE.DirectionalLight(0xbfd0ff, 1.7);
    moon.position.set(-22, 38, -34);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const c = moon.shadow.camera;
    c.left = -44; c.right = 44; c.top = 44; c.bottom = -44; c.near = 1; c.far = 130;
    moon.shadow.bias = -0.0005;
    s.add(moon);
    const warm = new THREE.PointLight(0xffb066, 85, 26, 2);
    warm.position.set(0, 4.6, -13.5);
    const fire = new THREE.PointLight(0xff7a33, 55, 14, 2);
    fire.position.set(0, 1.8, -17.6);
    const treeL = new THREE.PointLight(0xffe7a8, 70, 24, 2);
    treeL.position.set(TREE.x, 7, TREE.z + 3);
    const heartL = new THREE.PointLight(0xff8fb8, 45, 18, 2);
    heartL.position.set(HEART.x, 6, HEART.z + 4);
    s.add(warm, fire, treeL, heartL);
    this.ticks.push((dt, t) => { fire.intensity = 50 + Math.sin(t * 13) * 8 + Math.sin(t * 7.3) * 6; });
  }

  // ---------- 밤하늘 ----------
  buildSky() {
    const g = (this.sky = new THREE.Group());
    g.frustumCulled = false;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, depthTest: false,
        vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `varying vec3 vP; void main(){
          float h=normalize(vP).y;
          vec3 hor=vec3(.78,.37,.52), mid=vec3(.18,.18,.45), top=vec3(.03,.05,.17), low=vec3(.20,.14,.36);
          vec3 c = h<0. ? mix(hor,low,clamp(-h*3.,0.,1.)) : mix(mix(hor,mid,smoothstep(0.,.3,h)),top,smoothstep(.2,.9,h));
          gl_FragColor=vec4(c,1.); }`,
      }),
    );
    dome.renderOrder = -10;
    g.add(dome);

    // 반짝이는 별
    const N = 1300;
    const pos = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const y = Math.pow(Math.random(), 0.8) * 1.05 - 0.06;
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.max(0, 1 - y * y));
      pos.set([Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380], i * 3);
      ph[i] = Math.random() * 6.28;
      sz[i] = Math.random() < 0.06 ? rnd(7, 11) : rnd(2.2, 5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    this.starMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
      vertexShader: `attribute float aPhase; attribute float aSize; uniform float uTime; uniform float uScale; varying float vA;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
          float tw=.5+.5*sin(uTime*(1.1+aPhase*.25)+aPhase*20.); vA=.35+.65*tw; gl_PointSize=aSize*uScale*(.7+.5*tw); }`,
      fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); a*=a; gl_FragColor=vec4(1.,.96,.86,a*vA); }`,
    });
    const stars = new THREE.Points(geo, this.starMat);
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    g.add(stars);

    // 달 + 달빛 번짐
    const moon = new THREE.Mesh(new THREE.SphereGeometry(15, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff4d2', depthTest: false, depthWrite: false }));
    const dir = new THREE.Vector3(-0.42, 0.5, -0.75).normalize().multiplyScalar(340);
    moon.position.copy(dir);
    moon.renderOrder = -8;
    g.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffe9b0', transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(150, 150, 1);
    halo.position.copy(dir);
    halo.renderOrder = -8;
    g.add(halo);
    this.scene.add(g);
    this.ticks.push((dt, t) => {
      g.position.copy(this.camera.position);
      this.starMat.uniforms.uTime.value = t;
      this.starMat.uniforms.uScale.value = Math.min(window.devicePixelRatio || 1, 2);
    });
  }

  // ---------- 땅/눈/숲 ----------
  buildGround() {
    const r = this.root;
    const g = new THREE.Mesh(new THREE.CircleGeometry(75, 64), new THREE.MeshStandardMaterial({ color: '#e1e9ff', roughness: 1 }));
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    r.add(g);
    const outer = new THREE.Mesh(new THREE.CircleGeometry(500, 32), new THREE.MeshBasicMaterial({ color: '#6f79b4' }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.05;
    r.add(outer);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(10, 48), new THREE.MeshStandardMaterial({ color: '#cdd6f2', roughness: 1 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.02, 9); plaza.receiveShadow = true;
    r.add(plaza);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 12), new THREE.MeshStandardMaterial({ color: '#cdd6f2', roughness: 1 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.021, -3); path.receiveShadow = true;
    r.add(path);
    // 먼 언덕 실루엣
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rnd(-0.1, 0.1), d = rnd(95, 125);
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), S('#d9e2ff', { roughness: 1 }));
      h.scale.set(rnd(22, 40), rnd(7, 15), rnd(18, 30));
      h.position.set(Math.cos(a) * d, -3, Math.sin(a) * d);
      r.add(h);
    }
    // 눈더미
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, d = rnd(26, 62);
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), S('#f1f5ff', { roughness: 1 }));
      m.scale.set(rnd(1.5, 4), rnd(0.5, 1.2), rnd(1.5, 4));
      m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      m.receiveShadow = true; m.castShadow = true;
      r.add(m);
    }
  }

  buildSnow() {
    const N = 2200;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pos.set([rnd(-45, 45), rnd(0, 36), rnd(-45, 45)], i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.ticks.push((dt, t) => {
      pts.position.set(this.follow.x, 0, this.follow.z);
      for (let i = 0; i < N; i++) {
        let y = pos[i * 3 + 1] - dt * (1.4 + (i % 7) * 0.22);
        if (y < 0) y += 36;
        pos[i * 3 + 1] = y;
        pos[i * 3] += Math.sin(t * 0.6 + i) * dt * 0.35;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  pine(x, z, s = 1) {
    const g = new THREE.Group();
    CY(g, 0.3 * s, 0.4 * s, 1.4 * s, '#5a3a22', 0, 0.7 * s, 0);
    for (let i = 0; i < 3; i++) {
      const r = (2.1 - i * 0.55) * s, h = (2.4 - i * 0.2) * s, y = (1.6 + i * 1.3) * s;
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), S('#1f6b4a', { flatShading: true }));
      c.position.y = y; c.castShadow = true; c.receiveShadow = true;
      g.add(c);
      const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.78, h * 0.55, 10), S('#f4f8ff', { flatShading: true }));
      sn.position.y = y + h * 0.28;
      g.add(sn);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rnd(0, 6);
    this.root.add(g);
    if (Math.hypot(x, z) < WORLD.radius + 2) this.circles.push([x, z, 0.7 * s]);
  }

  house(x, z, w, d, color) {
    const g = new THREE.Group();
    B(g, w, 3.4, d, color, 0, 1.7, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.6, 4), S('#7a2e2e'));
    roof.rotation.y = Math.PI / 4; roof.position.y = 4.6; roof.castShadow = true;
    g.add(roof);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.8, 1.2, 4), S('#ffffff'));
    snow.rotation.y = Math.PI / 4; snow.position.y = 5.2;
    g.add(snow);
    CY(g, 0.35, 0.35, 1.8, '#8b8b98', w * 0.28, 4.3, -d * 0.2, { seg: 8 });
    const win = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), win);
      m.position.set(sx * w * 0.28, 2.1, d / 2 + 0.02);
      g.add(m);
    }
    B(g, 1, 1.9, 0.12, '#5a3a22', 0, 0.95, d / 2 + 0.03);
    g.position.set(x, 0, z);
    this.root.add(g);
    this.boxes.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  }

  bulbLine(parent, a, b, n, sag = 0.4) {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      const m = new THREE.Mesh(bulbGeo, bulbMats[i % 4]);
      m.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag, a[2] + (b[2] - a[2]) * u);
      parent.add(m);
    }
  }

  marker(text, x, y, z, station) {
    const sp = textSprite(text, { scale: 4.4 });
    sp.position.set(x, y, z);
    sp.userData.station = station;
    this.root.add(sp);
    this.pickables.push(sp);
    this.ticks.push((dt, t) => { sp.position.y = y + Math.sin(t * 2 + x) * 0.18; });
    return sp;
  }

  buildPlaza() {
    const r = this.root;
    // 숲
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, d = rnd(30, 62);
      this.pine(Math.cos(a) * d, Math.sin(a) * d, rnd(0.9, 1.7));
    }
    // 마을 집
    this.house(-27, -7, 7, 6, '#f3dcc0');
    this.house(28, -6, 7, 6, '#e8c8d8');
    this.house(-27, 17, 6.5, 5.5, '#cfe2f3');
    this.house(28, 19, 6.5, 5.5, '#f6e7b4');
    // 가로등
    for (const [x, z] of [[-5.5, 2], [5.5, 2], [-5.5, 13], [5.5, 13], [-18, 11], [18, 11]]) {
      const g = new THREE.Group();
      CY(g, 0.1, 0.14, 4.2, '#2a2a38', 0, 2.1, 0, { seg: 8 });
      SP(g, 0.34, '#ffe9a8', 0, 4.4, 0, { mat: new THREE.MeshBasicMaterial({ color: '#ffe9a8' }), cast: false });
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffcf80', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(5, 5, 1); halo.position.y = 4.4;
      g.add(halo);
      g.position.set(x, 0, z);
      r.add(g);
      this.circles.push([x, z, 0.25]);
    }
    // 눈사람
    const sm = new THREE.Group();
    SP(sm, 1.1, '#ffffff', 0, 1.0, 0); SP(sm, 0.82, '#ffffff', 0, 2.3, 0); SP(sm, 0.58, '#ffffff', 0, 3.3, 0);
    for (const sx of [-1, 1]) SP(sm, 0.07, '#222222', sx * 0.2, 3.4, 0.5, { cast: false });
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), S('#ff8a2b'));
    carrot.rotation.x = Math.PI / 2; carrot.position.set(0, 3.3, 0.72);
    sm.add(carrot);
    CY(sm, 0.5, 0.5, 0.08, '#222233', 0, 3.8, 0); CY(sm, 0.32, 0.32, 0.55, '#222233', 0, 4.1, 0);
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 18), S('#e63946'));
    sc.rotation.x = Math.PI / 2; sc.position.y = 2.85;
    sm.add(sc);
    sm.position.set(4.5, 0, 15);
    r.add(sm);
    this.circles.push([4.5, 15, 1.2]);
    this.marker('🎄 오너먼트 달기', TREE.x + 5.5, 3.6, TREE.z + 5, 'tree');
  }

  // ---------- 공방 ----------
  buildWorkshop() {
    const g = (this.workshop = new THREE.Group());
    this.root.add(g);
    B(g, 18, 0.3, 12, '#fff', 0, 0.15, -14, { mat: new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.8 }), cast: false });
    const wall = (cx, cz, sx, sz) => {
      B(g, sx, 1.6, sz, '#b3363c', cx, 1.1, cz);
      B(g, sx + 0.05, 0.25, sz + 0.05, '#ffffff', cx, 1.97, cz);
      B(g, sx, 4.2, sz, '#f7e8c8', cx, 4.2, cz);
      B(g, sx + 0.35, 0.4, sz + 0.35, '#ffffff', cx, 6.5, cz);
      this.boxes.push([cx - sx / 2 - 0.05, cz - sz / 2 - 0.05, cx + sx / 2 + 0.05, cz + sz / 2 + 0.05]);
    };
    wall(0, -20, 18.6, 0.5); // 뒷벽
    wall(-9, -14, 0.5, 12.2); // 왼쪽 (앞면은 열어둔 돌하우스 단면)
    wall(9, -14, 0.5, 12.2);

    // 창문
    const winMat = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
    for (const wx of [-6.5, 6.5]) {
      B(g, 2.7, 2.7, 0.1, '#5a3a22', wx, 3.9, -19.7);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), winMat);
      w.position.set(wx, 3.9, -19.63);
      g.add(w);
      B(g, 0.12, 2.3, 0.06, '#5a3a22', wx, 3.9, -19.6);
      B(g, 2.3, 0.12, 0.06, '#5a3a22', wx, 3.9, -19.6);
    }
    // 벽난로
    B(g, 4.2, 3.4, 1.4, '#8d8f9c', 0, 2.0, -19.0);
    B(g, 5, 0.28, 1.7, '#6b4428', 0, 3.8, -18.9);
    B(g, 2.0, 1.7, 0.2, '#1a1210', 0, 1.2, -18.28, { cast: false });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 8), new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: 0.95 }));
    flame.position.set(0, 1.0, -18.35);
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
    flame2.position.set(0, 0.85, -18.3);
    g.add(flame, flame2);
    this.ticks.push((dt, t) => {
      flame.scale.set(1 + Math.sin(t * 11) * 0.1, 1 + Math.sin(t * 9 + 1) * 0.18, 1);
      flame2.scale.set(1, 1 + Math.sin(t * 14) * 0.2, 1);
    });
    for (const x of [-1.4, 0, 1.4]) {
      B(g, 0.45, 0.7, 0.12, '#d63031', x, 3.3, -18.0);
      B(g, 0.5, 0.15, 0.14, '#ffffff', x, 3.65, -18.0);
    }
    this.boxes.push([-2.2, -19.8, 2.2, -18.2]);
    this.bulbLine(g, [-2.4, 4.05, -18.0], [2.4, 4.05, -18.0], 9, 0.35);

    // 러그
    CY(g, 3.6, 3.6, 0.06, '#c0392b', 0, 0.33, -12.8, { seg: 40 });
    CY(g, 3.0, 3.0, 0.07, '#f6efe0', 0, 0.33, -12.8, { seg: 40 });
    CY(g, 2.4, 2.4, 0.08, '#c0392b', 0, 0.33, -12.8, { seg: 40 });

    // 선물 포장대
    const gt = new THREE.Group();
    B(gt, 5, 0.25, 1.8, '#c58b57', 0, 1.35, 0);
    for (const [lx, lz] of [[-2.2, -0.7], [2.2, -0.7], [-2.2, 0.7], [2.2, 0.7]]) B(gt, 0.25, 1.25, 0.25, '#8a5a2b', lx, 0.7, lz);
    const roll = CY(gt, 0.3, 0.3, 1.3, '#e63946', -1.6, 1.75, 0);
    roll.rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.1, 8, 16), S(RIBBONS[i].color));
      sp.position.set(0.2 + i * 0.7, 1.6, -0.2); sp.castShadow = true;
      gt.add(sp);
    }
    const demo = this.giftMesh('blueStars', 'gold'); demo.position.set(1.8, 1.9, 0.3); demo.scale.setScalar(0.7); gt.add(demo);
    gt.position.set(-5, 0.3, -17.4);
    gt.userData.station = 'gift';
    g.add(gt);
    this.pickables.push(gt);
    this.boxes.push([-7.6, -18.4, -2.4, -16.4]);
    this.marker('🎁 선물 포장', -5, 4.8, -17.4, 'gift');

    // 편지 책상 + 우체통
    const lt = new THREE.Group();
    B(lt, 5, 0.25, 1.8, '#c58b57', 0, 1.35, 0);
    for (const [lx, lz] of [[-2.2, -0.7], [2.2, -0.7], [-2.2, 0.7], [2.2, 0.7]]) B(lt, 0.25, 1.25, 0.25, '#8a5a2b', lx, 0.7, lz);
    B(lt, 1.3, 1.2, 1.5, '#d63031', 1.2, 2.1, 0);
    const roofM = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 16, 1, false, 0, Math.PI), S('#d63031'));
    roofM.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    roofM.position.set(1.2, 2.7, 0); roofM.castShadow = true;
    lt.add(roofM);
    B(lt, 0.7, 0.12, 0.05, '#222222', 1.2, 2.3, 0.77, { cast: false });
    B(lt, 0.08, 0.7, 0.08, '#e9c58b', 1.9, 2.5, 0);
    B(lt, 0.4, 0.25, 0.06, '#ffd24a', 2.1, 2.8, 0);
    CY(lt, 0.14, 0.14, 0.7, '#fff6d6', -1.6, 1.8, 0);
    SP(lt, 0.1, '#ffb340', -1.6, 2.25, 0, { mat: new THREE.MeshBasicMaterial({ color: '#ffcf70' }), cast: false });
    for (let i = 0; i < 3; i++) { const l = B(lt, 0.8, 0.04, 0.55, '#ffffff', -0.4 + i * 0.1, 1.5 + i * 0.04, 0.1); l.rotation.y = i * 0.3; }
    lt.position.set(5, 0.3, -17.4);
    lt.userData.station = 'letter';
    g.add(lt);
    this.pickables.push(lt);
    this.boxes.push([2.4, -18.4, 7.6, -16.4]);
    this.marker('✉️ 편지', 5, 4.8, -17.4, 'letter');

    // 앞 기둥 + 들보 + 간판
    for (const sx of [-1, 1]) B(g, 0.6, 6.4, 0.6, '#b3363c', sx * 9, 3.5, -8);
    B(g, 18.6, 0.5, 0.6, '#7a4a2a', 0, 6.4, -8);
    B(g, 18.9, 0.35, 0.9, '#ffffff', 0, 6.8, -8);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshStandardMaterial({ map: signTexture('🎅 산타 공방'), roughness: 0.8 }));
    sign.position.set(0, 5.3, -7.65);
    g.add(sign);
    sign.userData.keep = true;
    for (const sx of [-2.6, 2.6]) CY(g, 0.03, 0.03, 0.9, '#2a2a38', sx, 6.0, -7.68, { seg: 6 });
    this.bulbLine(g, [-9, 5.9, -7.7], [9, 5.9, -7.7], 20, 0.55);
    this.bulbLine(g, [-9, 6.0, -19.7], [9, 6.0, -19.7], 20, 0.5);
    this.ticks.push((dt, t) => bulbMats.forEach((m, i) => { m.opacity = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7); }));
    this.loadWorkshopGLB(g);
  }

  // Blender로 만든 공방(public/models/workshop.glb)이 있으면 절차적 인테리어 대신 사용. 없으면 그대로 둠.
  loadWorkshopGLB(g) {
    new GLTFLoader().load('models/workshop.glb', (gltf) => {
      const m = gltf.scene;
      const kill = [];
      m.traverse((o) => { if (o.isLight || o.isCamera) kill.push(o); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      kill.forEach((o) => o.parent && o.parent.remove(o));
      for (const c of g.children) if (!c.userData.keep) c.visible = false; // 충돌/클릭 판정은 그대로 유지
      m.position.set(0, 0.3, -13.83);
      g.add(m);
    }, undefined, () => {});
  }

  // ---------- 트리 ----------
  buildTree() {
    const g = (this.treeGroup = new THREE.Group());
    g.position.set(TREE.x, 0, TREE.z);
    this.root.add(g);
    CY(g, 0.7, 1.0, 2.2, '#5a3a22', 0, 1.1, 0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(TREE.R, TREE.H, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#1d7a4f', roughness: 0.9, flatShading: true, side: THREE.DoubleSide }));
    cone.position.y = TREE.y0 + TREE.H / 2;
    cone.castShadow = true;
    g.add(cone);
    this.treeCone = cone;
    for (const h of [0.1, 0.32, 0.52, 0.72]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TREE.R * (1 - h) * 1.04, 0.38, 8, 36), S('#17653f', { flatShading: true }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = TREE.y0 + h * TREE.H;
      ring.scale.z = 0.8;
      ring.castShadow = true;
      g.add(ring);
    }
    const star = new THREE.Mesh(starGeo(0.9), new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffc933', emissiveIntensity: 1.2 }));
    star.position.set(0, TREE.y0 + TREE.H + 0.35, -0.1);
    g.add(star);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffe08a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(5, 5, 1); halo.position.copy(star.position);
    g.add(halo);
    this.ticks.push((dt, t) => { star.rotation.y = Math.sin(t) * 0.5; halo.scale.setScalar(4.6 + Math.sin(t * 3) * 0.5); });
    // 나선 조명
    for (let i = 0; i < 90; i++) {
      const h = 0.05 + (i / 90) * 0.88, th = h * 40;
      const r = TREE.R * (1 - h) + 0.1;
      const m = new THREE.Mesh(bulbGeo, bulbMats[i % 4]);
      m.position.set(Math.cos(th) * r, TREE.y0 + h * TREE.H, Math.sin(th) * r);
      g.add(m);
    }
    // 선물 상자(나무 아래 장식)
    for (const [x, z, p, rb] of [[2.6, 3.8, 'redDots', 'gold'], [3.5, 3.0, 'greenStripe', 'red'], [-2.4, 4.0, 'goldSnow', 'purple']]) {
      const m = this.giftMesh(p, rb); m.scale.setScalar(1.3); m.position.set(x, 0.65, z); m.rotation.y = rnd(0, 3); g.add(m);
    }
    this.circles.push([TREE.x, TREE.z, 1.3]);
    this.ornGroup = new THREE.Group();
    this.root.add(this.ornGroup);
    this.ghost = null;
  }

  ornPos(o) {
    const h = o.h;
    const y = TREE.y0 + h * TREE.H;
    const r = TREE.R * (1 - h) + 0.22;
    return new THREE.Vector3(TREE.x + Math.cos(o.th) * r, y, TREE.z + Math.sin(o.th) * r);
  }

  addOrnament(o, animate) {
    const def = ORNAMENTS.find((d) => d.id === o.kind) || ORNAMENTS[0];
    const m = ornamentMesh(def);
    m.position.copy(this.ornPos(o));
    m.rotation.y = Math.PI / 2 - o.th;
    m.userData.ornament = { ...o, name: def.name, emoji: def.emoji };
    this.ornGroup.add(m);
    this.pickables.push(m);
    if (animate) { m.scale.setScalar(0.01); this.pop.push({ m, t: 0 }); }
  }

  pickTree(raycaster) {
    const hit = raycaster.intersectObject(this.treeCone, false)[0];
    if (!hit) return null;
    const p = hit.point;
    const h = Math.min(0.92, Math.max(0.07, (p.y - TREE.y0) / TREE.H));
    return { h, th: Math.atan2(p.z - TREE.z, p.x - TREE.x) };
  }

  setGhost(kind, pos) {
    if (this.ghost) { this.root.remove(this.ghost); this.ghost = null; }
    if (!kind) return;
    const def = ORNAMENTS.find((d) => d.id === kind);
    this.ghost = ornamentMesh(def);
    this.ghost.visible = false;
    this.ghost.scale.setScalar(1.15);
    this.root.add(this.ghost);
    if (pos) this.moveGhost(pos);
  }
  moveGhost(o) {
    if (!this.ghost) return;
    this.ghost.visible = true;
    this.ghost.position.copy(this.ornPos(o));
    this.ghost.rotation.y = Math.PI / 2 - o.th;
  }

  // ---------- 하트 선물 더미 ----------
  buildHeart() {
    const g = (this.heartGroup = new THREE.Group());
    g.position.set(HEART.x, 0, HEART.z);
    this.root.add(g);
    const c = 1.15, S_ = 4.2, cells = [];
    for (let j = 0; j < 18; j++) for (let i = -8; i <= 8; i++) {
      const x = (i * c) / S_, y = -1.15 + ((j + 0.5) * c) / S_, a = x * x + y * y - 1;
      if (a * a * a - x * x * y * y * y <= 0) cells.push({ i, j });
    }
    const minJ = Math.min(...cells.map((k) => k.j));
    cells.forEach((k) => { k.j -= minJ; });
    cells.sort((a, b) => a.j - b.j || Math.abs(a.i) - Math.abs(b.i) || a.i - b.i);
    this.cells = cells;
    this.cellSize = c;
    B(g, 15, 0.4, 7, '#f4f8ff', 0, 0.0, 1.2, { cast: false });
    // 하트 가이드: 선물이 채워질 자리를 옅은 분홍 칸으로 보여줌 (선물이 쌓이면 가려짐)
    const guide = new THREE.InstancedMesh(new THREE.BoxGeometry(c * 0.94, c * 0.94, 0.06), new THREE.MeshBasicMaterial({ color: '#ff9ec4', transparent: true, opacity: 0.24, depthWrite: false }), cells.length);
    const mt = new THREE.Matrix4();
    cells.forEach((k, n) => { mt.makeTranslation(k.i * c, (k.j + 0.5) * c + 0.2, 0.62); guide.setMatrixAt(n, mt); });
    g.add(guide);
    const lab = textSprite('💝 선물이 하트로 쌓여요', { scale: 5.2 });
    lab.position.set(0, 0.9, 5.4);
    g.add(lab);
  }

  giftMesh(paperId, ribbonId) {
    const paper = PAPERS.find((p) => p.id === paperId) || PAPERS[0];
    const rib = RIBBONS.find((r) => r.id === ribbonId) || RIBBONS[0];
    this._pm ||= {};
    if (!this._pm[paper.id]) {
      const tex = new THREE.CanvasTexture(paperCanvas(paper, 128));
      tex.colorSpace = THREE.SRGBColorSpace;
      this._pm[paper.id] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    }
    const rm = S(rib.color, { roughness: 0.4 });
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this._pm[paper.id]);
    box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.03, 1.03, 0.17), rm));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 1.03, 1.03), rm));
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), rm);
      b.scale.set(1.2, 0.8, 0.8);
      b.position.set(sx * 0.15, 0.55, 0);
      b.rotation.z = -sx * 0.5;
      g.add(b);
    }
    return g;
  }

  addGift(gift, animate) {
    const idx = this.gifts.length;
    const n = this.cells.length;
    const cell = this.cells[idx % n], layer = Math.floor(idx / n), c = this.cellSize;
    const m = this.giftMesh(gift.paper, gift.ribbon);
    const tx = cell.i * c + rnd(-0.03, 0.03), ty = (cell.j + 0.5) * c + 0.2, tz = 1.2 + layer * c * 1.02;
    m.position.set(tx, animate ? ty + 16 : ty, tz);
    m.rotation.y = rnd(-0.07, 0.07);
    m.scale.setScalar(0.98);
    m.userData.gift = gift;
    this.heartGroup.add(m);
    this.pickables.push(m);
    this.gifts.push(m);
    if (animate) this.falling.push({ m, y: ty, v: 0 });
  }

  // ---------- 하늘 이벤트: 썰매 / 폭죽 ----------
  buildSparks() {
    const N = 300;
    const pos = new Float32Array(N * 3).fill(-999), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.6, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.sparks = { N, pos, col, vel, life, geo, i: 0 };
  }
  spark(x, y, z, spread = 3) {
    const s = this.sparks, k = s.i++ % s.N;
    s.pos.set([x, y, z], k * 3);
    s.vel.set([rnd(-spread, spread), rnd(-spread, 0.5), rnd(-spread, spread)], k * 3);
    s.life[k] = 1;
  }

  buildSleigh() {
    const g = new THREE.Group();
    const em = (c, e) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 0.7, roughness: 0.6 });
    const red = em('#d63031', '#7a1010'), brown = em('#8a5a2b', '#3a2210'), gold = em('#ffd24a', '#8a6a10');
    B(g, 3.2, 1, 1.6, '#d63031', -1, 0.9, 0, { mat: red, cast: false });
    B(g, 0.3, 0.2, 2, '#fff', -1, 0.1, 0, { mat: gold, cast: false }).scale.set(11, 1, 1);
    SP(g, 0.62, '#d63031', -1.1, 1.9, 0, { mat: red, cast: false });
    SP(g, 0.36, '#ffdcc4', -1.1, 2.7, 0, { mat: em('#ffdcc4', '#553322'), cast: false });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 10), red); hat.position.set(-1.1, 3.25, 0); g.add(hat);
    SP(g, 0.75, '#8a5a2b', -2.2, 1.9, 0, { mat: brown, cast: false });
    const legs = [];
    const deer = (x, z, rudolph) => {
      const d = new THREE.Group();
      SP(d, 1, '#8a5a2b', 0, 0, 0, { mat: brown, sc: [1.0, 0.55, 0.5], cast: false });
      SP(d, 0.3, '#8a5a2b', 0.95, 0.55, 0, { mat: brown, cast: false });
      for (const s of [-1, 1]) {
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6), brown);
        a.position.set(0.92, 1.0, s * 0.18); a.rotation.z = -0.3; d.add(a);
      }
      const nose = SP(d, 0.1, '#ff2b2b', 1.27, 0.5, 0, { mat: new THREE.MeshBasicMaterial({ color: rudolph ? '#ff2b2b' : '#3a2210' }), cast: false });
      if (rudolph) {
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff3030', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        gl.scale.set(2.4, 2.4, 1); gl.position.copy(nose.position); d.add(gl);
      }
      for (const [lx, lz] of [[0.5, 0.25], [0.5, -0.25], [-0.5, 0.25], [-0.5, -0.25]]) {
        const lg = new THREE.Group(); lg.position.set(lx, -0.3, lz);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), brown); leg.position.y = -0.4; lg.add(leg);
        d.add(lg); legs.push(lg);
      }
      d.position.set(x, 1.2, z);
      g.add(d);
    };
    deer(3.0, 0.7), deer(3.0, -0.7), deer(6.0, 0.7), deer(6.0, -0.7), deer(9.2, 0, true);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffe9b0', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(16, 8, 1); glow.position.set(3, 1.5, 0); g.add(glow);
    g.scale.setScalar(3.4);
    g.visible = false;
    g.traverse((o) => { o.castShadow = false; });
    this.scene.add(g);
    this.sleigh = { g, legs, active: false, t: 0, dur: 13 };
  }

  triggerSleigh() {
    if (this.sleigh.active) return;
    Object.assign(this.sleigh, { active: true, t: 0 });
    this.sleigh.g.visible = true;
    this.skyUntil = Math.max(this.skyUntil, this.t + 14);
  }

  launchFirework(x, z, y = rnd(24, 36)) {
    this.rockets.push({ x, z, ty: y, y: 1, t: 0, dur: rnd(0.8, 1.1) });
  }
  burst(x, y, z) {
    const N = 90;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const hue = Math.random();
    const c1 = new THREE.Color().setHSL(hue, 1, 0.6), c2 = new THREE.Color().setHSL((hue + 0.12 + Math.random() * 0.3) % 1, 1, 0.65);
    for (let i = 0; i < N; i++) {
      pos.set([x, y, z], i * 3);
      const th = Math.random() * Math.PI * 2, ph = Math.acos(rnd(-1, 1)), sp = rnd(6, 10) * (i % 3 === 0 ? 0.6 : 1);
      vel.set([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp], i * 3);
      const c = i % 2 ? c1 : c2;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col.slice(), 3));
    const mat = new THREE.PointsMaterial({ size: 1.2, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.bursts.push({ pts, geo, mat, pos, vel, base: col, N, t: 0 });
  }
  fireworkShow() {
    for (let i = 0; i < 7; i++) this.timers.push({ at: this.t + i * 0.75 + rnd(0, 0.3), fn: () => this.launchFirework(rnd(-28, 28), rnd(-42, -8)) });
    this.skyUntil = Math.max(this.skyUntil, this.t + 9.5);
  }

  // ---------- 매 프레임 ----------
  update(dt, followPos) {
    this.t += dt;
    const t = this.t;
    this.follow.copy(followPos);
    for (const f of this.ticks) f(dt, t);

    const target = t < this.skyUntil ? 1 : 0;
    this.skyFocus += (target - this.skyFocus) * Math.min(1, dt * 1.5);

    for (let i = this.timers.length - 1; i >= 0; i--) if (t >= this.timers[i].at) { this.timers[i].fn(); this.timers.splice(i, 1); }

    for (const f of this.falling) {
      f.v -= 32 * dt; f.m.position.y += f.v * dt;
      if (f.m.position.y <= f.y) { f.m.position.y = f.y; f.v = -f.v * 0.28; if (Math.abs(f.v) < 1.2) f.done = true; }
    }
    this.falling = this.falling.filter((f) => !f.done);
    for (const p of this.pop) {
      p.t += dt * 2.2;
      const k = Math.min(1, p.t) - 1; // easeOutBack: 0 → 1 (살짝 튀어오름)
      p.m.scale.setScalar(Math.max(0.01, 1 + 2.7 * k * k * k + 1.7 * k * k));
    }
    this.pop = this.pop.filter((p) => { if (p.t >= 1) { p.m.scale.setScalar(1); return false; } return true; });

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.t += dt;
      r.y = 1 + (r.ty - 1) * Math.min(1, r.t / r.dur);
      this.spark(r.x, r.y, r.z, 0.6);
      if (r.t >= r.dur) { this.burst(r.x, r.y, r.z); this.rockets.splice(i, 1); }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += dt;
      const fade = Math.max(0, 1 - b.t / 2.3), col = b.geo.attributes.color.array;
      for (let k = 0; k < b.N; k++) {
        b.vel[k * 3 + 1] -= 5 * dt;
        b.vel[k * 3] *= 0.985; b.vel[k * 3 + 2] *= 0.985;
        for (let a = 0; a < 3; a++) {
          b.pos[k * 3 + a] += b.vel[k * 3 + a] * dt;
          col[k * 3 + a] = b.base[k * 3 + a] * fade * fade;
        }
      }
      b.geo.attributes.position.needsUpdate = true;
      b.geo.attributes.color.needsUpdate = true;
      if (b.t > 2.3) { this.scene.remove(b.pts); b.geo.dispose(); b.mat.dispose(); this.bursts.splice(i, 1); }
    }

    const sl = this.sleigh;
    if (sl.active) {
      sl.t += dt;
      const u = sl.t / sl.dur;
      if (u >= 1) { sl.active = false; sl.g.visible = false; }
      else {
        const p0 = [-150, 30, -70], p1 = [0, 76, -90], p2 = [150, 32, -60];
        const at = (k) => [0, 1, 2].map((a) => (1 - k) * (1 - k) * p0[a] + 2 * (1 - k) * k * p1[a] + k * k * p2[a]);
        const p = at(u), q = at(Math.min(1, u + 0.01));
        sl.g.position.set(...p);
        sl.g.rotation.y = Math.atan2(-(q[2] - p[2]), q[0] - p[0]);
        sl.g.rotation.z = Math.atan2(q[1] - p[1], Math.hypot(q[0] - p[0], q[2] - p[2])) * 0.6;
        sl.legs.forEach((l, i) => { l.rotation.z = Math.sin(sl.t * 9 + i * 1.3) * 0.7; });
        for (let k = 0; k < 3; k++) this.spark(p[0] - Math.cos(sl.g.rotation.y) * 10, p[1] + rnd(-1, 4), p[2] + Math.sin(sl.g.rotation.y) * 10, 4);
      }
    }
    const s = this.sparks, col = s.geo.attributes.color.array, pos = s.pos;
    for (let k = 0; k < s.N; k++) {
      if (s.life[k] > 0) {
        s.life[k] -= dt * 0.8;
        for (let a = 0; a < 3; a++) pos[k * 3 + a] += s.vel[k * 3 + a] * dt;
        const l = Math.max(0, s.life[k]);
        col[k * 3] = l; col[k * 3 + 1] = l * 0.85; col[k * 3 + 2] = l * 0.5;
        if (s.life[k] <= 0) pos[k * 3 + 1] = -999;
      }
    }
    s.geo.attributes.position.needsUpdate = true;
    s.geo.attributes.color.needsUpdate = true;
  }
}
