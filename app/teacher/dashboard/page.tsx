import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Trophy, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRankingEligibleReason } from "@/app/constants/economy";
import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { QuickActionsCarousel } from "@/components/ui/quick-actions-carousel";
import { ClassSettingsModal } from "@/components/teacher/class-settings-modal";
export const dynamic = "force-dynamic";

const quickActions = [
    { id: "tournament", title: "대회 개설", icon: "trophy", color: "#2d3436", path: "/teacher/tournaments" },
    { id: "add_student", title: "학생 추가", icon: "plus", color: "#6c5ce7", path: "/teacher/accounts" },
    { id: "give_coin", title: "코인 지급", icon: "coins", color: "#00b894", path: "/teacher/coins" },
    { id: "create_problem", title: "문제 출제", icon: "pencil", color: "#fdcb6e", path: "/teacher/questions" },
] as const;

type ActivityItem = {
    id: string;
    studentName: string;
    action: string;
    accentClass: string;
    badgeLabel: string;
    badgeClass: string;
    createdAt: string;
};

type WeeklyTopItem = {
    studentName: string;
    score: number;
    plays: number;
};

type LowCoinStudentItem = {
    studentName: string;
    earnedCoin: number;
};

type ActiveTournament = {
    id: string;
    title: string | null;
    game_id: string | null;
    start_time: string | null;
    end_time: string | null;
    is_active: boolean | null;
};

type TeacherDashboardData = {
    teacherName: string;
    totalStudents: number;
    todayActiveStudents: number;
    attendanceRate: number;
    weeklyAvgScore: number;
    activeTournament: ActiveTournament | null;
    activeTournamentCount: number;
    todayManualGrantCount: number;
    todayManualGrantAmount: number;
    activeQuestionSetCount: number;
    recentActivities: ActivityItem[];
    weeklyTopStudents: WeeklyTopItem[];
    lowCoinStudents: LowCoinStudentItem[];
};

const GAME_LABELS: Record<string, string> = {
    "pixel-runner": "픽셀러너",
    "history-quiz": "역사 퀴즈 어택",
    "word-runner": "단어 디펜스",
    "word-chain": "단어 연결",
    "ox-swipe": "OX 스와이프",
    "typing-defense": "타이핑 디펜스",
    "memory-match": "메모리 매치",
};

function getKSTMidnightIso() {
    const now = new Date();
    const kstDateString = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(now);

    return new Date(`${kstDateString}T00:00:00+09:00`).toISOString();
}

function getKSTWeekStartIso() {
    const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const day = kstNow.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    kstNow.setDate(kstNow.getDate() - diffToMonday);

    const year = kstNow.getFullYear();
    const month = String(kstNow.getMonth() + 1).padStart(2, "0");
    const date = String(kstNow.getDate()).padStart(2, "0");
    return new Date(`${year}-${month}-${date}T00:00:00+09:00`).toISOString();
}

function formatRelativeTime(iso: string) {
    const eventTime = new Date(iso).getTime();
    if (Number.isNaN(eventTime)) return "-";

    const diffMs = Date.now() - eventTime;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    return `${Math.floor(diffHour / 24)}일 전`;
}

function formatTournamentTimeLeft(endIso: string | null) {
    if (!endIso) return "종료 시간 미설정";

    const end = new Date(endIso).getTime();
    if (Number.isNaN(end)) return "종료 시간 확인 필요";

    const diffMs = end - Date.now();
    if (diffMs <= 0) return "곧 종료";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;

    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간`;

    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${mins}분`;
}

function getTournamentProgressPercent(startIso: string | null, endIso: string | null) {
    if (!startIso || !endIso) return 0;

    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}

function normalizeTeacherName(name: string | null | undefined) {
    const trimmed = (name || "").trim();
    if (!trimmed) return "담임 선생님";
    return trimmed;
}

function normalizeGrantReason(reason: string) {
    return reason.replace("TEACHER_GRANT:", "").replace("ADMIN_GRANT:", "").trim();
}

function formatPurchaseItem(reason: string) {
    return reason.replace("PURCHASE:", "").replace(/[-_]/g, " ");
}

