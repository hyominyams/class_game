"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Joystick, Landmark, Link2 } from "lucide-react";
import { GameModeModal } from "@/components/game/game-mode-modal";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { PixelCard } from "@/components/ui/pixel-card";

type GameCategory = "MATH" | "ENGLISH" | "HISTORY" | "GENERAL";

type Game = {
    id: string;
    title: string;
    category: GameCategory;
    description: string;
    color: string;
    icon: React.ElementType;
    isTournament?: boolean;
    tournamentId?: string;
};

const CATEGORY_ORDER: GameCategory[] = ["MATH", "ENGLISH", "HISTORY", "GENERAL"];
const FILTERS: Array<"ALL" | GameCategory> = ["ALL", ...CATEGORY_ORDER];

const GAMES: Game[] = [
    {
        id: "word-runner",
        title: "단어 디펜스",
        category: "ENGLISH",
        description: "주어진 뜻에 맞는 단어를 빠르게 입력해 성문을 지키세요.",
        color: "bg-pink-100",
        icon: BookOpen,
    },
    {
        id: "word-chain",
        title: "단어 연결",
        category: "ENGLISH",
        description: "제시어를 보고 정답을 이어서 입력해 점수를 올리세요.",
        color: "bg-indigo-100",
        icon: Link2,
    },
    {
        id: "history-quiz",
        title: "역사 퀴즈 어택",
        category: "HISTORY",
        description: "역사 지식을 퀴즈로 확인하세요.",
        color: "bg-yellow-100",
        icon: Landmark,
    },
    {
        id: "pixel-runner",
        title: "픽셀러너",
        category: "GENERAL",
        description: "장애물을 피하고 문제를 풀며 달리세요.",
        color: "bg-green-100",
        icon: Joystick,
    },
];

interface GameListClientProps {
    activeTournaments: Array<{ id: string; game_id: string }>;
    participationMap: Record<string, { allowed: boolean; attemptsLeft: number }>;
}

export function GameListClient({ activeTournaments, participationMap }: GameListClientProps) {
    const router = useRouter();
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [filter, setFilter] = useState<"ALL" | GameCategory>("ALL");

    const gamesWithStatus = useMemo(() => {
        return GAMES
            .map((game) => {
                const tournament = activeTournaments.find((item) => item.game_id === game.id);
                return {
                    ...game,
                    isTournament: Boolean(tournament),
                    tournamentId: tournament?.id,
                };
            })
            .sort((a, b) => {
                const categoryDelta = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
                if (categoryDelta !== 0) return categoryDelta;
                return a.title.localeCompare(b.title, "ko");
            });
    }, [activeTournaments]);

    const filteredGames = filter === "ALL" ? gamesWithStatus : gamesWithStatus.filter((game) => game.category === filter);

    const getRemainingAttempts = (gameId: string) => {
        return participationMap[gameId]?.attemptsLeft ?? 3;
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="mb-2 font-pixel text-3xl font-bold">게임 선택</h1>
                <p className="font-bold text-gray-200">플레이할 학습 게임을 선택하세요.</p>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide">
                {FILTERS.map((category) => (
                    <button
                        key={category}
                        onClick={() => setFilter(category)}
                        className={`relative whitespace-nowrap rounded border-4 border-black px-4 py-2 font-pixel text-sm shadow-[2px_2px_0_0_black] transition-all ${filter === category
                                ? "z-10 -translate-y-1 bg-[#ff2e63] text-white shadow-[4px_4px_0_0_black]"
                                : "bg-white hover:z-10 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-[3px_3px_0_0_black]"
                            }`}
                    >
                        {category === "ALL" ? "전체" : category}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredGames.map((game) => (
                    <div key={game.id} onClick={() => setSelectedGame(game)} className="group cursor-pointer">
                        <PixelCard className="relative h-full overflow-hidden border-black transition-all group-hover:-translate-y-2 group-hover:shadow-[8px_8px_0_0_black] hover:bg-white">
                            <div className={`absolute left-0 top-0 z-0 h-24 w-full ${game.color} opacity-50`} />

                            <div className="relative z-10 flex flex-col items-center pb-4 pt-8 text-center">
                                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-white shadow-[4px_4px_0_0_black]">
                                    <game.icon size={40} className="text-black" />
                                </div>

                                <PixelBadge variant="outline" className="mb-2 bg-white">
                                    {game.category}
                                </PixelBadge>
                                <h3 className="mb-2 font-pixel text-xl font-bold">{game.title}</h3>
                                <p className="line-clamp-2 px-4 text-sm font-bold text-gray-500">{game.description}</p>
                            </div>

                            {game.isTournament && (
                                <div className="absolute right-2 top-2">
                                    <span className="inline-block animate-pulse rounded border-2 border-black bg-[#ff2e63] px-2 py-0.5 text-[10px] font-bold text-white shadow-[2px_2px_0_0_black]">
                                        대회 진행중
                                    </span>
                                </div>
                            )}
                        </PixelCard>
                    </div>
                ))}
            </div>

            {filteredGames.length === 0 && (
                <div className="rounded-xl border-4 border-dashed border-black bg-white p-6 text-center font-bold text-gray-600">
                    해당 카테고리에 표시할 게임이 없습니다.
                </div>
            )}

            {selectedGame && (
                <GameModeModal
                    isOpen={Boolean(selectedGame)}
                    onClose={() => setSelectedGame(null)}
                    gameTitle={selectedGame.title}
                    tournamentActive={selectedGame.isTournament}
                    remainingAttempts={getRemainingAttempts(selectedGame.id)}
                    onSelectMode={(mode) => {
                        let targetPath = "";
                        if (selectedGame.id === "pixel-runner") targetPath = "/student/game/pixel-runner";
                        else if (selectedGame.id === "word-runner") targetPath = "/student/game/word-defense";
                        else if (selectedGame.id === "history-quiz") targetPath = "/student/game/history-quiz";
                        else if (selectedGame.id === "word-chain") targetPath = "/student/game/word-chain";

                        if (targetPath) {
                            if (mode === "tournament") {
                                const left = getRemainingAttempts(selectedGame.id);
                                if (window.confirm(`${left}회 도전 가능합니다. 대회에 참가할까요?`)) {
                                    router.push(`${targetPath}?mode=tournament&tournamentId=${selectedGame.tournamentId}`);
                                }
                            } else {
                                router.push(`${targetPath}?mode=practice`);
                            }
                        }

                        setSelectedGame(null);
                    }}
                />
            )}
        </div>
    );
}
