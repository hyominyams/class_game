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

const UNSET_NICKNAME = "-";

function isAnonymousNickname(value: string) {
    return value.replace(/\s+/g, "").toLowerCase() === "익명";
}

function toDisplayNickname(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return UNSET_NICKNAME;
    }

    const normalized = trimmed.replace(/\s+/g, "").toLowerCase();
    if (normalized === "익명" || normalized === "unknown") {
        return UNSET_NICKNAME;
    }

    return trimmed;
}

function toEditableNickname(value: string) {
    const displayNickname = toDisplayNickname(value);
    return displayNickname === UNSET_NICKNAME ? "" : displayNickname;
}

export function StudentMyPageClient({ username, initialNickname }: StudentMyPageClientProps) {
    const [nickname, setNickname] = useState(() => toEditableNickname(initialNickname));
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
        <div className="grid gap-5 lg:grid-cols-2">
            <StudentPixelCard className="group relative !p-0 overflow-hidden border-4 border-black bg-[#fff6da] shadow-[8px_8px_0_0_black] transition-transform hover:-translate-y-1">
                <div className="absolute inset-x-0 top-0 h-2 bg-[#ff2e63]" />
                <div className="relative space-y-5 p-5 sm:p-6">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                        <div>
                            <p className="font-pixel text-xs text-[#ff2e63]">PROFILE</p>
                            <h2 className="mt-1 font-pixel text-2xl font-bold">프로필 설정</h2>
                            <p className="mt-2 text-sm font-bold text-slate-600">
                                이름은 고정되며 닉네임만 변경할 수 있습니다.
                            </p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-black bg-white text-xl shadow-[2px_2px_0_0_black] sm:h-12 sm:w-12 sm:text-2xl">
                            👤
                        </span>
                    </div>

                    <div className="rounded-md border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_black]">
                        <p className="text-[11px] font-bold text-gray-500">랭킹 표시 닉네임</p>
                        <p className="font-pixel text-lg text-[#ff2e63]">{toDisplayNickname(nickname)}</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleNicknameSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="student-username" className="font-pixel text-sm">
                                이름
                            </Label>
                            <Input
                                id="student-username"
                                value={username}
                                readOnly
                                disabled
                                className="border-2 border-black bg-gray-100 font-pixel text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="student-nickname" className="font-pixel text-sm">
                                닉네임
                            </Label>
                            <Input
                                id="student-nickname"
                                value={nickname}
                                onChange={(event) => setNickname(event.target.value)}
                                maxLength={20}
                                className="border-2 border-black bg-white font-pixel text-sm placeholder:font-bold"
                                placeholder="닉네임을 입력하세요"
                            />
                            <p className="text-xs text-gray-500 font-bold">
                                &quot;익명&quot; 닉네임은 사용할 수 없습니다.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isNicknamePending}
                            className="w-full border-2 border-black bg-[#00b894] font-pixel text-white shadow-[2px_2px_0_0_black] transition-all hover:-translate-y-0.5 hover:bg-[#00a885] hover:shadow-[4px_4px_0_0_black]"
                        >
                            {isNicknamePending ? "저장 중..." : "닉네임 저장"}
                        </Button>
                    </form>
                </div>
            </StudentPixelCard>

            <StudentPixelCard className="group relative !p-0 overflow-hidden border-4 border-black bg-[#eef3ff] shadow-[8px_8px_0_0_black] transition-transform hover:-translate-y-1">
                <div className="absolute inset-x-0 top-0 h-2 bg-[#6c5ce7]" />
                <div className="relative space-y-5 p-5 sm:p-6">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                        <div>
                            <p className="font-pixel text-xs text-[#6c5ce7]">SECURITY</p>
                            <h2 className="mt-1 font-pixel text-2xl font-bold">비밀번호 변경</h2>
                            <p className="mt-2 text-sm font-bold text-slate-600">
                                비밀번호만 변경 가능합니다.
                            </p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-black bg-white text-xl shadow-[2px_2px_0_0_black] sm:h-12 sm:w-12 sm:text-2xl">
                            🔐
                        </span>
                    </div>

                    <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="student-new-password" className="font-pixel text-sm">
                                새 비밀번호
                            </Label>
                            <Input
                                id="student-new-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="최소 6자 이상"
                                className="border-2 border-black bg-white font-pixel text-sm placeholder:font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="student-confirm-password" className="font-pixel text-sm">
                                비밀번호 확인
                            </Label>
                            <Input
                                id="student-confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                placeholder="비밀번호를 다시 입력하세요"
                                className="border-2 border-black bg-white font-pixel text-sm placeholder:font-bold"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isPasswordPending}
                            className="w-full border-2 border-black bg-[#6c5ce7] font-pixel text-white shadow-[2px_2px_0_0_black] transition-all hover:-translate-y-0.5 hover:bg-[#5f27cd] hover:shadow-[4px_4px_0_0_black]"
                        >
                            {isPasswordPending ? "변경 중..." : "비밀번호 변경"}
                        </Button>
                    </form>
                </div>
            </StudentPixelCard>
        </div>
    );
}
