// 서버 연결. 배포된 Worker에 WebSocket으로 붙고, 실패하면(로컬 파일/미리보기 등)
// 같은 Room 로직을 브라우저 안에서 돌리는 "체험 모드"로 자동 전환합니다.
import { Room } from './room.js';

const KEY = 'santa-village-local-v1';
const rnd = (a, b) => a + Math.random() * (b - a);

export function connect({ timeout = 3500 } = {}) {
  const q = new URLSearchParams(location.search);
  const net = { mode: 'local', onmessage: null, onclose: null, send() {} };
  if (q.get('local') === '1' || !/^https?:$/.test(location.protocol)) return Promise.resolve(makeLocal(net));

  return new Promise((resolve) => {
    let done = false;
    let ws;
    const fin = (fn) => { if (done) return; done = true; clearTimeout(tm); resolve(fn()); };
    const tm = setTimeout(() => { try { ws && ws.close(); } catch {} fin(() => makeLocal(net)); }, timeout);
    try {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?room=${encodeURIComponent(q.get('room') || 'main')}`);
    } catch { return fin(() => makeLocal(net)); }
    ws.onopen = () => fin(() => {
      net.mode = 'online';
      net.send = (o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
      ws.onmessage = (e) => { try { net.onmessage?.(JSON.parse(e.data)); } catch {} };
      ws.onclose = () => net.onclose?.();
      return net;
    });
    ws.onerror = () => fin(() => makeLocal(net));
    ws.onclose = () => fin(() => makeLocal(net));
  });
}

function makeLocal(net) {
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  let timer;
  const room = new Room(state, {
    ownerKey: 'demo', // 체험 모드의 공방 주인 열쇠
    save: (k, v) => {
      state[k] = v;
      clearTimeout(timer);
      timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, 300);
    },
  });

  const me = 'me';
  room.addConn(me, (o) => queueMicrotask(() => net.onmessage?.(JSON.parse(JSON.stringify(o)))));
  net.mode = 'local';
  net.send = (o) => room.handle(me, o);

  // 데모용 NPC 3명 (같은 Room 로직으로 입장/이동/선물)
  const bots = [['눈송이', '#ff7eb6', 'antlers', true], ['진저', '#ffc93c', 'santaHat', false], ['루미', '#3b6fd8', 'none', false]];
  bots.forEach(([name, body, head, nose], i) => {
    const id = 'bot' + i;
    const st = { x: rnd(-8, 8), z: rnd(2, 14) };
    let tx = st.x, tz = st.z;
    room.addConn(id, () => {});
    room.handle(id, { t: 'join', cid: id, name, look: { body, head, nose, scarf: true, cheeks: true, mustache: i === 1 }, x: st.x, z: st.z });
    setInterval(() => {
      const dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { tx = rnd(-10, 10); tz = rnd(2, 15); return; }
      st.x += (dx / d) * 0.45; st.z += (dz / d) * 0.45;
      room.handle(id, { t: 'move', x: st.x, z: st.z, ry: Math.atan2(dx, dz) });
    }, 150);
    setInterval(() => {
      if (room.gifts.length < 12) room.handle(id, { t: 'gift', item: 'bear', paper: ['redDots', 'blueStars', 'pinkCandy'][i], ribbon: ['gold', 'white', 'red'][i] });
    }, 30000 + i * 9000);
  });
  setTimeout(() => room.ambient(), 14000);
  setInterval(() => room.ambient(), 50000);
  return net;
}
