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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/app/actions/auth";
import { toast } from "sonner";
import { Lock, KeyRound } from "lucide-react";

interface ChangePasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        try {
            const result = await changePasswordAction(password);
            if (result.success) {
                toast.success(result.message || "비밀번호가 변경되었습니다.");
                onOpenChange(false);
                setPassword("");
                setConfirmPassword("");
            } else {
                toast.error(result.error || "비밀번호 변경에 실패했습니다.");
            }
        } catch (error) {
            toast.error("알 수 없는 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white border-4 border-black shadow-[8px_8px_0_0_black] p-0 font-sans">
                <DialogHeader className="bg-[#6c5ce7] p-6 border-b-4 border-black text-white">
                    <DialogTitle className="font-pixel text-2xl flex items-center gap-2">
                        <Lock className="w-6 h-6" /> 비밀번호 변경
                    </DialogTitle>
                    <DialogDescription className="text-white/80 font-bold">
                        새로운 비밀번호를 입력해주세요.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password" className="font-bold flex items-center gap-2">
                            <KeyRound className="w-4 h-4" /> 새 비밀번호
                        </Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="6자 이상 입력"
                            className="border-2 border-black focus-visible:ring-0 focus-visible:border-[#6c5ce7]"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="font-bold flex items-center gap-2">
                            <KeyRound className="w-4 h-4" /> 비밀번호 확인
                        </Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호 재입력"
                            className="border-2 border-black focus-visible:ring-0 focus-visible:border-[#6c5ce7]"
                            required
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#6c5ce7] hover:bg-[#5f27cd] text-white font-bold border-2 border-black shadow-[4px_4px_0_0_black] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                        >
                            {loading ? "변경 중..." : "비밀번호 변경하기"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
