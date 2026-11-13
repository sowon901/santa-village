// 클라이언트와 서버(Worker)가 함께 쓰는 상수/검증 데이터
export const BODY_COLORS = ['#d63031', '#1f9d63', '#3b6fd8', '#ff7eb6', '#f1f1f1', '#ffc93c'];

export const HEAD_ITEMS = [
  { id: 'none', label: '없음' },
  { id: 'santaHat', label: '🎅 산타 모자' },
  { id: 'antlers', label: '🦌 루돌프 머리띠' },
];

export const TOGGLES = [
  { id: 'mustache', label: '🧔 산타 콧수염' },
  { id: 'nose', label: '🔴 루돌프 빨간 코' },
  { id: 'scarf', label: '🧣 목도리' },
  { id: 'cheeks', label: '🌸 볼터치' },
];

export const DEFAULT_LOOK = { body: '#d63031', head: 'santaHat', mustache: false, nose: false, scarf: true, cheeks: true };

export function sanitizeLook(l = {}) {
  return {
    body: BODY_COLORS.includes(l.body) ? l.body : BODY_COLORS[0],
    head: HEAD_ITEMS.some((h) => h.id === l.head) ? l.head : 'none',
    mustache: !!l.mustache,
    nose: !!l.nose,
    scarf: !!l.scarf,
    cheeks: l.cheeks !== false,
  };
}

export const GIFT_ITEMS = [
  { id: 'bear', emoji: '🧸', name: '곰인형' },
  { id: 'book', emoji: '📚', name: '동화책' },
  { id: 'train', emoji: '🚂', name: '장난감 기차' },
  { id: 'cake', emoji: '🍰', name: '케이크' },
  { id: 'sock', emoji: '🧦', name: '따뜻한 양말' },
  { id: 'star', emoji: '⭐', name: '소원 별' },
  { id: 'choco', emoji: '🍫', name: '초콜릿' },
  { id: 'letter', emoji: '💌', name: '마음 카드' },
];

export const PAPERS = [
  { id: 'redDots', name: '빨강 땡땡이', base: '#d63031', accent: '#ffffff', pattern: 'dots' },
  { id: 'greenStripe', name: '초록 줄무늬', base: '#1f8a5b', accent: '#ffffff', pattern: 'stripes' },
  { id: 'blueStars', name: '파랑 별', base: '#2f5fb8', accent: '#ffe27a', pattern: 'stars' },
  { id: 'goldSnow', name: '골드 눈꽃', base: '#e5b73b', accent: '#ffffff', pattern: 'snow' },
  { id: 'whiteTree', name: '화이트 트리', base: '#f4f6ff', accent: '#2e8b57', pattern: 'trees' },
  { id: 'pinkCandy', name: '핑크 캔디', base: '#ff8fb8', accent: '#ffffff', pattern: 'candy' },
];

export const RIBBONS = [
  { id: 'gold', name: '골드', color: '#ffd24a' },
  { id: 'red', name: '레드', color: '#e63946' },
  { id: 'white', name: '화이트', color: '#ffffff' },
  { id: 'green', name: '그린', color: '#2e9e5b' },
  { id: 'blue', name: '블루', color: '#3b82f6' },
  { id: 'purple', name: '퍼플', color: '#a259e6' },
];

export const ORNAMENTS = [
  { id: 'ballRed', emoji: '🔴', name: '빨간 볼', color: '#e63946', shape: 'ball' },
  { id: 'ballGold', emoji: '🟡', name: '금빛 볼', color: '#ffc93c', shape: 'ball' },
  { id: 'ballBlue', emoji: '🔵', name: '파란 볼', color: '#3b82f6', shape: 'ball' },
  { id: 'star', emoji: '⭐', name: '별', color: '#ffd84d', shape: 'star' },
  { id: 'bell', emoji: '🔔', name: '종', color: '#ffc93c', shape: 'bell' },
  { id: 'cane', emoji: '🍭', name: '지팡이 사탕', color: '#e63946', shape: 'cane' },
  { id: 'flake', emoji: '❄️', name: '눈꽃', color: '#bfe6ff', shape: 'flake' },
  { id: 'gift', emoji: '🎁', name: '미니 선물', color: '#2e9e5b', shape: 'gift' },
];

export const EMOTES = [
  { id: 'wave', emoji: '👋', name: '인사' },
  { id: 'dance', emoji: '💃', name: '춤' },
  { id: 'jump', emoji: '🦘', name: '점프' },
  { id: 'heart', emoji: '❤️', name: '하트' },
  { id: 'cheer', emoji: '🎉', name: '만세' },
];

export const LIMITS = { gifts: 300, letters: 200, ornaments: 300, nick: 10, letterNick: 12, letterText: 500, perUserLetters: 10 };
export const WORLD = { radius: 38 };
