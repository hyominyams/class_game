"use client";

import React from "react";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelButton } from "@/components/ui/pixel-button";

const ITEMS = [
    { id: "item_role_change", name: "1인1역 변경권", price: 500, icon: "🔄", color: "bg-blue-100", description: "맡고 있는 역할을 다른 직업으로 변경할 수 있습니다." },
    { id: "item_cleaning_exemption", name: "청소 면제권", price: 1000, icon: "🧹", color: "bg-green-100", description: "오늘의 청소 의무를 1회 면제받을 수 있습니다." },
    { id: "item_snack", name: "간식 교환권", price: 800, icon: "🍭", color: "bg-pink-100", description: "선생님께 맛있는 간식 하나를 받을 수 있습니다." },
    { id: "item_lunch_priority", name: "급식 우선권", price: 600, icon: "🍱", color: "bg-orange-100", description: "가장 먼저 급식을 먹을 수 있는 권리입니다." },
    { id: "item_group_selection", name: "모둠 선택권", price: 2000, icon: "🤝", color: "bg-purple-100", description: "원하는 친구와 같은 모둠이 될 수 있습니다." },
    { id: "item_free_time", name: "자유 시간 10분", price: 1500, icon: "⏰", color: "bg-yellow-100", description: "10분의 보너스 자유 시간을 얻습니다." },
];

export default function StoreDemoPage() {
    return (
        <div className="min-h-screen bg-[#fdf5e6] p-8 space-y-8">
            <header className="text-center space-y-2">
                <h1 className="font-pixel text-4xl font-bold text-[#ff2e63]">학급 상점 아이템 데모</h1>
                <p className="font-bold text-gray-600 font-pixel">새로운 쿠폰 아이템들을 미리 확인해보세요.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {ITEMS.map((item) => (
                    <div key={item.id} className="group">
                        <PixelCard className="h-full border-black bg-white transition-all group-hover:-translate-y-2 group-hover:shadow-[8px_8px_0_0_black]">
                            <div className={`h-32 ${item.color} border-b-4 border-black flex items-center justify-center -mx-6 -mt-6 mb-4`}>
                                <span className="text-6xl filter drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]">{item.icon}</span>
                            </div>
                            <div className="text-center space-y-3">
                                <h3 className="font-pixel text-xl font-bold">{item.name}</h3>
                                <p className="text-sm text-gray-500 font-bold h-10">{item.description}</p>
                                <div className="inline-flex items-center gap-1 bg-black text-white px-3 py-1 rounded font-pixel text-sm">
                                    <span>🪙</span> {item.price}
                                </div>
                                <PixelButton className="w-full mt-4 bg-[#08d9d6] text-black hover:bg-[#06b6b3]">
                                    구매하기 (데모)
                                </PixelButton>
                            </div>
                        </PixelCard>
                    </div>
                ))}
            </div>
        </div>
    );
}
