"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, XCircle, Coins, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameResultModalProps {
    isOpen: boolean;
    isClear: boolean;
    score: number;
    coinsEarned: number;
    dailyCoinsTotal: number;
    dailyLimit: number;
    onRetry: () => void;
    onExit: () => void;
    title?: string;
}

export function GameResultModal({
    isOpen,
    isClear,
    score,
    coinsEarned,
    dailyCoinsTotal,
    dailyLimit,
    onRetry,
    onExit,
    title
}: GameResultModalProps) {
    if (!isOpen) return null;

    const isMaxed = dailyCoinsTotal >= dailyLimit;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={cn(
                "w-full max-w-md bg-[#fff1e6] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in duration-300",
                isClear ? "ring-4 ring-[#00b894]/50" : "ring-4 ring-[#ff2e63]/50"
            )}>
                {/* Header Section */}
                <div className={cn(
                    "p-6 text-center border-b-4 border-black",
                    isClear ? "bg-[#00b894]" : "bg-[#ff2e63]"
                )}>
                    <div className="flex justify-center mb-2">
                        {isClear ? (
                            <Trophy className="w-16 h-16 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]" />
                        ) : (
                            <XCircle className="w-16 h-16 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]" />
                        )}
                    </div>
                    <h2 className="font-pixel text-4xl text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.5)] tracking-tighter">
                        {isClear ? (title || "MISSION CLEAR") : (title || "GAME OVER")}
                    </h2>
                </div>

                {/* Score Section */}
                <div className="p-8 space-y-6">
                    <div className="text-center space-y-1">
                        <p className="font-pixel text-sm text-gray-500 uppercase tracking-widest">Final Score</p>
                        <p className="font-pixel text-5xl text-black">{score.toLocaleString()}</p>
                    </div>

                    {/* Coin Reward Card */}
                    <div className="bg-white border-4 border-black p-4 relative shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center">
                                    <Coins className="w-5 h-5 text-black" />
                                </div>
                                <span className="font-pixel text-sm font-bold">REWARD</span>
                            </div>
                            <span className="font-pixel text-2xl text-yellow-600">+{coinsEarned}</span>
                        </div>

                        {/* Daily Progress Bar */}
                        <div className="space-y-1 mt-4">
                            <div className="flex justify-between text-[10px] font-pixel text-gray-400">
                                <span>DAILY LIMIT</span>
                                <span>{dailyCoinsTotal}/{dailyLimit}</span>
                            </div>
                            <div className="h-4 bg-gray-200 border-2 border-black overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-1000",
                                        isMaxed ? "bg-red-500" : "bg-yellow-400"
                                    )}
                                    style={{ width: `${Math.min(100, (dailyCoinsTotal / dailyLimit) * 100)}%` }}
                                />
                            </div>
                            {isMaxed && (
                                <p className="text-[10px] font-pixel text-[#ff2e63] mt-1 animate-pulse">
                                    오늘의 코인을 모두 모았습니다! (연습 모드)
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <Button
                            onClick={onRetry}
                            className="h-14 font-pixel text-lg bg-white hover:bg-gray-100 text-black border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                        >
                            <RotateCcw className="mr-2 w-5 h-5" /> RETRY
                        </Button>
                        <Button
                            onClick={onExit}
                            className="h-14 font-pixel text-lg bg-black hover:bg-zinc-800 text-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                        >
                            EXIT <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Footer Deco */}
                <div className="h-2 bg-black/10 flex">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className={cn("flex-1", i % 2 === 0 ? "bg-black/5" : "bg-transparent")} />
                    ))}
                </div>
            </div>
        </div>
    );
}
