'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TITLES, TitleId } from '@/app/constants/titles';
import { equipTitleAction } from '@/app/actions/game';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

interface TitleSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalCoinsEarned: number;
    currentEquippedTitleId: string | null;
}

export function TitleSelectionModal({ isOpen, onClose, totalCoinsEarned, currentEquippedTitleId }: TitleSelectionModalProps) {
    const router = useRouter();
    const [isEquipping, setIsEquipping] = useState(false);

    const handleEquip = async (titleId: TitleId) => {
        if (titleId === currentEquippedTitleId) return;
        setIsEquipping(true);
        try {
            const result = await equipTitleAction(titleId);
            if (result.success) {
                toast.success('칭호가 성공적으로 변경되었습니다!');
                router.refresh();
                onClose();
            } else {
                toast.error(result.error || '칭호 변경에 실패했습니다.');
            }
        } catch (error) {
            toast.error('오류가 발생했습니다.');
        } finally {
            setIsEquipping(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#fffbeb] border-4 border-black p-0 overflow-hidden shadow-[8px_8px_0_0_black]">
                <DialogHeader className="p-6 pb-2 border-b-4 border-black bg-[#fbbf24]">
                    <DialogTitle className="font-pixel text-2xl font-bold flex items-center gap-2">
                        ✨ 나의 칭호 선택
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6">
                    <p className="font-bold text-slate-600 mb-6 text-sm">
                        달성한 코인으로 획득한 칭호를 장착하여 자신을 뽐내보세요!<br />
                        <span className="text-rose-600">내 누적 코인: {totalCoinsEarned.toLocaleString()}</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {TITLES.map((title) => {
                            const isUnlocked = totalCoinsEarned >= title.requiredCoins;
                            const isEquipped = title.id === currentEquippedTitleId;

                            return (
                                <div
                                    key={title.id}
                                    className={`relative border-4 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${isUnlocked
                                            ? isEquipped
                                                ? 'bg-[#ffe4e6] border-[#ff2e63] shadow-[4px_4px_0_0_#ff2e63] translate-y-[-2px]'
                                                : 'bg-white border-black shadow-[4px_4px_0_0_black] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_black]'
                                            : 'bg-gray-100 border-gray-400 opacity-80 cursor-not-allowed'
                                        }`}
                                >
                                    {!isUnlocked && (
                                        <div className="absolute top-2 right-2 text-gray-500">
                                            <Lock size={16} />
                                        </div>
                                    )}

                                    <div className={`text-4xl mb-2 flex items-center justify-center w-16 h-16 rounded-full border-4 ${isUnlocked ? (isEquipped ? 'bg-[#ff2e63] border-black text-white px-2' : 'bg-rose-100 border-black') : 'bg-gray-200 border-gray-400 grayscale'
                                        }`}>
                                        <span className={!isUnlocked ? 'opacity-50' : ''}>{title.icon}</span>
                                    </div>
                                    <h3 className={`font-pixel text-xl font-bold mb-1 ${!isUnlocked ? 'text-gray-500' : ''}`}>
                                        {title.name}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-500 mb-4 h-8 flex items-center justify-center">
                                        {title.description}
                                    </p>

                                    {isUnlocked ? (
                                        <button
                                            onClick={() => handleEquip(title.id as TitleId)}
                                            disabled={isEquipped || isEquipping}
                                            className={`w-full py-2 border-2 rounded font-bold text-sm transition-all focus:outline-none ${isEquipped
                                                    ? 'bg-rose-600 text-white border-black cursor-default shadow-none'
                                                    : 'bg-[#fbbf24] text-black border-black shadow-[2px_2px_0_0_black] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_black] active:translate-y-1 active:shadow-none'
                                                }`}
                                        >
                                            {isEquipped ? '장착 중' : '장착하기'}
                                        </button>
                                    ) : (
                                        <div className="w-full py-2 border-2 rounded font-bold text-sm bg-gray-200 text-gray-500 border-gray-400">
                                            {title.requiredCoins} 코인 필요
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