async function getTeacherDashboardData(): Promise<TeacherDashboardData | null> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("id, nickname, role, grade, class")
        .eq("id", user.id)
        .single();

    if (
        !teacherProfile ||
        teacherProfile.role !== "teacher" ||
        teacherProfile.grade === null ||
        teacherProfile.class === null
    ) {
        return null;
    }

    const grade = teacherProfile.grade;
    const classNum = teacherProfile.class;
    const todayIso = getKSTMidnightIso();
    const weekStartIso = getKSTWeekStartIso();
    const nowIso = new Date().toISOString();

    const { data: students } = await adminClient
        .from("profiles")
        .select("id, nickname, created_at")
        .eq("role", "student")
        .eq("grade", grade)
        .eq("class", classNum)
        .order("nickname", { ascending: true });

    const studentList = students || [];
    const studentIds = studentList.map((student) => student.id);
    const totalStudents = studentList.length;
    const studentNameMap = new Map(studentList.map((student) => [student.id, student.nickname || "학생"]));

    if (studentIds.length === 0) {
        return {
            teacherName: normalizeTeacherName(teacherProfile.nickname),
            totalStudents: 0,
            todayActiveStudents: 0,
            attendanceRate: 0,
            weeklyAvgScore: 0,
            activeTournament: null,
            activeTournamentCount: 0,
            todayManualGrantCount: 0,
            todayManualGrantAmount: 0,
            activeQuestionSetCount: 0,
            recentActivities: [],
            weeklyTopStudents: [],
            lowCoinStudents: [],
        };
    }

    const [
        { data: todayGameLogs },
        { data: todayCoinTransactions },
        { data: recentGameLogs },
        { data: recentCoinTransactions },
        { data: activeTournaments },
        { data: weeklyGameLogs },
        { data: weeklyCoinTransactions },
        { count: activeQuestionSetCount },
    ] = await Promise.all([
        adminClient.from("game_logs").select("id, user_id, game_id, score, created_at").in("user_id", studentIds).gte("created_at", todayIso),
        adminClient.from("coin_transactions").select("id, user_id, amount, reason, created_at").in("user_id", studentIds).gte("created_at", todayIso),
        adminClient.from("game_logs").select("id, user_id, game_id, score, created_at").in("user_id", studentIds).order("created_at", { ascending: false }).limit(24),
        adminClient.from("coin_transactions").select("id, user_id, amount, reason, created_at").in("user_id", studentIds).order("created_at", { ascending: false }).limit(48),
        adminClient
            .from("tournaments")
            .select("id, title, game_id, start_time, end_time, is_active")
            .eq("grade", grade)
            .eq("class", classNum)
            .eq("is_active", true)
            .lte("start_time", nowIso)
            .gte("end_time", nowIso)
            .order("end_time", { ascending: true }),
        adminClient.from("game_logs").select("user_id, score").in("user_id", studentIds).gte("created_at", weekStartIso),
        adminClient.from("coin_transactions").select("user_id, amount, reason").in("user_id", studentIds).gte("created_at", weekStartIso),
        adminClient.from("question_sets").select("id", { count: "exact", head: true }).eq("grade", grade).eq("class", classNum).eq("is_active", true),
    ]);

    const todayActiveStudentIds = new Set<string>();

    (todayGameLogs || []).forEach((log) => {
        if (log.user_id) todayActiveStudentIds.add(log.user_id);
    });

    (todayCoinTransactions || []).forEach((tx) => {
        if (!tx.user_id) return;
        if (tx.reason === "ATTENDANCE" || tx.reason.startsWith("PURCHASE:")) {
            todayActiveStudentIds.add(tx.user_id);
        }
    });

    const todayActiveStudents = todayActiveStudentIds.size;

    const todayManualGrants = (todayCoinTransactions || []).filter(
        (tx) => tx.amount > 0 && (tx.reason.startsWith("TEACHER_GRANT:") || tx.reason.startsWith("ADMIN_GRANT:"))
    );

    const todayManualGrantCount = todayManualGrants.length;
    const todayManualGrantAmount = todayManualGrants.reduce((sum, tx) => sum + tx.amount, 0);

    const weeklyCoinMap = new Map<string, number>();
    studentIds.forEach((studentId) => weeklyCoinMap.set(studentId, 0));

    (weeklyCoinTransactions || []).forEach((tx) => {
        if (!tx.user_id || tx.amount <= 0) return;
        if (!isRankingEligibleReason(tx.reason)) return;
        weeklyCoinMap.set(tx.user_id, (weeklyCoinMap.get(tx.user_id) || 0) + tx.amount);
    });

    const lowCoinStudents: LowCoinStudentItem[] = Array.from(weeklyCoinMap.entries())
        .map(([studentId, earnedCoin]) => ({
            studentName: studentNameMap.get(studentId) || "학생",
            earnedCoin,
        }))
        .sort((a, b) => a.earnedCoin - b.earnedCoin || a.studentName.localeCompare(b.studentName, "ko"))
        .slice(0, Math.min(3, totalStudents));

    const activityItems: ActivityItem[] = [];

    (recentGameLogs || []).forEach((log) => {
        if (!log.user_id || !log.created_at) return;
        activityItems.push({
            id: `game-${log.id}`,
            studentName: studentNameMap.get(log.user_id) || "학생",
            action: `${GAME_LABELS[log.game_id] || log.game_id} 플레이 (${log.score}점)`,
            accentClass: "text-[#08d9d6]",
            badgeLabel: "PLAY",
            badgeClass: "bg-[#dff9f7]",
            createdAt: log.created_at,
        });
    });

    (recentCoinTransactions || []).forEach((tx) => {
        if (!tx.user_id || !tx.created_at) return;

        if (tx.reason.startsWith("TEACHER_GRANT:") || tx.reason.startsWith("ADMIN_GRANT:")) {
            activityItems.push({
                id: `grant-${tx.id}`,
                studentName: studentNameMap.get(tx.user_id) || "학생",
                action: `코인 지급 +${tx.amount} (${normalizeGrantReason(tx.reason) || "사유 없음"})`,
                accentClass: "text-[#ff2e63]",
                badgeLabel: "COIN",
                badgeClass: "bg-[#ffe1e8]",
                createdAt: tx.created_at,
            });
            return;
        }

        if (tx.reason === "ATTENDANCE") {
            activityItems.push({
                id: `attendance-${tx.id}`,
                studentName: studentNameMap.get(tx.user_id) || "학생",
                action: "출석 체크 완료",
                accentClass: "text-[#00b894]",
                badgeLabel: "ATTEND",
                badgeClass: "bg-[#dcfce7]",
                createdAt: tx.created_at,
            });
            return;
        }

        if (tx.reason.startsWith("PURCHASE:")) {
            activityItems.push({
                id: `purchase-${tx.id}`,
                studentName: studentNameMap.get(tx.user_id) || "학생",
                action: `상점 구매 (${formatPurchaseItem(tx.reason)})`,
                accentClass: "text-[#6c5ce7]",
                badgeLabel: "SHOP",
                badgeClass: "bg-[#ece8ff]",
                createdAt: tx.created_at,
            });
        }
    });

    studentList.forEach((student) => {
        if (!student.created_at) return;
        const createdAt = new Date(student.created_at).getTime();
        if (Number.isNaN(createdAt)) return;
        if (createdAt < Date.now() - 2 * 24 * 60 * 60 * 1000) return;

        activityItems.push({
            id: `join-${student.id}`,
            studentName: student.nickname || "학생",
            action: "계정 생성 완료",
            accentClass: "text-[#f59e0b]",
            badgeLabel: "NEW",
            badgeClass: "bg-[#fff3d1]",
            createdAt: student.created_at,
        });
    });

    activityItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const weeklyScoreMap = new Map<string, { score: number; plays: number }>();
    (weeklyGameLogs || []).forEach((log) => {
        if (!log.user_id) return;
        const prev = weeklyScoreMap.get(log.user_id) || { score: 0, plays: 0 };
        weeklyScoreMap.set(log.user_id, {
            score: prev.score + (log.score || 0),
            plays: prev.plays + 1,
        });
    });

    const weeklyTopStudents: WeeklyTopItem[] = Array.from(weeklyScoreMap.entries())
        .map(([studentId, stat]) => ({
            studentName: studentNameMap.get(studentId) || "학생",
            score: stat.score,
            plays: stat.plays,
        }))
        .sort((a, b) => b.plays - a.plays || b.score - a.score)
        .slice(0, 5);

    let totalWeeklyScore = 0;
    let totalWeeklyPlays = 0;
    Array.from(weeklyScoreMap.values()).forEach(stat => {
        totalWeeklyScore += stat.score;
        totalWeeklyPlays += stat.plays;
    });

    return {
        teacherName: normalizeTeacherName(teacherProfile.nickname),
        totalStudents,
        todayActiveStudents,
        attendanceRate: totalStudents > 0 ? (todayActiveStudents / totalStudents) * 100 : 0,
        weeklyAvgScore: totalWeeklyPlays > 0 ? totalWeeklyScore / totalWeeklyPlays : 0,
        activeTournament: (activeTournaments || [])[0] || null,
        activeTournamentCount: activeTournaments?.length || 0,
        todayManualGrantCount,
        todayManualGrantAmount,
        activeQuestionSetCount: activeQuestionSetCount || 0,
        recentActivities: activityItems.slice(0, 5),
        weeklyTopStudents,
        lowCoinStudents,
    };
}

