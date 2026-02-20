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
import { createBulkStudentsAction } from "@/app/actions/teacher-v2";
import { Users, Plus, UserPlus, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, if not, window.alert for now

export function BulkCreateStudentModal({ children, teacherProfile }: { children: React.ReactNode, teacherProfile?: any }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"count" | "input">("count");
    const [studentCount, setStudentCount] = useState(5);
    const [students, setStudents] = useState<{ nickname: string; username: string }[]>([]);

    const handleGenerateFields = () => {
        const newStudents = Array.from({ length: studentCount }, (_, i) => ({
            nickname: "",
            username: ""
        }));
        setStudents(newStudents);
        setStep("input");
    };

    const handleAddRow = () => {
        setStudents([...students, { nickname: "", username: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        const newStudents = [...students];
        newStudents.splice(index, 1);
        setStudents(newStudents);
    };

    const handleInputChange = (index: number, field: "nickname" | "username", value: string) => {
        const newStudents = [...students];
        newStudents[index][field] = value;
        setStudents(newStudents);
    };

    const handleSubmit = async () => {
        // Validate
        const validStudents = students.filter(s => s.nickname.trim() !== "" && s.username.trim() !== "");
        if (validStudents.length === 0) {
            toast.warning("최소 1명 이상의 학생 정보를 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            const studentsToCreate = validStudents.map(s => ({
                ...s,
                grade: teacherProfile?.grade,
                classNum: teacherProfile?.class
            }));

            const res = await createBulkStudentsAction(studentsToCreate);

            if (res.success) {
                const results = res.results!;
                if (results.failures.length > 0) {
                    toast.warning(`${results.successCount}명 성공, ${results.failures.length}명 실패`, {
                        description: `실패 사유: ${results.failures.map(f => f.username).join(', ')} (로그 확인 필요)`,
                        duration: 5000,
                    });
                } else {
                    toast.success(`${results.successCount}명의 학생 계정이 생성되었습니다!`);
                    setOpen(false);
                    setStep("count");
                    setStudentCount(5);
                    setStudents([]);
                }
            } else {
                toast.error(res.error || "계정 생성 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error(error);
            toast.error("알 수 없는 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setStep("count"); // Reset on close
                setStudents([]);
            }
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogHeader className="bg-[#6c5ce7] p-6 border-b-4 border-black text-white shrink-0">
                    <DialogTitle className="font-pixel text-3xl flex items-center gap-3">
                        <div className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_0_black]">
                            <Users className="w-8 h-8 text-[#6c5ce7]" />
                        </div>
                        <span>학생 계정 일괄 생성</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/90 font-bold mt-2">
                        {step === "count" ? "생성할 학생 수를 입력하세요." : "학생 정보를 입력하세요."} ({teacherProfile?.grade}학년 {teacherProfile?.class}반)
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === "count" ? (
                        <div className="flex flex-col items-center justify-center gap-6 py-10">
                            <div className="flex items-center gap-4">
                                <Label htmlFor="count" className="font-pixel text-xl">학생 수:</Label>
                                <Input
                                    id="count"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={studentCount}
                                    onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                                    className="w-32 h-12 text-center text-xl font-bold border-3 border-black"
                                />
                                <span className="font-pixel text-xl">명</span>
                            </div>
                            <Button
                                onClick={handleGenerateFields}
                                className="h-14 px-8 bg-[#00b894] hover:bg-[#00a885] text-white font-pixel text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" /> 입력폼 생성하기
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-[60px_1fr_1fr_60px] gap-4 font-bold text-center border-b-2 border-black pb-2 sticky top-0 bg-white z-10">
                                <div className="p-2">No.</div>
                                <div className="p-2">이름</div>
                                <div className="p-2">아이디 (ID)</div>
                                <div className="p-2">삭제</div>
                            </div>

                            <div className="space-y-2">
                                {students.map((student, idx) => (
                                    <div key={idx} className="grid grid-cols-[60px_1fr_1fr_60px] gap-4 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex justify-center items-center font-pixel text-lg">
                                            {idx + 1}
                                        </div>
                                        <Input
                                            value={student.nickname}
                                            onChange={(e) => handleInputChange(idx, "nickname", e.target.value)}
                                            placeholder="이름"
                                            className="h-10 border-2 border-black font-medium"
                                        />
                                        <Input
                                            value={student.username}
                                            onChange={(e) => handleInputChange(idx, "username", e.target.value)}
                                            placeholder="아이디"
                                            className="h-10 border-2 border-black font-mono text-sm bg-gray-50"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveRow(idx)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 mx-auto"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flexjustify-center pt-4">
                                <Button
                                    variant="outline"
                                    onClick={handleAddRow}
                                    className="w-full h-12 border-2 border-dashed border-gray-400 text-gray-500 hover:border-black hover:text-black hover:bg-gray-50 font-bold"
                                >
                                    <Plus className="mr-2 h-5 w-5" /> 학생 1명 추가하기
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {step === "input" && (
                    <DialogFooter className="p-6 border-t-4 border-black bg-gray-50 shrink-0 flex justify-between sm:justify-between w-full">
                        <Button
                            variant="outline"
                            onClick={() => setStep("count")}
                            className="h-14 px-6 border-3 border-black font-pixel text-lg hover:bg-gray-200"
                        >
                            뒤로가기
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="h-14 px-8 bg-[#6c5ce7] hover:bg-[#5f27cd] text-white font-pixel text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">생성 중...</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6" /> 일괄 생성하기
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
