"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTournamentRankings } from "@/app/actions/tournament";
import { Loader2, Trophy } from "lucide-react";

interface Ranking {
    rank: number;
    nickname: string;
    score: number;
    date: string;
}

interface TournamentRankingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    title: string;
}

export function TournamentRankingModal({ isOpen, onClose, tournamentId, title }: TournamentRankingModalProps) {
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && tournamentId) {
            setLoading(true);
            getTournamentRankings(tournamentId).then(data => {
                setRankings(data);
                setLoading(false);
            });
        }
    }, [isOpen, tournamentId]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white border-2 border-dashed border-gray-300">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold font-pixel text-[#2d3436]">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        {title} Rankings
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#00b894]" />
                        </div>
                    ) : rankings.length === 0 ? (
                        <p className="text-center text-gray-500 p-8 font-pixel">No participants yet.</p>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                                    <th className="px-4 py-3">Student</th>
                                    <th className="px-4 py-3 text-right">Score</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankings.map((r, i) => (
                                    <tr key={i} className="bg-white border-b hover:bg-green-50 transition-colors">
                                        <td className="px-4 py-3 font-bold">
                                            {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.nickname}</td>
                                        <td className="px-4 py-3 text-right font-bold text-[#00b894]">{r.score.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 text-xs">{r.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
