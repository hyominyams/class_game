# ClassQuest Core Logic Recovery Plan (4-Area Split)

- Last Updated: 2026-02-28
- Scope: 문제세트 반영, 결과 저장/코인 지급, RBAC/RLS, 대회 집계, 데이터 정합성, 배포 검증
- Owner: Multi-Agent Task Force

## 0) 멀티 에이전트 운영 장치

1. 각 영역(Area)은 1개 에이전트만 수정한다.
2. 각 에이전트는 자신 영역 밖 파일을 수정하지 않는다.
3. 공통 파일 충돌 방지를 위해 통합 순서를 지킨다.
4. 모든 작업 완료 시 `작업결과`와 `다음 작업 단계`를 반드시 기록한다.
5. 상태값은 `Done`, `In Progress`, `Blocked`, `Not Started`만 사용한다.

## 1) 4개 영역 분리

| Area | 담당 Phase | 수정 범위(파일/모듈) | DB 범위 | 담당 에이전트 |
|---|---|---|---|---|
| Area A: Question Runtime | Phase 1, Phase 2(연동) | `app/student/game/*`, `components/games/word-runner/*`, `components/games/history-quiz/*`, `components/games/word-chain/*`, `components/games/pixel-runner/*`, `app/actions/game.ts`, `app/actions/game-data.ts` | 조회 로직만 사용 | Agent A |
| Area B: Security & Access | Phase 3 | `middleware.ts`, `lib/supabase/middleware.ts`, `app/actions/*`(권한 가드 관련), `app/admin/*/actions.ts`, `app/teacher/*/actions.ts` | RLS 정책 정의/적용(권한 중심) | Agent B |
| Area C: Economy & Tournament | Phase 4, Phase 5 | `app/actions/store.ts`, `app/actions/tournament.ts`, 대회/상점 UI 연결 파일 | 결제 RPC, 대회 무결성 RPC/제약 | Agent C |
| Area D: Data Hygiene & Release | Phase 6, Phase 7 + 통합 검증 | `docs/*`, 검증 스크립트, 데이터 정제 스크립트, 최종 회귀 테스트 설정 | 마이그레이션 파일 정리, 데이터 정제 쿼리 | Agent D |

## 2) 충돌 방지 규칙 (필수)

| Rule ID | 규칙 | Owner |
|---|---|---|
| R1 | `supabase/migrations/*`는 Area D만 최종 작성/수정 | Agent D |
| R2 | `app/actions/game.ts`는 Area A만 수정 (권한 가드는 Area B가 별도 패치로 반영) | Agent A |
| R3 | `app/actions/tournament.ts`, `app/actions/store.ts`는 Area C 전용 | Agent C |
| R4 | `middleware.ts`, `lib/supabase/middleware.ts`는 Area B 전용 | Agent B |
| R5 | 공통 파일 수정이 필요하면 `docs/status`에 동기록 후 해당자 합의 | All |

## 3) 통합 순서 (권장)

1. Area B 선반영: 경로 접근 통제/가드 확정
2. Area A 반영: 학생 런타임 문제세트 경로 통합
3. Area C 반영: 결제/대회 원자성 및 서버 검증 강화
4. Area D 반영: 데이터 정제, 회귀 테스트, 릴리스 체크

## 4) Phase-Task 매핑 (4영역 기준)

