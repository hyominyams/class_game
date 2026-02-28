# New Game Integration Checklist (ClassQuest)

## 1) DB and Catalog
- Add or upsert a row in `public.games` with `id`, `title`, `description`.
- Keep `id` stable; routes and tournament/question mapping depend on it.
- Verify row exists in DB (`select id,title from games`).

## 2) Student Runtime
- Add student game route page under `app/student/game/<game-slug>/page.tsx`.
- Ensure route loads questions via `getQuestionSets(gameId)` and passes them into the game component.
- Add game card in `components/game/game-list-client.tsx` with category/icon/description.
- Confirm path mapping in mode selection (`practice` and `tournament` query behavior).

## 3) Teacher/Admin Question Authoring
- Add game option to teacher/admin question authoring list (DB-driven preferred, fallback must include game).
- Map `gameId` to question storage type in `app/actions/game-data.ts`.
- If new question schema is needed, add table + RLS migration and wire CRUD helpers.
- Ensure both `/teacher/questions` and `/admin/questions` can create/edit/activate/delete sets.

## 4) CSV Contract (Required)
- Every game question UI must support:
  - CSV upload import
  - Example CSV download
- Define required columns and validation rules.
- Implement parser + template in `components/teacher/question-csv-utils.ts` or a dedicated parser module.
- Reject rows with missing required columns or invalid answer format.

## 5) Tournament Integration
- Include game in tournament labels/order where applicable.
- Ensure tournament mode fetches tournament question set and enforces attempt rules on server.
- Verify results are saved to `tournament_logs` and reflected in rankings.

## 6) Scoring and Logs
- Save normal mode results through existing result action (`saveGameResult`).
- Include metadata needed for analytics/debugging.
- Validate that score/coin pipeline works with current ranking eligibility rules.

## 7) Permissions and Safety
- Do not rely on client-only restrictions.
- Keep server-side role checks for teacher/admin actions.
- Teacher scope must remain grade/class-limited; admin can be global.

## 8) Naming and UX Consistency
- Use canonical game name consistently across DB, teacher/admin UI, and docs.
- If product requires a different student-facing label, document that exception explicitly.
- Keep existing Pixel UI tone.

## 9) Test Pass Criteria
- Student can start practice mode and finish one run.
- Tournament mode starts when active tournament exists and attempts decrement correctly.
- Teacher creates CSV question set and sees it in list.
- Admin creates CSV question set and can activate it.
- Runtime loads active class set first; fallback behavior remains intact.

## 10) Completion Artifacts
- Migration file for schema/catalog changes.
- Updated route/component/action mappings.
- Updated CSV template/parser docs.
- Optional: handoff/progress note listing changed files and validation commands.