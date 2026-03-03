---
name: classquest-new-game-playbook
description: End-to-end ClassQuest 신규 게임 추가 실행 스킬. Use when asked to add or refactor a game and wire DB catalog, student route/runtime questions, teacher/admin question authoring, CSV upload/download contract, tournament/scoring/coin pipelines, and RBAC/RLS validation.
---

# ClassQuest New Game Playbook

Implement one game at a time with full platform integration.

## Workflow
1. Read [references/new-game-addition-playbook.md](references/new-game-addition-playbook.md).
2. Fix canonical contract first: `gameId`, route slug, display labels, category, question type, CSV contract.
3. Add DB migration for `games` upsert and schema if needed.
4. Wire student runtime:
- route page `app/student/game/<slug>/page.tsx`
- runtime data `getRuntimeQuestions(gameId)` with no-active-set block
- result actions `saveGameResult` and `recordTournamentAttempt`.
5. Wire teacher/admin authoring:
- `app/actions/game-data.ts` question type and CRUD mapping
- question modal routing in `components/teacher/question-set-manager.tsx`
- teacher/admin questions pages visibility.
6. Implement CSV parser/template and modal upload/download controls.
7. Wire labels across dashboard/tournament/game-list hardcoded maps.
8. Run validation and summarize changed files with test evidence.

## Non-Negotiable Rules
- Keep `games` table as catalog source of truth. If UI has fallback hardcoding, update both DB and fallback paths.
- Keep question activation server-authoritative via `toggleQuestionSetAction` -> `activate_question_set_atomic`.
- Keep runtime set priority `CLASS > GLOBAL`; never add student set-selection UX.
- Keep RBAC and scope checks on server actions; never rely on client-only checks.
- Keep coin and settlement replayable from logs (`game_logs`, `coin_transactions`, tournament tables).

## Required Output
- List migration files and affected tables/functions.
- List updated routes/components/actions.
- Show CSV columns and parser validation behavior for the new game.
- Confirm practice and tournament runtime checks, including 3-attempt limit.
- Confirm teacher and admin create/edit/activate flows.
- Report executed checks and outcomes.

## Validation Commands
```bash
npm run check:utf8
npm run check:security
npx tsc --noEmit
```

## Reference
- Detailed project checklist: [new-game-addition-playbook.md](references/new-game-addition-playbook.md)
