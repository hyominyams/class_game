"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { TournamentRankingModal } from "@/components/teacher/tournament-ranking-modal";

const GAME_LABELS: Record<string, string> = {
    "pixel-runner": "픽셀 러너",
    "word-runner": "word defense",
    "history-quiz": "역사 퀴즈",
    "word-chain": "워드 체인",
};

type TournamentListItem = {
    id: string;
    title: string;
    end_time: string;
    game_id: string;
    is_active: boolean;
};

export function TournamentListClient({ tournaments }: { tournaments: TournamentListItem[] }) {
    const [selectedTournament, setSelectedTournament] = useState<TournamentListItem | null>(null);

    const activeList = tournaments.filter((t) => t.is_active);
    const pastList = tournaments.filter((t) => !t.is_active);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <StudentPixelCard title="현재 진행 중인 대회" className="border-4 border-[#ff2e63] bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                {activeList.map((tournament) => (
                    <div
                        key={tournament.id}
                        className="group mb-4 flex cursor-pointer items-center justify-between rounded border-2 border-[#ff2e63]/20 bg-red-50 p-4 transition-colors hover:bg-red-100"
                        onClick={() => setSelectedTournament(tournament)}
                    >
                        <div>
                            <h3 className="mb-1 flex items-center gap-2 text-2xl font-bold text-[#d63031]">
                                🏆 {tournament.title}
                                <span className="animate-pulse rounded-full bg-[#ff2e63] px-2 py-0.5 text-[10px] text-white">LIVE</span>
                            </h3>
                            <p className="font-mono text-xl font-bold text-gray-600">
                                ~ {new Date(tournament.end_time).toLocaleDateString()}
                            </p>
                            <p className="mt-1 text-xs font-bold text-gray-500">
                                게임: {GAME_LABELS[tournament.game_id] || tournament.game_id}
                            </p>
                        </div>
                        <Button variant="ghost" className="text-[#d63031] hover:bg-white hover:text-black">
                            결과 보기 &gt;
                        </Button>
                    </div>
                ))}
                {activeList.length === 0 && (
                    <div className="p-4 text-center font-pixel text-gray-500">진행 중인 대회가 없습니다.</div>
                )}
            </StudentPixelCard>

            <StudentPixelCard title="종료된 대회" className="bg-white">
                <ul className="space-y-4">
                    {pastList.map((tournament) => (
                        <li
                            key={tournament.id}
                            className="group flex cursor-pointer items-center justify-between rounded border-b-2 border-dashed border-gray-200 p-2 pb-3 hover:bg-gray-50"
                            onClick={() => setSelectedTournament(tournament)}
                        >
                            <div>
                                <span className="block text-lg font-bold transition-colors group-hover:text-blue-600">{tournament.title}</span>
                                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                    {new Date(tournament.end_time).toLocaleDateString()} 종료
                                </span>
                                <p className="mt-1 text-xs font-bold text-gray-500">
                                    게임: {GAME_LABELS[tournament.game_id] || tournament.game_id}
                                </p>
                            </div>
                            <Button size="sm" variant="ghost" className="text-blue-500 hover:bg-blue-50 hover:text-blue-700">
                                결과 보기 &gt;
                            </Button>
                        </li>
                    ))}
                </ul>
                {pastList.length === 0 && (
                    <div className="p-4 text-center font-pixel text-gray-500">지난 대회가 없습니다.</div>
                )}
            </StudentPixelCard>

            {selectedTournament && (
                <TournamentRankingModal
                    isOpen={Boolean(selectedTournament)}
                    onClose={() => setSelectedTournament(null)}
                    tournamentId={selectedTournament.id}
                    title={selectedTournament.title}
                />
            )}
        </div>
    );
}
