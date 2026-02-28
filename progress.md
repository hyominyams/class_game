Original prompt: 1. word defense는 게임 이름이 영단어 런닝이니까 db랑 코드상에서도 바뀌어야 하지않을까? 2. 게임 코드만 따로 폴더를 하나 만들어서 게임별로 리팩토링해. 3. 영단어런닝, 역사퀴즈탐험도 내가 만든 픽셀러너처럼 디자인이 들어간 재밌는 게임이면 좋겠어. 고도화해줘. 만약 이미지가 필요하다면 어떤 이미지가 필요한지 알려주면 내가 public 폴더에 넣어둘게.

## Progress Log

- 초기 분석 완료: 기존 플레이 가능한 게임은 `pixel-runner`, `word-defense`, `history-quiz`.
- 핵심 목표 확정:
  - `word-defense` 명칭을 코드/DB에서 `영단어 런닝`으로 통일.
  - 게임 코드 전용 폴더 신설 후 라우트에서 해당 폴더 컴포넌트를 사용하도록 리팩토링.
  - `word-defense`, `history-quiz` UI/UX를 픽셀 아케이드 감성으로 고도화.
- 게임 코드 전용 폴더 생성:
  - `components/games/pixel-runner/pixel-runner-game.tsx`
  - `components/games/word-defense/word-defense-game.tsx`
  - `components/games/history-quiz/history-quiz-game.tsx`
- 라우트 리팩토링:
  - `app/student/game/pixel-runner/page.tsx`는 게임 컴포넌트 래퍼로 변경
  - `word-defense`, `history-quiz` 페이지 import 경로를 `components/games/*`로 변경
- 게임 고도화:
  - `영단어 런닝`: 콤보/라운드/라이프/대시 진행 UI와 점수 배율 로직 추가
  - `역사 퀴즈 탐험`: 탐험형 HUD, 보스 라운드(5문제 단위), 유물/스트릭 시스템 추가
- 식별자 통일:
  - `components/game/game-list-client.tsx`에서 `english-run` 제거, `word-defense`로 단일화
  - 학생 대시보드 게임명 표기를 `영단어 런닝`으로 수정
- DB 반영:
  - `supabase/migrations/20260227103000_normalize_game_titles.sql` 추가
  - Supabase에 `normalize_game_titles` 마이그레이션 적용 완료 (성공)
  - `games` 테이블의 `word-defense/history-quiz/pixel-runner` 제목·설명 정상 반영 확인
- 호환성 정리:
  - `components/student/word-defense-game.tsx`, `components/student/history-quiz-game.tsx`는 새 경로 re-export로 유지
  - 깨진 중복 파일 `app/components/teacher/WordSetModal.tsx`는 안전한 re-export로 정리

## TODO

- 전체 타입 에러(기존 레거시 포함) 정리 필요:
  - `app/actions/tournament.ts`, `app/api/test-seed/route.ts`, `app/student/game/page.tsx` 등
- `components/game/game-list-client.tsx`는 아직 하드코딩 목록 기반이므로, `games` 테이블 단일진실 구조로 추가 정리 가능
- 필요 시 `word-defense`/`history-quiz` 전용 이미지 에셋(배경/캐릭터/아이콘) 도입으로 연출 확장 가능

## 2026-02-27 image integration fix
- Rebuilt components/games/word-defense/word-defense-game.tsx to remove mojibake and keep tournament/question-set runtime logic.
- Rebuilt components/games/history-quiz/history-quiz-game.tsx with clean strings and image hooks.
- Wired image assets: /bg-layer.png, /runner.png, /map-bg.png, /relic.png, /bosss-badge.png.
- Verification: npx eslint on both game files (pass), targeted tsc grep for both game files (no errors).
- TODO: consider renaming bosss-badge.png to boss-badge.png and updating path for consistency.

## 2026-02-27 word-chain runtime integration
- Added student runtime game component: components/games/word-chain/word-chain-game.tsx.
- Added route: app/student/game/word-chain/page.tsx with getQuestionSets('word-chain').
- Linked game list card + routing for word-chain in components/game/game-list-client.tsx.
- Runtime uses teacher question set data from word_chain_questions (prompt/answer/accepted_answers).
- Added tournament bootstrap + attempt recording + saveGameResult('word-chain').
- Scoring now tied to correct count (+100 per correct).
- Verified with eslint for changed files (pass).
## 2026-02-27 word learner defense completion
- Replaced `components/games/word-defense/word-defense-game.tsx` with a full canvas-based castle defense loop using newly added assets.
- Integrated assets: `bg-sky/bg-main`, `castle1/2/3`, `castle-barrier`, `enemy-zombie/bat/tank`, `boss`, `effect-correct/hit/kill`.
- Added gameplay systems: enemy spawn waves, boss spawn, typed-answer targeting, combo scoring, castle HP loss, shield charge/activation, and status feedback.
- Preserved platform integration: tournament bootstrap via `getTournamentQuestionSetSelection`, result save via `saveGameResult`, and tournament attempt logging.
- Exposed test hooks for web-game skill: `window.render_game_to_text` and `window.advanceTime(ms)` while in playing state.
- Verification:
  - `npm run lint -- components/games/word-defense/word-defense-game.tsx` passed.
  - Playwright client run blocked because `playwright` package is missing in environment (`ERR_MODULE_NOT_FOUND`).
