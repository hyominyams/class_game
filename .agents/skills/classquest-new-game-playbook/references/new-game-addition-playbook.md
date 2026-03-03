# ClassQuest 신규 게임 추가 플레이북

## 0. 문서 목적
- 이 문서는 ClassQuest에 게임 1종을 추가할 때 필요한 작업을 누락 없이 수행하기 위한 통합 체크리스트다.
- 기준 우선순위:
  1. `PRD.md`
  2. `Agents.md`
  3. 본 문서

## 1. 먼저 결정해야 하는 것(기획/정책)
신규 게임 개발 전에 아래 항목을 먼저 확정한다.

| 항목 | 예시 | 비고 |
|---|---|---|
| Canonical `gameId` | `typing-defense` | DB/로그/대회/질문세트 전부 이 값으로 연결 |
| 학생용 라우트 | `/student/game/typing-defense` | URL slug와 `gameId` 분리 가능하나, 매핑 문서화 필수 |
| 학생 노출 이름 | `타이핑 디펜스` | 라벨 하드코딩 지점이 많아 동시 반영 필요 |
| 카테고리 | `ENGLISH` | 게임 목록 필터/카드 표시용 |
| 문제 타입 | `multiple_choice` / `flexible_answer` / 신규 | `app/actions/game-data.ts` 매핑 필수 |
| CSV 계약 | 컬럼/검증 규칙 | `docs/question-csv-contract.md` 갱신 필수 |
| 점수/보상 규칙 | 점수 계산, `metadata` 필드 | `saveGameResult` 연동 계약 정의 |
| 대회 지원 여부 | practice+tournament 지원 여부 | 대회 지원 시 3회 제한/최고점 집계 준수 |

추가 원칙:
- 문제세트 반영 단일 진실은 교사의 `적용(활성)` 버튼이다.
- 학생은 문제세트를 선택하지 않는다.
- 활성 세트 조회 우선순위는 `CLASS > GLOBAL`이다.

## 2. 작업 Phase(필수)

### Phase A. DB 카탈로그/스키마
1. `games` 카탈로그 등록
- 파일: `supabase/migrations/*_upsert_<game>.sql`
- 작업:
  - `public.games`에 `id/title/description/(thumbnail_url)` upsert
  - `id`는 변경 금지(영구 식별자)

2. 문제 저장소 결정
- 기존 `questions`로 충분하면 테이블 추가 없이 진행
- 신규 구조 필요 시:
  - 새 테이블 migration 추가
  - FK(`set_id -> question_sets.id`)와 인덱스 추가
  - RLS 정책까지 같이 반영

3. 타입 동기화
- 파일: `types/supabase.ts` (필요 시 재생성)
- 작업:
  - 신규 테이블/컬럼이 런타임 타입에 반영되었는지 확인

### Phase B. 학생 게임 런타임
1. 게임 컴포넌트 구현
- 파일: `components/games/<game-slug>/<game>-game.tsx`
- 작업:
  - practice 결과 저장: `saveGameResult(gameId, score, playTime, metadata)`
  - tournament 결과 저장: `recordTournamentAttempt(tournamentId, score)`
  - tournament 문제셋 부트스트랩: `getTournamentQuestionSetSelection(tournamentId, gameId)`

2. 학생 라우트 페이지 추가
- 파일: `app/student/game/<game-slug>/page.tsx`
- 작업:
  - `getRuntimeQuestions(gameId)` 호출 후 게임 컴포넌트에 전달
  - 활성 세트 없음(`setId=null`) 처리 UI(시작 차단/안내) 구현

3. 게임 목록 노출
- 파일: `components/game/game-list-client.tsx`
- 작업:
  - 카드 데이터(`id/title/category/description/icon/color`) 추가
  - 라우트 매핑(`onSelectMode`) 추가
  - 대회 모드 쿼리(`?mode=tournament&tournamentId=...`) 연결 확인

주의:
- 현재 학생 게임 목록은 DB 완전 동적이 아니라 하드코딩 목록이 섞여 있다.
- 신규 게임 추가 시 카드/라우트 분기 누락이 가장 자주 발생한다.

### Phase C. 교사/관리자 문제 출제 연동
1. 문제 타입 매핑
- 파일: `app/actions/game-data.ts`
- 작업:
  - `GAME_QUESTION_TYPES[gameId]` 추가
  - `insertQuestions/deleteQuestionsByType/getQuestions` 분기 추가
  - `getRuntimeQuestions(gameId)` 흐름에서 신규 타입 정상 조회 확인

