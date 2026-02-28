"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Globe, Layout, Lock, Sparkles, Trophy } from "lucide-react";
import { createQuestionSetAction } from "@/app/actions/teacher-v2";
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
    SelectValue,
} from "@/components/ui/select";

export function CreateQuestionSetModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        const formData = new FormData(event.currentTarget);

        try {
            const res = await createQuestionSetAction({
                title: formData.get("title") as string,
                gameId: formData.get("gameId") as string,
                grade: 5,
                classNum: 2,
                subject: formData.get("subject") as string,
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
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[550px] overflow-hidden border-4 border-black bg-white p-0 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader className="border-b-4 border-black bg-[#00b894] p-6 text-white">
                    <DialogTitle className="flex items-center gap-3 font-pixel text-3xl">
                        <div className="rounded border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_black]">
                            <BookOpen className="h-8 w-8 text-[#00b894]" />
                        </div>
                        <span>새 문제 세트 만들기</span>
                    </DialogTitle>
                    <DialogDescription className="mt-2 font-bold text-white/90">
                        학생들이 플레이할 퀴즈 세트를 생성합니다. 생성 후 문항을 입력할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="flex items-center gap-2 font-pixel text-lg">
                                <Sparkles className="h-4 w-4 text-yellow-500" /> 세트 제목
                            </Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="예: 5학년 1학기 단원 정리"
                                className="h-12 border-3 border-black font-pixel text-lg transition-all placeholder:font-sans placeholder:font-normal placeholder:opacity-60 focus-visible:border-[#00b894] focus-visible:ring-0 focus-visible:ring-offset-0"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-pixel text-lg">
                                    <Trophy className="h-4 w-4 text-orange-500" /> 과목
                                </Label>
                                <Select name="subject" required>
                                    <SelectTrigger className="h-12 border-3 border-black bg-gray-50 font-bold focus:ring-0">
                                        <SelectValue placeholder="과목을 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        <SelectItem value="math">수학</SelectItem>
                                        <SelectItem value="english">영어</SelectItem>
                                        <SelectItem value="science">과학</SelectItem>
                                        <SelectItem value="social">사회</SelectItem>
                                        <SelectItem value="history">역사</SelectItem>
                                        <SelectItem value="other">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-pixel text-lg">
                                    <Layout className="h-4 w-4 text-blue-500" /> 대상 게임
                                </Label>
                                <Select name="gameId" defaultValue="pixel-runner" required>
                                    <SelectTrigger className="h-12 border-3 border-black bg-gray-50 font-bold focus:ring-0">
                                        <SelectValue placeholder="게임을 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        <SelectItem value="pixel-runner">픽셀 러너</SelectItem>
                                        <SelectItem value="word-runner">word defense</SelectItem>
                                        <SelectItem value="word-chain">워드 체인</SelectItem>
                                        <SelectItem value="history-quiz">역사 퀴즈 탐험</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-pixel text-lg">
                                <Globe className="h-4 w-4 text-green-500" /> 공개 범위
                            </Label>
                            <Select name="scope" defaultValue="CLASS">
                                <SelectTrigger className="h-12 border-3 border-black bg-gray-50 text-left font-bold focus:ring-0">
                                    <SelectValue placeholder="범위를 선택하세요" />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-black font-bold">
                                    <SelectItem value="CLASS">
                                        <div className="flex items-center gap-2">
                                            <Lock className="h-4 w-4" /> 학급 전용 (우리 반만)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="GLOBAL">
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4" /> 전체 공개 (모든 학교)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="border-t-2 border-dashed border-gray-200 pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-16 w-full border-4 border-black bg-[#fdcb6e] font-pixel text-2xl text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#fab1a0] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
                        >
                            {isLoading ? "생성 중..." : "문제 세트 생성하기"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
