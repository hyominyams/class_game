# AI 문제 자동생성 기능 구현 계획

## 1. 목표
- 교사/관리자 문제세트 생성 모달에서 `AI자동생성` 버튼으로 문제를 즉시 생성한다.
- CSV 업로드 없이 생성된 문제를 모달 UI 상태에 바로 주입한다.
- 기존 저장 경로(`createQuestionSet`, `updateQuestionSet`)는 유지한다.

## 2. 요구사항 반영 범위

### 2.1 게임별 문제유형 자동 선택
- 사용자가 게임을 선택하고 생성 모달에 들어오면 게임 타입에 맞는 생성 포맷을 자동 적용한다.
- 매핑:
  - `word-runner`(word-defense): 단어쌍(영어/한국어)
  - `word-chain`: 제시어/정답/유사정답
  - `history-quiz`, `pixel-runner`, 기타 히스토리 모달 경로: 객관식/단답형 포맷

### 2.2 난이도별 문항수 조정
- 모달에 `상/중/하` 문항 수 입력 필드를 추가한다.
- 난이도 기준:
  - 상: 중학교 수준
  - 중: 초등학교 고학년
  - 하: 초등학교 저학년
- 게임별 최대 문항수 정책:
  - `pixel-runner`: 최대 10 (게임 내부 퀴즈 상수 반영)
  - 나머지 게임: 최대 30
- 총합이 최대치를 넘으면 서버/클라이언트 모두에서 차단한다.

### 2.3 주제 정책
- 기본 주제:
  - `word-runner`, `word-chain`: 영어
  - `history-quiz`(및 동일 포맷): 역사
- `General` 모드 제공:
  - 사용자가 프리셋 선택 또는 직접 입력으로 주제를 지정 가능

## 3. 기술 설계

### 3.1 서버 액션 신설
- 파일: `app/actions/question-ai.ts` (신규)
- 액션 예시:
  - `generateQuestionsWithAI(input)`
- 입력 계약(요약):
  - `gameId`
  - `difficultyCounts: { high, medium, low }`
  - `topicMode: "default" | "general"`
  - `topic` (general일 때 필수)
- 보안:
  - `requireActor(["teacher", "admin"])` 적용
  - `OPENAI_API_KEY` 누락 시 명확한 에러 반환
- 출력 계약:
  - 게임별 모달 상태에 바로 들어갈 수 있는 JSON 배열
  - 모든 문자열 trim/빈값 방지/중복 최소화

### 3.2 OpenAI 호출 정책
- 서버에서만 호출한다(클라이언트 직접 호출 금지).
- 모델 기본값: `gpt-4.1-mini` (환경변수로 추후 교체 가능).
- 응답은 JSON 스키마 지시 + 서버 후검증으로 처리한다.

### 3.3 클라이언트 UI 반영
- 대상 모달:
  - `components/teacher/word-set-modal.tsx`
  - `components/teacher/word-chain-set-modal.tsx`
  - `components/teacher/history-set-modal.tsx`
- 공통 추가 UI:
  - `AI자동생성` 버튼
  - 상/중/하 문항수 입력
  - 주제 설정(default/general)
  - 생성 중 로딩 상태 및 에러 메시지
- 생성 성공 시:
  - 각 모달의 로컬 상태(`setWords`/`setQuestions`)를 즉시 교체

## 4. 검증/테스트 계획
- 권한:
  - student 호출 차단(403)
  - teacher/admin만 호출 성공
- 입력 검증:
  - 문항 수 음수/비정수/총합 0 차단
  - 최대 문항수 초과 차단
  - general 주제 빈값 차단
- UI 동작:
  - teacher/admin 모두 동일 동작
  - 생성 후 즉시 폼에 반영
  - 기존 수동 수정 + 저장 정상
- 게임별 포맷:
  - word-runner: english/korean 쌍
  - word-chain: prompt/answer/acceptedAnswers
  - history/pixel: type/question/options/answer

## 5. 롤백 계획
- 신규 액션 파일 비활성화 또는 모달에서 버튼 숨김으로 즉시 롤백 가능
- 기존 CSV 업로드/수동입력 저장 경로는 변경하지 않으므로 운영 영향 최소
