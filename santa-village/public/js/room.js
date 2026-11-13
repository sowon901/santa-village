// 방 규칙(선물/오너먼트/편지/이동 중계). DOM·Cloudflare API에 의존하지 않는 순수 로직이라
// Durable Object(온라인)와 브라우저 체험 모드(오프라인)에서 똑같이 사용합니다.
import { sanitizeLook, GIFT_ITEMS, PAPERS, RIBBONS, ORNAMENTS, EMOTES, LIMITS } from './data.js';

const has = (arr, id) => arr.some((x) => x.id === id);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);
const cleanText = (s, n) => String(s ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, '').replace(/\r/g, '').trim().slice(0, n);
const num = (v, min, max, d = 0) => { v = Number(v); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d; };
const rid = () => Math.random().toString(36).slice(2, 9);
const pub = (p) => ({ id: p.id, name: p.name, look: p.look, x: p.x, z: p.z, ry: p.ry });

export class Room {
  constructor(state = {}, opts = {}) {
    this.gifts = state.gifts || [];
    this.ornaments = state.ornaments || [];
    this.letters = state.letters || [];
    this.used = state.used || {}; // cid -> {o:1}  (오너먼트 사용 여부)
    this.ownerKey = opts.ownerKey || '';
    this.save = opts.save || (() => {});
    this.conns = new Map(); // connId -> {send, p, t:{...}}
  }

  count() { return this.conns.size; }
  addConn(id, send) { this.conns.set(id, { send, p: null, t: {} }); }
  removeConn(id) {
    const c = this.conns.get(id);
    this.conns.delete(id);
    if (c && c.p) this.broadcast({ t: 'leave', id });
  }
  broadcast(m, except) {
    for (const [id, c] of this.conns) if (id !== except && c.p) c.send(m);
  }
  lettersFor(owner) {
    // 잠긴 편지는 공방 주인에게만 닉네임/본문이 전달됩니다.
    return this.letters.map((l) => this.view(l, owner));
  }
  view(l, owner) {
    if (owner || !l.locked) { const { cid, ...safe } = l; return safe; } // cid(작성자 식별자)는 보내지 않음
    return { id: l.id, locked: true, at: l.at };
  }
  ambient() {
    this.broadcast({ t: 'event', kind: Math.random() < 0.5 ? 'sleigh' : 'firework', seed: Math.floor(Math.random() * 1e9) });
  }

