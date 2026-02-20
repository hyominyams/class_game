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
import { User, Contact, KeyRound, Save, AlertCircle } from "lucide-react";

interface EditStudentModalProps {
    children: React.ReactNode;
    student: {
        id: number;
        name: string;
        username: string;
    }
}

export function EditStudentModal({ children, student }: EditStudentModalProps) {
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement actual student update logic
        console.log("Student updated");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden">
                <DialogHeader className="bg-[#00b894] p-6 border-b-4 border-black text-white">
                    <DialogTitle className="font-pixel text-3xl flex items-center gap-3">
                        <div className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_0_black]">
                            <User className="w-8 h-8 text-[#00b894]" />
                        </div>
                        <span>학생 정보 수정</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/90 font-bold mt-2">
                        학생의 프로필 정보를 관리합니다. <span className="underline decoration-pink-500 decoration-2 italic text-white uppercase">ID는 수정할 수 없습니다.</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid gap-5">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name" className="font-pixel text-lg flex items-center gap-2">
                                <User className="w-4 h-4 text-pink-500" /> 이름
                            </Label>
                            <Input
                                id="edit-name"
                                defaultValue={student.name}
                                className="h-12 border-3 border-black focus-visible:ring-0 font-pixel text-lg bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2 opacity-70">
                            <Label htmlFor="edit-id" className="font-pixel text-lg flex items-center gap-2">
                                <Contact className="w-4 h-4 text-gray-500" /> 아이디 (변경 불가)
                            </Label>
                            <Input
                                id="edit-id"
                                defaultValue={student.username}
                                className="h-12 border-3 border-black bg-gray-100 font-pixel text-lg cursor-not-allowed"
                                disabled
                            />
                        </div>
                    </div>

                    <div className="bg-orange-50 border-3 border-dashed border-orange-200 p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-orange-800 font-bold leading-relaxed">
                            비밀번호를 분실한 경우 아래의 [PW 초기화] 버튼을 눌러 초기 비밀번호(1234)로 변경할 수 있습니다.
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-14 border-3 border-black font-pixel text-lg hover:bg-red-50 text-red-600 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_black] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
                        >
                            <KeyRound className="w-5 h-5" /> PW 초기화
                        </Button>
                        <Button
                            type="submit"
                            className="flex-[1.5] h-14 bg-[#00b894] hover:bg-[#00a885] text-white font-pixel text-lg border-3 border-black shadow-[4px_4px_0_0_black] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> 정보 저장하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
