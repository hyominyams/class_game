# STATUS 2026-02-28 Vibe Coding Fix Scope

## 목적
- 지금 코드베이스에서 바로 구현 가능한 수준으로만 수정 범위를 정리한다.
- 우선순위는 운영 안정성(저장/코인/점수/권한) 기준으로 둔다.

## 핵심 RPC 3개 설명
1. `purchase_item_atomic`
- 학생 상점 구매를 DB 트랜잭션으로 한 번에 처리하는 함수.
- 처리 묶음: 잔액 확인 -> 잔액 차감 -> `coin_transactions` 기록 -> `student_items` 지급.
- 의미: 부분 성공(차감만 되고 아이템 미지급) 방지.

2. `record_tournament_attempt_atomic`
- 대회 시도 기록을 DB에서 원자적으로 처리하는 함수.
- 처리 묶음: 시도 횟수 증가(최대 3회) -> 최고 점수 갱신 -> `tournament_logs` 기록.
- 의미: 동시 제출 시 횟수 초과/점수 꼬임 방지.

3. `activate_question_set_atomic`
- 문제세트 활성화(적용) 단일 진입점 함수.
- 처리 묶음: 같은 스코프 세트 비활성화 -> 대상 세트 활성화 + 권한/스코프 검증.
- 의미: `CLASS > GLOBAL` 정책과 단일 활성 제약을 일관되게 강제.

## 왜 지금 필요한가
- 코드에서는 위 RPC를 우선 경로로 호출하지만, 운영 DB에는 아직 없음.
- 결과적으로 비원자 fallback 경로로 동작 중이며, 저장/정산/권한 리스크가 커진 상태.

## 바이브코딩 범위 작업 목록

### P0. 누락 마이그레이션 적용
- 대상:
  - `supabase/migrations/20260228150000_activate_question_set_atomic.sql`
  - `supabase/migrations/20260228151000_data_hygiene_play_time_and_text_cleanup.sql`
  - `supabase/migrations/20260228152000_add_atomic_purchase_and_tournament_attempt_rpc.sql`
  - `supabase/migrations/20260228153000_harden_rbac_rls_policies.sql`
- 완료 기준:
  - 위 3개 RPC가 DB 함수 목록에 존재.
  - `question_sets` 활성 단일성 인덱스 존재.
  - RLS 정책이 강화 버전으로 교체.

### P0. 스키마/정책 스모크 검증
- 함수 존재 확인:
  - `purchase_item_atomic`
  - `record_tournament_attempt_atomic`
  - `activate_question_set_atomic`
- 정책 확인 테이블:
  - `profiles`, `game_logs`, `coin_transactions`, `tournaments`, `tournament_participants`, `tournament_logs`
- 완료 기준:
  - `SELECT true`/`WITH CHECK true` 형태의 과도한 정책이 제거됨.

### P1. 데이터 위생 보정
- 현재 발견 데이터:
  - `game_logs.play_time < 0` 레코드 존재.
  - 일부 사용자 `profiles.coin_balance` vs 원장 합계 불일치.
- 조치:
  - 음수 play_time 0으로 보정.
  - 원장 합계 기준으로 `coin_balance` 재동기화.
- 완료 기준:
  - 음수 `play_time` 0건.
  - `coin_balance - ledger_sum` 불일치 0건.

### P1. 동작 검증 (수동 테스트)
- 상점:
  - 정상 구매 1회: 잔액 감소, 거래 로그 1건, 아이템 +1.
  - 잔액 부족: 변경 없음.
- 대회:
  - 1~3회 제출 성공, 4회 제출 실패.
  - 최고 점수만 반영.
- 문제세트:
  - CLASS 세트 활성 시 학생 런타임 즉시 반영.
  - CLASS 없으면 GLOBAL 반영.

## 이번 범위에서 제외
- 대규모 구조개편(전체 액션을 전면 RPC화 등).
- UI 리디자인.
- 통계 파이프라인 재설계.

## 실행 순서 제안
1. 마이그레이션 4개 적용
2. 함수/정책 스모크 검증
3. 데이터 위생 보정
4. 상점/대회/문제세트 수동 검증

## Work Log (AI Handoff)
- 2026-02-28 Step 1: Applied migration `v20260228150000_activate_question_set_atomic` to Supabase via MCP.
- Result: success.
- Impact: added `activate_question_set_atomic` RPC and active-set singleton indexes for `question_sets` scope control.
- 2026-02-28 Step 2: Applied migration `v20260228151000_data_hygiene_play_time_and_text_cleanup`.
- Result: success.
- Impact: normalized game descriptions, backfilled negative `play_time` to 0, and added non-negative check constraints for `game_logs`/`tournament_logs`.
- 2026-02-28 Step 3: Applied migration `v20260228152000_add_atomic_purchase_and_tournament_attempt_rpc`.
- Result: success.
- Impact: added `purchase_item_atomic` and `record_tournament_attempt_atomic` RPCs, and hardened tournament participant constraints for attempts/best_score.
- 2026-02-28 Step 4: Applied migration `v20260228153000_harden_rbac_rls_core_tables`.
- Result: success.
- Impact: replaced permissive policies with scope-aware RBAC policies on core tables (`profiles`, `question_sets`, `questions`, `game_logs`, `coin_transactions`, `student_items`, `tournaments`, `tournament_participants`, `tournament_logs`).
- Note: specialized question tables (`word_chain_questions`, `short_answer_questions`, `ox_questions`, `matching_questions`) are not re-hardened in this reduced migration and remain follow-up scope.

