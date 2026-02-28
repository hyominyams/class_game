# ClassQuest Agents.md v2

## 1. 문서 목적과 우선순위
이 문서는 ClassQuest의 운영 규정, 구현 로드맵, 검증 기준을 통합 관리한다.

의사결정 우선순위는 다음과 같다.
1. `PRD.md`
2. `Agents.md` (본 문서)
3. 코드 구현 상세

비기능 원칙:
- 보안 우선: 권한 검증은 UI, Middleware, Server Action, RLS에서 중복 적용한다.
- 통계 복구성: 정산/보상/진행 상태는 로그 기반으로 복원 가능해야 한다.
- UI 일관성: 기존 Pixel Art UI를 유지하고 정보 밀도만 개선한다.

## 2. 프로젝트 개요
ClassQuest는 학습 게임 결과를 하나의 플랫폼에서 통합 관리하는 학급용 게임 학습 플랫폼이다.

- Frontend: Next.js (App Router), React, TailwindCSS, shadcn/ui
- Backend/DB: Supabase (PostgreSQL, Storage)
- Game Runtime: Web 코드 기반 게임 + Phaser.js 전환 구조
- Deployment: Vercel

## 3. 핵심 운영 규칙 (고정)

### 3.1 문제세트 반영 단일 진실
- 교사가 문제세트를 `적용(활성)`하면 해당 게임의 학생 플레이에 즉시 반영되어야 한다.
- 학생은 문제세트를 직접 선택하지 않는다.
- 교사의 `적용` 버튼이 문제 반영의 단일 진실(Source of Truth)이다.

### 3.2 학생용 문제세트 우선순위
1. `CLASS` 활성 세트 1개
2. `GLOBAL` 활성 세트 1개
3. 둘 다 없으면 게임 플레이를 막고 안내 UI를 표시한다.

### 3.3 대회 집계 규칙
- 대회 모드는 게임별 최대 3회 도전.
- 집계는 게임별 최고 점수만 반영.
- CLASS 대회만 리그/승급에 영향.
- GRADE 대회는 보상 지급만 수행.

## 4. Agent 체계 (v2)
| Agent | 주요 책임 | 핵심 사인오프 |
|---|---|---|
| Product Agent | 기획/정책 | PRD 단일 진실, 규칙 우선순위 |
| Frontend Agent | UI/UX | Role 기반 화면, Pixel UI 준수 |
| Backend Agent | 서버/DB | 데이터 무결성, 스키마/액션 관리 |
| Auth Agent | 인증/권한 | 경로/액션/RLS 전면 강화 |
| Game Agent | 게임 확장/연동 | 게임 카탈로그, 신규 3종 우선 |
| Scoring Agent | 점수/정산 | 로그 기반 집계, 최고점 반영 |
| Question Agent | 문제 세트 | 교사 적용 버튼 중심 반영 |
| Economy Agent | 코인 경제 | 원장 기록, 잔액 캐시, 원자 결제 |
| Progression Agent | 칭호/레벨 | 다중 조건 잠금, 장착 규칙 |
| Analytics Agent | 통계/리포트 | 보존 정책, 운영 지표 도출 |

## 5. Agent별 상세 책임

### 5.1 Product Agent
- PRD 변경사항 확인 및 규칙 우선순위 결정
- 성능 vs 규칙 충돌 시 최종 판단
- MVP/확장 기능 컷오프 관리

### 5.2 Frontend Agent
- Admin/Teacher/Student 화면 분리
- 권한 없는 UI는 렌더 단계에서 차단
- 학생 대시보드 고밀도 정보 제공
- 기존 Pixel Art UI 규칙 준수 (컴포넌트 계열/톤 유지)

### 5.3 Backend Agent
- 스키마/인덱스/제약/함수 설계
- Server Action에서 최종 규칙 검증
- 파생 데이터는 로그로 재계산 가능하도록 유지
- 가능하면 Hard Delete 대신 Soft Delete 우선