- TODO:
  - Install Playwright and run the scripted gameplay loop for screenshot/state verification.
  - Replace residual English HUD labels if full Korean localization is required.
## 2026-02-27 word-defense tuning update
- Slowed enemy movement significantly for tablet learners:
  - Base speeds lowered (`zombie 46`, `bat 63`, `tank 34`, `boss 26`).
  - Wave speed scaling reduced (`+4%` per wave instead of `+8%`).
  - Spawn cadence eased (`max(0.72, 2.3 - elapsed*0.01)`).
- Increased visual effect footprint:
  - Global default effect size increased.
  - Hit/kill/shield/castle impact effect sizes enlarged for better readability.
- Added in-game sound effects via Web Audio API (no asset files required):
  - hit, kill, castle hit, shield activate, shield-ready, clear, fail.
- Added failure-side minimum coin reward for `word-defense` (Word Defense) in server logic:
  - Keeps daily cap logic intact.
  - Only applies on failed runs with meaningful participation.
- Renamed student-facing naming from Word Learner to `WORD DEFENSE`:
  - Game list card title, game intro title, dashboard activity label.
  - Added new student route alias: `/student/game/word-defense`.
- Reworked game list categorization:
  - Filters now: `ALL`, `MATH`, `ENGLISH`, `HISTORY`, `GENERAL`.
  - Placed implemented games into ENGLISH/HISTORY/GENERAL.
- Added migration: `20260228001000_rename_word_runner_to_word_defense.sql`.

### Verification
- Lint pass on directly changed gameplay/list/route files:
  - `components/games/word-defense/word-defense-game.tsx`
  - `components/game/game-list-client.tsx`
  - `app/student/game/word-defense/page.tsx`
  - `app/student/game/word-defense/page.tsx`
- Playwright scripted run attempted but blocked:
  - `ERR_MODULE_NOT_FOUND: playwright` from `web_game_playwright_client.js`.

### TODO
- Install `playwright` in environment and rerun the scripted gameplay capture loop.
- Optional follow-up: clean remaining mojibake strings in older legacy files outside this task scope.

## 2026-02-28 enemy bat mp4-as-gif integration
- Updated `components/games/word-defense/word-defense-game.tsx` so bat enemies render from `/enemy-bat.mp4` on canvas when the video is ready.
- Kept safe fallback behavior: if autoplay/decoding is blocked, rendering falls back to the existing `/enemy-bat.png`.
- Added hidden video lifecycle management:
  - preload + loop + muted + playsInline
  - auto-play attempt on `canplay`
  - second play attempt when the user starts the game
  - cleanup on unmount
- Fixed existing JSX lint issue in the same file by escaping quotation marks in intro copy.

### Verification
- `npm run lint -- components/games/word-defense/word-defense-game.tsx` passed.
- Playwright client execution attempted and blocked due missing dependency:
  - `ERR_MODULE_NOT_FOUND: playwright` from `web_game_playwright_client.js`.

## 2026-02-28 enemy video integration (bat + zombie)
- Updated `components/games/word-defense/word-defense-game.tsx` to use MP4 animation sources for both bat and zombie enemies:
  - `/enemy-bat.mp4`
  - `/enemy-zombie.mp4`
- Implemented shared enemy-video lifecycle:
  - preload + muted loop + inline playback
  - play retry on `startGame`
  - cleanup on unmount
- Rendering behavior:
  - bat/zombie draw from video when ready
  - fallback to existing PNG assets when video cannot autoplay/decode

### Verification
- `npm run lint -- components/games/word-defense/word-defense-game.tsx components/game/game-list-client.tsx` passed.

## 2026-02-28 gameplay background + naming cleanup
- Reverted the game-list dashboard background customization and restored default layout scope for `components/game/game-list-client.tsx`.
- Changed actual Word Defense gameplay background priority to `bg-main.png`:
  - Canvas runtime now draws `bgMain` first, then falls back to `bgSky`.
  - Word Defense menu hero image source updated from `/bg-sky.png` to `/bg-main.png`.
