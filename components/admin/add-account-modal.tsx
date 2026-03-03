"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { bulkCreateAccounts } from "@/app/admin/accounts/actions";

export function AddAccountModal({
    role,
    onSuccess,
}: {
    role: "teacher" | "student";
    onSuccess?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [grade, setGrade] = useState("");
    const [classNum, setClassNum] = useState("");
    const [nickname, setNickname] = useState("");
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!grade || !classNum || !nickname || !loginId) {
            toast.error("필수 항목을 모두 입력해주세요.");
            return;
        }

        setLoading(true);

        try {
            const res = await bulkCreateAccounts([
                {
                    role,
                    grade: Number(grade),
                    classNum: Number(classNum),
                    nickname: nickname.trim(),
                    loginId: loginId.trim(),
                    password: password.trim() || undefined,
                },
            ]);

            if (res.success && res.results) {
                if (res.results.failures.length > 0) {
                    toast.error(`계정 생성 실패: ${res.results.failures[0].reason}`);
                } else {
                    toast.success("계정이 성공적으로 생성되었습니다.");
                    setOpen(false);
                    setGrade("");
                    setClassNum("");
                    setNickname("");
                    setLoginId("");
                    setPassword("");
                    if (onSuccess) onSuccess();
                }
            } else {
                toast.error(res.error || "계정 생성 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error(error);
            toast.error("알 수 없는 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#6c5ce7] text-white border-2 border-black shadow-[2px_2px_0_0_black] hover:bg-[#a29bfe] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all active:shadow-none active:translate-y-[2px] active:translate-x-[2px]">
                    <UserPlus className="w-4 h-4 mr-2" />
                    단일 계정 추가
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white border-4 border-black p-0 sm:rounded-xl overflow-hidden">
                <DialogHeader className="bg-[#a29bfe] p-6 border-b-4 border-black">
                    <DialogTitle className="font-pixel text-xl text-black">
                        {role === "teacher" ? "교사" : "학생"} 단일 계정 추가
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#fdf5e6]">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold">학년 *</Label>
                            <Input
                                type="number"
                                required
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="border-2 border-black"
                                placeholder="예: 5"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold">반 *</Label>
                            <Input
                                type="number"
                                required
                                value={classNum}
                                onChange={(e) => setClassNum(e.target.value)}
                                className="border-2 border-black"
                                placeholder="예: 1"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">이름 (닉네임) *</Label>
                        <Input
                            required
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="border-2 border-black"
                            placeholder="예: 홍길동"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">로그인 아이디 *</Label>
                        <Input
                            required
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            className="border-2 border-black"
                            placeholder="예: teacher_5_1_hong"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">비밀번호 (선택)</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-2 border-black"
                            placeholder="기본값: a123456789"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1 border-2 border-black hover:bg-gray-100"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-black text-white hover:bg-gray-800"
                        >
                            {loading ? "생성 중..." : "추가하기"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