2. 문제 모달 연결
- 파일:
  - `components/teacher/question-set-manager.tsx`
  - `components/teacher/<new-game>-set-modal.tsx` (신규)
- 작업:
  - `selectedGameId` 분기로 신규 모달 연결
  - 생성/수정 공통 경로(`createQuestionSet`, `updateQuestionSet`) 사용

3. 교사/관리자 페이지 노출 확인
- 파일:
  - `app/teacher/questions/page.tsx`
  - `app/admin/questions/page.tsx`
- 작업:
  - `games` 테이블 기반 목록에 신규 게임이 보이는지 확인
  - fallback 목록 하드코딩이 있으면 신규 게임도 반영

4. 적용(활성) 경로 유지
- 파일: `app/actions/teacher-v2.ts`
- 작업:
  - 반드시 `toggleQuestionSetAction -> activate_question_set_atomic` 경로 사용
  - 학생이 바로 반영되는지 수동 테스트

### Phase D. CSV 계약(필수)
1. CSV 파서/템플릿 추가
- 파일: `components/teacher/question-csv-utils.ts`
- 작업:
  - `download<NewGame>TemplateCsv`
  - `parse<NewGame>CsvFile`
  - 필수 컬럼 누락/포맷 오류 시 명확한 에러 메시지 반환

2. 모달 업로드 UI 연결
- 파일: `components/teacher/<new-game>-set-modal.tsx`
- 작업:
  - `CSV 업로드` + `예시 CSV 다운로드` 버튼 필수
  - 입력 폼과 CSV import 결과 데이터 구조 일치

3. 계약 문서 갱신
- 파일: `docs/question-csv-contract.md`
- 작업:
  - 컬럼, 타입, 검증 규칙, 예시를 신규 게임 항목으로 추가

### Phase E. 점수/코인/집계 연동
1. 게임 결과 저장 계약 정의
- 파일: `app/actions/game.ts` + 신규 게임 컴포넌트
- 작업:
  - `metadata` 스키마 정의(예: `correctCount`, `didClear`, `combo`, `accuracy`)
  - 필요 시 게임별 최소 보상 로직 추가

2. 랭킹/정산 반영 확인
- 파일:
  - `app/actions/ranking.ts`
  - `app/actions/weekly-settlement.ts`
- 작업:
  - `GAME_REWARD:<gameId>` reason이 기존 랭킹 집계에 포함되는지 확인
  - 별도 집계 규칙이 필요하면 액션 레벨에서 명시 추가

3. 대회 생성/목록 라벨 반영
- 파일:
  - `components/teacher/create-tournament-modal.tsx`
  - `components/teacher/tournament-list-client.tsx`
  - `app/teacher/dashboard/page.tsx` (`GAME_LABELS`)
  - `app/student/dashboard/page.tsx` (`GAME_LABELS`)
- 작업:
  - 신규 `gameId` 라벨 추가
  - 대회 UI에서 게임명이 `id`로 노출되지 않도록 확인

4. 배지/통계 조건 점검(선택이지만 권장)
- 파일: `app/actions/stats.ts`
- 작업:
  - 신규 게임 관련 배지 조건이 필요하면 추가
  - 기존 조건이 신규 게임 추가로 의도치 않게 깨지지 않는지 확인

### Phase F. 보안/RBAC/RLS
1. 경로 권한
- `/student/*`, `/teacher/*`, `/admin/*`는 기존 middleware 범위 내에서 동작
- 신규 라우트가 해당 prefix 밖으로 새지 않도록 확인

2. 서버 액션 권한
- 파일: `app/actions/security/guards.ts` 사용 액션
- 작업:
  - teacher/admin 액션은 `requireActor(["teacher","admin"])`
  - 학생 전용 액션은 `requireActor(["student"])`
  - 교사는 본인 학급 scope만 접근 허용

3. 신규 질문 테이블 RLS
- 신규 테이블을 만들었다면 반드시 RLS 정책 포함
- `question_sets` scope(grade/class/global)와 일관된 정책으로 작성

## 3. 실제 파일 기준 체크리스트(빠른 실행용)

### 공통
- [ ] `supabase/migrations/*`에 게임 카탈로그 upsert 추가
- [ ] (필요 시) 질문 전용 테이블 + RLS migration 추가
- [ ] `types/supabase.ts` 타입 반영 확인

