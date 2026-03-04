---
name: classquest-new-game-playbook
description: End-to-end ClassQuest 신규 게임 추가 실행 스킬. Use when asked to add or refactor a game and wire DB catalog, student route/runtime questions, teacher/admin question authoring, CSV upload/download contract, AI question generation button flow, tournament/scoring/coin pipelines, and RBAC/RLS validation.
---

# ClassQuest New Game Playbook

Implement one game at a time with full platform integration.

## Workflow
1. Read [references/new-game-addition-playbook.md](references/new-game-addition-playbook.md).
2. Read [references/logic-coverage-matrix.md](references/logic-coverage-matrix.md).
3. Read [references/ai-question-generation-checks.md](references/ai-question-generation-checks.md).
4. Fix canonical contract first: `gameId`, route slug, display labels, category, question type, CSV contract.
5. Add DB migration for `games` upsert and schema if needed.
6. Wire student runtime:
- route page `app/student/game/<slug>/page.tsx`
- runtime data `getRuntimeQuestions(gameId)` with no-active-set block
- result actions `saveGameResult` and `recordTournamentAttempt`.
7. Wire teacher/admin authoring:
- `app/actions/game-data.ts` question type and CRUD mapping
- question modal routing in `components/teacher/question-set-manager.tsx`
- teacher/admin questions pages visibility.
8. Implement CSV parser/template and modal upload/download controls (frontend and backend mapping both).
9. Implement and verify AI question-generation path:
- panel integration in modal
- server action mapping and validation
- teacher/admin-only access and env configuration handling.
10. Wire labels across dashboard/tournament/game-list hardcoded maps.
11. Run domain coverage audit for `db`, `score`, `coin`, `ranking`, `tournament`, `csv(front+back)`, `ai-question-gen` and summarize evidence.

## Non-Negotiable Rules
- Keep `games` table as catalog source of truth. If UI has fallback hardcoding, update both DB and fallback paths.
- Keep question activation server-authoritative via `toggleQuestionSetAction` -> `activate_question_set_atomic`.
- Keep runtime set priority `CLASS > GLOBAL`; never add student set-selection UX.
- Keep RBAC and scope checks on server actions; never rely on client-only checks.
- Keep coin and settlement replayable from logs (`game_logs`, `coin_transactions`, tournament tables).
- Keep coin balance and ledger consistency (`profiles.coin_balance` cache + `coin_transactions` ledger + RPC path).
- Keep ranking eligibility intact (`GAME_REWARD:<gameId>` reason, tournament best-score aggregation, weekly/monthly filters).
- Keep AI generation server-only (`app/actions/question-ai.ts`) and role-limited (`teacher`, `admin`).
- Keep AI output schema-aligned with modal and DB payload; do not bypass existing create/update save path.

## Required Output
- List migration files and affected tables/functions.
- List updated routes/components/actions.
- Show CSV columns and parser validation behavior for the new game.
- Show AI generation behavior (limits/topic mode/auth/env/errors) and mapping to saved payload.
- Confirm practice and tournament runtime checks, including 3-attempt limit.
- Confirm score -> coin -> ranking pipeline behavior with regression checks.
- Confirm teacher and admin create/edit/activate flows.
- Provide a coverage matrix (Pass/Fail) for `db`, `score`, `coin`, `ranking`, `tournament`, `csv(front+back)`, `ai-question-gen`.
- Report executed checks and outcomes.

## Validation Commands
```bash
npm run check:utf8
npm run check:security
npx tsc --noEmit
```

## Reference
- Detailed project checklist: [new-game-addition-playbook.md](references/new-game-addition-playbook.md)
- Logic coverage matrix: [logic-coverage-matrix.md](references/logic-coverage-matrix.md)
- AI generation checks: [ai-question-generation-checks.md](references/ai-question-generation-checks.md)
