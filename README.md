# 🎅 산타 마을 (Santa Village)

브라우저에서 즐기는 크리스마스 멀티플레이어 마을. three.js + Cloudflare Workers/Durable Objects.

## 폴더
- `public/` 정적 클라이언트 (index.html, style.css, js/)
  - `js/room.js` 방 규칙(선물·오너먼트·편지, 1회 제한, 잠긴 편지 필터링). 서버와 체험 모드가 같이 씀
  - `js/world.js` 밤하늘/별, 공방, 트리, 하트 선물 더미, 썰매·폭죽
  - `js/avatar.js` 프로시저럴 캐릭터 + 코스튬
- `src/worker.js` Worker + Durable Object (WebSocket 중계, 방 상태 저장)
- `test/room.test.mjs` 규칙 테스트 (`npm test`)
- `tools/build-preview.mjs` 한 파일 미리보기 번들 (`npm run preview`)

## 실행
```
npm install
cp .dev.vars.example .dev.vars     # OWNER_KEY = 공방 주인 열쇠
npm run dev                         # http://localhost:8787
```
## 배포
```
npx wrangler secret put OWNER_KEY
npm run deploy
```
- 서버에 연결 못 하면 자동으로 "체험 모드"(브라우저 안에서만 저장)로 동작합니다. `?local=1` 로 강제 가능.
- 코드 점검용: 주소 끝에 `?debug` 를 붙이면 `window.__santa` 점검 훅이 켜집니다.

## Blender 공방 GLB 사용 (선택)
https://higgsfield.ai/3d-jutsu/ecc8b516-560a-4083-a69b-2d2562fb10cd 에서 GLB를 내려받아 `public/models/workshop.glb` 로 저장하면 자동으로 적용됩니다. 파일이 없으면 기본 절차적 공방이 표시됩니다.

## 배포 (링크 공유)
```
npm install
npx wrangler secret put OWNER_KEY
npm run deploy
```
