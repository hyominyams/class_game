# 대시보드/게임 로딩 성능 개선안 (기능 비파괴)

작성일: 2026-03-04

## 1. 목적
- 메인 대시보드와 게임 로딩 체감 속도를 개선한다.
- 기존 기능/정책(RBAC, 문제세트 우선순위, 대회 규칙, 코인 원장)을 깨지 않는다.

## 2. 현재 병목 요약
- 인증 호출 중복: `auth.getUser()`가 페이지/액션/미들웨어에서 반복 호출됨.
- 대시보드 쿼리 fan-out: 대시보드 1회 로드에 다수의 Supabase 요청이 동시에 발생.
- 알림 쿼리 과조회: 반 전체 `coin_transactions`를 큰 범위로 읽는 패턴 존재.
- 게임 목록 N+1: 대회 참가 정보 조회가 게임별 개별 호출 구조.
- 인덱스 부족: `coin_transactions`, `game_logs` 핵심 조회 조건 대비 보조 인덱스 부족.

## 3. 기능 비파괴 가드레일
- 응답 계약 유지:
  - `getStudentDashboardData()` 반환 shape 변경 금지.
  - `getRuntimeQuestions(gameId)`의 `CLASS > GLOBAL` 우선순위 유지.
  - 대회 3회 제한/최고점 집계 로직 유지.
- 권한 모델 유지:
  - Middleware + Server Action + RLS 다중 검증 구조 유지.
- 경제 규칙 유지:
  - 코인 변경은 항상 `coin_transactions` 원장 기준.
  - `profiles.coin_balance`는 캐시 요약으로만 사용.

## 4. 우선순위 개선안

## 4.1 Phase A (즉시 적용, 저위험)

### A1. 조회 인덱스 보강
대상: DB (`public.coin_transactions`, `public.game_logs`, `public.profiles`, `public.tournaments`, `public.question_sets`)

```sql
create index if not exists idx_coin_tx_user_created_at_pos
on public.coin_transactions (user_id, created_at desc)
where amount > 0;

create index if not exists idx_coin_tx_user_reason_created_at
on public.coin_transactions (user_id, reason, created_at desc);

create index if not exists idx_coin_tx_reference_id
on public.coin_transactions (reference_id);

create index if not exists idx_game_logs_user_created_at
on public.game_logs (user_id, created_at desc);

create index if not exists idx_profiles_role_grade_class
on public.profiles (role, grade, class);

create index if not exists idx_tournaments_scope_window
on public.tournaments (grade, class, is_active, start_time, end_time, game_id);

create index if not exists idx_question_sets_runtime_lookup
on public.question_sets (game_id, is_active, grade, class, created_at desc);
```

리스크: 인덱스 생성 시 일시 부하  
완화: 트래픽 낮은 시간대 적용, 필요 시 분할 적용

### A2. 대시보드 집계 쿼리 슬림화
대상: `app/actions/game.ts#getStudentDashboardData`

현재 문제:
- 전체 행 조회 후 앱 레이어에서 합산(`scoreData`, `coinData`) 수행.

개선:
- 합계/카운트는 DB aggregate(`sum`, `count`)로 계산.
- 최근 활동 3건만 상세 조회 유지.
- 응답 필드는 그대로 유지.

리스크: 없음(동일 필드/동일 의미 유지)  
검증: 기존 값과 샘플 사용자 20명 기준 일치 비교.

### A3. 알림 랭킹 계산 과조회 제거
대상: `app/actions/notifications.ts#getStudentNotificationsAction`

현재 문제:
- 반 전체 거래를 대량 조회 후 TS에서 순회 계산.

개선:
- 랭킹용 점수는 SQL `group by user_id` 집계 2회로 계산:
  - 누적 총점(eligible reason)
  - 기준시점 이전 총점
- row 단위 전체 fetch 제거.

리스크: 랭킹 변동 계산식 오해 가능  
완화: 기존 구현과 결과 diff 테스트 추가.

### A4. 게임 목록 N+1 제거
대상: `app/student/game/page.tsx`

현재 문제:
- `activeTournaments.map` 내부에서 `tournament_participants` 개별 조회.

개선:
- `tournament_id in (...)` 단일 조회 후 메모리 매핑.

리스크: 없음(동일 결과)  
검증: 대회 참가/비참가/3회 소진 케이스 비교.

### A5. 네비게이션 헤더 재요청 제어
대상: `components/ui/navbar.tsx`

현재 문제:
- `pathname` 변화마다 코인/알림 재요청.

개선:
- 짧은 TTL 캐시(예: 15~30초) 또는 화면 진입 시 1회 fetch + 명시적 refresh 이벤트 기반 갱신.
- 응답 계약/표시는 그대로 유지.

리스크: 실시간성 약간 감소  
완화: 구매/출석/정산 성공 시 refresh 이벤트 강제 발행.

## 4.2 Phase B (중기, 추가 이득)

### B1. 대시보드 전용 스냅샷 RPC
- `get_student_dashboard_snapshot(user_id)` RPC로 묶어 1회 round-trip화.
- 기존 `getStudentDashboardData()`는 RPC 결과를 기존 shape로 변환해서 반환.

