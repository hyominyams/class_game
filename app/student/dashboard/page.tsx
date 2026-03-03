import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStudentDashboardData } from "@/app/actions/game";
import { checkAndSettleWeeklyRewards } from "@/app/actions/weekly-settlement";
import { calculateLevel } from "@/app/constants/levels";
import { TITLES, getHighestTitle } from "@/app/constants/titles";
import { AttendanceButton } from "@/components/student/attendance-button";
import { DailyCoinTracker } from "@/components/student/daily-coin-tracker";
import { DashboardCards } from "@/components/student/dashboard-cards";
import { WeeklyRewardModalWrapper } from "@/components/student/weekly-reward-modal-wrapper";

type Activity = {
    id: string;
    game_id?: string | null;
    created_at?: string | null;
    coin_transactions?: Array<{ amount?: number | null }> | null;
};

type DashboardData = {
    profile: {
        nickname?: string | null;
        coin_balance?: number | null;
    } | null;
    activities: Activity[];
    rank: number;
    totalScore: number;
    totalCoinsEarned: number;
    totalGamesPlayed: number;
    attendanceCount: number;
    currentEquippedTitleId: string | null;
};

const GAME_LABELS: Record<string, string> = {
    "pixel-runner": "픽셀러너",
    "history-quiz": "역사 퀴즈 어택",
    "word-runner": "단어 디펜스",
    "word-chain": "단어 연결",
    attendance: "출석 체크",
};

export default async function StudentDashboard() {
    const data = await getStudentDashboardData();
    if (!data) return <div>로그인이 필요합니다.</div>;

    const settlementResult = await checkAndSettleWeeklyRewards();

    const dashboardData = data as DashboardData;

    const {
        profile,
        activities,
        rank,
        totalScore,
        totalCoinsEarned,
        totalGamesPlayed,
        attendanceCount,
        currentEquippedTitleId,
    } = dashboardData;

    const level = calculateLevel(totalScore);
    const equippedTitleObj = currentEquippedTitleId ? TITLES.find((t) => t.id === currentEquippedTitleId) : null;
    const highestTitle = getHighestTitle(totalCoinsEarned);
    const studentTitle = equippedTitleObj ? equippedTitleObj.name : (highestTitle ? highestTitle.name : "견습 기사");

    return (
        <div className="space-y-6 pt-2 md:pt-3">
            <WeeklyRewardModalWrapper result={settlementResult} />

            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <h1 className="font-pixel text-2xl font-bold leading-tight md:text-3xl">
                        반가워요, <span className="text-[#ff2e63]">{profile?.nickname || "학생"}</span>!
                    </h1>
                    <p className="mt-1 font-bold text-gray-500">오늘도 즐겁게 학습 게임을 시작해볼까요?</p>
                </div>
                <div className="flex flex-col items-end gap-4 md:flex-row">
                    <DailyCoinTracker />
                    <div className="flex items-center gap-2 rounded-lg border-4 border-black bg-[#fbbf24] px-4 py-2 shadow-[4px_4px_0_0_black]">
                        <span className="text-xl">🪙</span>
                        <span className="font-pixel text-lg font-bold">{(profile?.coin_balance || 0).toLocaleString()}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
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

                    <Link href="/student/game" className="group relative block cursor-pointer hover:no-underline">
                        <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg bg-black transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />
                        <div className="relative flex items-center justify-between overflow-hidden rounded-lg border-4 border-black bg-[#b2c4ff] p-6 transition-transform group-hover:-translate-y-1 md:p-8">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-10" />
                            <div className="relative z-10">
                                <span className="mb-2 inline-block rounded border-2 border-black bg-[#ff2e63] px-2 py-1 text-xs font-bold text-white shadow-[2px_2px_0_0_black]">
                                    ADVENTURE
                                </span>
                                <h2 className="mb-2 font-pixel text-2xl font-bold md:text-3xl">게임 플레이하러 가기</h2>
                                <p className="mb-4 max-w-sm font-bold text-slate-700">
                                    다양한 학습 게임을 플레이하고 점수와 코인을 획득해보세요.
                                </p>
                                <div className="inline-flex h-10 items-center justify-center rounded border-2 border-black bg-[#ff2e63] px-4 py-2 font-bold text-white shadow-[2px_2px_0_0_black] transition-all hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_black]">
                                    시작하기 <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </div>
                            <div className="mr-8 hidden rotate-[-12deg] items-center justify-center opacity-80 md:flex">
                                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm">
                                    <span className="text-6xl drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]">🎮</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="space-y-6">
                    <AttendanceButton />

                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 font-pixel text-xl font-bold">
                                <span className="block h-6 w-2 border-2 border-black bg-[#08d9d6] shadow-[1px_1px_0_0_black]" />
                                최근 활동
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {(activities as Activity[]).length === 0 ? (
                                <div className="rounded-lg border-4 border-dashed border-gray-200 bg-white py-6 text-center text-sm font-bold text-gray-400">
                                    최근 활동 내역이 없습니다.
                                </div>
                            ) : (
                                (activities as Activity[]).map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex cursor-default items-center justify-between rounded-lg border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_black]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded border-2 border-black bg-[#e0fafa] text-lg font-bold shadow-[1px_1px_0_0_black]">
                                                ⭐
                                            </div>
                                            <div>
                                                <h3 className="w-32 truncate text-sm font-bold uppercase leading-tight">
                                                    {GAME_LABELS[String(activity.game_id ?? "")] || String(activity.game_id ?? "UNKNOWN")}
                                                </h3>
                                                <p className="text-[10px] font-bold text-gray-400">
                                                    {new Date(activity.created_at || "").toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-pixel text-sm font-bold">+{activity.coin_transactions?.[0]?.amount || 0}</p>
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
