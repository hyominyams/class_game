'use client'

import { useState, useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PixelModal } from "@/components/ui/pixel-modal";
import { createTeacherAction } from "./actions";

export function CreateTeacherModal() {
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(createTeacherAction, {});

    useEffect(() => {
        if (state.success) {
            setOpen(false);
            // Optionally reset form or show toast
        }
    }, [state.success]);

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-[#2d3436] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
                + 학급 추가 / 교사 배정
            </Button>

            <PixelModal
                isOpen={open}
                onClose={() => setOpen(false)}
                title="새 학급/교사 등록"
            >
                <form action={formAction} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">학년</label>
                        <select name="grade" className="w-full border-2 border-black p-2 pixel-font" required>
                            {[3, 4, 5, 6].map(g => <option key={g} value={g}>{g}학년</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">반</label>
                        <input type="number" name="class" min="1" max="20" className="w-full border-2 border-black p-2 pixel-font" required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">교사 성함 (닉네임)</label>
                        <input type="text" name="nickname" className="w-full border-2 border-black p-2 pixel-font placeholder:font-sans placeholder:font-normal placeholder:opacity-60" placeholder="예: 김선생님" required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">로그인 ID</label>
                        <input type="text" name="loginId" className="w-full border-2 border-black p-2 pixel-font placeholder:font-sans placeholder:font-normal placeholder:opacity-60" placeholder="teacher_5_1" required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">비밀번호</label>
                        <input type="text" name="password" defaultValue="a123456789" className="w-full border-2 border-black p-2 pixel-font bg-gray-100" />
                        <p className="text-xs text-gray-500/70 mt-1">* 기본값: a123456789</p>
                    </div>

                    {state.error && (
                        <p className="text-red-500 text-sm font-bold">{state.error}</p>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-black">취소</Button>
                        <Button type="submit" disabled={isPending} className="bg-[#0984e3] text-white hover:bg-[#74b9ff] border-black">
                            {isPending ? '생성 중...' : '등록하기'}
                        </Button>
                    </div>
                </form>
            </PixelModal>
        </>
    );
}
