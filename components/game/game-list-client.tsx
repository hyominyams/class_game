"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { GameModeModal } from "@/components/game/game-mode-modal";
import { Joystick, BookOpen, Calculator, Globe } from "lucide-react";

// Game type definition
type Game = {
    id: string;
    title: string;
    category: string;
    description: string;
    color: string;
    icon: React.ElementType;
    isTournament?: boolean;
    tournamentId?: string;
};

const GAMES: Game[] = [
    {
        id: "english-run",
        title: "영단어 런닝",
        category: "ENGLISH",
        description: "단어를 맞추고 누구보다 빠르게 달리세요.",
        color: "bg-pink-100",
        icon: BookOpen,
    },
    {
        id: "history-quiz",
        title: "역사 퀴즈 탐험",
        category: "SOCIAL",
        description: "역사 상식을 퀴즈로 풀어봐요.",
        color: "bg-yellow-100",
        icon: Globe,
    },
    {
        id: "pixel-runner",
        title: "픽셀 러너",
        category: "SOCIAL",
        description: "장애물을 피하고 퀴즈를 풀며 달리세요!",
        color: "bg-green-100",
        icon: Joystick,
    },
];

interface GameListClientProps {
    activeTournaments: any[];
    participationMap: Record<string, { allowed: boolean, attemptsLeft: number }>;
}

export function GameListClient({ activeTournaments, participationMap }: GameListClientProps) {
    const router = useRouter();
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [filter, setFilter] = useState("ALL");

    // Merge active tournament info into games
    const gamesWithStatus = GAMES.map(g => {
        // Map frontend game ID to DB game ID if necessary
        const gameIdKey = g.id === "english-run" ? "word-runner" : g.id;

        const tournament = activeTournaments.find(t => t.game_id === gameIdKey);

        return {
            ...g,
            isTournament: !!tournament,
            tournamentId: tournament?.id
        };
    });

    const filteredGames = filter === "ALL"
        ? gamesWithStatus
        : gamesWithStatus.filter(g => g.category === filter);

    const getRemainingAttempts = (gameId: string) => {
        const gameIdKey = gameId === "english-run" ? "word-runner" : gameId;
        return participationMap[gameIdKey]?.attemptsLeft ?? 3;
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-pixel text-3xl font-bold mb-2">게임 대기실</h1>
                <p className="text-gray-600 font-bold">플레이할 게임을 선택하세요.</p>
            </header>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pt-2 pb-2 scrollbar-hide">
                {["ALL", "MATH", "ENGLISH", "SOCIAL", "GAME"].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 font-pixel text-sm border-4 border-black rounded transition-all shadow-[2px_2px_0_0_black] whitespace-nowrap relative
                            ${filter === cat
                                ? "bg-[#ff2e63] text-white -translate-y-1 shadow-[4px_4px_0_0_black] z-10"
                                : "bg-white hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_black] hover:z-10"}`}
                    >
                        {cat === "ALL" ? "전체" : cat}
                    </button>
                ))}
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredGames.map((game) => (
                    <div
                        key={game.id}
                        onClick={() => setSelectedGame(game)}
                        className="group cursor-pointer"
                    >
                        <PixelCard className={`h-full transition-all group-hover:-translate-y-2 group-hover:shadow-[8px_8px_0_0_black] hover:bg-white relative overflow-hidden border-black`}>
                            <div className={`absolute top-0 left-0 w-full h-24 ${game.color} opacity-50 z-0`}></div>

                            <div className="relative z-10 flex flex-col items-center text-center pt-8 pb-4">
                                <div className="w-20 h-20 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_black] mb-4">
                                    <game.icon size={40} className="text-black" />
                                </div>

                                <PixelBadge variant="outline" className="mb-2 bg-white">{game.category}</PixelBadge>
                                <h3 className="font-pixel text-xl font-bold mb-2">{game.title}</h3>
                                <p className="text-sm text-gray-500 font-bold line-clamp-2 px-4">{game.description}</p>
                            </div>

                            {game.isTournament && (
                                <div className="absolute top-2 right-2">
                                    <span className="animate-pulse inline-block bg-[#ff2e63] text-white text-[10px] px-2 py-0.5 rounded border-2 border-black font-bold shadow-[2px_2px_0_0_black]">
                                        대회 진행중
                                    </span>
                                </div>
                            )}
                        </PixelCard>
                    </div>
                ))}
            </div>

            {/* Game Mode Selection Modal */}
            {selectedGame && (
                <GameModeModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
                    gameTitle={selectedGame.title}
                    tournamentActive={selectedGame.isTournament}
                    remainingAttempts={getRemainingAttempts(selectedGame.id)}
                    onSelectMode={(mode) => {
                        console.log(`Starting ${selectedGame.id} in ${mode} mode`);

                        let targetPath = '';
                        if (selectedGame.id === 'pixel-runner') targetPath = `/student/game/pixel-runner`;
                        else if (selectedGame.id === 'english-run') targetPath = `/student/game/word-runner`;
                        else if (selectedGame.id === 'history-quiz') targetPath = `/student/game/history-quiz`;

                        if (targetPath) {
                            if (mode === 'tournament') {
                                const left = getRemainingAttempts(selectedGame.id);
                                if (window.confirm(`${left}회 남았습니다. 참여하시겠습니까?`)) {
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
