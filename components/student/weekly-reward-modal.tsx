'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WeeklySettlementResult } from "@/app/actions/weekly-settlement";
import confetti from "canvas-confetti";

interface WeeklyRewardModalProps {
    result: WeeklySettlementResult | null;
    open: boolean;
    onClose: () => void;
}

export function WeeklyRewardModal({ result, open, onClose }: WeeklyRewardModalProps) {
    useEffect(() => {
        if (open && result?.settled) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [open, result]);

    if (!result || !result.settled) return null;

    const tierColor = {
        'Diamond': 'text-cyan-400',
        'Platinum': 'text-emerald-400',
        'Gold': 'text-yellow-400',
        'Silver': 'text-gray-400',
        'Bronze': 'text-orange-400'
    }[result.tier || 'Bronze'];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white border-4 border-black p-0 overflow-hidden shadow-[8px_8px_0_0_black]">
                <DialogTitle className="sr-only">주간 랭킹 보상</DialogTitle>
                <div className="bg-yellow-400 p-4 border-b-4 border-black text-center">
                    <h2 className="font-pixel text-2xl font-bold text-black">🎉 주간 랭킹 보상 🎉</h2>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div>
                        <p className="font-pixel text-xl text-gray-500 mb-2">지난주 나의 성적</p>
                        <div className={`font-pixel text-4xl font-bold ${tierColor} drop-shadow-[2px_2px_0_black]`}>
                            {result.tier} 등급
                        </div>
                        <p className="font-pixel text-lg text-gray-700 mt-2 font-bold">
                            전체 {result.rank}위 달성!
                        </p>
                    </div>

                    <div className="bg-gray-50 border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_black]">
                        <p className="font-pixel text-gray-500 mb-2 text-sm font-bold">획득 보상</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl">💰</span>
                            <span className="font-pixel text-3xl font-bold text-black">
                                {result.rewardAmount} 코인
                            </span>
                        </div>
                    </div>

                    <Button
                        onClick={onClose}
                        className="w-full h-12 bg-black text-white hover:bg-gray-800 font-pixel text-lg border-b-4 border-gray-600 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        보상 받기
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
