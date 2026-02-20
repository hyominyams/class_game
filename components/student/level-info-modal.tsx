'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCurrentLevelProgress } from '@/app/constants/levels';
import { Target, Trophy, ArrowUp } from 'lucide-react';

interface LevelInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalScore: number;
}

export function LevelInfoModal({ isOpen, onClose, totalScore }: LevelInfoModalProps) {
    const progress = getCurrentLevelProgress(totalScore);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-[#e0fafa] border-4 border-black p-0 overflow-hidden shadow-[8px_8px_0_0_black]">
                <DialogHeader className="p-6 pb-2 border-b-4 border-black bg-[#08d9d6]">
                    <DialogTitle className="font-pixel text-2xl font-bold flex items-center gap-2">
                        <Target className="w-6 h-6" /> 레벨업 정보
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Current Level Status */}
                    <div className="text-center relative">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-black rounded-full shadow-[4px_4px_0_0_black] mb-4">
                            <span className="font-pixel text-4xl font-bold text-[#08d9d6]">LV.{progress.level}</span>
                        </div>
                        <h3 className="font-pixel text-xl font-bold">내 누적 점수: {totalScore.toLocaleString()}점</h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_black]">
                        <div className="flex justify-between font-bold text-sm mb-2 text-teal-800">
                            <span>LV.{progress.level}</span>
                            <span>LV.{progress.level + 1}</span>
                        </div>

                        <div className="relative h-6 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-[#08d9d6] transition-all duration-1000 ease-out flex items-center justify-end px-2"
                                style={{ width: `${progress.percentage}%` }}
                            >
                                {progress.percentage >= 15 && (
                                    <span className="text-[10px] font-bold text-black mix-blend-overlay">
                                        {Math.floor(progress.percentage)}%
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-3 text-center text-sm font-bold text-slate-600">
                            다음 레벨까지 <span className="text-rose-500">{progress.requiredInLevel - progress.earnedInLevel}</span>점 남았습니다!
                        </div>
                        <div className="mt-1 text-center text-[10px] text-gray-400 font-bold">
                            다음 레벨 요구 점수: {progress.nextTarget.toLocaleString()}점
                        </div>
                    </div>

                    {/* Level System Description */}
                    <div className="bg-teal-50 border-2 border-teal-200 rounded p-4">
                        <h4 className="font-bold flex items-center gap-1 text-teal-800 mb-2">
                            <ArrowUp size={16} /> 레벨 달성 가이드
                        </h4>
                        <ul className="text-sm font-bold text-slate-600 space-y-2 list-disc pl-4">
                            <li>레벨은 오직 게임을 통해 획득한 <strong>누적 점수(스코어)</strong>로만 올라갑니다.</li>
                            <li>코인은 상점에서 아이템을 사거나 칭호를 얻는데 사용되며 레벨과는 별개입니다.</li>
                            <li>레벨이 높아질수록 레벨업에 필요한 점수 요구치가 더욱 가팔라집니다. 한계를 돌파해보세요!</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
