// room.js 규칙 검증 (node test/room.test.mjs)
import assert from 'node:assert/strict';
import { Room } from '../public/js/room.js';

function conn(room, id) {
  const inbox = [];
  room.addConn(id, (m) => inbox.push(JSON.parse(JSON.stringify(m))));
  return { id, inbox, last: (t) => [...inbox].reverse().find((m) => m.t === t) };
}
const saves = {};
const room = new Room({}, { ownerKey: 'secret', save: (k, v) => { saves[k] = v; } });
const a = conn(room, 'A'), b = conn(room, 'B'), o = conn(room, 'O');
room.handle('A', { t: 'join', cid: 'cidA', name: '앨리스', look: { head: 'santaHat' } });
room.handle('B', { t: 'join', cid: 'cidB', name: '밥' });
room.handle('O', { t: 'join', cid: 'cidO', name: '주인', ownerKey: 'secret' });
assert.equal(a.last('init').owner, false);
assert.equal(o.last('init').owner, true);
assert.ok(a.last('join'), 'A가 다른 입장자를 받는다');

// 눈사람: 최초 생성 방송 + 방 상태 저장
room.handle('A', { t: 'snowman' });
assert.equal(room.snowman, true);
assert.equal(b.last('snowman').nick, '앨리스');
assert.equal(saves.snowman, true);
room.handle('A', { t: 'snowmanStyle', style: { scarf: 'blue', hat: 'santaHat' } });
assert.deepEqual(room.snowmanStyle, { scarf: 'blue', hat: 'santaHat' });
assert.equal(b.last('snowmanStyle').nick, '앨리스');
room.handle('B', { t: 'snowmanStyle', style: { scarf: 'green', hat: 'beanie' } });
assert.deepEqual(room.snowmanStyle, { scarf: 'green', hat: 'beanie' }, '여러 방문자가 공유 눈사람 스타일을 바꾼다');
assert.deepEqual(saves.snowmanStyle, room.snowmanStyle);

// 선물: 검증 + 전체 방송
room.handle('A', { t: 'gift', item: 'bear', paper: 'redDots', ribbon: 'gold' });
assert.equal(b.last('gift').gift.nick, '앨리스');

const d = conn(room, 'D');
room.handle('D', { t: 'join', cid: 'cidD', name: '데이브' });
room.handle('D', { t: 'gift', item: 'hack', paper: 'redDots', ribbon: 'gold' });
assert.equal(room.gifts.length, 1, '잘못된 아이템은 거부');
assert.match(d.last('err').msg, /선물/);

// 오너먼트: 1회 제한
room.handle('A', { t: 'ornament', kind: 'star', th: 1, h: 0.5 });
assert.equal(room.ornaments.length, 1);
room.handle('A', { t: 'ornament', kind: 'bell', th: 2, h: 0.4 });
assert.equal(room.ornaments.length, 1, '두 번째 오너먼트는 거부');
assert.match(a.last('err').msg, /한 번만/);
room.handle('D', { t: 'ornament', kind: 'nope', th: 0, h: 0.5 });
assert.match(d.last('err').msg, /오너먼트/);
room.handle('B', { t: 'ornament', kind: 'bell', th: -1, h: 5 });
assert.equal(room.ornaments.length, 2);
assert.ok(room.ornaments[1].h <= 0.94 && room.ornaments[1].th >= 0, '위치 값 보정');

// 편지: 1회 제한 + 잠금 필터링
room.handle('A', { t: 'letter', nick: '앨리스', text: '산타 할아버지께 비밀이에요', locked: true });
room.handle('A', { t: 'letter', nick: '앨리스', text: '두 번째', locked: false });
assert.equal(room.letters.length, 1, '편지는 1회');
assert.equal(b.last('letter').letter.text, undefined, '일반 사용자에게 잠긴 편지 본문이 가면 안 됨');
assert.equal(b.last('letter').letter.nick, undefined);
assert.equal(o.last('letter').letter.text, '산타 할아버지께 비밀이에요', '주인은 본문 확인');
assert.equal(o.last('letter').letter.cid, undefined, 'cid는 노출 금지');
room.handle('B', { t: 'letter', nick: '밥', text: '모두 읽어도 돼요', locked: false });
assert.equal(a.last('letter').letter.text, '모두 읽어도 돼요');

// 늦게 입장한 사람 / 인증
const c = conn(room, 'C');
room.handle('C', { t: 'join', cid: 'cidC', name: '찰리' });
const init = c.last('init');
assert.equal(init.letters.find((l) => l.locked).text, undefined);
assert.equal(init.snowman, true, '늦게 입장한 사람에게도 눈사람 상태가 전달됨');
assert.deepEqual(init.snowmanStyle, { scarf: 'green', hat: 'beanie' }, '늦게 입장한 사람에게도 스타일이 전달됨');
room.handle('C', { t: 'auth', key: 'wrong' });
assert.match(c.last('err').msg, /열쇠/);
room.handle('C', { t: 'auth', key: 'secret' });
assert.equal(c.last('letters').letters.find((l) => l.locked).text, '산타 할아버지께 비밀이에요');

// 재접속해도 사용 기록 유지(같은 cid)
const a2 = conn(room, 'A2');
room.handle('A2', { t: 'join', cid: 'cidA', name: '앨리스' });
assert.deepEqual(a2.last('init').used, { ornament: true, letter: true });

// 퇴장 알림, 저장 호출
room.removeConn('B');
assert.equal(a.last('leave').id, 'B');
assert.ok(saves.gifts && saves.ornaments && saves.letters && saves.used && saves.snowmanStyle);
console.log('room tests passed ✅');