### 5.4 Auth Agent
- Middleware에서 `/student/*`, `/teacher/*`, `/admin/*` 모두 역할 검증
- 모든 Server Action에 `requireAuth/requireRole/requireScope` 적용
- 교사는 본인 학년/반 데이터만 접근 가능
- Admin은 전역 스코프 접근 가능
- Student는 SELF 스코프만 접근 가능
- 최초 로그인 시 비밀번호 변경 강제

### 5.5 Game Agent
- 게임 목록의 단일 진실은 `games` 테이블
- 하드코딩 목록 의존 제거
- 우선 확장 게임: `ox-swipe`, `typing-defense`, `memory-match`
- 게임 결과 계약은 공통 스키마를 따른다

### 5.6 Scoring Agent
- 일반 모드: 모든 플레이 로그 저장
- 대회 모드: 기간 내 결과만 유효, 3회 제한, 최고점 집계
- 학년 대회는 리그 반영 금지

### 5.7 Question Agent
- 문제세트는 게임 단위로 분리 관리
- 활성 세트는 학생 플레이에 자동 반영
- 교사 `적용` 액션이 단일 진입점
- 세트 활성은 단일성 제약 유지

### 5.8 Economy Agent
- 모든 코인 변경은 `coin_transactions` 기록 필수
- `profiles.coin_balance`는 캐시 요약으로 유지
- 결제는 원자 처리(잔액 차감 + 로그 + 아이템 지급)
- 클라이언트 전달 가격/이름은 신뢰 금지

### 5.9 Progression Agent
- 레벨은 기존 점수 기반 곡선 유지
- 칭호는 코인 단일 기준에서 다중 기준으로 확장
- 장착 상태는 항상 1개만 허용
- 잠금 이유를 UI에서 설명

### 5.10 Analytics Agent
- 일반 모드 로그 120일 보관
- 통계 요약/대회 데이터 집계 보관
- 운영 리포팅 및 모니터링 지표 산출

## 6. 권한 매트릭스
| 기능/화면 | ADMIN | TEACHER | STUDENT |
|---|---|---|---|
| 학생 게임 플레이 로그 | 조회/관리 가능 | 조회 가능 | 본인 플레이만 |
| 교사 계정 발급 | 전역 가능 | 불가 | 불가 |
| 학생 계정 발급 | 전역 가능 | 본인 학년/반만 가능 | 불가 |
| 문제세트 생성/수정/삭제 | 전역 가능 | 본인 학년/반만 가능 | 불가 |
| 문제세트 적용(활성화) | 전역 가능 | 본인 학년/반만 가능 | 불가 |
| 코인 지급/회수 | 전역 가능 | 본인 학년/반 학생만 가능 | 불가 |
| 상점 구매 | 불가 | 불가 | 본인만 가능 |
| CLASS 대회 생성/운영 | 가능 | 본인 학급만 가능 | 불가 |
| GRADE 대회 생성/운영 | 가능 | 불가 | 불가 |
| 정산 조회 | 전역 가능 | 본인 학급 범위 | 본인 소속 학급/대회 |
| 시스템 설정 | 전역 가능 | 불가 | 불가 |

스코프 규칙:
- Teacher: `grade/class` 동일 범위 강제
- Student: `auth.uid() == owner_id` 강제
- Admin: 서비스 전역 허용

## 7. 도메인별 실행 규약

### 7.1 게임 확장 규약
- 게임 목록은 DB `games` 기반 렌더링
- 신규 게임은 공통 메타(`id/title/route/category/questionType/enabled`) 등록 후 노출
- 하드코딩만으로 게임 추가 금지

### 7.2 문제세트 적용 규약
- 교사 적용 버튼은 `activateQuestionSetAction`으로만 처리
- 학생 조회는 `getRuntimeQuestions(gameId)`만 사용
- 학생에게 세트 선택 UX 제공 금지

### 7.3 상점 결제 규약
- 클라이언트 입력은 `itemId`만 허용
- 가격/이름/타입은 서버 카탈로그에서 조회
- 결제는 DB 원자 함수(RPC) 사용
- 부분 성공 허용 금지

