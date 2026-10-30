# Scoter

> A supplement-stack community: check the products you take, and see others who take the same ones.

**Scoter**는 영양제 스택 커뮤니티입니다. 지금 먹는 영양제 제품을 체크하면 내 스택 카드가 공개되고, 같은 제품을 체크한 사람들의 카드를 바로 볼 수 있습니다.

점수·추천·판매 기능은 일부러 넣지 않았습니다. 화면에 결핍 판정이나 복용 권유 문구를 쓰지 않는 것이 원칙입니다. 자세한 범위는 [`docs/기획서.md`](docs/기획서.md)에 있습니다.

## 주요 기능

- **공개 스택 · 제품 방** — 로그인하지 않아도 최근 공개 스택(`/`), 사용자 스택(`/stacks/[userId]`), 제품 방(`/products/[id]`)을 볼 수 있습니다.
- **제품 체크** — 로그인한 사용자가 제품을 검색해 체크하고, 1회 분량 배수와 먹는 시간(아침 · 점심 · 저녁 · 자기 전)을 정합니다.
- **직접 제품 추가** — 목록에 없는 제품은 이름과 함량을 직접 추가하고, 성분 함량을 고칠 수 있습니다.
- **함량 합계** — 스택 카드 안에 오늘 먹는 성분 함량 합계를 보여 줍니다.
- **질문** — 스택 카드에 200자 이내 질문을 달 수 있고, 본인 질문(관리자는 모든 질문)을 지울 수 있습니다.
- **군(cohort) 비교** (`/me/cohort`) — 성분이 3개 이상 겹치는 사람들을 한 군으로 묶습니다. 20명 미만이면 그 사람들의 카드를, 20명 이상이면 성분 차이를 퍼센트로 보여 줍니다.
- **스택 공개 설정** — 내 스택을 비공개로 돌릴 수 있습니다.
- **카탈로그 가져오기** — 식약처 건강기능식품 영양성분 형식의 CSV를 가져옵니다. 품목제조신고번호 기준으로 갱신하고, 사람이 고친(잠긴) 함량은 덮어쓰지 않습니다. 성분 이름은 별칭 표(`비타민D3` → `비타민 D` 등)로 정규화합니다.
- **이메일 매직 링크 로그인** — 개발 모드에서는 메일을 보내지 않고 링크를 콘솔과 `data/dev-magic-link.txt`에 남깁니다. 첫 가입자는 관리자 권한을 받습니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 (App Router, Server Actions), React 19, TypeScript |
| 데이터베이스 | PostgreSQL, Drizzle ORM / drizzle-kit |
| 인증 | Auth.js (next-auth v5) + Nodemailer 이메일 로그인, Drizzle Adapter |
| 테스트 | Vitest |
| 패키지 매니저 | pnpm |

## 실행 방법

필요한 것: Node.js, pnpm, 로컬 PostgreSQL

```bash
pnpm install

# 환경 변수
cp .env.example .env
# DATABASE_URL, AUTH_SECRET 등을 환경에 맞게 수정

# DB 생성 후 스키마 반영
createdb scoter
pnpm db:push

# 샘플 카탈로그 가져오기 (선택)
pnpm import:catalog --file data/sample-catalog.csv

# 개발 서버
pnpm dev        # http://localhost:3000
```

기타 스크립트:

```bash
pnpm test       # Vitest 단위 테스트
pnpm build      # 프로덕션 빌드
pnpm start      # 프로덕션 서버
```

### 환경 변수

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `AUTH_SECRET` | Auth.js 비밀값 |
| `AUTH_URL` | 앱 주소 (예: `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | 호스트 신뢰 여부 |
| `EMAIL_FROM` | 로그인 메일 발신자 |
| `EMAIL_SERVER` | SMTP 주소. 배포할 때만 필요 (개발 모드에서는 링크를 화면/파일로 확인) |

## 프로젝트 구조

```
src/
├── app/                 # 페이지 (홈, 로그인, /me, /me/cohort, 제품 방, 사용자 스택) + Auth 라우트
├── components/          # 헤더, 스택 목록, 시간 입력 등 UI
├── db/                  # Drizzle 스키마 (users, products, product_nutrients, stack_items, questions …)
├── domain/              # 시간대·문구 포맷 등 순수 로직
├── server/
│   ├── actions.ts       # Server Actions (제품 체크/추가, 함량 수정, 질문 등)
│   ├── catalog/         # CSV 파싱 · 성분 별칭 · 카탈로그 가져오기 CLI
│   ├── cohort.ts        # 성분 3개 이상 겹치는 군 계산
│   ├── totals.ts        # 함량 합계
│   └── questions.ts     # 질문 권한
└── auth.ts              # Auth.js 설정
data/sample-catalog.csv  # 샘플 카탈로그
docs/기획서.md            # 기획서 (범위 · 흐름)
```
