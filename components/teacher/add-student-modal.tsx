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
import { createStudentAction } from "@/app/actions/teacher-v2";
import { UserPlus, User, Contact, GraduationCap, School, ShieldCheck } from "lucide-react";

export function AddStudentModal({ children, teacherProfile }: { children: React.ReactNode, teacherProfile?: any }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await createStudentAction({
                nickname: formData.get("nickname") as string,
                username: formData.get("username") as string,
                grade: parseInt(formData.get("grade") as string),
                classNum: parseInt(formData.get("classNum") as string)
            });

            if (res.success) {
                setOpen(false);
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
            <DialogContent className="sm:max-w-[450px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden">
                <DialogHeader className="bg-[#6c5ce7] p-6 border-b-4 border-black text-white">
                    <DialogTitle className="font-pixel text-3xl flex items-center gap-3">
                        <div className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_0_black]">
                            <UserPlus className="w-8 h-8 text-[#6c5ce7]" />
                        </div>
                        <span>학생 추가</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/90 font-bold mt-2">
                        새로운 학생 계정을 생성합니다. 초기 비밀번호는 <span className="underline decoration-yellow-400 decoration-2">1234</span>로 자동 설정됩니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid gap-5">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="font-pixel text-lg flex items-center gap-2">
                                <User className="w-4 h-4 text-pink-500" /> 이름
                            </Label>
                            <Input
                                id="name"
                                name="nickname"
                                placeholder="학생 이름을 입력하세요"
                                className="h-12 border-3 border-black focus-visible:ring-0 font-pixel text-lg bg-gray-50 placeholder:font-sans placeholder:font-normal placeholder:opacity-60"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id" className="font-pixel text-lg flex items-center gap-2">
                                <Contact className="w-4 h-4 text-blue-500" /> 아이디
                            </Label>
                            <Input
                                id="id"
                                name="username"
                                placeholder="영어/숫자 아이디 (예: shinwol01)"
                                className="h-12 border-3 border-black focus-visible:ring-0 font-pixel text-lg bg-gray-50 placeholder:font-sans placeholder:font-normal placeholder:opacity-60"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="grade" className="font-pixel text-lg flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-green-500" /> 학년
                                </Label>
                                <Select name="grade" defaultValue={teacherProfile?.grade?.toString() || "5"}>
                                    <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-white disabled:bg-gray-100" disabled={!!teacherProfile?.grade}>
                                        <SelectValue placeholder="학년 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        {[3, 4, 5, 6].map(g => (
                                            <SelectItem key={g} value={g.toString()}>{g}학년</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="class" className="font-pixel text-lg flex items-center gap-2">
                                    <School className="w-4 h-4 text-orange-500" /> 반
                                </Label>
                                <Select name="classNum" defaultValue={teacherProfile?.class?.toString() || "1"}>
                                    <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-white disabled:bg-gray-100" disabled={!!teacherProfile?.class}>
                                        <SelectValue placeholder="반 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        {[1, 2, 3, 4, 5, 6].map(c => (
                                            <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-[#6c5ce7] hover:bg-[#5f27cd] text-white font-pixel text-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">생성 중...</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6" /> 계정 생성하기
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
