# Question CSV Contract (Teacher/Admin)

## Purpose
All game question authoring UIs must support CSV upload and sample CSV download in both:
- `/teacher/questions`
- `/admin/questions`

This contract ensures new games can be onboarded with the same authoring flow.

## Common Rules
- Encoding: UTF-8 (BOM allowed).
- Header row is required.
- Empty rows are ignored.
- Missing required columns or invalid answer format must fail with a clear error.

## Current Game Contracts

### 1) `word defense` (`game_id=word-runner`)
- Required columns:
  - `korean`
  - `english`
- Row mapping:
  - `question_text <- korean`
  - `answer_text <- english`

### 2) `history quiz` (`game_id=history-quiz`)
- Required columns:
  - `type` (`multiple-choice` | `short-answer`)
  - `question_text`
  - `option_1`, `option_2`, `option_3`, `option_4`
  - `correct_answer`
  - `answer_text`
- Validation:
  - `multiple-choice`: `option_1~4` required, `correct_answer` required
  - `short-answer`: `answer_text` required

### 3) `word chain` (`game_id=word-chain`)
- Required columns:
  - `prompt`
  - `answer`
  - `accepted_answers`
- `accepted_answers` parsing:
  - `|` or `,` delimiter supported

## Implementation Location
- CSV parser/template source:
  - `components/teacher/question-csv-utils.ts`
- Modal integrations:
  - `components/teacher/word-set-modal.tsx`
  - `components/teacher/history-set-modal.tsx`
  - `components/teacher/word-chain-set-modal.tsx`

## New Game Extension Procedure
1. Define canonical `game_id` and question schema.
2. Add CSV template function (`download<NewGame>TemplateCsv`).
3. Add CSV parse function (`parse<NewGame>CsvFile`) with strict required-column validation.
4. Add upload/download UI controls to the new question modal.
5. Map `game_id` to storage type in `app/actions/game-data.ts`.
6. Ensure both teacher/admin question pages can open the modal and save sets.
7. Add migration if new table or game catalog row is needed.
8. Validate with teacher/admin create-edit-activate flows.
