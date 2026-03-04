"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { changePasswordAction, updateStudentNicknameAction } from "@/app/actions/auth";

type StudentMyPageClientProps = {
    username: string;
    initialNickname: string;
};

function isAnonymousNickname(value: string) {
    return value.replace(/\s+/g, "").toLowerCase() === "익명";
}

export function StudentMyPageClient({ username, initialNickname }: StudentMyPageClientProps) {
    const [nickname, setNickname] = useState(initialNickname);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isNicknamePending, startNicknameTransition] = useTransition();
    const [isPasswordPending, startPasswordTransition] = useTransition();

    const handleNicknameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = nickname.trim();
        if (trimmed.length < 2) {
            toast.error("닉네임은 최소 2글자 이상이어야 합니다.");
            return;
        }

        if (isAnonymousNickname(trimmed)) {
            toast.error("닉네임을 익명으로 설정할 수 없습니다.");
            return;
        }

        startNicknameTransition(async () => {
            const result = await updateStudentNicknameAction(trimmed);
            if (result.success) {
                toast.success(result.message || "닉네임이 변경되었습니다.");
            } else {
                toast.error(result.error || "닉네임 변경에 실패했습니다.");
            }
        });
    };

    const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (password.length < 6) {
            toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("비밀번호가 일치하지 않습니다.");
            return;
        }

        startPasswordTransition(async () => {
            const result = await changePasswordAction(password);
            if (result.success) {
                toast.success(result.message || "비밀번호가 변경되었습니다.");
                setPassword("");
                setConfirmPassword("");
            } else {
                toast.error(result.error || "비밀번호 변경에 실패했습니다.");
            }
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <StudentPixelCard title="프로필 설정" description="이름은 고정되며 닉네임만 변경할 수 있습니다.">
                <form className="space-y-4" onSubmit={handleNicknameSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="student-username" className="font-bold">
                            이름
                        </Label>
                        <Input
                            id="student-username"
                            value={username}
                            readOnly
                            disabled
                            className="bg-gray-100 border-2 border-black"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="student-nickname" className="font-bold">
                            닉네임
                        </Label>
                        <Input
                            id="student-nickname"
                            value={nickname}
                            onChange={(event) => setNickname(event.target.value)}
                            maxLength={20}
                            className="bg-white border-2 border-black"
                            placeholder="닉네임을 입력하세요"
                        />
                        <p className="text-xs text-gray-500 font-bold">
                            &quot;익명&quot; 닉네임은 사용할 수 없습니다.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        disabled={isNicknamePending}
                        className="w-full bg-[#00b894] hover:bg-[#00a885] text-white border-2 border-black font-bold"
                    >
                        {isNicknamePending ? "저장 중..." : "닉네임 저장"}
                    </Button>
                </form>
            </StudentPixelCard>

            <StudentPixelCard title="비밀번호 변경" description="비밀번호만 변경 가능합니다.">
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="student-new-password" className="font-bold">
                            새 비밀번호
                        </Label>
                        <Input
                            id="student-new-password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="최소 6자 이상"
                            className="bg-white border-2 border-black"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="student-confirm-password" className="font-bold">
                            비밀번호 확인
                        </Label>
                        <Input
                            id="student-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="비밀번호를 다시 입력하세요"
                            className="bg-white border-2 border-black"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isPasswordPending}
                        className="w-full bg-[#6c5ce7] hover:bg-[#5f27cd] text-white border-2 border-black font-bold"
                    >
                        {isPasswordPending ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                </form>
            </StudentPixelCard>
        </div>
    );
}
