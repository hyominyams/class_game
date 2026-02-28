"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HistorySetModal } from "./history-set-modal";
import { WordChainSetModal } from "./word-chain-set-modal";
import { WordSetModal } from "./word-set-modal";

type GameItem = {
    id: string;
    title: string;
};

type TeacherProfile = {
    grade?: number | null;
    class?: number | null;
} | null;

type QuestionSetModalWrapperProps = {
    selectedGameId: string;
    selectedGame?: GameItem;
    teacherProfile?: TeacherProfile;
    children: React.ReactNode;
    setId?: string;
    initialTitle?: string;
    initialGrade?: number | null;
    initialClass?: number | null;
    initialQuestionMode?: string | null;
};

export function QuestionSetModalWrapper({
    selectedGameId,
    selectedGame,
    teacherProfile,
    children,
    setId,
    initialTitle,
    initialGrade,
    initialClass,
    initialQuestionMode,
}: QuestionSetModalWrapperProps) {
    if (!selectedGameId) {
        return <>{children}</>;
    }

    if (selectedGameId === "word-chain") {
        return (
            <WordChainSetModal
                gameId={selectedGameId}
                gameTitle={selectedGame?.title}
                teacherProfile={teacherProfile}
                setId={setId}
                initialTitle={initialTitle}
                initialGrade={initialGrade}
                initialClass={initialClass}
            >
                {children}
            </WordChainSetModal>
        );
    }

    if (selectedGameId === "word-runner" || selectedGameId === "word-defense") {
        return (
            <WordSetModal
                gameId={selectedGameId === "word-defense" ? "word-runner" : selectedGameId}
                gameTitle={selectedGame?.title}
                teacherProfile={teacherProfile}
                setId={setId}
                initialTitle={initialTitle}
                initialGrade={initialGrade}
                initialClass={initialClass}
                initialQuestionMode={initialQuestionMode}
            >
                {children}
            </WordSetModal>
        );
    }

    return (
        <HistorySetModal
            gameId={selectedGameId}
            gameTitle={selectedGame?.title || "퀴즈"}
            teacherProfile={teacherProfile}
            setId={setId}
            initialTitle={initialTitle}
            initialGrade={initialGrade}
            initialClass={initialClass}
        >
            {children}
        </HistorySetModal>
    );
}

export function QuestionSetManager({
    games,
    teacherProfile,
    initialGameId = "",
    basePath = "/teacher/questions",
}: {
    games: GameItem[];
    teacherProfile?: TeacherProfile;
    initialGameId?: string;
    basePath?: string;
}) {
    const [selectedGameId, setSelectedGameId] = useState(initialGameId);
    const router = useRouter();

    const selectedGame = games.find((game) => String(game.id) === selectedGameId);

    const handleGameChange = (value: string) => {
        setSelectedGameId(value);
        router.push(`${basePath}?gameId=${value}`);
    };

    return (
        <div className="flex gap-2 items-center">
            <Select onValueChange={handleGameChange} value={selectedGameId}>
                <SelectTrigger className="w-[190px] bg-white border-2 border-black">
                    <SelectValue placeholder="게임 선택" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-black font-bold">
                    <SelectItem value="all" className="hover:bg-gray-50">
                        전체 보기
                    </SelectItem>
                    {games.length > 0 ? (
                        games.map((game) => (
                            <SelectItem key={game.id} value={game.id} className="hover:bg-yellow-50">
                                {game.title}
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
