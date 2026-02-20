"use client";

import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { WordSetModal } from "./word-set-modal";
import { HistorySetModal } from "./history-set-modal";
import { Plus } from "lucide-react";

type Game = {
    id: string; // or number
    title: string;
};



// Helper component for the selected game's modal
export function QuestionSetModalWrapper({
    selectedGameId,
    selectedGame,
    teacherProfile,
    children,
    setId,
    initialTitle
}: {
    selectedGameId: string;
    selectedGame: { title: string } | undefined;
    teacherProfile: any;
    children: React.ReactNode;
    setId?: string;
    initialTitle?: string;
}) {
    if (!selectedGameId) return <>{children}</>;

    // Check for specific game types (using ID as proxy for now)
    if (selectedGameId === 'word-runner' || selectedGameId.includes('word')) {
        return (
            <WordSetModal
                gameId={selectedGameId}
                gameTitle={selectedGame?.title}
                teacherProfile={teacherProfile}
                setId={setId}
                initialTitle={initialTitle}
            >
                {children}
            </WordSetModal>
        );
    }

    // Default fallback to Generic Quiz Modal
    return (
        <HistorySetModal
            gameId={selectedGameId}
            gameTitle={selectedGame?.title || '퀴즈'}
            teacherProfile={teacherProfile}
            setId={setId}
            initialTitle={initialTitle}
        >
            {children}
        </HistorySetModal>
    );
}

import { useRouter } from "next/navigation";

export function QuestionSetManager({
    games,
    teacherProfile,
    initialGameId = ""
}: {
    games: Game[],
    teacherProfile?: any,
    initialGameId?: string
}) {
    const [selectedGameId, setSelectedGameId] = useState<string>(initialGameId);
    const router = useRouter();

    // Helper to get selected game title
    const selectedGame = games.find(g => String(g.id) === selectedGameId);

    const handleGameChange = (value: string) => {
        setSelectedGameId(value);
        router.push(`/teacher/questions?gameId=${value}`);
    };

    return (
        <div className="flex gap-2 items-center">
            <Select onValueChange={handleGameChange} value={selectedGameId}>
                <SelectTrigger className="w-[180px] bg-white border-2 border-black">
                    <SelectValue placeholder="게임 선택" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-black font-bold">
                    <SelectItem value="all" className="hover:bg-gray-50">전체 보기</SelectItem>
                    {games && games.length > 0 ? (
                        games.map(g => (
                            <SelectItem key={String(g.id)} value={String(g.id)} className="hover:bg-yellow-50">
                                {g.title}
                            </SelectItem>
                        ))
                    ) : (
                        <div className="p-2 text-sm text-gray-500 text-center">등록된 게임이 없습니다.</div>
                    )}
                </SelectContent>
            </Select>

            <QuestionSetModalWrapper selectedGameId={selectedGameId} selectedGame={selectedGame} teacherProfile={teacherProfile}>
                <Button
                    disabled={!selectedGameId || selectedGameId === "all"}
                    className="bg-[#ffeaa7] text-black border-2 border-black hover:bg-[#fdcb6e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    새 문제 세트 만들기
                </Button>
            </QuestionSetModalWrapper>
        </div>
    );
}
