"use client";

import { useState } from "react";
import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import { TournamentRankingModal } from "@/components/teacher/tournament-ranking-modal";

export function TournamentListClient({ tournaments }: { tournaments: any[] }) {
    const [selectedTournament, setSelectedTournament] = useState<any>(null);

    // active based on is_active flag from DB
    const activeList = tournaments.filter(t => t.is_active);
    const pastList = tournaments.filter(t => !t.is_active);

    return (
        <div className="grid gap-6 md:grid-cols-2">

            <StudentPixelCard title="현재 진행 중인 대회" className="bg-white border-4 border-[#ff2e63] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                {activeList.map(t => (
                    <div key={t.id} className="p-4 bg-red-50 rounded border-2 border-[#ff2e63]/20 mb-4 flex justify-between items-center group cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setSelectedTournament(t)}>
                        <div>
                            <h3 className="text-2xl font-bold text-[#d63031] mb-1 flex items-center gap-2">
                                🔥 {t.title}
                                <span className="bg-[#ff2e63] text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                            </h3>
                            <p className="font-bold text-gray-600 font-mono text-xl">
                                ~ {new Date(t.end_time).toLocaleDateString()}
                            </p>
                        </div>
                        <Button variant="ghost" className="text-[#d63031] hover:bg-white hover:text-black">Rankings &gt;</Button>
                    </div>
                ))}
                {activeList.length === 0 && (
                    <div className="p-4 text-center text-gray-500 font-pixel">진행 중인 대회가 없습니다.</div>
                )}
            </StudentPixelCard>

            <StudentPixelCard title="지난 대회 기록" className="bg-white">
                <ul className="space-y-4">
                    {pastList.map(t => (
                        <li key={t.id} className="flex justify-between items-center border-b-2 border-dashed border-gray-200 pb-3 cursor-pointer hover:bg-gray-50 p-2 rounded group"
                            onClick={() => setSelectedTournament(t)}>
                            <div>
                                <span className="font-bold block text-lg group-hover:text-blue-600 transition-colors">{t.title}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {new Date(t.end_time).toLocaleDateString()} 종료
                                </span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">결과 보기 &gt;</Button>
                        </li>
                    ))}
                </ul>
                {pastList.length === 0 && (
                    <div className="p-4 text-center text-gray-500 font-pixel">지난 대회가 없습니다.</div>
                )}
            </StudentPixelCard>

            {selectedTournament && (
                <TournamentRankingModal
                    isOpen={!!selectedTournament}
                    onClose={() => setSelectedTournament(null)}
                    tournamentId={selectedTournament.id}
                    title={selectedTournament.title}
                />
            )}
        </div>
    );
}
