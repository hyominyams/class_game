"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getWeeklyRankingAction,
    getMonthlyRankingAction,
    getTournamentRankingAction,
    getGameRankingAction,
    getAvailableGamesAction,
    RankUser
} from "@/app/actions/ranking";

type RankingTab = "WEEKLY" | "MONTHLY" | "TOURNAMENT" | "GAME_SCORE";

const RANKING_TABS: Array<{ id: RankingTab; label: string; color: string }> = [
    { id: "WEEKLY", label: "주간(코인)", color: "bg-[#ff2e63]" },
    { id: "MONTHLY", label: "월간(코인)", color: "bg-[#00b894]" },
    { id: "GAME_SCORE", label: "게임별(점수)", color: "bg-amber-400" },
    { id: "TOURNAMENT", label: "🏆 대회", color: "bg-[#6c5ce7]" },
];

export default function RankingPage() {
    const [activeTab, setActiveTab] = useState<RankingTab>("WEEKLY");
    const [rankingData, setRankingData] = useState<RankUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableGames, setAvailableGames] = useState<{ id: string, title: string }[]>([]);
    const [selectedGameId, setSelectedGameId] = useState<string>("");

    useEffect(() => {
        const fetchGames = async () => {
            try {
                const games = await getAvailableGamesAction();
                setAvailableGames(games);
                if (games.length > 0) setSelectedGameId(games[0].id);
            } catch (error) {
                console.error("Failed to fetch games:", error);
            }
        };
        fetchGames();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                let data: RankUser[] = [];
                switch (activeTab) {
                    case "WEEKLY":
                        data = await getWeeklyRankingAction();
                        break;
                    case "MONTHLY":
                        data = await getMonthlyRankingAction();
                        break;
                    case "TOURNAMENT":
                        data = await getTournamentRankingAction();
                        break;
                    case "GAME_SCORE":
                        if (selectedGameId) {
                            data = await getGameRankingAction(selectedGameId);
                        }
                        break;
                }
                setRankingData(data);
            } catch (error) {
                console.error("Failed to fetch ranking:", error);
                setRankingData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [activeTab, selectedGameId]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-pixel text-3xl font-bold mb-2">명예의 전당</h1>
                <p className="text-gray-600 font-bold">우리 반 최고의 학생은 누구일까요?</p>
            </header>

            {/* Tabs Container */}
            <div className="flex items-end px-2 -mb-[4px] relative z-10 space-x-1 overflow-x-auto scrollbar-hide">
                {RANKING_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-4 md:px-6 py-2 font-pixel text-xs md:text-sm border-t-4 border-x-4 border-black rounded-t-lg transition-all flex items-center justify-center whitespace-nowrap",
                            activeTab === tab.id
                                ? `${tab.color} text-white h-12 translate-y-0 shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.2)]`
                                : "bg-[#e5e5e5] text-gray-500 h-10 hover:h-12 hover:bg-white hover:text-black border-b-4 active:h-10 transition-all duration-200"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List Content */}
            <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0_0_black] relative z-0 !mt-0 min-h-[400px]">
                {/* Game Selection for GAME_SCORE tab */}
                {activeTab === "GAME_SCORE" && availableGames.length > 0 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto py-2 px-1 scrollbar-hide">
                        {availableGames.map((game) => (
                            <button
                                key={game.id}
                                onClick={() => setSelectedGameId(game.id)}
                                className={cn(
                                    "px-4 py-1.5 font-pixel text-xs rounded border-2 border-black transition-all shadow-[2px_2px_0_0_black] whitespace-nowrap",
                                    selectedGameId === game.id
                                        ? "bg-amber-400 text-black -translate-x-0.5 -translate-y-0.5 shadow-[4px_4px_0_0_black]"
                                        : "bg-gray-50 text-gray-400 hover:bg-white hover:text-black"
                                )}
                            >
                                {game.title}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === "TOURNAMENT" && (
                    <div className="mb-6 bg-yellow-100 border-2 border-yellow-400 p-4 rounded text-center">
                        <h3 className="font-pixel text-lg font-bold text-yellow-800 mb-1">👑 우리 학급 토너먼트 진행 중!</h3>
                        <p className="text-sm text-yellow-700 font-bold">가장 높은 점수를 기록한 학생이 전당에 오릅니다.</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
                        <p className="font-pixel text-gray-400">데이터를 불러오는 중...</p>
                    </div>
                ) : rankingData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 border-4 border-dashed border-gray-100 rounded-xl">
                        <p className="text-4xl">🏜️</p>
                        <p className="font-pixel text-gray-400">아직 데이터가 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-[60px_70px_1fr_140px] gap-4 px-4 pb-3 text-sm font-pixel font-bold text-gray-400 border-b-4 border-black/5">
                            <div className="text-center">순위</div>
                            <div className="text-center">{activeTab === "TOURNAMENT" ? "티어" : "아바타"}</div>
                            <div>닉네임</div>
                            <div className="text-right">
                                {activeTab === "GAME_SCORE" ? "최고 점수" : activeTab === "TOURNAMENT" ? "대회 기록" : "획득 코인"}
                            </div>
                        </div>

                        {rankingData.map((user, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "grid grid-cols-[60px_70px_1fr_140px] gap-4 items-center p-4 border-4 border-black rounded-xl transition-all hover:translate-x-1 shadow-[4px_4px_0_0_black] hover:shadow-none hover:translate-y-1",
                                    index === 0 ? "bg-yellow-50 border-yellow-400 shadow-yellow-200" :
                                        index === 1 ? "bg-gray-50 border-gray-400 shadow-gray-200" :
                                            index === 2 ? "bg-orange-50 border-orange-400 shadow-orange-200" : "bg-white"
                                )}
                            >
                                {/* Rank Column */}
                                <div className="flex justify-center">
                                    <div className={cn(
                                        "w-10 h-10 flex items-center justify-center font-pixel text-xl font-bold rounded-full border-2 border-black shadow-[2px_2px_0_0_black]",
                                        index === 0 ? "bg-[#fbbf24] text-white" :
                                            index === 1 ? "bg-[#94a3b8] text-white" :
                                                index === 2 ? "bg-[#d97706] text-white" : "bg-white text-gray-400"
                                    )}>
                                        {user.rank}
                                    </div>
                                </div>

                                {/* Avatar Column */}
                                <div className="flex justify-center text-3xl">
                                    {user.avatar}
                                </div>

                                {/* Name & Tier Column */}
                                <div className="flex flex-col justify-center">
                                    <h3 className="font-bold text-lg flex items-center gap-2 truncate">
                                        {user.name}
                                        {user.tier && (
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded border border-black font-pixel text-white whitespace-nowrap",
                                                user.tier === 'Diamond' ? "bg-cyan-400" :
                                                    user.tier === 'Platinum' ? "bg-emerald-400" :
                                                        "bg-yellow-400"
                                            )}>
                                                {user.tier}
                                            </span>
                                        )}
                                    </h3>
                                </div>

                                {/* Points Column */}
                                <div className="text-right">
                                    <p className="font-pixel font-bold text-lg">
                                        {user.points.toLocaleString()} {activeTab === "GAME_SCORE" || activeTab === "TOURNAMENT" ? "pts" : "coins"}
                                    </p>
                                    <p className="text-xs font-bold text-gray-400">-</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
