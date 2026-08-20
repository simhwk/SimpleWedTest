# SimpleWedTest

바이브코딩을 이용해서 웹 기능들을 추가하고 디자인 해보려 만든 저장소입니다.

## 들어있는 것

| 디렉터리 | 내용 |
|---|---|
| [`liferpgsource/`](./liferpgsource) | **내 인생 RPG** — 할 일을 AI 가 판타지 퀘스트로 바꿔주는 Next.js 앱 |

## 빠르게 실행하기

```bash
cd liferpgsource
npm install
cp .env.example .env      # 그대로도 동작합니다
npx prisma migrate dev
npm run dev               # http://localhost:3000
```

환경변수, 게임 규칙, 프로젝트 구조는 [`liferpgsource/README.md`](./liferpgsource/README.md) 에 정리돼 있습니다.

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
Prisma 7 + SQLite · jose(JWT 세션) · bcryptjs · nodemailer · Anthropic SDK
