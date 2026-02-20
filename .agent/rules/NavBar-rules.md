---
trigger: model_decision
---

# 🧭 NavBar Component (Pixel Art UI) Rules

이 문서는 픽셀 아트 테마로 리뉴얼된 **NavBar** 컴포넌트의 사양을 정의합니다.

## 1. 개요
- **위치**: 상단 고정(`fixed top-0`)
- **주요 기능**: 서비스 로고(`SHINWOL_QUEST`) 및 로그인 버튼 제공.

## 2. 디자인 사양 (Pixel Art UI 준수)
- **배경**: `#fdf5e6` (Old Paper) 컬러.
- **테두리**: 하단에 `border-b-[4px] border-[#18181b]` 적용.
- **높이**: `h-16` 고정.
- **폰트**: `Press Start 2P` 시스템 픽셀 폰트 적용.

## 3. 구성 요소
- **Left (Logo)**: `SHINWOL_QUEST` 텍스트. 호버 시 네온 핑크(`#ff2e63`)로 강조.
- **Right (Action)**: `LOGIN` 버튼.
  - 스타일: 흰색 배경, `border-[3px] border-[#18181b]`, `shadow-[4px_4px_0px_#18181b]`.
  - 인터랙션: 클릭 시 `active:translate-y-[2px]`와 그림자 제거 효과.

## 4. 구현 주의 사항
- 픽셀 폰트 로드를 위해 컴포넌트 내부 혹은 글로벌 CSS에 `@font-face` 설정이 포함되어야 합니다.
- 스크롤 시에도 최상단에 고정되어야 하며, `z-50` 이상의 인덱스를 가집니다.