### 7.4 정산/대회 규약
- 집계는 로그 기반 재연산 가능해야 함
- 도전 횟수/기간 규칙은 서버에서 최종 검증
- 클라이언트 상태만으로 제한 처리 금지

### 7.5 학생 대시보드 UX 규약
- 기존 Pixel UI 유지
- 추가 모듈: 오늘의 미션, 진행중 대회, 다음 레벨/칭호 목표, 추천 게임
- 기존 톤을 무시한 전면 리디자인 금지

## 8. Public API / 인터페이스 계약

### 8.1 서버 액션 계약
- `purchaseItem(itemId)`
  - 클라이언트는 `itemId`만 전달
  - 응답 예시: `{ success, newBalance, itemId, quantity, error? }`
- `activateQuestionSetAction(setId)`
  - 응답 예시: `{ success, gameId, appliedScope, activatedSetId, error? }`
- `getRuntimeQuestions(gameId)`
  - 응답 예시: `{ setId, sourceScope, questions[] }`

### 8.2 대시보드 데이터 계약
- `getStudentDashboardData()`는 아래 필드를 포함
  - `missions`
  - `activeTournament`
  - `nextLevelGoal`
  - `nextTitleGoal`
  - `recommendedGame`

### 8.3 공통 타입 계약
- `GameCatalogItem`
  - `{ id, title, route, category, questionType, enabled }`
- `TitleRule`
  - 다중 조건 잠금 규칙 배열

### 8.4 SQL/RPC 계약
- `purchase_item_atomic(...)` 필수
- 필요 시 `activate_question_set_atomic(...)` 추가
- `question_sets` 활성 단일성 인덱스/제약 유지

## 9. 구현 로드맵 (Phase + AC + DoD + Rollback)

### Phase 1: 권한 전면 강화 + 문제 반영 경로 통합
작업:
- 경로 역할 검증 전면 적용
- 액션 공통 가드 도입
- 문제세트 적용 액션 단일화

AC:
- 학생 계정으로 교사/관리자 경로 접근 차단
- 교사 적용 즉시 학생 게임 반영

DoD:
- 경로/액션/RLS 체크리스트 통과

Rollback:
- 기존 middleware 분기 및 기존 액션 헬퍼 복구

### Phase 2: 상점 결제 원자화
작업:
- `purchaseItem(itemId)` 시그니처 단순화
- RPC 기반 원자 결제 도입

AC:
- 동시 구매 시 중복 차감/중복 지급 없음
- 실패 시 부분 반영 없음

DoD:
- 결제 통합 테스트 통과

Rollback:
- 기존 결제 액션으로 임시 복귀 가능

### Phase 3: 게임 목록 확장 (신규 미니게임 3종)
작업:
- `ox-swipe`, `typing-defense`, `memory-match` 추가
- 게임 카탈로그 DB 기반 렌더링

AC:
- 3종이 게임 목록/대회/문제세트 관리에 노출

DoD:
- 신규 게임 플레이/결과/문제반영 통합 검증 통과

Rollback:
- `enabled=false`로 즉시 비노출

### Phase 4: 칭호/레벨 고도화
작업:
- `coin_balance` 캐시 유지
- 칭호 다중 조건 잠금 규칙 도입
- 레벨 목표/보상 가시화

AC:
- 칭호 잠금 이유 표시
- 장착 칭호 1개 보장

DoD:
- 잠금/장착/표시 테스트 통과

Rollback:
- 기존 코인 단일 기준 칭호 규칙 복귀 가능

### Phase 5: 학생 대시보드 고도화
작업:
- 미션/대회 목표/추천 모듈 추가
- 빈 상태 UI 정비

AC:
- 빈 영역 최소화
- CTA 가시성 향상

DoD:
- 모바일/태블릿 반응형 레이아웃 완료

Rollback:
- 신규 모듈 feature flag 비활성화