### B2. 주간 정산 호출 비동기화
- 대시보드 SSR 블로킹에서 분리(초기 렌더 후 백그라운드 정산 체크).
- 보상 지급 로직은 유지, 사용자 체감 TTFB 개선.

## 5. 단계별 롤아웃 전략
- Step 1: 인덱스 적용(A1)
- Step 2: N+1 제거(A4)
- Step 3: 대시보드 집계 슬림화(A2)
- Step 4: 알림 집계 슬림화(A3)
- Step 5: 헤더 캐시(A5)
- Step 6: 필요 시 RPC(B1), 정산 비동기(B2)

권장 방식:
- 각 Step 단위로 배포/검증/롤백 가능하게 분리.
- 기능 플래그 예시:
  - `PERF_DASHBOARD_AGG_V2`
  - `PERF_NOTI_AGG_V2`
  - `PERF_GAME_PARTICIPATION_BATCH`

## 6. 롤백 계획
- 코드 롤백: 플래그 OFF로 즉시 기존 경로 복귀.
- DB 롤백: 신규 인덱스는 기능 영향 없이 `drop index if exists ...`로 제거 가능.
- 데이터 롤백: 원장/점수 스키마 변경 없음(데이터 무결성 영향 없음).

## 7. 검증 체크리스트
- 기능 검증:
  - 학생 대시보드 수치(총점/코인/출석/랭크) 기존과 동일.
  - 게임 진입/문제세트 반영(`CLASS > GLOBAL`) 동일.
  - 대회 모드 3회 제한/최고점 반영 동일.
- 권한 검증:
  - `/student/*`, `/teacher/*`, `/admin/*` 접근 규칙 동일.
- 성능 검증:
  - 대시보드 최초 로딩 P95 시간 전/후 비교.
  - 게임 목록 진입 시 요청 수 전/후 비교.
  - Supabase API 호출 수와 전송량 전/후 비교.

## 8. 기대 효과 (보수적)
- 대시보드 관련 요청 수: 약 30~50% 감소.
- 반 전체 거래 조회 payload: 최대 80% 이상 감소.
- 게임 목록 진입 DB round-trip: N+1 -> 1회(참가정보 기준).
- 체감 TTFB/로딩 스피너 노출시간 유의미 감소.

## 9. Execution Log
- 2026-03-04 11:30 KST - `A1` started. Added additive index migration file: `supabase/migrations/20260304113000_add_performance_indexes_for_dashboard_and_game.sql`.
- 2026-03-04 11:34 KST - `A1` success. Scope: index-only (non-breaking), no behavior/schema contract change.
- 2026-03-04 11:37 KST - `A4` started. Replaced game-page tournament participation N+1 lookup with single batched query.
- 2026-03-04 11:40 KST - `A4` success. Updated: `app/student/game/page.tsx` (`.in("tournament_id", ids)` + in-memory map). Behavior preserved for attempts limit.
- 2026-03-04 11:41 KST - Validation pending: run build and UTF-8 check after next step.
- 2026-03-04 11:46 KST - `A5` started. Added navbar fetch throttling (30s TTL) with explicit `student-header-refresh` event override.
- 2026-03-04 11:49 KST - `A5` success. Updated: `components/ui/navbar.tsx`. Expected effect: reduced repeated coin/notification requests during route changes.
- 2026-03-04 11:52 KST - Validation success. `npm run build` and `npm run check:utf8` passed.
- 2026-03-04 11:55 KST - `A2/A3` started. Added RPC migration: `supabase/migrations/20260304122000_add_student_metrics_and_rank_rpc.sql`.
- 2026-03-04 11:57 KST - `A2` applied in `app/actions/game.ts` (RPC metrics + rank lookup), with fallback to legacy query path if RPC fails/missing.
- 2026-03-04 11:59 KST - `A3` patch error. `apply_patch` context mismatch on `app/actions/notifications.ts` due existing text/encoding variance.
- 2026-03-04 12:01 KST - `A3` patch error. `Set-Content -Encoding utf8NoBOM` unsupported in current PowerShell.
- 2026-03-04 12:03 KST - `A3` recovered. Rewrote `app/actions/notifications.ts` using .NET UTF-8 (no BOM) writer.
- 2026-03-04 12:05 KST - `A3` applied with safety fallback. Notification rank snapshot uses RPC first and auto-falls back to legacy transaction-based ranking on RPC error.
- 2026-03-04 12:08 KST - Final validation success. `npm run build` and `npm run check:utf8` passed after A2/A3.
- 2026-03-04 12:10 KST - UTF-8 recheck after newline normalization: `npm run check:utf8` passed.
- 2026-03-04 12:13 KST - Supabase apply success. Migrations applied: `add_performance_indexes_for_dashboard_and_game`, `add_student_metrics_and_rank_rpc`.
- 2026-03-04 12:14 KST - Supabase verification success. New indexes and RPC functions confirmed in catalog queries.
- 2026-03-04 12:15 KST - Post-apply encoding check success: `npm run check:utf8` passed.
- 2026-03-04 21:17 KST - Re-verification success. Supabase migrations list includes `add_performance_indexes_for_dashboard_and_game` and `add_student_metrics_and_rank_rpc`.
- 2026-03-04 21:17 KST - UTF-8/BOM check success. `npm run check:utf8` passed, and key updated files confirmed as UTF-8 without BOM.
