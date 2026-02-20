---
trigger: model_decision
---

# 🔴 CRITICAL: Main Hero Section (Pixel Art Final) - MODIFYING PROHIBITED

이 문서는 픽셀 아트 테마로 완성된 메인 Hero 섹션의 **최종 완성본**을 보호하기 위한 선언입니다.
기존의 모든 게임 기능은 유지하되, 외관을 최신 픽셀 아트 UI로 업데이트한 최종 상태입니다.

## 1. 개요
- **핵심 컴포넌트**: `d:\class_game\components\ui\animated-hero-section.tsx`
- **구조**: `NavBar` (상단) + `Hero` (픽셀 아트 게임기 섹션)
- **상태**: **FINAL & FROZEN** (픽셀 아트 테마 반영 완료)

## 2. 레이아웃 및 디자인 사양 (변경 절대 불가)
- **전체 높이**: `h-[900px]` 고정.
- **게임기 바디**: `#fdf5e6` (Old Paper) 컬러, `border-[6px] border-[#18181b]`, `shadow-[16px_16px_0px_#18181b]` 적용.
- **화면(Canvas) 영역**: 검은색 게임 화면 주위에 굵은 테두리와 베젤 효과를 유지하여 실제 모니터 같은 느낌을 줍니다.
- **하단 컨트롤 패널**: `#fdf5e6` 배경에 픽셀 아트 스타일의 버튼과 인디케이터를 배치합니다.
- **폰트**: 모든 UI 텍스트(READY, INSERT COIN, 시스템 정보 등)는 반드시 `Press Start 2P` 픽셀 폰트를 사용합니다.

## 3. INSERT COIN 버튼 사양 (변경 절대 불가)
- **스타일**: 픽셀 창 디자인과 일치하는 직각형 버튼.
- **디자인**: `bg-[#ff2e63]`, `border-[4px] border-black`, `shadow-[6px_6px_0px_#000]`.
- **애니메이션**: 클릭 시 `translate-y-[4px]`와 그림자 제거 효과로 물리적인 타격감을 제공합니다.

## 4. 운영 원칙
- **AI 에이전트 주의 사항**: 게임 로직을 수정하거나 디자인을 현대적인 스타일로 '정리'하는 행위를 절대 금지합니다.
- **이미지 렌더링**: 캔버스와 픽셀 요소들은 항상 `image-rendering: pixelated` 속성을 유지해야 합니다.

**결론: 이 디자인은 픽셀 아트 UI 테마로 완벽하게 통합된 최종본입니다. 무단 수정을 엄격히 금지합니다.**