- Updated markdown documentation naming to `word defense` / `word-defense` wording where old `word runner` / `word-runner` remained.

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx components/game/game-list-client.tsx` passed.
- Playwright client run still blocked by missing dependency:
  - `ERR_MODULE_NOT_FOUND: playwright`.

## 2026-02-28 word-defense road removal
- Removed the intentionally drawn road layer from Word Defense gameplay canvas:
  - deleted ground strip fill and lane dash stroke loop in `drawScene`.
- Kept gameplay logic and entity paths unchanged; only visual road rendering was removed.

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.

## 2026-02-28 spritesheet pipeline (gif split) for word defense enemies
- Added automated GIF splitting script:
  - `scripts/gif-to-spritesheet.mjs`
  - Uses `gifuct-js` + `pngjs` to decode frames and write spritesheet PNG + metadata JSON.
- Generated assets in `public/sprites`:
  - `enemy-bat-sheet.png/json`
  - `enemy-zombie-sheet.png/json`
  - `enemy-tank-sheet.png/json`
  - `boss-sheet.png/json`
- Updated runtime in `components/games/word-runner/word-runner-game.tsx`:
  - loads spritesheet metadata/image for each enemy
  - computes frame index by elapsed time and draws spritesheet frames in canvas
  - keeps static PNG fallback if spritesheet or metadata load fails

### Verification
- `node scripts/gif-to-spritesheet.mjs` ran successfully for all 4 enemies.
- `npm run lint -- components/games/word-runner/word-runner-game.tsx scripts/gif-to-spritesheet.mjs` passed.

## 2026-02-28 word defense in-game localization + font tone update
- Localized visible in-game English strings in `components/games/word-runner/word-runner-game.tsx` to Korean:
  - status messages, wave/shield/boss notifications, loading text
  - result modal titles
  - HUD labels (`시간/체력/점수/콤보/보호막/웨이브`)
  - input placeholder + action button labels
  - progress summary labels
- Updated canvas text font stack from `Malgun Gothic` only to pixel-first stack:
  - `'Press Start 2P', 'DungGeunMo', 'Malgun Gothic', sans-serif`
- Applied pixel font classes to input/buttons/progress summary for stronger game-like UI tone.

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.

## 2026-02-28 root-cause and fix for static enemy gifs
- Root cause: browser-dependent behavior where `canvas.drawImage(gif)` does not reliably advance GIF frames (first-frame lock) in this environment.
- Replaced GIF playback dependency with explicit frame decoding:
  - implemented `ImageDecoder`-based GIF frame decode for enemy sprites (`zombie/bat/tank/boss`)
  - stores decoded frames (`ImageBitmap[]`) + per-frame durations
  - canvas render loop now chooses frame by elapsed time and draws it directly
- Fallback behavior:
  - if `ImageDecoder` is unavailable or a decode fails, existing image render path remains as fallback.

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.

## 2026-02-28 gif playback visibility workaround
- Verified GIF files are actually animated (multi-frame):
  - enemy-bat: 181 frames
  - enemy-zombie: 181 frames
  - enemy-tank: 180 frames
  - boss: 147 frames
- Adjusted hidden GIF playback strategy for canvas rendering:
  - replaced off-screen hidden images with a tiny on-screen host container (`2x2`, near-transparent)
  - keeps browser animation clock active in environments that throttle off-screen GIF animation

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.

## 2026-02-28 gif-first-frame fix for word defense enemies
- Addressed static-looking GIF issue in canvas rendering:
  - mounted enemy GIF sources as hidden DOM `<img>` elements so browser animation clocks advance
  - draw loop now prioritizes those DOM GIF elements for enemy sprite rendering
- Applied to all animated enemy keys:
  - `enemyZombie`, `enemyBat`, `enemyTank`, `boss`
- Kept existing preloaded image assets as fallback if hidden element is not ready.

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.

## 2026-02-28 enemy tank + boss gif integration
- Updated Word Defense enemy asset paths:
  - `enemyTank: "/enemy-tank.gif"`
  - `boss: "/boss.gif"`

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.

## 2026-02-28 enemy animation source switched to GIF
- Replaced Word Defense enemy animation source for bat/zombie from MP4 flow to GIF image assets.
  - `enemyBat: "/enemy-bat.gif"`
  - `enemyZombie: "/enemy-zombie.gif"`
- Removed now-unneeded MP4 video handling logic:
  - enemy video refs
  - video preload/playback effect
  - start-time playback retry
  - video draw branch in `drawEnemy`
- Kept existing PNG/shape fallback behavior if asset loading fails.

### Verification
- `npm run lint -- components/games/word-runner/word-runner-game.tsx` passed.