  handle(id, m) {
    const c = this.conns.get(id);
    if (!c || !m || typeof m !== 'object') return;
    const now = Date.now();
    const p = c.p;
    if (!p && m.t !== 'join') return;

    switch (m.t) {
      case 'join': {
        if (p) return;
        const owner = !!this.ownerKey && m.ownerKey === this.ownerKey;
        const cid = clean(m.cid, 64) || id;
        c.p = {
          id, cid, owner,
          name: clean(m.name, LIMITS.nick) || '손님',
          look: sanitizeLook(m.look),
          x: num(m.x, -60, 60, 0), z: num(m.z, -60, 60, 10), ry: 0,
        };
        const others = [...this.conns].filter(([k, v]) => k !== id && v.p).map(([, v]) => pub(v.p));
        const u = this.used[cid] || {};
        c.send({
          t: 'init', id, players: others, gifts: this.gifts, ornaments: this.ornaments,
          letters: this.lettersFor(owner), owner, used: { ornament: !!u.o },
        });
        this.broadcast({ t: 'join', p: pub(c.p) }, id);
        break;
      }
      case 'move': {
        if (now - (c.t.move || 0) < 30) return;
        c.t.move = now;
        p.x = num(m.x, -60, 60, p.x); p.z = num(m.z, -60, 60, p.z); p.ry = num(m.ry, -7, 7, p.ry);
        this.broadcast({ t: 'move', id, x: p.x, z: p.z, ry: p.ry }, id);
        break;
      }
      case 'look': {
        p.look = sanitizeLook(m.look);
        this.broadcast({ t: 'look', id, look: p.look }, id);
        break;
      }
      case 'emote': {
        if (!has(EMOTES, m.e) || now - (c.t.emote || 0) < 500) return;
        c.t.emote = now;
        this.broadcast({ t: 'emote', id, e: m.e }, id);
        break;
      }
      case 'firework': {
        if (now - (c.t.fw || 0) < 4000) return c.send({ t: 'err', msg: '폭죽은 잠깐 쉬었다가 쏠 수 있어요 🎆' });
        c.t.fw = now;
        this.broadcast({ t: 'firework', x: num(m.x, -40, 40, p.x), z: num(m.z, -40, 40, p.z) });
        break;
      }
      case 'gift': {
        if (now - (c.t.gift || 0) < 1500) return c.send({ t: 'err', msg: '선물은 조금 천천히 포장해요 🎁' });
        if (!has(GIFT_ITEMS, m.item) || !has(PAPERS, m.paper) || !has(RIBBONS, m.ribbon)) return;
        if (this.gifts.length >= LIMITS.gifts) return c.send({ t: 'err', msg: '선물 더미가 가득 찼어요!' });
        c.t.gift = now;
        const gift = { id: rid(), item: m.item, paper: m.paper, ribbon: m.ribbon, nick: p.name, at: now };
        this.gifts.push(gift);
        this.save('gifts', this.gifts);
        this.broadcast({ t: 'gift', gift });
        break;
      }
      case 'ornament': {
        const u = this.used[p.cid] || (this.used[p.cid] = {});
        if (u.o) return c.send({ t: 'err', msg: '오너먼트는 한 번만 걸 수 있어요 🎄' });
        if (!has(ORNAMENTS, m.kind)) return;
        if (this.ornaments.length >= LIMITS.ornaments) return c.send({ t: 'err', msg: '트리가 오너먼트로 가득 찼어요!' });
        const TAU = Math.PI * 2;
        const th = ((num(m.th, -100, 100, 0) % TAU) + TAU) % TAU;
        const o = { id: rid(), kind: m.kind, h: num(m.h, 0.06, 0.94, 0.5), th, nick: p.name, at: now };
        u.o = 1;
        this.ornaments.push(o);
        this.save('used', this.used);
        this.save('ornaments', this.ornaments);
        this.broadcast({ t: 'ornament', o });
        c.send({ t: 'used', ornament: true });
        break;
      }
      case 'letter': {
        if (now - (c.t.letter || 0) < 5000) return c.send({ t: 'err', msg: '편지는 잠깐 쉬었다가 다시 쓸 수 있어요 ✉️' });
        if (this.letters.filter((l) => l.cid === p.cid).length >= LIMITS.perUserLetters) return c.send({ t: 'err', msg: `편지는 한 사람당 ${LIMITS.perUserLetters}통까지 보낼 수 있어요 ✉️` });
        const nick = clean(m.nick, LIMITS.letterNick);
        const text = cleanText(m.text, LIMITS.letterText);
        if (!nick || !text) return c.send({ t: 'err', msg: '닉네임과 편지 내용을 모두 적어주세요' });
        if (this.letters.length >= LIMITS.letters) return c.send({ t: 'err', msg: '우체통이 가득 찼어요!' });
        const letter = { id: rid(), cid: p.cid, nick, text, locked: !!m.locked, at: now };
        c.t.letter = now;
        this.letters.push(letter);
        this.save('letters', this.letters);
        for (const [, cc] of this.conns) {
          if (!cc.p) continue;
          cc.send({ t: 'letter', letter: this.view(letter, cc.p.owner) });
        }
        break;
      }
      case 'auth': {
        if (this.ownerKey && m.key === this.ownerKey) {
          p.owner = true;
          c.send({ t: 'letters', letters: this.lettersFor(true), owner: true });
        } else {
          c.send({ t: 'err', msg: '열쇠가 맞지 않아요 🔑' });
        }
        break;
      }
      default:
    }
  }
}
