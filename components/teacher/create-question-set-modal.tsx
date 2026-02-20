"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { createQuestionSetAction } from "@/app/actions/teacher-v2";
import { useRouter } from "next/navigation";
import { BookOpen, Trophy, Globe, Lock, Sparkles, Layout } from "lucide-react";

export function CreateQuestionSetModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await createQuestionSetAction({
                title: formData.get("title") as string,
                gameId: formData.get("gameId") as string,
                grade: 5, // Mock for now, should get from profile
                classNum: 2, // Mock for now
                subject: formData.get("subject") as string
            });

            if (res.success) {
                setOpen(false);
                router.refresh();
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden">
                <DialogHeader className="bg-[#00b894] p-6 border-b-4 border-black text-white">
                    <DialogTitle className="font-pixel text-3xl flex items-center gap-3">
                        <div className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_0_black]">
                            <BookOpen className="w-8 h-8 text-[#00b894]" />
                        </div>
                        <span>새 문제 세트 만들기</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/90 font-bold mt-2">
                        학생들이 풀이할 퀴즈 세트를 생성합니다. 생성 후 문항을 편집할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid gap-6">
                        {/* Title Section */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="font-pixel text-lg flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" /> 세트 제목
                            </Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="예: 5학년 1학기 사회 핵심 정리"
                                className="h-12 border-3 border-black focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00b894] transition-all font-pixel text-lg placeholder:font-sans placeholder:font-normal placeholder:opacity-60"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Subject Section */}
                            <div className="space-y-2">
                                <Label className="font-pixel text-lg flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-orange-500" /> 과목
                                </Label>
                                <Select name="subject" required>
                                    <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-gray-50">
                                        <SelectValue placeholder="과목 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        <SelectItem value="math">수학</SelectItem>
                                        <SelectItem value="english">영어</SelectItem>
                                        <SelectItem value="science">과학</SelectItem>
                                        <SelectItem value="social">사회</SelectItem>
                                        <SelectItem value="history">국사</SelectItem>
                                        <SelectItem value="other">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Game Section */}
                            <div className="space-y-2">
                                <Label className="font-pixel text-lg flex items-center gap-2">
                                    <Layout className="w-4 h-4 text-blue-500" /> 대상 게임
                                </Label>
                                <Select name="gameId" defaultValue="pixel-runner" required>
                                    <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-gray-50">
                                        <SelectValue placeholder="게임 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        <SelectItem value="pixel-runner">픽셀 러너</SelectItem>
                                        <SelectItem value="word-runner">영단어 런닝</SelectItem>
                                        <SelectItem value="history-quiz">역사 퀴즈 탐험</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Scope Section */}
                        <div className="space-y-2">
                            <Label className="font-pixel text-lg flex items-center gap-2">
                                <Globe className="w-4 h-4 text-green-500" /> 공개 범위
                            </Label>
                            <Select name="scope" defaultValue="CLASS">
                                <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-gray-50 text-left">
                                    <SelectValue placeholder="범위 선택" />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-black font-bold">
                                    <SelectItem value="CLASS">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> 학급 전용 (우리 반만)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="GLOBAL">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4" /> 전체 공개 (모든 학교)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t-2 border-dashed border-gray-200">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-[#fdcb6e] hover:bg-[#fab1a0] text-black font-pixel text-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                        >
                            {isLoading ? "생성 중..." : "새 세트 생성하기"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
