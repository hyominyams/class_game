# ClassQuest Core Logic Recovery Plan (4-Area Split)

- Last Updated: 2026-02-28
- Scope: 문제세트 반영, 결과 저장/코인지급, RBAC/RLS, 대회 집계, 데이터 정합성, 배포 검증
- Owner: Multi-Agent Task Force

## 0) 멀티 에이전트 운영 원칙

1. 한 영역(Area)당 1개 에이전트만 수정한다.
2. 각 에이전트는 자신의 영역 밖 파일을 수정하지 않는다.
3. 공통 파일 충돌 방지를 위해 통합 순서를 지킨다.
4. 모든 작업 완료 시 `작업결과`와 `다음 작업 단계`를 반드시 기록한다.
5. 상태값은 `Done`, `In Progress`, `Blocked`, `Not Started`만 사용한다.

## 1) 4개 영역 분리

| Area | 담당 Phase | 수정 범위(파일/모듈) | DB 범위 | 담당 에이전트 |
|---|---|---|---|---|
| Area A: Question Runtime | Phase 1, Phase 2(앱 연동) | `app/student/game/*`, `components/games/word-runner/*`, `components/games/history-quiz/*`, `components/games/word-chain/*`, `components/games/pixel-runner/*`, `app/actions/game.ts`, `app/actions/game-data.ts` | 조회 로직만 사용 | Agent A |
| Area B: Security & Access | Phase 3 | `middleware.ts`, `lib/supabase/middleware.ts`, `app/actions/*`(권한 가드 관련), `app/admin/*/actions.ts`, `app/teacher/*/actions.ts` | RLS 정책 정의/적용(권한 중심) | Agent B |
| Area C: Economy & Tournament | Phase 4, Phase 5 | `app/actions/store.ts`, `app/actions/tournament.ts`, 대회/상점 UI 연결 파일 | 결제 RPC, 대회 무결성 RPC/제약 | Agent C |
| Area D: Data Hygiene & Release | Phase 6, Phase 7 + 통합 검증 | `docs/*`, 검증 스크립트, 데이터 정제 스크립트, 최종 회귀 테스트 설정 | 마이그레이션 파일 정리, 데이터 정제 쿼리 | Agent D |

## 2) 충돌 방지 규칙 (필수)

| Rule ID | 규칙 | Owner |
|---|---|---|
| R1 | `supabase/migrations/*`는 Area D만 최종 작성/수정 | Agent D |
| R2 | `app/actions/game.ts`는 Area A만 수정 (권한 가드는 Area B가 별도 헬퍼로 반영) | Agent A |
| R3 | `app/actions/tournament.ts`, `app/actions/store.ts`는 Area C 전용 | Agent C |
| R4 | `middleware.ts`, `lib/supabase/middleware.ts`는 Area B 전용 | Agent B |
| R5 | 공통 타입 수정이 필요하면 `docs/status`에 선기록 후 담당자 합의 | All |

## 3) 통합 순서 (권장)

1. Area B 선반영: 접근 통제/가드 확정
2. Area A 반영: 학생 런타임 문제세트 경로 통합
3. Area C 반영: 결제/대회 원자성 및 서버 검증 강화
4. Area D 반영: 데이터 정제, 회귀 테스트, 릴리스 체크

## 4) Phase-Task 매핑 (4영역 기준)

