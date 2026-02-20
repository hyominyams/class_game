# 이번 세션 구현 내용: 교사 및 게임 규칙 정교화 (Backend Integration)

## 1. 데이터베이스 스키마 확장 (Supabase)
- `student_profiles` 테이블을 `profiles`로 변경하고 `role`, `grade`, `class`, `username` 컬럼 추가.
- `games` 테이블 생성: 플랫폼 내 게임 메타데이터 관리.
- `question_sets` 테이블 생성: 게임과 1:1 매핑되는 문제 세트 구조 (CLASS/GLOBAL 구분).
- `questions` 테이블 생성: 문제 세트 내 개별 문항 저장.
- **Row Level Security (RLS)** 설정: 교사가 본인 학급 데이터만 관리할 수 있도록 보안 강화.

## 2. 교사 전용 서버 액션 (Server Actions) 구현
- `createStudentAction`: 교사가 **자신의 학년/반 학생만** 계정을 생성할 수 있도록 제한 로직 포함.
  - Supabase Admin API를 사용하여 `auth.users`에 계정 생성.
  - 초기 비밀번호 `1234` 설정 및 프로필 자동 연동.
- `createQuestionSetAction`: 특정 게임에 귀속된 새 문제 세트 생성.
- `toggleQuestionSetAction`: 특정 게임에 대해 활성화할 문제 세트를 선택 (선택 시 해당 게임의 기존 활성 세트는 자동 비활성화).
- `getActiveQuestions`: 학생이 게임 실행 시 자신의 학급에 활성화된 문제 세트를 가져오는 로직 (없을 경우 GLOBAL 세트 폴백).

## 3. 프론트엔드 반영 및 연동
- **학생 계정 관리 (`/teacher/accounts`)**:
  - 기존 Mock 데이터를 제거하고 실시간 DB 데이터를 조회하도록 전환.
  - 학생 생성 모달에서 실제 서버 액션을 호출하여 계정 생성 가능.
- **문제 관리 (`/teacher/questions`)**:
  - 서버 컴포넌트에서 실시간 문제 세트 목록 조회.
  - 문제 세트별로 대상 게임 표시 및 "활성화/해제" 토글 기능 구현.
- **게임 엔진 연동 (`Pixel Runner`)**:
  - 게임 시작 시 하드코딩된 문제가 아닌 DB의 활성 문제 세트를 실시간으로 로드.
  - 문제 세트 변경 시 즉시 게임에 반영되는 1:1 매핑 구조 확립.

## 4. 향후 과제
- 문제 세트 내 세부 문항 편집 UI (Question Editor) 추가.
- 학생 계정 비밀번호 초기화 및 수정 기능 연동.
- 대회(Tournament) 관리 시스템의 실데이터 연동.
