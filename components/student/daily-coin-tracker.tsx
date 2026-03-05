"use client";

import { useEffect, useState } from "react";
import { getDailyCoinProgress } from "@/app/actions/game";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailyCoinTracker() {
    const [progress, setProgress] = useState<{ current: number, limit: number } | null>(null);

    useEffect(() => {
        const fetchProgress = async () => {
            const data = await getDailyCoinProgress();
            setProgress(data);
        };

        fetchProgress();

        const refreshProgress = () => {
            fetchProgress();
        };

        window.addEventListener("daily-coin-progress-refresh", refreshProgress);
        return () => {
            window.removeEventListener("daily-coin-progress-refresh", refreshProgress);
        };
    }, []);

    if (!progress) return null;

    const percentage = Math.min(100, (progress.current / progress.limit) * 100);
    const isMaxed = progress.current >= progress.limit;

    return (
        <div className="flex h-[50px] w-full max-w-full items-center gap-2 rounded-lg border-4 border-black bg-white px-3 py-2 shadow-[4px_4px_0_0_black] sm:h-[52px] sm:gap-4 sm:px-4 sm:min-w-[300px] md:min-w-[360px]">
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center">
                    <Coins className="w-4 h-4 text-black" />
                </div>
                <span className="font-pixel text-[10px] uppercase font-bold text-gray-700 hidden sm:block">Daily</span>
            </div>

            <div className="flex-1 flex flex-col gap-1 justify-center">
                <div className="h-4 bg-gray-100 border-2 border-black overflow-hidden relative rounded-sm">
                    <div
                        className={cn(
                            "h-full transition-all duration-1000 relative",
                            isMaxed ? "bg-[#ff2e63]" : "bg-[#fbbf24]"
                        )}
                        style={{
                            width: `${percentage}%`,
                            backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                            backgroundSize: '10px 10px'
                        }}
                    />
                </div>
                {isMaxed && (
                    <p className="font-pixel text-[7px] text-[#ff2e63] leading-none animate-pulse">
                        LIMIT REACHED
                    </p>
                )}
            </div>

            <div className="min-w-[44px] shrink-0 text-right sm:min-w-[50px]">
                <span className="font-pixel text-[10px] font-bold text-gray-600 block leading-none">
                    {progress.current}
                </span>
                <span className="font-pixel text-[8px] text-gray-400 block mt-0.5">
                    / {progress.limit}
                </span>
            </div>
        </div>
    );
}
