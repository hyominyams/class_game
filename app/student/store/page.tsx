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
            <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="font-pixel text-3xl font-bold mb-2">상점</h1>
                    <p className="text-gray-600 font-bold">열심히 모은 코인으로 아이템을 구매하세요.</p>
                </div>
                <div className="flex w-full items-center justify-center gap-3 border-4 border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:w-auto sm:px-6 sm:py-3">
                    <span className="text-2xl">🪙</span>
                    <span className="font-pixel text-xl font-bold">
                        {userCoins === null ? "..." : userCoins.toLocaleString()}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
                {STORE_ITEMS.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group cursor-pointer"
                    >
                        <PixelCard className="h-full hover:-translate-y-2 transition-all hover:shadow-[8px_8px_0_0_black] border-black bg-white">
                            <div className={`-mx-6 -mt-6 mb-4 flex h-28 items-center justify-center border-b-4 border-black sm:h-32 ${item.color}`}>
                                <span className="text-5xl filter drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)] sm:text-6xl">{item.icon}</span>
                            </div>
                            <div className="text-center">
                                <h3 className="font-pixel text-lg font-bold mb-2">{item.name}</h3>
                                <p className="mb-4 min-h-[2.5rem] text-sm font-bold text-gray-500">{item.description}</p>
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
                <div className="space-y-4 text-center">
                    <div className={`w-20 h-20 ${selectedItem?.color} border-4 border-black rounded-full mx-auto flex items-center justify-center text-4xl shadow-[4px_4px_0_0_black]`}>
                        {selectedItem?.icon}
                    </div>
                    <div>
                        <h3 className="font-pixel text-xl">{selectedItem?.name}</h3>
                        <p className="text-gray-500 font-bold">{selectedItem?.description}</p>
                    </div>
                    <div className="rounded border-2 border-black bg-gray-100 p-4">
                        <div className="mb-2 flex justify-between text-xs font-bold sm:text-sm">
                            <span>보유 코인</span>
                            <span>{userCoins?.toLocaleString() || 0} C</span>
                        </div>
                        <div className="mb-2 flex justify-between text-xs font-bold text-[#ff2e63] sm:text-sm">
                            <span>가격</span>
                            <span>- {selectedItem?.price.toLocaleString()} C</span>
                        </div>
                        <div className="border-t-2 border-black my-2"></div>
                        <div className="flex justify-between font-bold">
                            <span>구매 후 잔액</span>
                            <span>{selectedItem && userCoins !== null ? (userCoins - selectedItem.price).toLocaleString() : 0} C</span>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
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
