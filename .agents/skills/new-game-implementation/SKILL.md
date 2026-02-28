---
name: new-game-implementation
description: End-to-end ClassQuest new game integration workflow for frontend, backend, DB, question authoring, CSV import/export, and tournament wiring. Use when adding a new game, refactoring an existing game's integration, or validating launch readiness across student, teacher, and admin flows.
---

# New Game Implementation

Implement new ClassQuest games with a strict integration checklist so no required surface is skipped.

## Workflow
1. Read [integration-checklist.md](references/integration-checklist.md) before coding.
2. Define the canonical `gameId` and label policy first.
3. Implement DB/catalog updates (`games` row, migrations).
4. Implement student runtime route and game list card.
5. Implement teacher/admin question authoring mapping and CRUD compatibility.
6. Add CSV upload + example CSV download for the new game's question format.
7. Wire tournament/scoring/logging paths.
8. Run validation checks and report results with changed files.

## Implementation Rules
- Keep `games` table as the source of truth for game catalog.
- Keep teacher scope grade/class-limited; allow admin global scope.
- Keep question activation flow server-authoritative.
- Keep Pixel UI tone; avoid introducing an unrelated design system.
- Add migration files for schema or catalog changes; avoid ad-hoc production edits only.

## Required Validation Output
- List SQL/migration changes.
- List route/component/action updates.
- Show CSV contract columns and parser validation behavior.
- Confirm practice/tournament mode runtime checks.
- Confirm teacher and admin question authoring both work.