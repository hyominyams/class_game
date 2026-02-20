"use client";

import React, { useEffect, useState } from "react";
import { PixelCard } from "@/components/ui/pixel-card";
import { Calendar, Check, Loader2, Lock } from "lucide-react";
import { getStudentStatsData, equipBadgeAction } from "@/app/actions/stats";
import { Badge } from "@/app/constants/badges";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Fallback Accordion
const SimpleAccordion = ({ title, children, defaultOpen = false }: { title: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-4 border-black rounded-lg overflow-hidden mb-8 shadow-[4px_4px_0_0_black]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 font-pixel font-bold text-lg transition-colors border-b-4 border-black"
            >
                {title}
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && <div className="p-6 bg-white">{children}</div>}
        </div>
    );
};

type StatsData = {
    stats: {
        totalPlays: number;
        totalScore: number;
        totalPlayTime: number;
        avgScore: number;
    };
    badges: (Badge & { obtained: boolean, isEquipped: boolean })[];
    recentLogs: any[];
    profile: any;
};

export default function StatsPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [equippingId, setEquippingId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const result = await getStudentStatsData();
            // @ts-ignore
            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEquip = async (badgeId: string) => {
        if (equippingId) return;
        setEquippingId(badgeId);

        try {
            const res = await equipBadgeAction(badgeId);
            if (res.success) {
                await fetchData();
            } else {
                alert(res.error || "Failed to equip badge");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setEquippingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!data) return <div>데이터를 불러오지 못했습니다.</div>;

    const { stats, badges, recentLogs, profile } = data;
    const equippedBadge = badges.find(b => b.isEquipped);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-pixel text-3xl font-bold mb-2">나의 학습 기록</h1>
                    <p className="text-gray-600 font-bold">
                        {profile?.nickname}님의 모험 기록입니다.
                    </p>
                </div>
                {equippedBadge && (
                    <div className="flex items-center gap-3 bg-yellow-50 px-4 py-2 border-4 border-yellow-400 rounded-lg shadow-[4px_4px_0_0_#ca8a04]">
                        <span className="text-yellow-700 font-bold text-xs uppercase tracking-wide">Equipped</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl filter drop-shadow-md">{equippedBadge.icon}</span>
                            <span className="font-pixel font-bold">{equippedBadge.name}</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "총 플레이", value: `${stats.totalPlays.toLocaleString()}회`, color: "bg-blue-100" },
                    { label: "획득 뱃지", value: `${badges.filter(b => b.obtained).length}개`, color: "bg-yellow-100" },
                    { label: "평균 점수", value: `${stats.avgScore}점`, color: "bg-green-100" },
                    { label: "누적 코인", value: (profile?.coin_balance || 0).toLocaleString(), color: "bg-pink-100" },
                ].map((stat, i) => (
                    <PixelCard key={i} className={`${stat.color} border-black text-center py-4`}>
                        <p className="text-sm font-bold text-gray-600 mb-1">{stat.label}</p>
                        <p className="font-pixel text-2xl font-bold">{stat.value}</p>
                    </PixelCard>
                ))}
            </div>

            {/* Badge Collection Section */}
            <section>
                <SimpleAccordion
                    title={
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🎖️</span>
                            <span>뱃지 컬렉션 ({badges.filter(b => b.obtained).length}/{badges.length})</span>
                        </div>
                    }
                    defaultOpen={true}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {badges.map((badge) => (
                            <div
                                key={badge.id}
                                className={cn(
                                    "relative transition-all",
                                    !badge.obtained && "opacity-60 grayscale cursor-not-allowed",
                                    badge.obtained && "cursor-pointer group"
                                )}
                                onClick={() => badge.obtained && handleEquip(badge.id)}
                            >
                                <PixelCard className={cn(
                                    "text-center h-full flex flex-col items-center justify-center p-4 transition-all relative overflow-hidden min-h-[140px]",
                                    badge.obtained ? "hover:-translate-y-1 hover:shadow-[4px_4px_0_0_black]" : "",
                                    badge.isEquipped ? "border-yellow-400 bg-yellow-50 shadow-[0_0_0_2px_#fbbf24] ring-2 ring-yellow-400 ring-offset-2" : ""
                                )}>
                                    {badge.isEquipped && (
                                        <div className="absolute top-2 right-2 text-yellow-500 bg-white rounded-full p-0.5 border border-yellow-500 shadow-sm z-10">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}

                                    <div className="text-4xl mb-3 transform transition-transform group-hover:scale-110">
                                        {badge.icon}
                                    </div>
                                    <h3 className="font-pixel text-sm font-bold mb-1 truncate w-full">{badge.name}</h3>
                                    <p className="text-[10px] text-gray-500 font-bold line-clamp-2 leading-tight min-h-[2.5em]">
                                        {badge.description}
                                    </p>

                                    {!badge.obtained && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg backdrop-blur-[1px]">
                                            <div className="bg-black/80 text-white px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                                                <Lock className="w-3 h-3" />
                                                <span className="font-pixel text-[10px]">Locked</span>
                                            </div>
                                        </div>
                                    )}

                                    {badge.obtained && !badge.isEquipped && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg backdrop-blur-[1px]">
                                            <span className="bg-white text-black px-3 py-1 rounded-full font-bold text-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform hover:bg-[#ff2e63] hover:text-white border-2 border-black">
                                                장착하기
                                            </span>
                                        </div>
                                    )}

                                    {equippingId === badge.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-20">
                                            <Loader2 className="w-6 h6 animate-spin text-black" />
                                        </div>
                                    )}
                                </PixelCard>
                            </div>
                        ))}
                    </div>
                </SimpleAccordion>
            </section>

            {/* Recent History List */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-6 h-6" />
                    <h2 className="font-pixel text-xl font-bold">최근 학습 이력</h2>
                </div>

                {recentLogs.length === 0 ? (
                    <div className="bg-white border-4 border-dashed border-gray-200 rounded-lg p-10 text-center text-gray-400 font-bold">
                        <p className="text-2xl mb-2">🏜️</p>
                        아직 플레이 기록이 없습니다.
                    </div>
                ) : (
                    <div className="bg-white border-4 border-black rounded-lg divide-y-2 divide-black shadow-[4px_4px_0_0_black]">
                        {recentLogs.map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-default group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-100 border-2 border-black rounded flex items-center justify-center text-lg shadow-[2px_2px_0_0_black] group-hover:translate-x-1 transition-transform">
                                        🎮
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg leading-none mb-1">{log.game_id || '알 수 없는 게임'}</p>
                                        <p className="text-xs text-gray-500 font-mono font-bold">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {(log.metadata?.status === 'CLEARED') || (!log.metadata?.status && log.score >= 100) ? (
                                        <span className="bg-[#00b894] text-white text-[10px] px-2 py-0.5 rounded border border-black font-pixel shadow-[1px_1px_0_0_black] mr-2">
                                            Clear!
                                        </span>
                                    ) : (log.metadata?.status === 'FAILED') ? (
                                        <span className="bg-[#ff4444] text-white text-[10px] px-2 py-0.5 rounded border border-black font-pixel shadow-[1px_1px_0_0_black] mr-2">
                                            Fail
                                        </span>
                                    ) : null}
                                    <span className="font-pixel font-bold text-xl">{log.score}pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
