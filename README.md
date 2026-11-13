<div align="center">

```
          *        .       *    .      *       .   *
    .         *        .        *   .        *
        🎄 ✨  S A N T A   V I L L A G E  ✨ 🎄
    *      .      *        .        *      .     *
```

# 🎅 산타 마을 · Santa Village

### 눈 내리는 크리스마스 저녁, 모두가 함께 머무는 브라우저 속 작은 마을

![Three.js](https://img.shields.io/badge/three.js-r170-black?logo=three.js&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Durable Objects](https://img.shields.io/badge/Durable%20Objects-WebSocket-c0392b)
![Blender](https://img.shields.io/badge/Blender-5.2-E87D0D?logo=blender&logoColor=white)
![Season](https://img.shields.io/badge/season-🎄%20Christmas-2e8b57)

❄️ &nbsp; ❄️ &nbsp; ❄️ &nbsp; ❄️ &nbsp; ❄️ &nbsp; ❄️ &nbsp; ❄️

</div>

---

## 🎁 이게 뭔가요?

**산타 마을**은 `online-camino`, `onlinehikers`, 혼술바 같은 **'온라인 ○○' 스타일 메타버스**를 크리스마스 테마로 만든 웹 서비스입니다.
앱 설치도 회원가입도 없이 링크 하나로 들어와서, 귀여운 3D 캐릭터로 마을을 돌아다니며 **선물을 포장하고, 트리에 오너먼트를 걸고, 편지를 남기고, 다른 사람들과 폭죽을 터뜨릴 수 있어요.**

> 🌙 어두우면서도 따뜻하게 밝은 크리스마스 저녁 &nbsp;·&nbsp; 🛷 가끔 하늘을 가로지르는 루돌프 썰매 &nbsp;·&nbsp; 🎆 밤하늘 폭죽 이벤트

---

## ✨ 주요 기능

### 🛷 로딩 화면
밤하늘과 반짝이는 별 사이로 **루돌프가 끄는 썰매를 탄 산타**가 흰 그림자처럼 지나갑니다.

### 🏠 열린 공방 (돌하우스 시점)
공간을 나누지 않고 **마을 바깥과 공방 안이 이어진** 구조예요. 벽 한쪽이 열린 돌하우스처럼 내부가 그대로 보이고, 카메라는 항상 내 캐릭터를 따라다닙니다.

### 🎀 활동 1 · 선물 포장
`선물 고르기 → 포장지 고르기 → 리본 고르기 → 완성!`
완성한 선물은 마을 한쪽에 **하트 모양으로 차곡차곡 쌓여요.** 선물이 모일수록 하트가 완성됩니다. 💗

### 🎄 활동 2 · 오너먼트와 편지
- **오너먼트 달기** — 큰 트리를 클릭해서 원하는 자리에 내 오너먼트를 걸어요.
- **편지 쓰기** — 닉네임과 본문을 적어 우체통에 넣어요. **🔒 잠금**을 켜면 **공방 주인만** 읽을 수 있어요.

### 👗 코스튬
시작하자마자 꾸밀 수 있어요.

| 부위 | 선택지 |
|---|---|
| 머리 | 🎅 산타 모자 · 🦌 루돌프 머리띠 |
| 얼굴 | 🧔 산타 콧수염 · 🔴 루돌프 빨간 코 · 🌸 볼터치 |
| 몸 | 🧣 목도리 · 코트 색상 6종 |

### 🎆 함께 즐기는 이벤트
- 🛷 **산타 썰매**가 하늘을 가로질러 날아갑니다.
- 🎇 **폭죽 쇼**가 밤하늘을 수놓아요. 직접 쏘는 버튼도 있어요.
- 😀 **감정 표현** — 손 흔들기, 춤추기, 점프, 하트, 환호
- 👥 **같은 공간에 모두가 함께** 있지만, 꾸미는 활동은 각자 내 것으로 남아요.

---

## 🧱 기술 스택

| 역할 | 사용 기술 |
|---|---|
| 기획 · 코드 · 디자인 · 배포 | **Claude** (대화로 진행) |
| 브라우저 3D 렌더링 · 프로시저럴 캐릭터 · GLB 로딩 | **three.js r170** |
| 공방 3D 씬 구성 · GLB 내보내기 | **Blender 5.2** + Python (Higgsfield 3D Jutsu) |
| 서버리스 배포 · WebSocket 실시간 멀티플레이 | **Cloudflare Workers** |
| 방 상태 저장 | **Durable Objects** (SQLite) |

### 구조

```
 브라우저 (three.js)                 Cloudflare
┌──────────────────┐   WebSocket   ┌──────────────────────┐
│ 3D 월드 · 캐릭터   │ ◄───────────► │ Worker               │
│ UI · 카메라       │   /ws?room=   │  └─ Durable Object   │
│                  │               │      (SantaRoom)     │
│  net.js          │               │   · 접속자 위치 중계    │
│   ├ WebSocket    │               │   · 선물/오너먼트/편지  │
│   └ (실패 시)     │               │   · 썰매/폭죽 알람     │
│     로컬 체험 모드  │               └──────────────────────┘
└──────────────────┘
        │  같은 규칙 코드를 공유
        └──────────►  public/js/room.js  (Room 클래스)
```

- `room.js`의 **순수 로직 `Room`** 을 Durable Object와 브라우저 로컬 모드가 **함께 사용**합니다.
- WebSocket 연결에 실패하면 자동으로 **체험 모드**(NPC 3명과 함께)로 전환돼요.
- **잠긴 편지**는 서버에서 걸러져서, 작성자 식별값이 다른 접속자에게 내려가지 않습니다.

---

## 📁 폴더 구조

```
santa-village/
├─ public/                 정적 파일 (Worker Assets로 제공)
│  ├─ index.html           로딩 · 시작 화면 · HUD
│  ├─ style.css
│  ├─ models/              (선택) workshop.glb 를 여기에 넣으세요
│  └─ js/
│     ├─ main.js           렌더러 · 카메라 · 입력 · 메인 루프
│     ├─ world.js          하늘 · 눈 · 공방 · 트리 · 썰매 · 폭죽 · 하트
│     ├─ avatar.js         툰 셰이딩 캐릭터 · 코스튬 · 감정 표현
│     ├─ room.js           방 상태 로직 (서버/로컬 공용)
│     ├─ net.js            WebSocket 연결 + 체험 모드 폴백
│     ├─ ui.js             선물 마법사 · 오너먼트 · 편지 모달
│     ├─ data.js           상수와 입력 검증
│     └─ gfx.js            텍스처 · 스프라이트 헬퍼
├─ src/worker.js           Worker + SantaRoom (Durable Object)
├─ test/room.test.mjs      방 로직 테스트
├─ tools/build-preview.mjs 단일 HTML 미리보기 번들러
└─ wrangler.toml
```

---

## 🚀 실행하기

### 준비물
- [Node.js](https://nodejs.org) LTS
- 무료 [Cloudflare 계정](https://dash.cloudflare.com/sign-up) (이메일 인증 필수)

### 내 컴퓨터에서 먼저 보기

```bash
npm install
cp .dev.vars.example .dev.vars     # Windows: copy .dev.vars.example .dev.vars
npm run dev
```

→ `http://localhost:8787` 을 열면 됩니다.

### 링크로 공유하기 (Cloudflare 배포)

```bash
npm install
npx wrangler login                    # 브라우저에서 Cloudflare 로그인
npx wrangler secret put OWNER_KEY     # 공방 주인 비밀번호 설정
npm run deploy
```

배포가 끝나면 `https://santa-village.<내-서브도메인>.workers.dev` 주소가 출력됩니다. 이 링크를 공유하면 누구나 접속할 수 있어요.

> 💡 처음 배포라면 대시보드의 **Workers & Pages** 메뉴를 한 번 열어 `workers.dev` 서브도메인을 만들어 두세요.

### 🔒 잠긴 편지 읽기
마을의 **편지 책상**에서 편지함을 열고 `OWNER_KEY`를 입력하면 잠긴 편지까지 볼 수 있어요. (로컬 체험 모드에서는 키가 `demo` 입니다.)

### 🛠️ 개발 팁
- 서버에 연결하지 못하면 자동으로 **체험 모드**(브라우저 안에서만 저장)로 동작해요. 주소 끝에 `?local=1`을 붙이면 강제로 체험 모드로 열 수 있어요.
- 주소 끝에 `?debug`를 붙이면 `window.__santa` 점검용 훅이 켜져요.

### 🧪 테스트 · 미리보기

```bash
npm test                 # 방 로직 테스트
npm run preview          # dist/preview.html 단일 파일 번들 생성
```

---

## 🏠 Blender 공방 (선택)

공방 내부는 기본적으로 three.js 도형으로 만든 절차적 모델이 표시돼요.
Blender로 만든 GLB가 있으면 **`public/models/workshop.glb`** 로 넣어 주세요. 자동으로 불러와서 대체합니다.

- 파일이 없으면 기본 공방으로 **자동 폴백**
- 불러올 때 GLB 안의 조명·카메라는 제거돼요
- 선물대·편지 책상의 클릭 영역과 충돌 판정은 그대로 유지돼요

---

## 🎨 만든 사람이 의도한 분위기

> 어두운 남색 밤하늘, 눈 내리는 마을, 창문마다 켜진 따뜻한 불빛.
> 춥지만 포근한, **'크리스마스 이브 저녁'** 의 느낌.

- 하늘: 셰이더로 그린 그라데이션 돔 + 반짝이는 별 + 달무리
- 마을: 눈 쌓인 전나무 숲, 가로등, 눈사람, 전구 장식
- 캐릭터: 툰 셰이딩 + 외곽선의 동글동글한 3D 아바타

---

## 🗺️ 앞으로 할 일

- [ ] 공방 규모 확대
- [ ] 트리 모델 퀄리티 개선
- [ ] 편지 여러 통 보내기
- [ ] 개인 방 (방문자별 별도 공간)
- [ ] 모바일 터치 조작 다듬기

---

<div align="center">

🎄 &nbsp; **Merry Christmas!** &nbsp; 🎄

*함께 모여서 따뜻한 연말 보내세요* ❄️

</div>