| Task ID | Phase | Area | Status | 작업결과 | 다음 작업 단계 | Evidence | Last Update |
|---|---|---|---|---|---|---|---|
| P1-1 `getRuntimeQuestions(gameId)` implementation | Phase 1 | Area A | Done | Added runtime resolver with `CLASS > GLOBAL` priority | Verify page/component integration changes | `app/actions/game-data.ts` | 2026-02-28 |
| P1-2 Student pages switched to runtime query | Phase 1 | Area A | Done | `word-defense/word-runner/history-quiz/word-chain` now use `getRuntimeQuestions` | Verify gameplay start flow on each page | `app/student/game/*/page.tsx` | 2026-02-28 |
| P1-3 Student set-selection UI removed | Phase 1 | Area A | Done | `word-runner/history-quiz/word-chain` menu now shows single auto-applied start card | Confirm retry/tournament path behavior | `components/games/word-runner/*`, `components/games/history-quiz/*`, `components/games/word-chain/*` | 2026-02-28 |
| P1-4 Block start when no active set | Phase 1 | Area A | Done | `pixel-runner` blocks start and shows no-active-set state when runtime questions are empty | Carry Phase 2 Area A after DB atomic action is ready | `components/games/pixel-runner/pixel-runner-game.tsx` | 2026-02-28 |
| P2-1 활성 세트 단일성 제약 설계 초안 | Phase 2 | Area D | Not Started |  |  |  | 2026-02-28 |
| P2-2 `activate_question_set_atomic(...)` SQL/RPC 구현 | Phase 2 | Area D | Not Started |  |  |  | 2026-02-28 |
| P2-3 `activateQuestionSetAction(setId)` integration | Phase 2 | Area A | Blocked | Depends on Area D atomic activation RPC/action contract | Start after Area D P2-2 completion | N/A | 2026-02-28 |
| P2-4 Teacher/Admin apply-button action migration | Phase 2 | Area A | Blocked | Waiting for P2-3 completion | Replace button handlers right after P2-3 | N/A | 2026-02-28 |
| P3-1 `/teacher/*`, `/student/*` 미들웨어 역할검증 | Phase 3 | Area B | Not Started |  |  |  | 2026-02-28 |
| P3-2 Server Action 공통 가드 적용 | Phase 3 | Area B | Not Started |  |  |  | 2026-02-28 |
| P3-3 RLS 정책 재정의 | Phase 3 | Area B | Not Started |  |  |  | 2026-02-28 |
| P3-4 권한 회귀 테스트 작성 | Phase 3 | Area B | Not Started |  |  |  | 2026-02-28 |
| P4-1 `purchase_item_atomic(...)` 구현 | Phase 4 | Area C | Blocked | DB 함수 조회 결과 `purchase_item_atomic` 미존재 확인 | Area D에서 RPC 마이그레이션 생성 후 Action fallback 제거 | `mcp__supabase__execute_sql`, `app/actions/store.ts` | 2026-02-28 |
| P4-2 `purchaseItem(itemId)` RPC 전환 | Phase 4 | Area C | Done | `purchaseItem(itemId)`를 RPC 우선 호출 + 서버 fallback 경로로 전환 | RPC 배포 후 fallback 비활성화 계획 수립 | `app/actions/store.ts` | 2026-02-28 |
| P4-3 결제 응답 계약 정렬 | Phase 4 | Area C | Done | 응답을 `{ success, newBalance, itemId, quantity, error }` 형태로 정렬 | 상점 UI 메시지 계약 통일(국문) | `app/actions/store.ts`, `app/student/store/page.tsx` | 2026-02-28 |
| P5-1 `recordTournamentAttempt` 서버 검증 강화 | Phase 5 | Area C | Done | 학생 역할/스코프/활성 기간/점수 정규화 검증 추가 | 게임별 제출 실패 UX 연결 보강 | `app/actions/tournament.ts` | 2026-02-28 |
| P5-2 대회 3회 제한 서버/DB 보강 | Phase 5 | Area C | In Progress | `attempts_used` 조건 업데이트 + retry로 동시성 충돌 완화, 롤백 처리 추가 | DB 원자 RPC/제약으로 최종 무결성 보강 (Area D 연계) | `app/actions/tournament.ts` | 2026-02-28 |
| P5-3 `GRADE` 대회 정책 정리 | Phase 5 | Area C | Done | `CLASS/GRADE` 스코프 해석과 `CLASS > GRADE` 조회 우선순위 반영 | 관리자 GRADE 대회 생성 UI 연결 | `app/actions/tournament.ts`, `app/student/game/page.tsx` | 2026-02-28 |
| P6-1 깨진 문자열(모지바케) 정리 | Phase 6 | Area D | Not Started |  |  |  | 2026-02-28 |
| P6-2 스키마 드리프트 정리 + 스키마 덤프 재생성 | Phase 6 | Area D | Not Started |  |  |  | 2026-02-28 |
| P6-3 음수 `play_time` 데이터 정제 + 가드 | Phase 6 | Area D | Not Started |  |  |  | 2026-02-28 |
| P7-1 AGENTS 체크리스트 회귀 검증 | Phase 7 | Area D | Not Started |  |  |  | 2026-02-28 |
| P7-2 롤백 플랜/feature flag 검증 | Phase 7 | Area D | Not Started |  |  |  | 2026-02-28 |
| P7-3 운영 모니터링 지표 점검 | Phase 7 | Area D | Not Started |  |  |  | 2026-02-28 |

## 5) Execution Log (작업 시 매번 추가)

| Date | Task ID | Area | Status | 작업결과 | 다음 작업 단계 | Evidence | Owner |
|---|---|---|---|---|---|---|---|
| 2026-02-28 | DOC-REFINE-01 | Area D | Done | 문서를 4개 영역 분리 기준으로 재구성 | 각 영역 에이전트 배정 후 P1-1부터 착수 | 본 문서 | Codex |
| 2026-02-28 | AREA-C-20260228-01 | Area C | In Progress | 상점 RPC 우선 구조 + 대회 검증/시도 제한 로직 강화 + CLASS/GRADE 우선순위 반영 | Area D의 `purchase_item_atomic`/대회 원자 RPC 마이그레이션 합류 후 fallback 정리 | `app/actions/store.ts`, `app/actions/tournament.ts`, `app/student/game/page.tsx`, `app/student/store/page.tsx` | Codex |
| 2026-02-28 | P1-1~P1-4 | Area A | Done | Runtime question path unified, student set-selection removed, pixel-runner start guard added | Resume with P2-3/P2-4 after Area D P2-2 | `app/actions/game-data.ts`, `app/student/game/*`, `components/games/*` | Codex |

