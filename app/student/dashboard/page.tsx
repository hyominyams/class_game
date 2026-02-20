import React from "react";
import { PixelCard } from "@/components/ui/pixel-card";
import { Trophy, Target, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getStudentDashboardData } from "@/app/actions/game";
import { AttendanceButton } from "@/components/student/attendance-button";
import { DailyCoinTracker } from "@/components/student/daily-coin-tracker";
import { checkAndSettleWeeklyRewards } from "@/app/actions/weekly-settlement";
import { WeeklyRewardModalWrapper } from "@/components/student/weekly-reward-modal-wrapper";
import { DashboardCards } from "@/components/student/dashboard-cards";
import { calculateLevel } from "@/app/constants/levels";
import { TITLES, getHighestTitle } from "@/app/constants/titles";

export default async function StudentDashboard() {
    const data = await getStudentDashboardData();
    if (!data) return <div>로그인이 필요합니다.</div>;

    // Check for weekly rewards
    const settlementResult = await checkAndSettleWeeklyRewards();

    const { profile, activities, rank, totalScore, totalCoinsEarned, totalGamesPlayed, attendanceCount, currentEquippedTitleId } = data as any;

    const level = calculateLevel(totalScore);

    const equippedTitleObj = currentEquippedTitleId ? TITLES.find(t => t.id === currentEquippedTitleId) : null;
    const highestTitle = getHighestTitle(totalCoinsEarned);
    const studentTitle = equippedTitleObj ? equippedTitleObj.name : (highestTitle ? highestTitle.name : "새내기");

    return (
        <div className="space-y-6">
            <WeeklyRewardModalWrapper result={settlementResult} />

            {/* Greeting Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-pixel text-2xl md:text-3xl font-bold leading-tight">
                        반가워요, <span className="text-[#ff2e63]">{profile?.nickname || '학생'}</span>!
                    </h1>
                    <p className="font-bold text-gray-500 mt-1">오늘도 즐겁게 학습 게임을 시작해볼까요?</p>
                </div>
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <DailyCoinTracker />
                    <div className="flex items-center gap-2 bg-[#fbbf24] px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_black] rounded-lg">
                        <span className="text-xl">🪙</span>
                        <span className="font-pixel font-bold text-lg">{(profile?.coin_balance || 0).toLocaleString()}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Cards Grid */}
                    <DashboardCards
                        rank={rank}
                        level={level}
                        totalScore={totalScore}
                        totalGamesPlayed={totalGamesPlayed}
                        studentTitle={studentTitle}
                        attendanceCount={attendanceCount}
                        totalCoinsEarned={totalCoinsEarned}
                        currentEquippedTitleId={currentEquippedTitleId}
                    />

                    {/* Main Action Banner */}
                    <Link href="/student/game" className="block relative group cursor-pointer hover:no-underline">
                        <div className="absolute inset-0 bg-black rounded-lg translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
                        <div className="relative bg-[#b2c4ff] border-4 border-black rounded-lg p-6 md:p-8 flex items-center justify-between overflow-hidden group-hover:-translate-y-1 transition-transform">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')]"></div>

                            <div className="z-10 relative">
                                <span className="inline-block bg-[#ff2e63] text-white text-xs font-bold px-2 py-1 rounded border-2 border-black mb-2 shadow-[2px_2px_0_0_black]">
                                    ADVENTURE
                                </span>
                                <h2 className="font-pixel text-2xl md:text-3xl font-bold mb-2">학습 게임 시작하기</h2>
                                <p className="font-bold text-slate-700 mb-4 max-w-sm">
                                    다양한 미니 게임을 플레이하고 코인을 모으세요.
                                    오늘의 퀴즈 세트가 당신을 기다리고 있습니다!
                                </p>
                                <div className="inline-flex items-center justify-center h-10 px-4 py-2 bg-[#ff2e63] text-white font-bold rounded border-2 border-black shadow-[2px_2px_0_0_black] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_black] transition-all">
                                    게임 하러 가기 <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </div>

                            {/* Decorative Icon */}
                            <div className="hidden md:flex items-center justify-center opacity-80 rotate-[-12deg] mr-8">
                                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white">
                                    <span className="text-6xl filter drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]">🎮</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="space-y-6">
                    <AttendanceButton />

                    {/* Recent Activities moved to sidebar or below on mobile */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-pixel text-xl font-bold flex items-center gap-2">
                                <span className="w-2 h-6 bg-[#08d9d6] border-2 border-black block shadow-[1px_1px_0_0_black]"></span>
                                최근 활동
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {activities.length === 0 ? (
                                <div className="text-center py-6 bg-white border-4 border-dashed border-gray-200 rounded-lg text-gray-400 font-bold text-sm">
                                    활동 내역이 없습니다.
                                </div>
                            ) : (
                                (activities as any[]).map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between bg-white border-2 border-black p-3 rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0_0_black] transition-all hover:-translate-y-0.5 cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 border-2 border-black rounded flex items-center justify-center font-bold text-lg shadow-[1px_1px_0_0_black] bg-[#e0fafa]">
                                                🎮
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm leading-tight uppercase truncate w-32">
                                                    {{
                                                        'pixel-runner': '픽셀 러너',
                                                        'history-quiz': '역사 퀴즈',
                                                        'word-runner': '영단어 러너',
                                                        'attendance': '출석 체크'
                                                    }[activity.game_id] || activity.game_id}
                                                </h3>
                                                <p className="text-[10px] text-gray-400 font-bold">{new Date(activity.created_at || '').toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-pixel font-bold text-sm">+{activity.coin_transactions?.[0]?.amount || 0}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
