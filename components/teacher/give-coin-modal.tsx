"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { giveCoinToStudentAction } from "@/app/actions/teacher-v2";
import { Coins, Plus, Minus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function GiveCoinModal({ studentId, studentName, children }: { studentId: string, studentName: string, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState<string | number>("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const coinAmount = Number(amount);
        if (!amount || isNaN(coinAmount) || coinAmount <= 0) {
            toast.warning("유효한 코인 수량을 입력해주세요.");
            return;
        }

        setLoading(true);

        const res = await giveCoinToStudentAction(studentId, coinAmount, reason || "학급 보상");

        setLoading(false);
        if (res.success) {
            setOpen(false);
            setAmount("");
            setReason("");
            toast.success(`${studentName} 학생에게 ${coinAmount} 코인을 지급했습니다.`);
            // window.location.reload(); // Optional: consider using router.refresh() or letting parent update
            window.location.reload();
        } else {
            toast.error("Error: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-md bg-white border-4 border-black shadow-[8px_8px_0_0_black] p-0 overflow-hidden">
                <DialogHeader className="bg-[#fdcb6e] p-6 border-b-4 border-black">
                    <DialogTitle className="font-pixel text-2xl flex items-center gap-3">
                        <div className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_0_black]">
                            <Coins className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div className="flex flex-col">
                            <span>코인 지급</span>
                            <span className="text-sm font-bold opacity-80">{studentName} 학생</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-pixel text-lg flex items-center gap-2">
                                <Plus className="w-4 h-4" /> 지급 수량
                            </Label>
                            <div className="relative group">
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    min={1}
                                    required
                                    className="h-14 font-pixel text-2xl pl-12 border-3 border-black focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#ff2e63] transition-all bg-gray-50 text-left"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <span className="text-xl">💰</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-pixel text-lg flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> 사유
                            </Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="예: 발표 우수, 청소 당번 등"
                                required
                                className="h-12 font-pixel text-lg border-3 border-black focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#ff2e63] transition-all placeholder:font-sans placeholder:font-normal placeholder:opacity-60"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full h-16 bg-[#ff2e63] hover:bg-[#ff4e7d] text-white font-pixel text-xl border-4 border-black shadow-[4px_4px_0_0_black] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">지급 중...</span>
                            ) : (
                                "코인 지급 확정!"
                            )}
                        </Button>
                        <p className="text-center text-[10px] text-gray-400 mt-2 font-pixel">
                            ※ 지급된 코인은 취소할 수 없습니다. 신중히 발송해주세요.
                        </p>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
