"use client";

import React, { useState, useEffect, useTransition } from "react";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelModal } from "@/components/ui/pixel-modal";
import { purchaseItem, getUserCoins } from "@/app/actions/store";
import { STORE_ITEMS } from "@/app/constants/store-items";

export default function StorePage() {
    const [userCoins, setUserCoins] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<typeof STORE_ITEMS[0] | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchCoins = async () => {
            const coins = await getUserCoins();
            setUserCoins(coins);
        };
        fetchCoins();
    }, []);

    const handlePurchase = () => {
        if (!selectedItem || userCoins === null) return;

        if (userCoins < selectedItem.price) {
            alert("코인이 부족합니다!");
            return;
        }

        startTransition(async () => {
            const result = await purchaseItem(selectedItem.id);
            if (result.success) {
                setUserCoins(result.newBalance);
                alert(result.message || "Purchase completed.");
                setSelectedItem(null);
            } else {
                alert(result.error || "Purchase failed.");
            }
        });
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="font-pixel text-3xl font-bold mb-2">상점</h1>
                    <p className="text-gray-600 font-bold">열심히 모은 코인으로 아이템을 구매하세요.</p>
                </div>
                <div className="bg-white border-4 border-black px-6 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center gap-3">
                    <span className="text-2xl">🪙</span>
                    <span className="font-pixel text-xl font-bold">
                        {userCoins === null ? "..." : userCoins.toLocaleString()}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {STORE_ITEMS.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group cursor-pointer"
                    >
                        <PixelCard className="h-full hover:-translate-y-2 transition-all hover:shadow-[8px_8px_0_0_black] border-black bg-white">
                            <div className={`h-32 ${item.color} border-b-4 border-black flex items-center justify-center -mx-6 -mt-6 mb-4`}>
                                <span className="text-6xl filter drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]">{item.icon}</span>
                            </div>
                            <div className="text-center">
                                <h3 className="font-pixel text-lg font-bold mb-2">{item.name}</h3>
                                <p className="text-sm text-gray-500 font-bold mb-4 h-10">{item.description}</p>
                                <div className="inline-flex items-center gap-1 bg-black text-white px-3 py-1 rounded font-pixel text-sm">
                                    <span>🪙</span> {item.price}
                                </div>
                            </div>
                        </PixelCard>
                    </div>
                ))}
            </div>

            {/* Purchase Confirmation Modal */}
            <PixelModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                title="아이템 구매"
            >
                <div className="text-center space-y-4">
                    <div className={`w-20 h-20 ${selectedItem?.color} border-4 border-black rounded-full mx-auto flex items-center justify-center text-4xl shadow-[4px_4px_0_0_black]`}>
                        {selectedItem?.icon}
                    </div>
                    <div>
                        <h3 className="font-pixel text-xl">{selectedItem?.name}</h3>
                        <p className="text-gray-500 font-bold">{selectedItem?.description}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded border-2 border-black">
                        <div className="flex justify-between text-sm font-bold mb-2">
                            <span>보유 코인</span>
                            <span>{userCoins?.toLocaleString() || 0} C</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-[#ff2e63] mb-2">
                            <span>가격</span>
                            <span>- {selectedItem?.price.toLocaleString()} C</span>
                        </div>
                        <div className="border-t-2 border-black my-2"></div>
                        <div className="flex justify-between font-bold">
                            <span>구매 후 잔액</span>
                            <span>{selectedItem && userCoins !== null ? (userCoins - selectedItem.price).toLocaleString() : 0} C</span>
                        </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                        <PixelButton variant="outline" onClick={() => setSelectedItem(null)} disabled={isPending}>취소</PixelButton>
                        <PixelButton
                            onClick={handlePurchase}
                            disabled={isPending || (selectedItem && userCoins !== null ? userCoins < selectedItem.price : true)}
                            className={selectedItem && userCoins !== null && userCoins < selectedItem.price ? "opacity-50 cursor-not-allowed" : "bg-[#08d9d6] text-black hover:bg-[#06b6b3]"}
                        >
                            {isPending ? "구매 중..." : "구매하기"}
                        </PixelButton>
                    </div>
                </div>
            </PixelModal>
        </div>
    );
}
