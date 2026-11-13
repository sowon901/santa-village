// DOM UI: 토스트, 모달, 코스튬 선택, 선물 마법사, 오너먼트 선택, 편지, 이모트
import { BODY_COLORS, HEAD_ITEMS, TOGGLES, GIFT_ITEMS, PAPERS, RIBBONS, ORNAMENTS, EMOTES, LIMITS } from './data.js';
import { paperCanvas } from './gfx.js';

const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, ms = 2800) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

let current = null;
export const modalOpen = () => !!current;
export function closeModal() { if (current) { const c = current; current = null; c.el.remove(); c.onClose?.(); } }
function modal(inner, { wide = false, onClose } = {}) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="card${wide ? ' wide' : ''}"><button class="x" aria-label="닫기">✕</button>${inner}</div>`;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) closeModal(); });
  el.querySelector('.x').onclick = closeModal;
  document.body.appendChild(el);
  current = { el, onClose };
  return { el, close: closeModal };
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

const pcache = {};
const paperURL = (id) => pcache[id] || (pcache[id] = paperCanvas(PAPERS.find((p) => p.id === id), 96).toDataURL());

// ----- 코스튬 -----
export function costumeControls(look, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'costume';
  wrap.innerHTML = `
    <h4>옷 색</h4><div class="sw">${BODY_COLORS.map((c) => `<button class="swatch" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
    <h4>머리</h4><div class="chips">${HEAD_ITEMS.map((h) => `<button class="chip" data-h="${h.id}">${h.label}</button>`).join('')}</div>
    <h4>얼굴 · 목</h4><div class="chips">${TOGGLES.map((t) => `<button class="chip" data-t="${t.id}">${t.label}</button>`).join('')}</div>`;
  const sync = () => {
    wrap.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('on', b.dataset.c === look.body));
    wrap.querySelectorAll('[data-h]').forEach((b) => b.classList.toggle('on', b.dataset.h === look.head));
    wrap.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', !!look[b.dataset.t]));
  };
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.c) look.body = b.dataset.c;
    else if (b.dataset.h) look.head = b.dataset.h;
    else if (b.dataset.t) look[b.dataset.t] = !look[b.dataset.t];
    sync();
    onChange(look);
  });
  sync();
  return wrap;
}

export function costumeModal(look, onChange) {
  const m = modal('<h3>👗 코스튬</h3><div class="slot"></div><button class="btn big" data-done>완료</button>');
  m.el.querySelector('.slot').appendChild(costumeControls(look, onChange));
  m.el.querySelector('[data-done]').onclick = closeModal;
}