## Execution Record (2026-02-28)

### Remote DB migrations applied in this session
- 20260228122859 `v20260228150000_activate_question_set_atomic`
- 20260228122925 `v20260228151000_data_hygiene_play_time_and_text_cleanup`
- 20260228123007 `v20260228152000_add_atomic_purchase_and_tournament_attempt_rpc`
- 20260228123139 `v20260228153000_harden_rbac_rls_core_tables`
- 20260228123223 `v20260228154000_reconcile_coin_balance_cache`
- 20260228123324 `v20260228154500_fix_activate_question_set_atomic_ambiguity`

### Verification summary
- RPC/function existence check: PASS
  - `activate_question_set_atomic`
  - `purchase_item_atomic`
  - `record_tournament_attempt_atomic`
  - `increment_coin_balance`
  - `current_actor_role/current_actor_grade/current_actor_class/can_access_user`
- `question_sets` active singleton indexes: PASS
  - `question_sets_active_class_singleton_idx`
  - `question_sets_active_global_singleton_idx`
- constraints: PASS
  - `game_logs_play_time_non_negative`
  - `tournament_logs_play_time_non_negative`
  - `tournament_participants_attempts_used_range`
  - `tournament_participants_best_score_non_negative`
- data hygiene checks: PASS
  - negative `game_logs.play_time`: 0
  - negative `tournament_logs.play_time`: 0
  - invalid tournament attempts (`<0` or `>3`): 0
  - game reward daily limit overflow (`>90`): 0
  - `coin_balance` vs ledger mismatch rows: 0

### Smoke checks performed
- `purchase_item_atomic` invalid item -> `INVALID_ITEM` (expected)
- `purchase_item_atomic` insufficient balance -> `INSUFFICIENT_BALANCE` (expected)
- `record_tournament_attempt_atomic` without auth context -> `AUTH_REQUIRED` (expected)
- `activate_question_set_atomic` execution -> PASS after hotfix

### Bug found and fixed during rollout
- Issue: `activate_question_set_atomic` raised `column reference "game_id" is ambiguous`.
- Root cause: unqualified `game_id` in function body conflicted with `RETURNS TABLE` output column variable.
- Fix:
  - Remote DB hotfix migration applied: `v20260228154500_fix_activate_question_set_atomic_ambiguity`
  - Local SQL updated to prevent regression:
    - `supabase/migrations/20260228150000_activate_question_set_atomic.sql` (alias-qualified UPDATE predicates)
    - `supabase/migrations/20260228154500_fix_activate_question_set_atomic_ambiguity.sql` added

### Remaining scope (important for next AI)
- Specialized question tables still use legacy permissive policies and should be re-hardened:
  - `word_chain_questions`
  - `short_answer_questions`
  - `ox_questions`
  - `matching_questions`
- `increment_coin_balance` still has advisor warning (`search_path` mutable). Recommend replacing with `SET search_path = public` function definition.
- Local migration history and remote migration versions are now mixed (existing timestamp-based files + MCP-applied `v...` names). If CLI linking is introduced later, run migration history reconciliation before `db push`.

### Suggested immediate next actions
1. Apply full RLS hardening for specialized question tables (scope-aware policies by `question_sets`).
2. Harden `increment_coin_balance` function definition (`SECURITY DEFINER` + fixed `search_path`).
3. Add simple automated DB smoke script for 3 RPC contracts and include in release checklist.

## Continuation Record (2026-02-28, Follow-up)

### What was done
- Applied DB migration: `v20260228155000_harden_specialized_question_rls`
  - Replaced legacy permissive policies on specialized question tables:
    - `word_chain_questions`
    - `short_answer_questions`
    - `ox_questions`
    - `matching_questions`
  - New policy shape: `*_select_by_set_scope`, `*_write_by_set_scope` (scope derived from `question_sets`).

- Applied DB migration: `v20260228155500_harden_increment_coin_balance_function`
  - Added fixed `search_path` to `increment_coin_balance` (`SET search_path = public`).
  - Tightened EXECUTE grants to `service_role` only.
  - Added argument guards (`USER_ID_REQUIRED`, `AMOUNT_REQUIRED`, `PROFILE_NOT_FOUND`).

### Verification snapshot
- Migration list includes new entries:
  - `v20260228155000_harden_specialized_question_rls`
  - `v20260228155500_harden_increment_coin_balance_function`
- `increment_coin_balance` ACL now:
  - `{postgres=X/postgres,service_role=X/postgres}`
  - `anon/authenticated` execute removed.
- Specialized table policies now only scope-aware pairs:
  - `*_select_by_set_scope`
  - `*_write_by_set_scope`
- Security advisor now:
  - `function_search_path_mutable` for `increment_coin_balance`: cleared.
  - Remaining security warning is only Auth setting: `Leaked password protection disabled`.

### Local files added for reproducibility
- `supabase/migrations/20260228154000_reconcile_coin_balance_cache.sql`
- `supabase/migrations/20260228155000_harden_specialized_question_rls.sql`
- `supabase/migrations/20260228155500_harden_increment_coin_balance_function.sql`

### Notes for next AI
- Performance advisor still reports multiple RLS optimization warnings (`auth_rls_initplan`, `multiple_permissive_policies`) due policy complexity and `FOR ALL` patterns. Functional security is improved, but performance tuning can be a separate pass.
- Auth console setting `Leaked password protection` should be enabled manually in Supabase dashboard.