| Task ID | Phase | Area | Status | 작업결과 | 다음 작업 단계 | Evidence | Last Update |
|---|---|---|---|---|---|---|---|
| P1-1 `getRuntimeQuestions(gameId)` implementation | Phase 1 | Area A | Done | Added runtime resolver with `CLASS > GLOBAL` priority | Verify page/component integration changes | `app/actions/game-data.ts` | 2026-02-28 |
| P1-2 Student pages switched to runtime query | Phase 1 | Area A | Done | `word-defense/word-runner/history-quiz/word-chain` now use `getRuntimeQuestions` | Verify gameplay start flow on each page | `app/student/game/*/page.tsx` | 2026-02-28 |
| P1-3 Student set-selection UI removed | Phase 1 | Area A | Done | Student menu shows single auto-applied start card | Confirm retry/tournament path behavior | `components/games/word-runner/*`, `components/games/history-quiz/*`, `components/games/word-chain/*` | 2026-02-28 |
| P1-4 Block start when no active set | Phase 1 | Area A | Done | `pixel-runner` blocks start and shows no-active-set state when runtime questions are empty | Monitor no-set UX metrics | `components/games/pixel-runner/pixel-runner-game.tsx` | 2026-02-28 |
| P2-1 활성 세트 단일성 제약 설계 초안 | Phase 2 | Area D | Done | CLASS/GLOBAL 분리 partial unique index 설계 반영 | 운영 데이터에서 위반 건수 모니터링 | `supabase/migrations/20260228150000_activate_question_set_atomic.sql` | 2026-02-28 |
| P2-2 `activate_question_set_atomic(...)` SQL/RPC 구현 | Phase 2 | Area D | Done | 원자 활성화 함수 + 교사 스코프 검증 + 권한 GRANT/REVOKE 반영 | 배포 후 RPC 호출 성공률 점검 | `supabase/migrations/20260228150000_activate_question_set_atomic.sql` | 2026-02-28 |
| P2-3 `activateQuestionSetAction(setId)` integration | Phase 2 | Area A | Done | `toggleQuestionSetAction`에서 활성화 시 RPC 우선 호출 + 미배포 fallback 추가 | fallback 제거 시점 결정 | `app/actions/teacher-v2.ts` | 2026-02-28 |
| P2-4 Teacher/Admin apply-button action migration | Phase 2 | Area A | Done | teacher/admin 화면의 기존 버튼은 동일 액션을 통해 RPC 경로 사용 | 장애 시 fallback 경로로 자동 복귀 확인 | `app/actions/teacher-v2.ts`, `app/teacher/questions/page.tsx`, `app/admin/questions/page.tsx` | 2026-02-28 |
| P3-1 `/teacher/*`, `/student/*` 미들웨어 역할검증 | Phase 3 | Area B | Done | 경로별 허용 역할 검증 적용 (`/admin`, `/teacher`, `/student`) | role redirect 케이스 추가 검증 | `middleware.ts`, `lib/supabase/middleware.ts`, `app/actions/security/rbac.ts` | 2026-02-28 |
| P3-2 Server Action 공통 가드 적용 | Phase 3 | Area B | Done | 상점/대회 액션 포함 주요 서버 액션을 `requireActor` 기반으로 정리 | 잔여 액션 점진 전환 | `app/actions/store.ts`, `app/actions/tournament.ts`, `app/actions/teacher-v2.ts`, `app/actions/admin/*` | 2026-02-28 |
| P3-3 RLS 정책 재정의 | Phase 3 | Area B | Done | helper function + 테이블별 scope 정책 재정의 마이그레이션 추가 | DB 적용 후 `pg_policies` 검증 실행 | `supabase/migrations/20260228153000_harden_rbac_rls_policies.sql` | 2026-02-28 |
| P3-4 권한 회귀 테스트 작성 | Phase 3 | Area B | Done | 보안 커버리지 자동 점검 스크립트(`check:security`) 추가 | CI 파이프라인 연결 | `scripts/check-security-coverage.mjs`, `package.json` | 2026-02-28 |
| P4-1 `purchase_item_atomic(...)` implementation | Phase 4 | Area C | Done | 원자 결제 RPC 구현(서버 카탈로그 가격 강제, 잔액/원장/아이템 일괄 처리) | DB 적용 후 fallback 제거 준비 | `supabase/migrations/20260228152000_add_atomic_purchase_and_tournament_attempt_rpc.sql` | 2026-02-28 |
| P4-2 `purchaseItem(itemId)` RPC migration | Phase 4 | Area C | Done | `purchaseItem(itemId)` RPC 우선 + 안전 fallback 유지 | RPC 적용 확인 후 fallback 단계적 제거 | `app/actions/store.ts` | 2026-02-28 |
| P4-3 Payment response contract alignment | Phase 4 | Area C | Done | 응답을 `{ success, newBalance, itemId, quantity, error }` 형태로 유지 | UI 메시지 표준화 유지 | `app/actions/store.ts`, `app/student/store/page.tsx` | 2026-02-28 |
| P5-1 `recordTournamentAttempt` server validation hardening | Phase 5 | Area C | Done | 학생 역할/스코프/활성 기간/점수 정규화 검증 유지 | 예외 코드별 UX 개선 | `app/actions/tournament.ts` | 2026-02-28 |
| P5-2 Tournament 3-attempt limit server/DB hardening | Phase 5 | Area C | Done | DB 제약 + 원자 RPC + 액션 RPC 우선 경로 추가 | DB 적용 후 fallback 축소 | `supabase/migrations/20260228152000_add_atomic_purchase_and_tournament_attempt_rpc.sql`, `app/actions/tournament.ts` | 2026-02-28 |
| P5-3 `GRADE` tournament policy alignment | Phase 5 | Area C | Done | `CLASS/GRADE` scope semantics and `CLASS > GRADE` priority 반영 완료 | 관리자 GRADE 운영 시나리오 점검 | `app/actions/tournament.ts`, `app/student/game/page.tsx` | 2026-02-28 |
| P6-1 깨진 문자열(모지바케) 정리 | Phase 6 | Area D | Done | 게임 설명 텍스트 정제 SQL 및 상태 문서 UTF-8 재작성 | 실데이터 반영 확인 | `supabase/migrations/20260228151000_data_hygiene_play_time_and_text_cleanup.sql`, `docs/status/STATUS_2026-02-28_core-logic-recovery-plan.md` | 2026-02-28 |
| P6-2 스키마 드리프트 정리 + 스키마 덤프 재생성 | Phase 6 | Area D | Blocked | `public_schema.sql` 훼손 복구 및 덤프 스크립트 추가 완료 | `supabase login` 또는 `SUPABASE_ACCESS_TOKEN` 설정 후 `npm run db:dump:public` 실행 필요 | `scripts/dump-public-schema.mjs`, `public_schema.sql` | 2026-02-28 |
| P6-3 음수 `play_time` 데이터 정제 + 가드 | Phase 6 | Area D | Done | 음수 데이터 정제 + `game_logs`/`tournament_logs` CHECK 제약 추가 | 운영 모니터링 쿼리로 위반 감시 | `supabase/migrations/20260228151000_data_hygiene_play_time_and_text_cleanup.sql` | 2026-02-28 |
| P7-1 AGENTS 체크리스트 회귀 검증 | Phase 7 | Area D | Done | `check:utf8`, `check:security`, `tsc --noEmit` 실행 완료 | CI에 회귀 체크 자동화 | `npm run check:utf8`, `npm run check:security`, `npx tsc --noEmit` | 2026-02-28 |
| P7-2 롤백 플랜/feature flag 검증 | Phase 7 | Area D | Done | 롤백 SQL 및 feature toggle 전략 문서화 | 배포 체크리스트와 연결 | `docs/status/AREA_D_RELEASE_CHECKLIST_2026-02-28.md` | 2026-02-28 |
| P7-3 운영 모니터링 지표 점검 | Phase 7 | Area D | Done | 운영 모니터링 SQL 템플릿 추가 | 대시보드/알람 채널 연결 | `docs/status/AREA_D_MONITORING_QUERIES_2026-02-28.sql` | 2026-02-28 |