export default async function TeacherDashboardPage() {
    const dashboardData = await getTeacherDashboardData();
    if (!dashboardData) {
        redirect("/login");
    }

    const tournament = dashboardData.activeTournament;
    const tournamentProgress = tournament ? getTournamentProgressPercent(tournament.start_time, tournament.end_time) : 0;
    const inactiveCount = Math.max(0, dashboardData.totalStudents - dashboardData.todayActiveStudents);

    const actionSuggestions = [
        dashboardData.lowCoinStudents.length > 0
            ? `미접속 혹은 코인이 부족한 학생 ${dashboardData.lowCoinStudents.length}명에게 출석 보상을 지급해보세요.`
            : null,
        dashboardData.activeTournamentCount === 0 ? "진행 중인 대회가 없습니다. 오늘 학급 대회를 개설해보세요." : null,
        dashboardData.todayManualGrantCount === 0 ? "수동 코인 지급 기록이 없습니다. 참여 보상을 검토하세요." : null,
    ].filter((item): item is string => Boolean(item));

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1.15fr)] gap-6 items-start mt-6">
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3 items-stretch">
                        <StudentPixelCard
                            title="학급 현황"
                            variant="compact"
                            className="h-full min-h-[160px] bg-[#f4f4f5] border-[3px] border-black border-solid shadow-[4px_4px_0_0_black] p-[18px] relative rounded-xl"
                            action={<ClassSettingsModal />}
                        >
                            <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-6 text-center">
                                <div>
                                    <p className="tracking-tight text-xs font-semibold text-gray-500 mb-1">총 학생</p>
                                    <p className="tracking-tight text-2xl font-bold leading-none">{dashboardData.totalStudents}명</p>
                                </div>
                                <div>
                                    <p className="tracking-tight text-xs font-semibold text-gray-500 mb-1">오늘 접속</p>
                                    <p className="tracking-tight text-2xl font-bold leading-none text-[#2857d6]">{dashboardData.todayActiveStudents}명</p>
                                </div>
                                <div>
                                    <p className="tracking-tight text-[11px] font-semibold text-gray-500 mb-1">학급 출석률</p>
                                    <p className="tracking-tight text-xl font-bold leading-none text-[#08d9d6]">{dashboardData.attendanceRate.toFixed(1)}%</p>
                                </div>
                                <div>
                                    <p className="tracking-tight text-[11px] font-semibold text-gray-500 mb-1">주간 평균 점수</p>
                                    <p className="tracking-tight text-xl font-bold leading-none text-black">{dashboardData.weeklyAvgScore.toFixed(1)}</p>
                                </div>
                            </div>
                        </StudentPixelCard>

                        <Link href="/teacher/tournaments" className="group block h-full min-h-[160px] cursor-pointer hover:no-underline">
                            <div
                                className={`relative flex h-full flex-col rounded-xl border-[3px] bg-[#e1e7f0] px-[20px] py-[20px] transition-all hover:-translate-y-0.5 shadow-[4px_4px_0_0_black] border-solid border-black overflow-hidden`}
                            >
                                {tournament ? (
                                    <>
                                        <div className="mb-3">
                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black rounded border-2 border-black bg-[#2d3436] text-white shadow-[2px_2px_0_0_black]">
                                                TOURNAMENT
                                            </span>
                                        </div>
                                        <h2 className="truncate font-pixel text-xl font-bold leading-none text-black mt-1">
                                            {tournament.title || "학급 대회"}
                                        </h2>
                                        <p className="mt-2 text-xs font-medium text-gray-600">진행 중인 대회가 있습니다.</p>
                                        <div className="mt-auto pt-4 relative z-10">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00b894] text-white text-xs font-bold rounded shadow-[2px_2px_0_0_black] border-2 border-black transition-transform group-hover:bg-[#00a884] w-fit">
                                                관리하기 <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black rounded border-[2px] border-black bg-[#4a5568] text-white shadow-[2px_2px_0_0_black]">
                                                TOURNAMENT
                                            </span>
                                        </div>
                                        <h2 className="font-pixel text-[20px] font-bold leading-none text-black mt-1">
                                            대회 개최하기
                                        </h2>
                                        <p className="mt-2 text-[12px] font-semibold text-gray-600 leading-snug tracking-tight">현재 열려있는 대회가 없습니다.</p>
                                        <div className="mt-auto pt-4 relative z-10">
                                            <div className="inline-flex items-center gap-1px px-3.5 py-1.5 bg-[#00b894] text-white text-[13px] font-bold rounded shadow-[2px_2px_0_0_black] border-2 border-black transition-transform group-hover:bg-[#00a884] w-fit">
                                                개최하기 <ArrowRight className="ml-1 w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-tr from-purple-300 via-pink-200 to-transparent rotate-[30deg] opacity-70 blur-[2px] rounded-tl-[100px] pointer-events-none" />
                                    </>
                                )}
                            </div>
                        </Link>

                        <StudentPixelCard title="오늘 운영 지표" variant="compact" className="h-full min-h-[160px] bg-white border-[3px] border-black border-solid shadow-[4px_4px_0_0_black] p-[18px] rounded-xl flex flex-col">
                            <div className="mt-4 space-y-3 px-1 flex-1 flex flex-col justify-center">
                                <div className="flex justify-between items-center text-[13px] font-semibold border-b border-gray-100 pb-2">
                                    <span className="text-gray-700 tracking-tight">미접속 학생</span>
                                    <span className="text-[#ff2e63] font-bold">{inactiveCount}명</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-semibold border-b border-gray-100 pb-2">
                                    <span className="text-gray-700 tracking-tight">수동 코인 지급</span>
                                    <span className="text-[#08d9d6] font-bold tracking-tight">
                                        {dashboardData.todayManualGrantCount}건 / <span className="text-[#08d9d6]">+{dashboardData.todayManualGrantAmount}</span>
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-semibold border-b border-gray-100 pb-2">
                                    <span className="text-gray-700 tracking-tight">진행 중 대회</span>
                                    <span className="text-black font-bold">{dashboardData.activeTournamentCount}개</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-semibold">
                                    <span className="text-gray-700 tracking-tight">활성 문제세트</span>
                                    <span className="text-black font-bold">{dashboardData.activeQuestionSetCount}개</span>
                                </div>
                            </div>
                        </StudentPixelCard>
                    </div>

                    <Link href="/teacher/tournaments" className="block relative group cursor-pointer hover:no-underline">
                        <div className="absolute inset-0 bg-black rounded-lg translate-x-1.5 translate-y-1.5 group-hover:translate-x-2.5 group-hover:translate-y-2.5 transition-transform" />
                        <div className="relative min-h-[220px] bg-[#fdf0a6] border-4 border-black rounded-lg p-7 flex flex-col md:flex-row items-center justify-between overflow-hidden group-hover:-translate-y-1 group-hover:-translate-x-1 transition-transform">
                            <div className="z-10 relative md:w-3/4">
                                <span className="inline-block bg-[#ff2e63] text-white text-[11px] font-black tracking-widest px-2.5 py-1 rounded border-2 border-black mb-4 shadow-[2px_2px_0_0_black]">
                                    CLASS EVENT
                                </span>
                                <h2 className="font-pixel text-[34px] font-bold mb-3 tracking-tight">대회 운영 바로가기</h2>
                                <p className="font-bold text-slate-800 mb-6 text-[15px] leading-relaxed max-w-lg tracking-tight">진행 중인 학급 대회를 확인하고, 새 대회를 즉시 생성 할 수 있습니다.</p>
                                <div className="inline-flex items-center justify-center h-[42px] px-6 py-2 bg-[#2d3436] text-white font-bold text-sm rounded-[4px] border-[3px] border-black shadow-[3px_3px_0_0_black] hover:bg-[#1e272e] transition-colors">
                                    대회 관리하기 <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </div>
                            <div className="hidden md:flex items-center justify-center mr-8 relative opacity-90">
                                <div className="w-[120px] h-[120px] rounded-full border-[5px] border-white flex items-center justify-center bg-transparent">
                                    <Trophy className="w-[60%] h-[60%] text-[#a39755]" strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>
                    </Link>

                    <StudentPixelCard title="이번 주 참여 TOP 5" className="h-full bg-white border-[3px] border-black border-solid p-[20px] rounded-xl shadow-[4px_4px_0_0_black]">
                        <div className="mt-1 mb-5 inline-flex items-center px-1.5 py-0.5 bg-white border-2 border-black rounded text-[9px] tracking-wider font-black">
                            WEEKLY RANK SNAPSHOT
                        </div>
                        {dashboardData.weeklyTopStudents.length === 0 ? (
                            <div className="border border-dashed border-gray-400 rounded p-4 text-sm font-bold text-gray-500">
                                이번 주 참여 데이터가 아직 없습니다.
                            </div>
                        ) : (
                            <ol className="space-y-3.5">
                                {dashboardData.weeklyTopStudents.map((student, index) => (
                                    <li key={`${student.studentName}-${index}`} className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <span className="text-[14px] font-bold tracking-tight">{index + 1}위 · {student.studentName}</span>
                                        <span className="text-[13px] font-black text-[#2857d6]">
                                            {student.score.toLocaleString()}점<span className="text-gray-400 font-bold ml-1 text-xs">/ {student.plays}회</span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </StudentPixelCard>

                    <StudentPixelCard title="학급 실행 제안" className="bg-white border-[3px] border-black border-solid shadow-[4px_4px_0_0_black] p-[20px] rounded-xl">
                        {actionSuggestions.length === 0 ? (
                            <div className="border-2 border-black rounded p-4 bg-[#dcfce7] text-[13px] font-semibold text-[#047857]">
                                오늘 운영 상태가 안정적입니다. 추가 제안은 없습니다.
                            </div>
                        ) : (
                            <ul className="space-y-3 mt-4 w-full">
                                {actionSuggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start gap-3 p-4 border border-gray-200 rounded-md bg-white w-full shadow-sm hover:border-gray-300 transition-colors">
                                        <span className="inline-flex min-w-[20px] h-5 items-center justify-center bg-white border border-gray-300 rounded text-[11px] font-bold text-gray-700 shrink-0 mt-[2px]">
                                            {index + 1}
                                        </span>
                                        <span className="text-[14px] font-semibold leading-relaxed tracking-tight text-gray-800">{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </StudentPixelCard>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#fdf3e7] rounded-lg p-5 border-[3px] border-black pb-8">
                        <h3 className="font-pixel text-[17px] font-bold mb-4 flex items-center gap-2">
                            <span className="inline-flex -ml-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" /><path d="M15 15h.01" /><path d="M9 15h.01" /><path d="M15 9h.01" /><path d="M9 9h.01" /></svg>
                            </span>
                            빠른 실행
                        </h3>
                        <QuickActionsCarousel actions={[...quickActions]} showArrows showTabs={false} initialIndex={3} />
                    </div>

                    <StudentPixelCard title="최근 학생 활동" className="bg-white border-[3px] border-black border-solid p-[20px] rounded-xl shadow-[4px_4px_0_0_black]">
                        {dashboardData.recentActivities.length === 0 ? (
                            <p className="text-sm font-bold text-gray-500 mt-2">최근 활동이 없습니다.</p>
                        ) : (
                            <ul className="space-y-3 mt-4">
                                {dashboardData.recentActivities.map((activity) => (
                                    <li key={activity.id} className="rounded-md border border-gray-200 p-3.5 bg-white">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border border-black text-[9px] font-black tracking-wider ${activity.badgeClass}`}>
                                                    {activity.badgeLabel}
                                                </span>
                                                <span className="text-gray-400 text-[10px] shrink-0 font-medium">{formatRelativeTime(activity.createdAt)}</span>
                                            </div>
                                            <p className="text-[13px] font-bold leading-relaxed tracking-tight">
                                                <span className="font-black text-black">{activity.studentName}</span> 학생이 <span className={activity.accentClass}>{activity.action}</span>
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </StudentPixelCard>
                </div>
            </div>
        </div>
    );
}
