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
import { createTournamentAction } from "@/app/actions/tournament";
import { Trophy, Calendar, Users, ListFilter, Sparkles, Rocket } from "lucide-react";

type QuestionSet = {
    id: string;
    title: string;
    game_id: string | null;
    grade: number | null;
    class: number | null;
    created_at: string | null;
    created_by: string | null;
    is_active: boolean | null;
};

export function CreateTournamentModal({ children, questionSets }: { children: React.ReactNode, questionSets: QuestionSet[] }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [endTime, setEndTime] = useState("");
    const [target, setTarget] = useState<"CLASS" | "GRADE">("CLASS");
    const [selectedSetId, setSelectedSetId] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedSetId) {
            alert("문제 세트를 선택해주세요.");
            return;
        }

        const selectedSet = questionSets.find(s => s.id === selectedSetId);
        if (!selectedSet) return;

        // Start time is now, End time is from input
        const now = new Date();
        const end = new Date(endTime);

        if (end <= now) {
            alert("종료 시간은 현재 시간보다 뒤여야 합니다.");
            return;
        }

        setLoading(true);

        const res = await createTournamentAction({
            title,
            gameId: selectedSet.game_id || "pixel-runner",
            questionSetId: selectedSetId,
            startTime: now.toISOString(),
            endTime: end.toISOString(),
            target
        });

        setLoading(false);
        if (res.success) {
            setOpen(false);
            setTitle("");
            setEndTime("");
            setSelectedSetId("");
            window.location.reload();
        } else {
            alert("Error: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden">
                <DialogHeader className="bg-[#ff2e63] p-6 border-b-4 border-black text-white">
                    <DialogTitle className="font-pixel text-3xl flex items-center gap-3">
                        <div className="bg-white p-2 border-2 border-black rounded shadow-[2px_2px_0_0_black]">
                            <Trophy className="w-8 h-8 text-[#ff2e63]" />
                        </div>
                        <span>새 대회 개최</span>
                    </DialogTitle>
                    <DialogDescription className="text-white/90 font-bold mt-2">
                        학생들이 실력을 겨룰 수 있는 토너먼트를 개최합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid gap-6">
                        {/* Title Section */}
                        <div className="space-y-2">
                            <Label htmlFor="t-title" className="font-pixel text-lg flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" /> 대회명
                            </Label>
                            <Input
                                id="t-title"
                                placeholder="예: 5학년 2반 최강자전"
                                className="h-12 border-3 border-black focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#ff2e63] transition-all font-pixel text-lg bg-gray-50 placeholder:font-sans placeholder:font-normal placeholder:opacity-60"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Date Section */}
                            <div className="space-y-2">
                                <Label htmlFor="t-date" className="font-pixel text-lg flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" /> 종료 일시
                                </Label>
                                <Input
                                    id="t-date"
                                    type="datetime-local"
                                    className="h-12 border-3 border-black focus-visible:ring-0 font-bold bg-white"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Scope Section */}
                            <div className="space-y-2">
                                <Label htmlFor="t-scope" className="font-pixel text-lg flex items-center gap-2">
                                    <Users className="w-4 h-4 text-green-500" /> 참가 대상
                                </Label>
                                <Select value={target} onValueChange={(val: "CLASS" | "GRADE") => setTarget(val)}>
                                    <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-white">
                                        <SelectValue placeholder="대상 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        <SelectItem value="CLASS">우리 반 학생들</SelectItem>
                                        <SelectItem value="GRADE">5학년 전체 (승인필요)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Question Set Section */}
                        <div className="space-y-2">
                            <Label htmlFor="t-questions" className="font-pixel text-lg flex items-center gap-2">
                                <ListFilter className="w-4 h-4 text-purple-500" /> 문제 세트 선택
                            </Label>
                            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                                <SelectTrigger className="h-12 border-3 border-black focus:ring-0 font-bold bg-white">
                                    <SelectValue placeholder="사용한 문제 세트 선택" />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-black font-bold max-h-[200px]">
                                    {questionSets.length > 0 ? (
                                        questionSets.map(set => (
                                            <SelectItem key={set.id} value={set.id}>
                                                <div className="flex flex-col">
                                                    <span>{set.title}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold underline">{set.game_id}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            생성된 문제 세트가 없습니다.
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            className="w-full h-16 bg-[#ff2e63] hover:bg-[#d63031] text-white font-pixel text-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">대회 개최 중...</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Rocket className="w-6 h-6" /> 대회 오픈!
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
