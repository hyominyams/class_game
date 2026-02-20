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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rank Card */}
                <Link href="/student/ranking" className="block outline-none">
                    <PixelCard className="bg-[#fffbeb] border-[#fbbf24] flex flex-row items-center gap-4 relative overflow-hidden h-[104px] cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] transition-all group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500">
                            <Trophy size={100} />
                        </div>
                        <div className="w-16 h-16 bg-[#fbbf24] border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_black] shrink-0 group-hover:animate-bounce">
                            <Trophy className="w-8 h-8 text-black" />
                        </div>
                        <div className="flex flex-col justify-center w-full min-w-0">
                            <p className="font-pixel text-sm text-amber-800 mb-1 font-bold">우리반 랭킹 👆</p>
                            <p className="font-pixel text-2xl font-bold leading-none">{rank} <span className="text-sm">위</span></p>
                            <p className="text-[10px] font-bold text-transparent select-none mt-1">.</p>
                        </div>
                    </PixelCard>
                </Link>

                {/* Score Card (Level Info) */}
                <div onClick={() => setIsLevelModalOpen(true)} className="block outline-none">
                    <PixelCard className="bg-[#e0fafa] border-[#08d9d6] flex flex-row items-center gap-4 relative overflow-hidden h-[104px] cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] transition-all group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500">
                            <Target size={100} />
                        </div>
                        <div className="w-16 h-16 bg-[#08d9d6] border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_black] shrink-0 group-hover:animate-pulse">
                            <Target className="w-8 h-8 text-black" />
                        </div>
                        <div className="flex flex-col justify-center w-full min-w-0">
                            <p className="font-pixel text-sm text-teal-800 mb-1 font-bold">총 누적 기록 👆</p>
                            <p className="font-pixel text-2xl font-bold leading-none">LV. {level}</p>
                            <p className="text-[10px] font-bold text-teal-600 mt-1">점수: {totalScore.toLocaleString()}점</p>
                        </div>
                    </PixelCard>
                </div>

                {/* Title Card */}
                <div onClick={() => setIsTitleModalOpen(true)} className="block outline-none">
                    <PixelCard className="bg-[#ffe4e6] border-[#ff2e63] flex flex-row items-center gap-4 relative overflow-hidden h-[104px] cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] transition-all group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500">
                            <Sparkles size={100} />
                        </div>
                        <div className="w-16 h-16 bg-[#ff2e63] border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_black] shrink-0 group-hover:animate-spin-slow">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex flex-col justify-center w-full min-w-0 pr-2">
                            <p className="font-pixel text-sm text-rose-800 mb-1 font-bold">나의 칭호 👆</p>
                            <p className="font-pixel xl:text-lg text-base font-bold truncate leading-none">{studentTitle}</p>
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
