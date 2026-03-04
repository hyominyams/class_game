# AI Question Generation Checks (Teacher/Admin)

## 1. Scope
Use this checklist when the new game must support the `AI자동생성` button in question authoring.

Current AI generation path:
- Server action: `app/actions/question-ai.ts`
- Shared config: `lib/questions/ai-config.ts`
- Panel UI: `components/teacher/ai-question-generate-panel.tsx`
- Modal integrations:
  - `components/teacher/word-set-modal.tsx`
  - `components/teacher/history-set-modal.tsx`
  - `components/teacher/word-chain-set-modal.tsx`

## 2. Required Decisions
- Decide AI support policy for the new game:
  - `support`: add AI panel + server schema branch
  - `not support`: explicitly hide/disable AI panel and document reason
- Define AI output schema that exactly matches modal local state and save payload.
- Define per-game max question count and default topic policy.

## 3. Backend Checks (`app/actions/question-ai.ts`)

### A. Auth/Security
- `requireActor(["teacher", "admin"])` is enforced.
- Student access returns 403-style failure path.
- No client-side direct model call path exists.

### B. Input Validation
- `gameId` required.
- Difficulty counts are non-negative integers.
- Total count must be `> 0`.
- Total count must be `<= getQuestionLimitForGame(gameId)`.
- `topicMode=general` requires non-empty `topic`.

### C. Model Call Safety
- `OPENAI_API_KEY` missing case returns clear error.
- `OPENAI_MODEL` override is optional with sane default.
- Response must be strict JSON parseable payload.
- API error response message is surfaced safely.

### D. Output Validation
- Requested count equals generated count.
- Difficulty distribution exactly matches requested counts.
- Duplicate questions are rejected.
- Game-specific schema constraints are enforced before returning success.

## 4. Game Mapping Checks (`lib/questions/ai-config.ts`)
- Update `is*Game` helpers when new game has special behavior.
- Update `getQuestionLimitForGame(gameId)` if game has custom cap.
- Update `getDefaultTopicForGame(gameId)` for correct default topic.
- Ensure route aliases (if any) map consistently (e.g. `word-defense` vs `word-runner`).

## 5. Frontend Modal Checks

### A. Panel Injection
- Modal imports and renders `AiQuestionGeneratePanel`.
- Modal keeps `aiLoading` state.
- Submit/save button is disabled while AI generation is running.

### B. Generate Handler
- Calls `generateQuestionsWithAI({ gameId, difficultyCounts, topicMode, topic })`.
- Converts AI rows into modal state shape.
- Rejects invalid/empty generated rows with clear user message.
- Keeps existing manual input and CSV flow intact.

### C. Save Path Consistency
- AI-generated rows must still save via existing:
  - `createQuestionSet(...)`
  - `updateQuestionSet(...)`
- AI flow must not introduce direct DB insert bypassing current authoring path.

## 6. Regression Matrix

| Case | Expected |
|---|---|
| Teacher generate success | Questions appear in modal and can be saved |
| Admin generate success | Same as teacher |
| Student invocation | Blocked by server auth |
| `OPENAI_API_KEY` missing | Clear actionable error |
| Count exceeds max | Blocked before request/at server validation |
| `topicMode=general` + empty topic | Validation error |
| AI returns malformed rows | Rejected, no bad rows saved |
| CSV import after AI generate | Works without state corruption |
| Manual edits after AI generate | Works and saves correctly |

## 7. Completion Evidence (Required)
- Changed files list for AI button path.
- One success capture per role (`teacher`, `admin`) for AI generation + save.
- One failure capture for each guardrail:
  - missing key / invalid count / invalid topic / malformed response.
