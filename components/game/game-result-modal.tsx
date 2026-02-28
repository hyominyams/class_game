"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, XCircle, Coins, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    const [countedScore, setCountedScore] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setCountedScore(0);
            return;
        }

        let start = 0;
        const duration = 1500;
        const startTime = performance.now();

        const animateScore = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            setCountedScore(Math.floor(easeOutQuad * score));

            if (progress < 1) {
                requestAnimationFrame(animateScore);
            } else {
                setCountedScore(score);
            }
        };

        requestAnimationFrame(animateScore);
    }, [isOpen, score]);

    if (!isOpen) return null;

    const isMaxed = dailyCoinsTotal >= dailyLimit;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0a0510]/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-md"
                    >
                        {/* 8-bit Border Container */}
                        <div className={cn(
                            "relative overflow-hidden rounded-xl border-[6px] shadow-[0_15px_50px_rgba(0,0,0,0.5)]",
                            isClear ? "border-[#00cec9] bg-[#1a2f33]" : "border-[#ff7675] bg-[#2d1b1e]"
                        )}>
                            {/* Inner Glow / Background Details */}
                            <div className={cn(
                                "absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_center,var(--tw-gradient-from),transparent_70%)]",
                                isClear ? "from-[#55efc4]" : "from-[#ff6b81]"
                            )} />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rotate-45 transform origin-top-right blur-2xl" />

                            {/* Header */}
                            <div className={cn(
                                "relative p-8 text-center border-b-[6px]",
                                isClear ? "bg-[#00b894] border-[#009276]" : "bg-[#d63031] border-[#b32b2b]"
                            )}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: isClear ? [0, -10, 10, -10, 0] : 0 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="flex justify-center mb-4 relative"
                                >
                                    {isClear && (
                                        <div className="absolute inset-0 animate-ping opacity-50 bg-white blur-xl rounded-full scale-150" />
                                    )}
                                    {isClear ? (
                                        <Trophy className="w-20 h-20 text-[#ffeaa7] drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)] relative z-10" />
                                    ) : (
                                        <XCircle className="w-20 h-20 text-[#ffcccb] drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)] relative z-10" />
                                    )}
                                </motion.div>
                                <h2 className="font-pixel text-4xl text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)] tracking-wider">
                                    {isClear ? (title || "MISSION CLEAR!") : (title || "GAME OVER")}
                                </h2>
                            </div>

                            {/* Content */}
                            <div className="relative p-8 space-y-8">
                                {/* Score Display */}
                                <div className="text-center">
                                    <p className="font-pixel text-sm text-[#a4b0be] mb-2 uppercase tracking-[0.2em]">Final Score</p>
                                    <h3 className={cn(
                                        "font-pixel text-6xl drop-shadow-[3px_3px_0_rgba(0,0,0,1)]",
                                        isClear ? "text-[#55efc4]" : "text-[#ff7675]"
                                    )}>
                                        {countedScore.toLocaleString()}
                                    </h3>
                                </div>

                                {/* Coin Rewards Card */}
                                <div className="bg-[#111418] rounded-lg border-2 border-[#2f3542] p-5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />

                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#ffeaa7] to-[#fdcb6e] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                                                <Coins className="w-5 h-5 text-[#d35400]" />
                                            </div>
                                            <span className="font-pixel text-sm text-[#dfe4ea] tracking-wider">REWARD</span>
                                        </div>
                                        <span className="font-pixel text-3xl text-[#fdcb6e] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                                            +{coinsEarned}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2 relative z-10">
                                        <div className="flex justify-between font-pixel text-[10px] text-[#747d8c]">
                                            <span>DAILY LIMIT</span>
                                            <span className={isMaxed ? "text-[#ff7675]" : "text-[#a4b0be]"}>
                                                {dailyCoinsTotal} / {dailyLimit}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-[#1e272e] rounded-full border border-black overflow-hidden relative">
                                            <div
                                                className={cn(
                                                    "absolute inset-y-0 left-0 transition-all duration-1000 ease-out",
                                                    isMaxed ? "bg-gradient-to-r from-[#ff7675] to-[#d63031]" : "bg-gradient-to-r from-[#ffeaa7] to-[#fdcb6e]"
                                                )}
                                                style={{ width: `${Math.min(100, (dailyCoinsTotal / dailyLimit) * 100)}%` }}
                                            />
                                        </div>
                                        {isMaxed && (
                                            <p className="text-[11px] font-bold text-[#ff7675] text-center mt-2 animate-pulse bg-[#ff7675]/10 rounded py-1">
                                                오늘의 획득 가능 코인을 모두 모았습니다!
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={onRetry}
                                        className="h-14 font-pixel text-lg bg-[#2d3436] hover:bg-[#636e72] text-white border-2 border-black shadow-[0_6px_0_0_#1e272e] hover:shadow-[0_4px_0_0_#1e272e] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all"
                                    >
                                        <RotateCcw className="mr-2 w-5 h-5" /> RETRY
                                    </Button>
                                    <Button
                                        onClick={onExit}
                                        className={cn(
                                            "h-14 font-pixel text-lg text-white border-2 border-black shadow-[0_6px_0_0_rgba(0,0,0,0.5)] hover:shadow-[0_4px_0_0_rgba(0,0,0,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[6px] transition-all",
                                            isClear ? "bg-[#00b894] hover:bg-[#55efc4] shadow-[0_6px_0_0_#009276]" : "bg-[#d63031] hover:bg-[#ff7675] shadow-[0_6px_0_0_#b32b2b]"
                                        )}
                                    >
                                        EXIT <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
