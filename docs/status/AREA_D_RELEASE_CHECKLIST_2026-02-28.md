# Area D Release Checklist (2026-02-28)

## 1) AGENTS 체크리스트 회귀 검증 (P7-1)

- [x] `supabase/migrations/*` 변경이 Area D 범위에 한정되었는지 확인
- [x] 상태 문서 UTF-8(무BOM) 재작성
- [x] `play_time` 정제/가드 SQL 추가 확인
- [x] 활성 세트 단일성 인덱스/원자 활성화 함수 확인
- [x] 원자 결제 RPC / 대회 시도 RPC 추가 확인
- [x] `npm run check:utf8` 통과
- [x] `npm run check:security` 통과
- [x] `npx tsc --noEmit` 통과
- [ ] Area A/B/C 통합 E2E 회귀 실행 (대기)

검증 커맨드:

```bash
npm run check:utf8
npm run check:security
npx tsc --noEmit
rg -n "activate_question_set_atomic|purchase_item_atomic|record_tournament_attempt_atomic|play_time_non_negative" supabase/migrations
```

## 2) 롤백 플랜 / Feature Flag 검증 (P7-2)

롤백 원칙:

1. 코드 롤백보다 먼저 DB 보호: 신규 함수 사용 중단 후 함수/인덱스/제약 제거.
2. 부분 롤백 금지: 활성화/결제/대회 기록 경로는 단일 진실 경로만 유지.

DB 롤백 SQL(필요 시):

```sql
DROP FUNCTION IF EXISTS public.activate_question_set_atomic(UUID, UUID);
DROP FUNCTION IF EXISTS public.purchase_item_atomic(UUID, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.record_tournament_attempt_atomic(UUID, INTEGER, INTEGER);

DROP INDEX IF EXISTS public.question_sets_active_class_singleton_idx;
DROP INDEX IF EXISTS public.question_sets_active_global_singleton_idx;

ALTER TABLE public.game_logs
DROP CONSTRAINT IF EXISTS game_logs_play_time_non_negative;

ALTER TABLE public.tournament_logs
DROP CONSTRAINT IF EXISTS tournament_logs_play_time_non_negative;

ALTER TABLE public.tournament_participants
DROP CONSTRAINT IF EXISTS tournament_participants_attempts_used_range;
```

앱 레벨 feature toggle:

1. `toggleQuestionSetAction`는 RPC 실패 시 기존 update fallback 경로를 유지.
2. `purchaseItem`은 RPC 실패 시 기존 fallback 경로를 유지.
3. `recordTournamentAttempt`는 RPC 미존재/실패 시 기존 서버 경로를 유지.

## 3) 배포 전 확인 순서

1. 마이그레이션 적용
2. 단일성 위반 검증 쿼리 실행
3. 음수 `play_time` 위반 쿼리 실행
4. teacher/admin/student 핵심 시나리오 수동 테스트
5. 모니터링 쿼리 대시보드 연결