### 학생 런타임
- [ ] `components/games/<new-game>/<new-game>-game.tsx` 생성
- [ ] `app/student/game/<new-game>/page.tsx` 생성
- [ ] `components/game/game-list-client.tsx` 카드 + 라우트 분기 추가
- [ ] practice/tournament 모두 결과 저장 확인

### 문제 출제
- [ ] `app/actions/game-data.ts`에 question type/CRUD 분기 추가
- [ ] `components/teacher/question-set-manager.tsx` 모달 라우팅 추가
- [ ] `components/teacher/<new-game>-set-modal.tsx` 생성
- [ ] `components/teacher/question-csv-utils.ts` 파서/템플릿 추가
- [ ] `app/teacher/questions/page.tsx` / `app/admin/questions/page.tsx` 노출 확인
- [ ] `docs/question-csv-contract.md` 계약 업데이트

### 점수/대회/대시보드
- [ ] 신규 게임 컴포넌트에서 `saveGameResult` 호출
- [ ] 신규 게임 컴포넌트에서 tournament RPC 흐름 연동
- [ ] `components/teacher/create-tournament-modal.tsx` 라벨/정렬 반영
- [ ] `components/teacher/tournament-list-client.tsx` 라벨 반영
- [ ] `app/teacher/dashboard/page.tsx` 라벨 반영
- [ ] `app/student/dashboard/page.tsx` 라벨 반영
- [ ] (필요 시) `app/actions/stats.ts` 배지 조건 반영

## 4. 검증 시나리오(최소 통과 기준)

1. 학생 플레이
- [ ] practice 모드 진입/완주/결과 저장 성공
- [ ] 활성 문제세트 없음 상태에서 시작 차단 + 안내 UI 노출

2. 문제세트 반영
- [ ] 교사 CLASS 세트 활성화 후 학생 게임 즉시 반영
- [ ] GLOBAL 세트가 있어도 CLASS 세트 우선 적용

3. 교사/관리자 출제
- [ ] `/teacher/questions`에서 CSV 업로드로 생성/수정/활성화 가능
- [ ] `/admin/questions`에서 동일 플로우 가능

4. 대회
- [ ] 대회 모드 시작 시 해당 대회 문제세트 로드
- [ ] 3회 초과 시 서버에서 차단
- [ ] 최고 점수만 반영

5. 코인/집계
- [ ] 게임 종료 시 `coin_transactions` 기록 생성
- [ ] `profiles.coin_balance` 캐시와 불일치 없음
- [ ] 랭킹/대시보드에서 신규 게임 로그가 정상 표기

## 5. 권장 검증 명령
```bash
npm run check:utf8
npm run check:security
npx tsc --noEmit
```

DB 점검(예시):
```sql
select id, title from public.games order by id;
select id, game_id, grade, class, is_active from public.question_sets where game_id = '<new-game-id>';
select user_id, game_id, score, play_time from public.game_logs where game_id = '<new-game-id>' order by created_at desc limit 20;
```

## 6. 릴리즈/롤백 가이드

릴리즈 전:
- [ ] 신규 게임 row 존재 확인
- [ ] 학생/교사/관리자 각 1회 이상 실플레이
- [ ] CSV 업로드 실패/성공 케이스 모두 확인

롤백:
- [ ] 긴급 비노출은 `games`에서 비활성 플래그 전략이 있으면 사용(현재 구조는 하드코딩 노출 지점도 같이 제거 필요)
- [ ] 필요 시 신규 라우트/카드 분기 제거
- [ ] DB 변경 롤백은 별도 migration으로 되돌림(수동 테이블 삭제 금지)

## 7. 현재 코드베이스 기준 주의사항(중요)
- 학생 게임 목록, 대회 라벨, 대시보드 라벨에 하드코딩 지점이 남아 있다. 신규 게임 추가 시 한 군데만 수정하면 누락이 발생한다.
- 문제 타입 분기는 `app/actions/game-data.ts`가 핵심 단일 지점이다. 이 매핑 누락 시 생성은 되더라도 조회/수정이 깨진다.
- CSV는 모든 게임에서 필수다. 신규 게임 모달에 업로드/다운로드가 빠지면 운영 정책 위반이다.
- 인코딩 정책은 UTF-8(무BOM) 기준이다. 커밋 전 `npm run check:utf8`를 반드시 통과해야 한다.
