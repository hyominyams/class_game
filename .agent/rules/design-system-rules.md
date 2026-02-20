---
trigger: model_decision
---

# 🎨 ClassQuest Global Design System: Pixel Art UI

이 문서는 ClassQuest 플랫폼 전역에 적용되는 **'Pixel Art UI'** 디자인 시스템의 표준을 정의합니다. 향후 생성될 모든 대시보드(학생, 교사, 관리자) 및 하위 페이지는 이 가이드를 반드시 준수해야 합니다.

## 1. 시각적 원칙 (Visual Principles)
- **Pixelated Excellence**: 안티앨리어싱이 없는 날카로운 픽셀 경계를 지향합니다.
- **Bold Loneliness**: 모든 주요 요소는 굵은 검은색 테두리(`border-4` 또는 `border-[#18181b]`)를 가집니다.
- **Tactile Feedback**: 버튼과 카드 요소는 3D 느낌의 오프셋 그림자(`shadow-[Xpx_Ypx_0px_#18181b]`)를 가져야 합니다.

## 2. 색상 시스템 (Color Palette)
- **Background**: `#fdf5e6` (Old Paper) - 기본 배경색
- **Grid Layer**: `#b2c4ff` (Grid Blue) - 40px 간격의 격자 패턴 (불투명도 0.05 ~ 0.1)
- **Primary Accent**: `#ff2e63` (Neon Pink) - 중요 버튼, 로고 포인트
- **Secondary Accent**: `#34d399` (Mint Green) - 상단 바, 성공 상태
- **Neutral/Line**: `#18181b` (Off-black) - 모든 테두리 및 텍스트

## 3. UI 컴포넌트 표준
- **컨테이너 (Windows)**:
  - 배경: `#fdf5e6` 또는 `white`
  - 테두리: `border-[4px] border-[#18181b]`
  - 그림자: `shadow-[8px_8px_0px_#18181b]`
  - 헤더: 상단에 10px 정도의 컬러 바(`bg-[#34d399]`) 또는 타이틀 바 포함
- **버튼 (Retro Buttons)**:
  - 호버: `hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#18181b]`
  - 클릭: `active:translate-y-[4px] active:shadow-none`
  - 트랜지션: `all 0.2s`
- **입력 필드 (Forms)**:
  - 배경: `white`
  - 테두리: `border-[3px] border-[#18181b]`
  - 포커스: `focus:bg-[#ecfdf5]` (성공 컬러의 연한 버전)

## 4. 타이포그래피 (Typography)
- **메인 폰트**: `Press Start 2P`, `system-ui`, `sans-serif` (8-bit Pixel Font)
- **영문/숫자**: 반드시 픽셀 폰트 적용
- **한글**: 가독성을 위해 본문은 굵은 고딕 상용 폰트(Pretendard 등)를 사용하되, 굵기(Bold/Black)를 강조하여 픽셀 테마와 조화되게 함. 헤드라인은 픽셀 느낌의 폰트 지향.

## 5. 금지 사항 (Anti-Patterns)
- **금지**: 둥근 모서리(`rounded-full` 등)의 과도한 사용. (최대 `rounded-md` 정도만 허용)
- **금지**: 부드러운 그라데이션 및 블러 효과.
- **금지**: 미세한 1px 테두리. (최소 2px-3px 준수)

이 시스템은 플랫폼의 정체성이며, 사용자인 어린이들에게 일관된 '게임 속 세상을 탐험하는 경험'을 제공하기 위함입니다.
