// Cloudflare Worker + Durable Object (방 상태 저장 + WebSocket 실시간 중계)
import { Room } from '../public/js/room.js';

export class SantaRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    // 저장된 선물/오너먼트/편지/사용기록을 읽어 Room을 복원
    ctx.blockConcurrencyWhile(async () => {
      const [gifts, ornaments, letters, used, snowman, snowmanStyle] = await Promise.all(
        ['gifts', 'ornaments', 'letters', 'used', 'snowman', 'snowmanStyle'].map((k) => ctx.storage.get(k)),
      );
      this.room = new Room(
        { gifts, ornaments, letters, used, snowman, snowmanStyle },
        { ownerKey: env.OWNER_KEY || '', save: (k, v) => { ctx.storage.put(k, v); } },
      );
    });
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const connId = crypto.randomUUID().slice(0, 8);
    this.room.addConn(connId, (obj) => { try { server.send(JSON.stringify(obj)); } catch {} });
    server.addEventListener('message', (e) => {
      if (typeof e.data !== 'string' || e.data.length > 4000) return; // 편지(최대 500자) 여유 크기
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      this.room.handle(connId, msg);
    });
    const bye = () => this.room.removeConn(connId);
    server.addEventListener('close', bye);
    server.addEventListener('error', bye);

    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      const name = (url.searchParams.get('room') || 'main').slice(0, 40);
      return env.ROOM.get(env.ROOM.idFromName(name)).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
