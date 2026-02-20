## 1. 프로젝트 개요
**ClassQuest**는 여러 학습 게임의 결과를 하나의 플랫폼에서 통합 관리하는  
**학급 게임 학습 플랫폼**이다.

- Frontend: Next.js (App Router), React, TailwindCSS, shadcn/ui
- Backend/DB: Supabase (PostgreSQL, Storage)
- Game Engine: Phaser.js
- Deployment: Vercel

본 문서는 AI 보조 개발 및 협업을 위해  
**역할 기반 책임(Agents)** 을 명확히 정의한다.

---

## 2. Agent 목록 (요약)

| Agent | 주요 책임 | 핵심 포인트 |
|---|---|---|
| Product Agent | 기획/정책 | PRD, 규칙의 단일 진실 |
| Frontend Agent | UI/UX | Next.js, Role 기반 화면 |
| Backend Agent | 서버/DB | Supabase, RLS, Server Actions |
| Auth Agent | 인증/권한 | Admin / Teacher / Student |
| Game Agent | 게임 연동 | Phaser ↔ 플랫폼 브리지 |
| Scoring Agent | 점수/대회 | 랭킹, 리그, 최고점수 |
| Question Agent | 문제 시스템 | 문제세트, 스코프 |
| Economy Agent | 코인 | 트랜잭션 로그 |
| Analytics Agent | 통계 | 요약, 리포트, 보존 |

---

## 3. Agent별 상세 책임

---

### 3.1 🧠 Product Agent (Manager)

**역할**
- 비즈니스 규칙의 최종 결정권자

**책임**
- PRD 유지 및 변경 관리
- 게임/대회/리그/보상 규칙 정의
- MVP vs 확장 기능 판단

**핵심 규칙**
- 대회 모드: 게임별 최대 3회 도전
- 점수 집계: 게임별 최고 점수만 반영
- 리그/승급: CLASS 대회만 적용
- 학년 대회: 랭킹 표시만 (리그 영향 없음)

---

### 3.2 🎨 Frontend Agent (UI/UX)

**역할**
- 사용자 인터페이스 구현

**책임**
- 역할별 대시보드 (Admin / Teacher / Student)
- 문제세트 관리 UI
- 대회 생성/운영 UI
- **학생 전용 페이지**:
    - 랭킹 페이지 (주간/월간/대회 탭 분리)
    - 학습 기록 페이지 (뱃지 컬렉션, 성장 그래프)
- **디자인 시스템**: 'Pixel Art UI' 테마 및 일관성 유지 (굵은 테두리, 픽셀 폰트 등)

**원칙**
- DB 직접 접근 금지
- 모든 요청은 Server Actions / API Route 사용
- 권한 없는 UI는 **렌더링 자체 금지**

---

### 3.3 🛠️ Backend Agent (Server & DB)

**역할**
- 데이터 무결성의 최종 책임자

**책임**
- Supabase DB 스키마 설계
- Server Actions 구현
- RLS 정책 관리

**원칙**
- 모든 파생 데이터(랭킹/최고점수)는 **로그로부터 재계산 가능**
- Hard Delete 지양, Soft Delete 우선
- 서버에서 권한/규칙 최종 검증

---

### 3.4 🛡️ Auth & Permission Agent

**역할**
- 인증 및 권한 통제

**권한 모델**
- `ADMIN`: 전역 접근 (교사/학생 계정 발급, 전체 코인/문제 관리)
- `TEACHER`: CLASS 스코프 (자기 학년/반 학생 계정 발급/코인 지급/문제 관리)
- `STUDENT`: SELF 스코프 (게임 플레이, 상점 이용)

**책임**
- 교사는 **본인과 동일한 학년/반의 학생 계정만** 생성 가능
- 최초 로그인 시 **별명 설정 및 비밀번호 변경** 강제 (Onboarding Flow)
- 모든 Server Action 내부에서 권한 재검증
- 비밀번호는 bcrypt/argon2 해시 저장

---

### 3.5 🎮 Game Integration Agent

**역할**
- Phaser.js 게임과 플랫폼 연결

**책임**
- Iframe / Canvas 컨테이너 관리
- 게임 종료 시 결과 전송

**결과 Payload**
```json
{
  "game_id": "string",
  "mode": "NORMAL | TOURNAMENT",
  "score": number,
  "correct_count": number,
  "play_time": number,
  "attempt_num": number
}
```

**원칙**
- 게임 수는 고정되지 않음
- 모든 규칙은 class_game 단위로 확장 가능해야 함

---

### 3.6 🏆 Scoring & Ranking Agent

**역할**
- 점수 저장 및 집계 로직 담당

**규칙**
- 일반 모드: 모든 플레이 로그 저장
- 대회 모드: 대회 기간 내 결과만 유효
- 대회 모드: 게임별 도전 3회 초과 시 잠금
- 대회 모드: 최고 점수만 집계
- 학년 대회: 랭킹만 표시
- 학년 대회: 리그/승급 미적용

**대회 권한**
- Teacher: 자기 CLASS 대회 생성/시작/종료
- Admin: CLASS + GRADE 대회 모두 가능

---

### 3.7 📝 Question System Agent

**역할**
- 문제 세트 및 문항 관리 (기본 형식: **4지 선다 객관식, 단답형**)

**문제 세트 스코프**
- CLASS (학년 + 반)
- **게임별 독립 관리**: 문제 세트는 각 게임(class_game)과 1:1 대응하여 관리됨. (게임별로 여러 세트를 보유하고 선택 가능)

**적용 우선순위**
- 활성 CLASS 문제세트
- GLOBAL 문제세트

**제약**
- 게임당 / 학급당 문제세트 최대 34개
- 활성 문제세트는 항상 1개
- 활성 문제세트는 삭제 불가

**삭제 규칙**
- 삭제 전 반드시 다른 세트를 활성화해야 함

---

### 3.8 💰 Economy Agent

**역할**
- 코인 경제 시스템 관리

**원칙**
- 모든 코인 변화는 coin_transactions에 기록
- 잔액은 SUM(amount)로 계산

**지급 규칙**
- 일반 모드: 게임별 하루 최대 3회
- 대회 보상: 랭킹 기준 지급

**권한**
- Teacher: 자기 CLASS 학생에게 코인 보너스 지급 가능
- Admin: 전교생 대상 코인 지급 가능

---

### 3.9 📊 Analytics Agent

**역할**
- 로그 기반 통계/리포트 생성

**보존 정책**
- 일반 모드 로그: 최근 120일
- 월별 요약: 영구 보관
- 대회 데이터: 영구 보관

**산출물**
- 월별 평균 점수 (일반 모드)
- 학생 성장 그래프
- 학급/학년 통계 리포트

---

## 4. Agent 협업 규칙

**PRD 우선 원칙**
- Product Agent의 PRD는 최상위 규칙

**이중 검증**
- Frontend 검증 + Backend 재검증 필수

**충돌 해결**
- UI vs 서버 충돌 → 서버 규칙 우선
- 성능 vs 규칙 충돌 → Product Agent 판단

---

## 5. 향후 확장 가능 Agent

- AI Tutor Agent (문제 추천)
- Notification Agent (알림)
- Export Agent (CSV / PDF)
- Parent View Agent (보호자)
