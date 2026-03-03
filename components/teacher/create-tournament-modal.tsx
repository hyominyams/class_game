"use client";

import { useMemo, useState } from "react";
import { Calendar, ListFilter, Rocket, Sparkles, Trophy, Users } from "lucide-react";
import { createTournamentAction } from "@/app/actions/tournament";
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

const GAME_LABELS: Record<string, string> = {
    "pixel-runner": "픽셀러너",
    "word-runner": "단어 디펜스",
    "history-quiz": "역사 퀴즈 어택",
    "word-chain": "단어 연결",
};

const DEFAULT_GAME_ORDER = ["pixel-runner", "word-runner", "history-quiz"];

export function CreateTournamentModal({
    children,
    questionSets,
}: {
    children: React.ReactNode;
    questionSets: QuestionSet[];
}) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [endTime, setEndTime] = useState("");
    const [target, setTarget] = useState<"CLASS" | "GRADE">("CLASS");
    const [selectedSetByGame, setSelectedSetByGame] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const gameIds = useMemo(() => {
        const fromSets = Array.from(
            new Set(
                questionSets
                    .map((set) => set.game_id)
                    .filter((gameId): gameId is string => Boolean(gameId)),
            ),
        );
        const prioritized = DEFAULT_GAME_ORDER.filter((gameId) => fromSets.includes(gameId));
        const extras = fromSets.filter((gameId) => !DEFAULT_GAME_ORDER.includes(gameId));
        return [...prioritized, ...extras];
    }, [questionSets]);

    const handleSelectSet = (gameId: string, setId: string) => {
        setSelectedSetByGame((prev) => ({
            ...prev,
            [gameId]: setId,
        }));
    };

    const selectedCount = useMemo(() => {
        return Object.values(selectedSetByGame).filter(Boolean).length;
    }, [selectedSetByGame]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const gameSetSelections = Object.entries(selectedSetByGame)
            .filter(([, setId]) => Boolean(setId))
            .map(([gameId, questionSetId]) => ({ gameId, questionSetId }));

        if (gameSetSelections.length === 0) {
            alert("게임별 문제 세트를 최소 1개 이상 선택해 주세요.");
            return;
        }

        const now = new Date();
        const end = new Date(endTime);

        if (end <= now) {
            alert("종료 시간은 현재 시간보다 이후여야 합니다.");
            return;
        }

        setLoading(true);

        const res = await createTournamentAction({
            title,
            startTime: now.toISOString(),
            endTime: end.toISOString(),
            target,
            gameSetSelections,
        });

        setLoading(false);
        if (res.success) {
            setOpen(false);
            setTitle("");
            setEndTime("");
            setSelectedSetByGame({});
            window.location.reload();
        } else {
            alert("Error: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[550px] overflow-hidden border-4 border-black bg-white p-0 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader className="border-b-4 border-black bg-[#ff2e63] p-6 text-white">
                    <DialogTitle className="flex items-center gap-3 font-pixel text-3xl">
                        <div className="rounded border-2 border-black bg-white p-2 shadow-[2px_2px_0_0_black]">
                            <Trophy className="h-8 w-8 text-[#ff2e63]" />
                        </div>
                        <span>학급 대회 개설</span>
                    </DialogTitle>
                    <DialogDescription className="mt-2 font-bold text-white/90">
                        게임과 문제 세트를 선택해 새로운 대회를 시작합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="t-title" className="flex items-center gap-2 font-pixel text-lg">
                                <Sparkles className="h-4 w-4 text-yellow-500" /> 대회명
                            </Label>
                            <Input
                                id="t-title"
                                placeholder="예: 5학년 2반 주말 챌린지"
                                className="h-12 border-3 border-black bg-gray-50 font-pixel text-lg transition-all placeholder:font-sans placeholder:font-normal placeholder:opacity-60 focus-visible:border-[#ff2e63] focus-visible:ring-0 focus-visible:ring-offset-0"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="t-date" className="flex items-center gap-2 font-pixel text-lg">
                                    <Calendar className="h-4 w-4 text-blue-500" /> 종료 일시
                                </Label>
                                <Input
                                    id="t-date"
                                    type="datetime-local"
                                    className="h-12 border-3 border-black bg-white font-bold focus-visible:ring-0"
                                    value={endTime}
                                    onChange={(event) => setEndTime(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="t-scope" className="flex items-center gap-2 font-pixel text-lg">
                                    <Users className="h-4 w-4 text-green-500" /> 참여 범위
                                </Label>
                                <Select value={target} onValueChange={(val: "CLASS" | "GRADE") => setTarget(val)}>
                                    <SelectTrigger className="h-12 border-3 border-black bg-white font-bold focus:ring-0">
                                        <SelectValue placeholder="범위를 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-black font-bold">
                                        <SelectItem value="CLASS">우리 반 학생</SelectItem>
                                        <SelectItem value="GRADE">학년 전체 (준비중)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 font-pixel text-lg">
                                <ListFilter className="h-4 w-4 text-purple-500" /> 게임별 문제 세트 선택
                            </Label>
                            <div className="rounded-lg border-2 border-black bg-gray-50 p-3 text-xs font-bold">
                                선택한 게임: {selectedCount}개
                            </div>

                            {gameIds.length > 0 ? (
                                <div className="max-h-[250px] space-y-3 overflow-y-auto pr-1">
                                    {gameIds.map((gameId) => {
                                        const setsForGame = questionSets.filter((set) => set.game_id === gameId);
                                        const label = GAME_LABELS[gameId] || gameId;

                                        return (
                                            <div key={gameId} className="space-y-1">
                                                <p className="text-sm font-bold text-gray-700">{label}</p>
                                                <Select
                                                    value={selectedSetByGame[gameId] || ""}
                                                    onValueChange={(value) => handleSelectSet(gameId, value)}
                                                >
                                                    <SelectTrigger className="h-11 border-2 border-black bg-white">
                                                        <SelectValue placeholder={`${label} 문제 세트 선택`} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[200px] border-2 border-black font-bold">
                                                        {setsForGame.length > 0 ? (
                                                            setsForGame.map((set) => (
                                                                <SelectItem key={set.id} value={set.id}>
                                                                    {set.title}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value={`${gameId}-none`} disabled>
                                                                활성 문제 세트가 없습니다.
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border-2 border-dashed border-black bg-white p-4 text-center text-sm font-bold text-gray-500">
                                    아직 활성 문제 세트가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            className="h-16 w-full border-4 border-black bg-[#ff2e63] font-pixel text-2xl text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#d63031] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">대회 생성 중...</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Rocket className="h-6 w-6" /> 대회 시작!
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