## 5) Execution Log (작업 시 매번 추가)

| Date | Task ID | Area | Status | 작업결과 | 다음 작업 단계 | Evidence | Owner |
|---|---|---|---|---|---|---|---|
| 2026-02-28 | DOC-REFINE-01 | Area D | Done | 문서를 4개 영역 분리 기준으로 재구성 | 각 영역 에이전트 배정 후 P1-1부터 착수 | 본 문서 | Codex |
| 2026-02-28 | P1-1~P1-4 | Area A | Done | Runtime path 통합, 학생 세트 선택 UI 제거, no-active-set 시작 차단 완료 | Phase 2 액션 연동 진행 | `app/actions/game-data.ts`, `app/student/game/*`, `components/games/*` | Codex |
| 2026-02-28 | AREA-C-20260228-01 | Area C | Done | Store RPC-first + Tournament validation/attempt-limit hardening + CLASS/GRADE 우선순위 반영 | RPC 적용 후 fallback 제거 일정 수립 | `app/actions/store.ts`, `app/actions/tournament.ts` | Codex |
| 2026-02-28 | D-P2-1-INDEX-DESIGN | Area D | Done | 활성 세트 단일성 인덱스 설계/반영 | RPC 연동 반영 | `supabase/migrations/20260228150000_activate_question_set_atomic.sql` | Codex |
| 2026-02-28 | D-P2-2-ACTIVATE-RPC | Area D | Done | `activate_question_set_atomic` 구현 및 권한 설정 | 액션 연동 완료 | `supabase/migrations/20260228150000_activate_question_set_atomic.sql`, `app/actions/teacher-v2.ts` | Codex |
| 2026-02-28 | D-P3-HARDEN-RLS | Area D | Done | helper 함수 + RLS 정책 재정의 마이그레이션 추가 | DB 적용 후 정책 검증 | `supabase/migrations/20260228153000_harden_rbac_rls_policies.sql` | Codex |
| 2026-02-28 | D-P4-P5-ATOMIC-RPCS | Area D | Done | `purchase_item_atomic`, `record_tournament_attempt_atomic` 및 시도 횟수 제약 반영 | 배포 후 fallback 축소 | `supabase/migrations/20260228152000_add_atomic_purchase_and_tournament_attempt_rpc.sql` | Codex |
| 2026-02-28 | D-P6-1-MOJIBAKE-CLEANUP | Area D | Done | 텍스트 정제 SQL + 상태 문서 UTF-8 재작성 | 운영 반영 확인 | `supabase/migrations/20260228151000_data_hygiene_play_time_and_text_cleanup.sql` | Codex |
| 2026-02-28 | D-P6-2-SCHEMA-DUMP-RECOVERY | Area D | Blocked | 덤프 스크립트/명령 추가 및 `public_schema.sql` 복구 | `supabase login` 또는 `SUPABASE_ACCESS_TOKEN` 설정 필요 | `scripts/dump-public-schema.mjs`, `public_schema.sql` | Codex |
| 2026-02-28 | D-P6-3-PLAY-TIME-GUARD | Area D | Done | 음수 `play_time` 정제 + DB CHECK 제약 추가 | 위반 모니터링 유지 | `supabase/migrations/20260228151000_data_hygiene_play_time_and_text_cleanup.sql` | Codex |
| 2026-02-28 | D-P7-REGRESSION | Area D | Done | UTF-8/보안 커버리지/TS 타입체크 실행 완료 | CI 자동화 | `npm run check:utf8`, `npm run check:security`, `npx tsc --noEmit` | Codex |
