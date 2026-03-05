'use client';

import React, { useState } from 'react';
import { PixelCard } from '@/components/ui/pixel-card';
import { Trophy, Target, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { TitleSelectionModal } from '@/components/student/title-selection-modal';
import { LevelInfoModal } from '@/components/student/level-info-modal';

interface DashboardCardsProps {
    rank: number;
    level: number;
    totalScore: number;
    totalGamesPlayed: number;
    studentTitle: string;
    attendanceCount: number;
    totalCoinsEarned: number;
    currentEquippedTitleId: string | null;
}

export function DashboardCards({
    rank,
    level,
    totalScore,
    studentTitle,
    attendanceCount,
    totalCoinsEarned,
    currentEquippedTitleId
}: DashboardCardsProps) {
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);

    return (
        <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Rank Card */}
                <Link href="/student/ranking" className="block outline-none">
                    <PixelCard className="relative flex min-h-[104px] cursor-pointer flex-row items-center gap-3 overflow-hidden border-[#fbbf24] bg-[#fffbeb] transition-all group hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] sm:gap-4 md:h-[104px]">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500">
                            <Trophy size={100} />
                        </div>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-black bg-[#fbbf24] shadow-[4px_4px_0_0_black] group-hover:animate-bounce sm:h-16 sm:w-16">
                            <Trophy className="h-7 w-7 text-black sm:h-8 sm:w-8" />
                        </div>
                        <div className="flex w-full min-w-0 flex-col justify-center">
                            <p className="font-pixel text-sm text-amber-800 mb-1 font-bold">우리반 랭킹 👆</p>
                            <p className="font-pixel text-2xl font-bold leading-none">{rank} <span className="text-sm">위</span></p>
                            <p className="text-[10px] font-bold text-transparent select-none mt-1">.</p>
                        </div>
                    </PixelCard>
                </Link>

                {/* Score Card (Level Info) */}
                <div onClick={() => setIsLevelModalOpen(true)} className="block outline-none">
                    <PixelCard className="relative flex min-h-[104px] cursor-pointer flex-row items-center gap-3 overflow-hidden border-[#08d9d6] bg-[#e0fafa] transition-all group hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] sm:gap-4 md:h-[104px]">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500">
                            <Target size={100} />
                        </div>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-black bg-[#08d9d6] shadow-[4px_4px_0_0_black] group-hover:animate-pulse sm:h-16 sm:w-16">
                            <Target className="h-7 w-7 text-black sm:h-8 sm:w-8" />
                        </div>
                        <div className="flex w-full min-w-0 flex-col justify-center">
                            <p className="font-pixel text-sm text-teal-800 mb-1 font-bold">총 누적 기록 👆</p>
                            <p className="font-pixel text-2xl font-bold leading-none">LV. {level}</p>
                            <p className="text-[10px] font-bold text-teal-600 mt-1">점수: {totalScore.toLocaleString()}점</p>
                        </div>
                    </PixelCard>
                </div>

                {/* Title Card */}
                <div onClick={() => setIsTitleModalOpen(true)} className="block outline-none">
                    <PixelCard className="relative flex min-h-[104px] cursor-pointer flex-row items-center gap-3 overflow-hidden border-[#ff2e63] bg-[#ffe4e6] transition-all group hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] sm:gap-4 md:h-[104px]">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500">
                            <Sparkles size={100} />
                        </div>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-black bg-[#ff2e63] shadow-[4px_4px_0_0_black] group-hover:animate-spin-slow sm:h-16 sm:w-16">
                            <Sparkles className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                        </div>
                        <div className="flex w-full min-w-0 flex-col justify-center pr-2">
                            <p className="font-pixel text-sm text-rose-800 mb-1 font-bold">나의 칭호 👆</p>
                            <p className="font-pixel text-sm font-bold leading-none truncate sm:text-base xl:text-lg">{studentTitle}</p>
                            <p className="text-[10px] font-bold text-rose-600 mt-1">출석: {attendanceCount}회</p>
                        </div>
                    </PixelCard>
                </div>
            </div>

            <LevelInfoModal
                isOpen={isLevelModalOpen}
                onClose={() => setIsLevelModalOpen(false)}
                totalScore={totalScore}
            />

            <TitleSelectionModal
                isOpen={isTitleModalOpen}
                onClose={() => setIsTitleModalOpen(false)}
                totalCoinsEarned={totalCoinsEarned}
                currentEquippedTitleId={currentEquippedTitleId}
            />
        </>
    );
}
