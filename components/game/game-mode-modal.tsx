"use client";

import React from "react";
import { PixelModal } from "@/components/ui/pixel-modal";
import { Trophy, Gamepad2, Lock } from "lucide-react";

interface GameModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameTitle: string;
    onSelectMode: (mode: "practice" | "tournament") => void;
    tournamentActive?: boolean;
    remainingAttempts?: number;
}

export function GameModeModal({
    isOpen,
    onClose,
    gameTitle,
    onSelectMode,
    tournamentActive = false,
    remainingAttempts = 3
}: GameModeModalProps) {
    return (
        <PixelModal isOpen={isOpen} onClose={onClose} title="게임 모드 선택">
            <div className="mb-6 text-center sm:mb-8">
                <div className="relative mb-4 inline-block">
                    <div className="absolute inset-0 bg-black translate-x-[4px] translate-y-[4px] rounded-lg"></div>
                    <div className="relative rounded-lg border-4 border-black bg-[#3b82f6] px-4 py-3 sm:px-8">
                        <h3 className="flex items-center gap-2 font-pixel text-lg tracking-wider text-white sm:gap-3 sm:text-2xl">
                            <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6" />
                            {gameTitle}
                        </h3>
                    </div>
                </div>
                <p className="flex items-center justify-center gap-2 text-xs font-bold text-[#18181b]/60 sm:text-sm">
                    <span className="w-8 h-px bg-gray-300"></span>
                    플레이할 모드를 선택해주세요
                    <span className="w-8 h-px bg-gray-300"></span>
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {/* Practice Mode */}
                <button
                    onClick={() => onSelectMode("practice")}
                    className="group relative rounded-lg border-4 border-black bg-white p-3 transition-all hover:-translate-y-1 hover:bg-blue-50 hover:shadow-[4px_4px_0_0_black] sm:p-4"
                >
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#b2c4ff] shadow-[2px_2px_0_0_black] sm:h-12 sm:w-12">
                        <Gamepad2 className="h-5 w-5 text-black sm:h-6 sm:w-6" />
                    </div>
                    <h4 className="font-pixel font-bold mb-1">연습 모드</h4>
                    <p className="text-xs text-gray-500 font-bold mb-2">무제한 플레이</p>
                    <span className="inline-block bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded border border-green-300 font-bold">
                        코인 획득 가능
                    </span>
                </button>

                {/* Tournament Mode */}
                <button
                    onClick={() => tournamentActive && remainingAttempts > 0 ? onSelectMode("tournament") : null}
                    disabled={!tournamentActive || remainingAttempts <= 0}
                    className={`relative group rounded-lg border-4 border-black p-3 transition-all sm:p-4 
                        ${!tournamentActive
                            ? "bg-gray-100 opacity-70 cursor-not-allowed border-gray-400"
                            : "bg-[#fffbeb] hover:bg-[#fff0c2] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_black] cursor-pointer"
                        }`}
                >
                    {!tournamentActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 z-10 backdrop-blur-[1px]">
                            <div className="bg-black text-white text-xs px-2 py-1 font-pixel flex items-center gap-1">
                                <Lock size={12} /> 대회 기간 아님
                            </div>
                        </div>
                    )}

                    <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-black shadow-[2px_2px_0_0_black] sm:h-12 sm:w-12
                        ${tournamentActive ? "bg-[#fbbf24]" : "bg-gray-300"}`}>
                        <Trophy className="h-5 w-5 text-black sm:h-6 sm:w-6" />
                    </div>
                    <h4 className="font-pixel font-bold mb-1">대회 모드</h4>
                    <p className="text-xs text-gray-500 font-bold mb-2">랭킹 반영 (1일 3회)</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-bold
                         ${remainingAttempts > 0 ? 'bg-[#ff2e63] text-white border-black' : 'bg-gray-200 text-gray-500 border-gray-400'}`}>
                        남은 기회: {remainingAttempts}/3
                    </span>
                </button>
            </div>
        </PixelModal>
    );
}
