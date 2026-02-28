export type StoreItem = {
    id: string;
    name: string;
    price: number;
    icon: string;
    color: string;
    description: string;
};

export const STORE_ITEMS: StoreItem[] = [
    {
        id: "item_role_change",
        name: "1인1역 변경권",
        price: 350,
        icon: "🔄",
        color: "bg-blue-100",
        description: "맡고 있는 역할을 다른 직업으로 변경할 수 있습니다.",
    },
    {
        id: "item_lunch_priority",
        name: "급식 우선권",
        price: 650,
        icon: "🍱",
        color: "bg-orange-100",
        description: "가장 먼저 급식을 먹을 수 있는 권리입니다.",
    },
    {
        id: "item_snack",
        name: "간식 교환권",
        price: 900,
        icon: "🍭",
        color: "bg-pink-100",
        description: "선생님께 맛있는 간식 하나를 받을 수 있습니다.",
    },
    {
        id: "item_cleaning_exemption",
        name: "청소 면제권",
        price: 1200,
        icon: "🧹",
        color: "bg-green-100",
        description: "오늘의 청소 의무를 1회 면제받을 수 있습니다.",
    },
    {
        id: "item_free_time",
        name: "자유 시간 10분",
        price: 2500,
        icon: "⏰",
        color: "bg-yellow-100",
        description: "10분의 보너스 자유 시간을 얻습니다.",
    },
    {
        id: "item_group_selection",
        name: "모둠 선택권",
        price: 3000,
        icon: "🤝",
        color: "bg-purple-100",
        description: "원하는 친구와 같은 모둠이 될 수 있습니다.",
    },
];

export function getStoreItemById(itemId: string) {
    return STORE_ITEMS.find((item) => item.id === itemId) || null;
}