// ----- 선물: 선물 선택 → 포장지 → 리본 → 완성 -----
export function giftWizard(onDone) {
  const st = { step: 0, item: null, paper: null, ribbon: null };
  const names = ['선물 고르기', '포장지 고르기', '리본 고르기', '완성'];
  const m = modal('<div class="wiz"></div>', { wide: true });
  const root = m.el.querySelector('.wiz');

  const preview = () => {
    const paper = PAPERS.find((p) => p.id === st.paper), rib = RIBBONS.find((r) => r.id === st.ribbon), item = GIFT_ITEMS.find((i) => i.id === st.item);
    return `<div class="gp" style="${paper ? `background-image:url(${paperURL(paper.id)});background-size:48px` : 'background:#3a3f78'}">
      ${rib ? `<i class="bv" style="background:${rib.color}"></i><i class="bh" style="background:${rib.color}"></i><i class="bow" style="background:${rib.color}"></i>` : ''}
      ${item ? `<em>${item.emoji}</em>` : ''}</div>`;
  };
  const render = () => {
    let body = '', ok = false;
    if (st.step === 0) {
      body = `<div class="grid">${GIFT_ITEMS.map((i) => `<button class="opt${st.item === i.id ? ' on' : ''}" data-k="item" data-v="${i.id}"><span class="em">${i.emoji}</span>${i.name}</button>`).join('')}</div>`;
      ok = !!st.item;
    } else if (st.step === 1) {
      body = `<div class="grid">${PAPERS.map((p) => `<button class="opt${st.paper === p.id ? ' on' : ''}" data-k="paper" data-v="${p.id}"><span class="pap" style="background-image:url(${paperURL(p.id)});background-size:36px"></span>${p.name}</button>`).join('')}</div>`;
      ok = !!st.paper;
    } else if (st.step === 2) {
      body = `<div class="grid">${RIBBONS.map((r) => `<button class="opt${st.ribbon === r.id ? ' on' : ''}" data-k="ribbon" data-v="${r.id}"><span class="rib" style="background:${r.color}"></span>${r.name} 리본</button>`).join('')}</div>`;
      ok = !!st.ribbon;
    } else {
      const it = GIFT_ITEMS.find((i) => i.id === st.item), pp = PAPERS.find((p) => p.id === st.paper), rr = RIBBONS.find((r) => r.id === st.ribbon);
      body = `<div class="final"><p>🎉 선물이 완성됐어요!</p><p class="sub">${it.emoji} ${it.name} · ${pp.name} · ${rr.name} 리본</p><p class="sub">보내면 하트 모양 선물 더미에 차곡차곡 쌓여요 💝</p></div>`;
      ok = true;
    }
    root.innerHTML = `
      <ol class="steps">${names.map((n, i) => `<li class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}">${i + 1}. ${n}</li>`).join('')}</ol>
      <div class="wiz-body"><div class="pv">${preview()}</div><div class="pane">${body}</div></div>
      <div class="nav">
        <button class="btn ghost" data-nav="prev" ${st.step === 0 ? 'disabled' : ''}>이전</button>
        ${st.step < 3 ? `<button class="btn" data-nav="next" ${ok ? '' : 'disabled'}>다음</button>` : '<button class="btn" data-nav="send">선물 보내기 🎁</button>'}
      </div>`;
  };
  root.addEventListener('click', (e) => {
    const o = e.target.closest('[data-k]');
    if (o) { st[o.dataset.k] = o.dataset.v; render(); return; }
    const n = e.target.closest('[data-nav]');
    if (!n || n.disabled) return;
    if (n.dataset.nav === 'prev') st.step--;
    else if (n.dataset.nav === 'next') st.step++;
    else { const { item, paper, ribbon } = st; closeModal(); onDone({ item, paper, ribbon }); return; }
    render();
  });
  render();
}

// ----- 오너먼트 선택 -----
export function ornamentPicker(onPick) {
  const m = modal(`<h3>🎄 오너먼트 고르기</h3><p class="sub">오너먼트는 <b>한 번만</b> 걸 수 있어요. 신중하게 골라주세요!</p>
    <div class="grid">${ORNAMENTS.map((o) => `<button class="opt" data-o="${o.id}"><span class="em">${o.emoji}</span>${o.name}</button>`).join('')}</div>`);
  m.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-o]');
    if (b) { closeModal(); onPick(b.dataset.o); }
  });
}

// ----- 이모트 -----
export function emotePicker(onPick) {
  const m = modal(`<h3>😀 감정 표현</h3><div class="grid emo">${EMOTES.map((o) => `<button class="opt" data-e="${o.id}"><span class="em">${o.emoji}</span>${o.name}</button>`).join('')}</div>`);
  m.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (b) { closeModal(); onPick(b.dataset.e); }
  });
}

// ----- 편지 (ctx: {letters, owner, used, onSend, onAuth, render}) -----
export function letterModal(ctx) {
  const m = modal('<div class="lt"></div>', { wide: true, onClose: () => { ctx.render = null; } });
  const root = m.el.querySelector('.lt');
  let tab = ctx.used.letter ? 'read' : 'write';
  ctx.render = () => {
    let body = '';
    if (tab === 'write') {
      body = ctx.used.letter
        ? '<p class="sub center">편지를 이미 보냈어요 ✉️<br>편지는 한 번만 보낼 수 있어요.</p>'
        : `<label>닉네임<input id="ln" maxlength="${LIMITS.letterNick}" placeholder="누가 보냈는지 적어요"></label>
           <label>편지 내용<textarea id="lt" maxlength="${LIMITS.letterText}" rows="6" placeholder="산타 마을에 남기고 싶은 말을 적어보세요"></textarea></label>
           <div class="row"><span class="cnt" id="lc">0 / ${LIMITS.letterText}</span>
           <label class="lock"><input type="checkbox" id="ll"> 🔒 공방 주인만 읽을 수 있게 잠그기</label></div>
           <p class="sub">편지는 <b>한 번만</b> 보낼 수 있어요.</p>
           <button class="btn big" id="lsend" disabled>편지 보내기 ✉️</button>`;
    } else {
      const list = [...ctx.letters].sort((a, b) => b.at - a.at);
      body = `<div class="owner">${ctx.owner ? '🔑 공방 주인 모드 — 잠긴 편지도 열람 중' : `<input id="ok" placeholder="공방 주인 열쇠" type="password"><button class="btn small" id="oauth">확인</button>`}</div>
        <div class="letters">${list.length ? list.map((l) => (l.locked && l.text === undefined
          ? '<div class="letter lockd">🔒 잠긴 편지 <span>(공방 주인만 열람)</span></div>'
          : `<div class="letter">${l.locked ? '🔒 ' : ''}<b>${esc(l.nick)}</b><p>${esc(l.text)}</p></div>`)).join('') : '<p class="sub center">아직 편지가 없어요</p>'}</div>`;
    }
    root.innerHTML = `<h3>✉️ 우체통</h3><div class="tabs"><button class="${tab === 'write' ? 'on' : ''}" data-tab="write">편지 쓰기</button><button class="${tab === 'read' ? 'on' : ''}" data-tab="read">편지 보기 (${ctx.letters.length})</button></div>${body}`;
    const ln = root.querySelector('#ln'), lt = root.querySelector('#lt'), send = root.querySelector('#lsend');
    if (send) {
      const check = () => { send.disabled = !ln.value.trim() || !lt.value.trim(); root.querySelector('#lc').textContent = `${lt.value.length} / ${LIMITS.letterText}`; };
      ln.oninput = lt.oninput = check;
      send.onclick = () => { ctx.onSend({ nick: ln.value.trim(), text: lt.value.trim(), locked: root.querySelector('#ll').checked }); tab = 'read'; };
    }
    const oa = root.querySelector('#oauth');
    if (oa) oa.onclick = () => ctx.onAuth(root.querySelector('#ok').value);
  };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; ctx.render(); }
  });
  ctx.render();
}
