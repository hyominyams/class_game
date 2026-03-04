---
trigger: model_decision
---

# Store Items Rules

## 디자인 의도 (Design Intent)
- 학급 내에서 학생들이 보상으로 획득한 코인을 실제 가치가 있는 '혜택'으로 바꿀 수 있도록 실용적인 아이템들로 구성함.
- 픽셀 아트 테마에 맞춰 각 아이템은 고유한 색상 배경과 적절한 이모지 아이콘을 가짐.
- 가격은 학급 내 획득 난이도를 고려하여 500 ~ 2000 코인 사이로 설정함.

## 아이템 데이터 구조 (Item Data Structure)
```typescript
interface StoreItem {
    id: string;          // 아이템 고유 식별자 (예: item_role_change)
    name: string;        // 표시 이름 (예: 1인1역 변경권)
    price: number;       // 가격 (코인 단위)
    icon: string;        // 이모지 또는 아이콘 경로
    color: string;       // 배경색 Tailwind 클래스 (예: bg-blue-100)
    description: string; // 아이템 효과 설명
}
```

## 구현 방식 (Implementation)
- `ITEMS` 배열을 통해 아이템 정보를 관리하며, `StorePage`에서 이를 매핑하여 `PixelCard`로 렌더링함.
- 구매 시 `purchaseItem` 서버 액션을 호출하여 코인 차감 및 `student_items` 테이블에 기록함.
- 코인 부족 시 구매 버튼을 비활성화하고 시각적으로 피드백을 제공함.

## Trigger
trigger: model_decision