## 10. 테스트 체크리스트
1. RBAC 경로 테스트
- 학생 계정으로 `/teacher/*`, `/admin/*` 접근 차단
- 교사 계정으로 `/admin/*` 접근 차단

2. RBAC 액션 테스트
- 학생의 교사/관리자 액션 호출 시 403
- 교사의 타 학급 학생 코인 지급 시 403

3. 문제세트 반영 테스트
- 교사 A세트 활성화 후 학생 게임 시작 시 A세트 로드
- GLOBAL 세트가 있어도 CLASS 세트 우선
- 활성 세트 없으면 안내 UI + 시작 차단

4. 상점 결제 테스트
- 정상 구매: 잔액 감소, 거래로그 1건, 아이템 수량 +1
- 잔액 부족: 변경 없음
- 동시 구매: 중복 차감/중복 지급 없음

5. 게임 확장 테스트
- 신규 3게임 카드 노출 및 진입 정상
- 신규 3게임 결과 저장 정상
- 신규 3게임 문제세트 반영 정상

6. 칭호/레벨 테스트
- 조건 충족 시 칭호 잠금 해제
- 미충족 조건 표시
- 장착 상태 1개 보장

7. 대시보드 테스트
- 미션/목표/추천 데이터 누락 없이 렌더
- 데이터 없음 상태에서도 Pixel UI 유지

## 11. 운영 모니터링 지표
- 보안
  - 권한 거부(403) 추세
  - 비정상 경로 접근 로그
- 경제
  - 결제 실패율
  - 결제 RPC 재시도율
  - 잔액/원장 불일치 건수
- 게임
  - 게임별 실행 수/완주율
  - 게임별 문제세트 반영 성공률
- 대시보드
  - 주요 CTA 클릭률
  - 빈 상태 노출 비율

## 12. 현재 진단 기반 개선 과제
- 게임 목록의 하드코딩 의존 제거
- `/admin` 중심 권한 보호를 전체 경로로 확장
- 결제 시 클라이언트 전달 가격/이름 신뢰 제거
- 학생 플레이의 활성 세트 자동 반영 구조 정비
- `CLASS > GLOBAL` 우선 조회 함수와 학생 경로 통합
- RLS 읽기 정책 공백 제거

## 13. 명시적 제약 및 기본값
- 기존 Pixel Art UI를 유지하고 레이아웃은 정보 밀도 중심으로 개선
- 경제 모델은 `profiles.coin_balance` 캐시 + 거래 원장 병행
- 신규 게임은 저비용 구현을 우선, 3종부터 시작
- 문제세트 반영의 단일 진실은 교사의 `적용` 버튼
- 문서는 한국어 중심, 코드/타입/식별자는 영어 사용

### 인코딩 정책 (필수)
- 저장 인코딩은 반드시 `"utf-8"`(UTF-8 without BOM)로 고정한다.
- 모든 텍스트 소스 파일(`.ts/.tsx/.js/.jsx/.json/.md/.sql/.css`)은 **UTF-8 (without BOM)**만 허용한다.
- CP949/EUC-KR/UTF-16 인코딩 사용 금지.
- 한글 깨짐 방지를 위해 저장/커밋 전 `npm run check:utf8` 검사를 통과해야 한다.
- `.gitattributes`의 `working-tree-encoding=UTF-8` 규칙을 유지한다.

## 14. 문제 CSV 표준 (신규)
- 교사/관리자 문제 출제 UI는 모든 게임에서 `CSV 업로드 + 예시 CSV 다운로드`를 제공해야 한다.
- 신규 게임 추가 시 CSV 계약은 필수이며, 컬럼/검증 규칙을 명시해야 한다.
- 표준 문서: `docs/question-csv-contract.md`
- 구현 기준:
  - 파서/템플릿 함수 추가
  - 모달 업로드/다운로드 버튼 추가
  - 서버 액션 저장 매핑(`app/actions/game-data.ts`) 추가
  - teacher/admin 양쪽 페이지에서 생성/수정/활성화 검증
