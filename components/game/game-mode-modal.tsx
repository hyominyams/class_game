"use client";

import React from "react";
import { PixelModal } from "@/components/ui/pixel-modal";
import { PixelButton } from "@/components/ui/pixel-button";
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
            <div className="text-center mb-8">
                <div className="inline-block relative mb-4">
                    <div className="absolute inset-0 bg-black translate-x-[4px] translate-y-[4px] rounded-lg"></div>
                    <div className="relative bg-[#3b82f6] border-4 border-black px-8 py-3 rounded-lg">
                        <h3 className="font-pixel text-2xl text-white tracking-wider flex items-center gap-3">
                            <Gamepad2 className="w-6 h-6" />
                            {gameTitle}
                        </h3>
                    </div>
                </div>
                <p className="text-[#18181b]/60 font-bold text-sm flex items-center justify-center gap-2">
                    <span className="w-8 h-px bg-gray-300"></span>
                    플레이할 모드를 선택해주세요
                    <span className="w-8 h-px bg-gray-300"></span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Practice Mode */}
                <button
                    onClick={() => onSelectMode("practice")}
                    className="relative group bg-white border-4 border-black p-4 rounded-lg hover:bg-blue-50 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_0_black]"
                >
                    <div className="w-12 h-12 bg-[#b2c4ff] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0_0_black]">
                        <Gamepad2 className="w-6 h-6 text-black" />
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
                    className={`relative group border-4 border-black p-4 rounded-lg transition-all 
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

                    <div className={`w-12 h-12 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0_0_black]
                        ${tournamentActive ? "bg-[#fbbf24]" : "bg-gray-300"}`}>
                        <Trophy className="w-6 h-6 text-black" />
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
