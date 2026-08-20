# 내 인생 RPG

오늘 할 일을 한 줄 적으면 AI가 판타지 퀘스트로 바꿔줍니다.
깨면 경험치를 받고, 능력치가 오르고, 레벨이 오릅니다.

```
"밀린 설거지 하기"
        ↓
[D급] 쌓인 그릇 산맥의 정화        +55 EXP · 의지 +1
싱크대에 잠든 도자기 유물들이 그대의 손길을 기다린다.
```

## 빠르게 실행하기

```bash
npm install
cp .env.example .env      # 그대로도 동작합니다
npx prisma migrate dev
npm run dev               # http://localhost:3000
```

API 키가 없어도 앱은 그대로 돌아갑니다. 퀘스트는 규칙 기반으로,
메일은 서버 콘솔로 나갑니다. 키를 넣으면 그 자리부터 AI/메일이 붙습니다.

## 환경변수

| 변수 | 필수 | 없으면 |
|---|---|---|
| `DATABASE_URL` | ✅ | 기본값 `file:./prisma/dev.db` |
| `SESSION_SECRET` | 배포 시 ✅ | 개발용 고정 키 사용 (운영에서는 실행 거부) |
| `ANTHROPIC_API_KEY` | — | 키워드·글자수 기반 규칙 생성기로 대체 |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | — | 메일 내용을 콘솔에 출력하고 `MailLog` 에만 저장 |
| `APP_TIMEZONE` | — | 기본값 `Asia/Seoul` (스트릭의 "하루" 기준) |

## 구조

```
src/
  lib/
    game.ts          레벨 곡선·등급표·칭호  ← 밸런스는 전부 여기서만 고친다
    streak.ts        연속 달성 계산 (타임존 인식)
    achievements.ts  업적 카탈로그·판정
    auth.ts          bcrypt 해시 + JWT 세션 쿠키
    ai.ts            퀘스트 생성 · 주간 리포트 (+ 폴백)
    mail.ts          nodemailer (+ 콘솔 폴백)
    db.ts            Prisma 클라이언트
  app/
    page.tsx            랜딩
    login, signup       인증 화면
    dashboard           캐릭터 + 퀘스트 보드
    api/                REST 엔드포인트
  components/           CharacterCard · QuestCard · AchievementPanel · Dashboard
prisma/schema.prisma    User · Character · Quest · Achievement · MailLog
tests/streak.test.mjs   스트릭 경계 케이스 (npm test)
```

## 게임 규칙

- **레벨업 필요 경험치** — `100 + (레벨-1) × 45`
- **등급별 보상** — F 15 / E 30 / D 55 / C 90 / B 140 / A 220 / S 400 EXP
- **능력치 5종** — 💪 힘 · 🧠 지능 · ✨ 매력 · 🌿 체력 · 🔥 의지
- **스트릭** — 하루에 하나라도 깨면 +1. 하루 비면 1부터 다시. 최고 기록은 남는다
- **업적 11종** — 완수 횟수 · 스트릭 · 레벨 · S급 달성 · 전 능력치 5 이상 등 (숨김 업적 1개)
- 보상 수치는 **서버가 등급표를 보고** 정합니다. AI는 등급과 능력치만 고르고,
  경험치 액수는 정하지 않습니다 — 모델이 밸런스를 흔들지 못하게.
- "하루"의 기준은 서버 위치가 아니라 `APP_TIMEZONE`(기본 `Asia/Seoul`)입니다.
  새벽 1시에 깬 퀘스트가 UTC 기준으로 전날이 되어 스트릭이 꼬이는 걸 막기 위해서.

## 테스트

```bash
npm test        # 스트릭 경계 케이스 17개 (월/연 경계, 윤년, 타임존)
npm run lint
npm run typecheck  # next typegen + tsc (생성 타입이 있어야 통과)
```

## 만들면서 다뤄본 것

로그인 세션(httpOnly 쿠키 · 비밀번호 해싱) · DB 스키마와 마이그레이션 ·
트랜잭션 · AI 구조화 출력(structured outputs) · SMTP 메일 발송 ·
서버/클라이언트 컴포넌트 분리 · 낙관적 UI 업데이트

## 다음에 붙여볼 것

- [ ] 주간 리포트 자동 발송 (cron)
- [ ] 친구 추가 후 레벨 비교
- [ ] 소셜 로그인 (OAuth)
