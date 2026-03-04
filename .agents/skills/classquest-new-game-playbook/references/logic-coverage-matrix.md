# Logic Coverage Matrix (ClassQuest New Game)

## 1. 사용 목적
신규 게임 추가 시 기능 구현이 끝났더라도, 아래 6개 도메인을 반드시 교차 점검한다.

- `db`
- `score`
- `coin`
- `ranking`
- `tournament`
- `csv(front+back)`
- `ai-question-gen`

## 2. 도메인별 필수 점검

### A. `db`
- 필수 파일:
  - `supabase/migrations/*`
  - `types/supabase.ts`
- 체크:
  - `public.games`에 신규 `gameId` row가 존재하는가
  - 신규 질문 스키마가 있으면 FK/인덱스/RLS가 함께 반영됐는가
  - 기존 RPC/제약(`activate_question_set_atomic`, tournament 3회 제한 등)을 깨지 않았는가

### B. `score`
- 필수 파일:
  - `components/games/<new-game>/<new-game>-game.tsx`
  - `app/actions/game.ts`
- 체크:
  - 게임 종료 시 `saveGameResult(gameId, score, playTime, metadata)` 호출
  - `metadata` 구조가 점수/보상/디버깅에 충분한가
  - `play_time`/`score`는 음수 방지 및 정규화가 되는가

### C. `coin`
- 필수 파일:
  - `app/actions/game.ts`
  - `app/actions/store.ts`
  - `app/actions/teacher-v2.ts`
  - `app/constants/economy.ts`
- 체크:
  - 게임 보상 reason이 `GAME_REWARD:<gameId>` 형태로 기록되는가
  - 보상 로그(`coin_transactions`)와 잔액 캐시(`profiles.coin_balance`)가 일관적인가
  - 상점 구매 RPC(`purchase_item_atomic`) 경로가 회귀 없이 동작하는가

### D. `ranking`
- 필수 파일:
  - `app/actions/ranking.ts`
  - `app/student/ranking/page.tsx`
  - `app/constants/economy.ts`
- 체크:
  - `getAvailableGamesAction()`에서 신규 게임이 노출되는가 (`games` 테이블 row 필요)
  - 게임별 랭킹이 `game_logs` 최고점 기준으로 집계되는가
  - 주/월간 랭킹이 `isRankingEligibleReason` 기준으로 정상 반영되는가

### E. `tournament`
- 필수 파일:
  - `app/actions/tournament.ts`
  - `components/teacher/create-tournament-modal.tsx`
  - `components/teacher/tournament-list-client.tsx`
  - `app/student/game/page.tsx`
- 체크:
  - tournament 문제셋 선택은 `getTournamentQuestionSetSelection`으로 검증되는가
  - 시도 기록은 `record_tournament_attempt_atomic` 경로를 타는가
  - 3회 제한/최고점 반영/범위 검증(CLASS/GRADE)이 서버에서 강제되는가

### F. `csv(front+back)`
- 필수 파일:
  - Front: `components/teacher/question-csv-utils.ts`, `components/teacher/<new-game>-set-modal.tsx`
  - Back: `app/actions/game-data.ts`
  - Doc: `docs/question-csv-contract.md`
- 체크:
  - CSV 업로드 + 예시 CSV 다운로드 UI가 teacher/admin 모두 동작하는가
  - 필수 컬럼 누락/형식 오류에서 명확한 에러를 반환하는가
  - CSV 파싱 결과와 DB 저장 매핑이 1:1로 일치하는가

### G. `ai-question-gen`
- 필수 파일:
  - `app/actions/question-ai.ts`
  - `lib/questions/ai-config.ts`
  - `components/teacher/ai-question-generate-panel.tsx`
  - `components/teacher/<new-game>-set-modal.tsx`
- 체크:
  - AI 호출은 서버 액션에서만 수행되는가 (`OPENAI_API_KEY`, `OPENAI_MODEL`)
  - 권한 제한(`teacher`, `admin`)이 적용되는가
  - 난이도별 문항 수/중복/스키마 검증이 서버에서 강제되는가
  - AI 생성 결과가 기존 저장 경로(`createQuestionSet`/`updateQuestionSet`)를 통해 저장되는가
  - CSV/수동 입력과 충돌 없이 함께 동작하는가

## 3. 증적(필수 출력 형식)
최종 보고 시 아래 표를 반드시 채운다.

| Domain | Status(PASS/FAIL) | Evidence (파일/쿼리/명령) | Notes |
|---|---|---|---|
| db |  |  |  |
| score |  |  |  |
| coin |  |  |  |
| ranking |  |  |  |
| tournament |  |  |  |
| csv(front+back) |  |  |  |
| ai-question-gen |  |  |  |

## 4. 권장 SQL 스모크
```sql
select id, title from public.games where id = '<new-game-id>';

select id, game_id, score, play_time
from public.game_logs
where game_id = '<new-game-id>'
order by created_at desc
limit 20;

select reason, amount, created_at
from public.coin_transactions
where reason like 'GAME_REWARD:<new-game-id>%'
order by created_at desc
limit 20;

select p.id as user_id, p.coin_balance, coalesce(sum(t.amount), 0) as ledger_sum
from public.profiles p
left join public.coin_transactions t on t.user_id = p.id
group by p.id, p.coin_balance
limit 50;
```
