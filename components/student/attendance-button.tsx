"use client";

import React, { useState, useEffect } from "react";
import { PixelButton } from "@/components/ui/pixel-button";
import { checkAttendance, performAttendance } from "@/app/actions/game";
import { toast } from "sonner";
import { ATTENDANCE_COIN_REWARD } from "@/app/constants/economy";

export function AttendanceButton() {
    const [canAttend, setCanAttend] = useState<boolean | null>(null);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            const { canAttend } = await checkAttendance();
            setCanAttend(canAttend);
        };
        fetchStatus();
    }, []);

    const handleAttend = async () => {
        setIsPending(true);
        try {
            const result = await performAttendance();
            if (result.success) {
                setCanAttend(false);
                toast.success(result.message);
                window.dispatchEvent(new Event("daily-coin-progress-refresh"));
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error("출석 체크 중 오류가 발생했습니다.");
        } finally {
            setIsPending(false);
        }
    };

    if (canAttend === null) return null;

    return (
        <div className="flex w-full flex-col items-center gap-3 rounded-lg border-4 border-black bg-white p-3 text-center shadow-[4px_4px_0_0_black] sm:p-4">
            <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span className="font-pixel text-lg font-bold">오늘의 출석 체크</span>
            </div>
            {canAttend ? (
                <div className="text-center space-y-2">
                    <p className="text-sm text-gray-500 font-bold">출석 보상으로 {ATTENDANCE_COIN_REWARD}코인을 받으세요!</p>
                    <PixelButton
                        onClick={handleAttend}
                        disabled={isPending}
                        className="bg-[#08d9d6] text-black hover:bg-[#06b6b3]"
                    >
                        {isPending ? "처리 중..." : "출석 체크하기"}
                    </PixelButton>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-gray-400 font-bold italic">이미 오늘 출석 체크를 완료했습니다 ✨</p>
                </div>
            )}
        </div>
    );
}
