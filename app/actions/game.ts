'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    ATTENDANCE_COIN_REWARD,
    DAILY_GAME_COIN_LIMIT,
    DAILY_TOTAL_COIN_LIMIT,
    GAME_REWARD_RULE,
    isRankingEligibleReason,
} from '@/app/constants/economy'

type SaveResultMetadata = {
    correctCount?: number;
    totalQuestions?: number;
    isPerfect?: boolean;
    didClear?: boolean;
    minimumReward?: number;
};

const GAME_CLEAR_MINIMUM_REWARD: Partial<Record<string, number>> = {
    'history-quiz': 12,
    'word-chain': 12,
    'pixel-runner': 12,
    'word-runner': 12,
};

export async function getDailyCoinProgress() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { current: 0, limit: DAILY_TOTAL_COIN_LIMIT };
    const todayIso = getKSTMidnightIso();

    const { data: transactions, error } = await supabase
        .from('coin_transactions')
        .select('amount, reason')
        .eq('user_id', user.id)
        .gt('amount', 0)
        .gte('created_at', todayIso);

    if (error) {
        console.error("Error fetching daily coin progress:", error);
        return { current: 0, limit: DAILY_TOTAL_COIN_LIMIT };
    }

    const currentCoins = (transactions || []).reduce((sum, tx) => {
        const isGameReward = tx.reason?.startsWith('GAME_REWARD:');
        const isAttendance = tx.reason === 'ATTENDANCE';
        if (!isGameReward && !isAttendance) return sum;
        return sum + (tx.amount || 0);
    }, 0);

    return { current: currentCoins, limit: DAILY_TOTAL_COIN_LIMIT };
}

function calculateGameReward(score: number, metadata?: SaveResultMetadata) {
    let potentialReward = 0;

    // A. Knowledge reward: capped to prevent single-round spikes.
    if (metadata && typeof metadata.correctCount === 'number') {
        potentialReward += Math.min(
            GAME_REWARD_RULE.maxCorrectReward,
            metadata.correctCount * GAME_REWARD_RULE.correctCoinPerAnswer
        );
    }

    // B. Performance reward: slower conversion and capped.
    const scoreReward = Math.min(
        GAME_REWARD_RULE.maxScoreReward,
        Math.floor(score / GAME_REWARD_RULE.scorePerCoin)
    );
    potentialReward += scoreReward;

    // C. Mastery reward.
    if (metadata?.isPerfect) {
        potentialReward += GAME_REWARD_RULE.perfectBonus;
    }

    // D. Hard cap per run.
    return Math.min(GAME_REWARD_RULE.maxPerGameReward, potentialReward);
}

function applyGameSpecificMinimumReward(
    gameId: string,
    score: number,
    playTime: number,
    metadata: SaveResultMetadata | undefined,
    baseReward: number
) {
    let adjustedReward = baseReward;

    if (metadata?.didClear) {
        const clearMinimum = GAME_CLEAR_MINIMUM_REWARD[gameId] || 0;
        adjustedReward = Math.max(adjustedReward, clearMinimum);
    }

    // Word Defense: even on failure, grant a tiny consolation reward for meaningful participation.
    if (gameId === 'word-runner' && metadata?.didClear === false) {
        const participatedEnough =
            (metadata.correctCount || 0) > 0 ||
            (metadata.totalQuestions || 0) >= 3 ||
            playTime >= 40 ||
            score >= 200;

        if (participatedEnough) {
            const minimumReward = Math.max(0, Math.min(5, metadata.minimumReward || 3));
            return Math.max(adjustedReward, minimumReward);
        }
    }

    return adjustedReward;
}

function resolveActualReward(todayTotal: number, potentialReward: number, dailyLimit: number) {
    if (todayTotal >= dailyLimit) {
        return { actualReward: 0, limitReached: true };
    } else if (todayTotal + potentialReward > dailyLimit) {
        return { actualReward: dailyLimit - todayTotal, limitReached: true };
    } else {
        return { actualReward: potentialReward, limitReached: false };
    }
}

export async function saveGameResult(
    gameId: string,
    score: number,
    playTime: number,
    metadata?: SaveResultMetadata
) {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // 1. Get current daily game-reward progress (attendance is excluded from game cap).
        const todayIso = getKSTMidnightIso();
        const { data: gameRewardTransactions, error: gameRewardError } = await adminClient
            .from('coin_transactions')
            .select('amount')
            .eq('user_id', user.id)
            .ilike('reason', 'GAME_REWARD:%')
            .gte('created_at', todayIso);

        if (gameRewardError) throw gameRewardError;
        const rewardTransactions = (gameRewardTransactions ?? []) as Array<{ amount: number | null }>;
        const todayTotal = rewardTransactions.reduce(
            (sum: number, tx: { amount: number | null }) => sum + (tx.amount ?? 0),
            0,
        );

        // 2. Calculate Potential Reward
        const baseReward = calculateGameReward(score, metadata);
        const potentialReward = applyGameSpecificMinimumReward(gameId, score, playTime, metadata, baseReward);

        // 3. Apply Daily Limit
        const { actualReward, limitReached } = resolveActualReward(todayTotal, potentialReward, DAILY_GAME_COIN_LIMIT);

        // 4. Insert Game Log
        const { data: gameLog, error: logError } = await adminClient
            .from('game_logs')
            .insert({
                user_id: user.id,
                game_id: gameId,
                score,
                play_time: playTime,
                metadata: metadata || null
            })
            .select()
            .single();

        if (logError) throw logError;

        // 5. Grant Reward if any
        if (actualReward > 0) {
            const { error: txError } = await adminClient
                .from('coin_transactions')
                .insert({
                    user_id: user.id,
                    amount: actualReward,
                    reason: `GAME_REWARD:${gameId}`,
                    reference_id: gameLog.id
                });

            if (txError) throw txError;

            const { error: balanceError } = await adminClient.rpc('increment_coin_balance', {
                user_id_arg: user.id,
                amount_arg: actualReward
            });

            if (balanceError) throw balanceError;
        }

        revalidatePath('/student/dashboard');

        return {
            success: true,
            coinsEarned: actualReward,
            dailyCoinsTotal: todayTotal + actualReward,
            dailyLimit: DAILY_GAME_COIN_LIMIT,
            isLimitReached: limitReached
        };

    } catch (error: any) {
        console.error("Error in saveGameResult:", error);
        return { success: false, error: error.message };
    }
}
export async function getActiveQuestions(gameId: string) {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Get current user's profile to know grade/class
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await adminClient
        .from('profiles')
        .select('grade, class')
        .eq('id', user.id)
        .single()

    if (!profile) return null

    // 2. Fetch active question set for this game and class (Use Admin Client)
    // grade/class가 null일 수 있으므로 0으로 강제 변환하지 않고 정확히 매칭하거나 로직 수정
    let query = adminClient
        .from('question_sets')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    // 학생의 학년/반 정보가 있는 경우 해당 학급 세트 우선 검색
    if (profile.grade && profile.class) {
        // 1순위: 내 학급 전용 세트
        const { data: classSets } = await query
            .eq('grade', profile.grade)
            .eq('class', profile.class)
            .limit(1);

        if (classSets && classSets.length > 0) {
            return await fetchQuestions(adminClient, classSets[0].id);
        }
    }

    // 2순위: 전체 공개 세트 (grade, class가 null인 경우)
    const { data: globalSets } = await adminClient
        .from('question_sets')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .is('grade', null)
        .is('class', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (globalSets && globalSets.length > 0) {
        return await fetchQuestions(adminClient, globalSets[0].id);
    }

    return [];
}

async function fetchQuestions(adminClient: any, setId: string) {
    const { data: questions } = await adminClient
        .from('questions')
        .select('question_text, options, correct_answer')
        .eq('set_id', setId)
        .order('id', { ascending: true });

    if (!questions) return [];

    return questions.map((q: any) => {
        let parsedOptions = q.options;
        if (typeof q.options === 'string') {
            try {
                parsedOptions = JSON.parse(q.options);
            } catch (e) {
                console.error("Failed to parse options for question:", q);
                parsedOptions = [];
            }
        }
        return {
            ...q,
            options: parsedOptions
        };
    });
}


export async function getStudentDashboardData() {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    type StudentProgressMetricsRow = {
        total_score: number | null;
        total_games_played: number | null;
        total_coins_earned: number | null;
        attendance_count: number | null;
    };

    type StudentRankRow = {
        rank: number | null;
    };

    // Parallel fetch for independent data
    const [
        { data: profile },
        { data: activities },
        { data: metricsData, error: metricsError },
        { data: titleData }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('game_logs').select('*, coin_transactions!coin_transactions_reference_id_fkey(amount)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        (supabase as any).rpc('get_student_progress_metrics', { p_user_id: user.id }).maybeSingle(),
        adminClient.from('student_items').select('item_name').eq('user_id', user.id).eq('item_id', 'EQUIPPED_TITLE_SLOT').single()
    ])

    if (metricsError) {
        console.error('Failed to fetch student progress metrics:', metricsError);
    }

    let rank = 1;
    if (profile && profile.grade !== null && profile.class !== null) {
        const { data: rankData, error: rankError } = await (supabase as any)
            .rpc('get_student_current_rank', {
                p_user_id: user.id,
                p_grade: profile.grade,
                p_class: profile.class,
            })
            .maybeSingle();

        if (rankError) {
            console.error('Failed to fetch student rank:', rankError);
        } else if ((rankData as StudentRankRow | null)?.rank && (rankData as StudentRankRow).rank! > 0) {
            rank = (rankData as StudentRankRow).rank as number;
        }

        if (rankError || rank <= 0) {
            const { data: classmates } = await supabase
                .from('profiles')
                .select('id')
                .eq('grade', profile.grade)
                .eq('class', profile.class)
                .eq('role', 'student');

            const classmateIds = (classmates || []).map((p) => p.id);
            if (classmateIds.length > 0) {
                const { data: classTransactions } = await adminClient
                    .from('coin_transactions')
                    .select('user_id, amount, reason')
                    .in('user_id', classmateIds)
                    .gt('amount', 0);

                const pointsMap: Record<string, number> = {};
                classTransactions
                    ?.filter((tx) => isRankingEligibleReason(tx.reason))
                    .forEach((tx) => {
                        pointsMap[tx.user_id] = (pointsMap[tx.user_id] || 0) + (tx.amount || 0);
                    });

                const myPoints = pointsMap[user.id] || 0;
                const rankCount = classmateIds.filter((id) => (pointsMap[id] || 0) > myPoints).length;
                rank = rankCount + 1;
            } else {
                rank = 1;
            }
        }
    }

    const metrics = (metricsData as StudentProgressMetricsRow | null) || null;
    let totalScore = Number(metrics?.total_score || 0)
    let totalGamesPlayed = Number(metrics?.total_games_played || 0)
    let totalCoinsEarned = Number(metrics?.total_coins_earned || 0)
    let attendanceCount = Number(metrics?.attendance_count || 0)

    if (metricsError || !metrics) {
        const [
            { data: scoreData },
            { data: coinData },
            { count: attendanceCountFallback }
        ] = await Promise.all([
            supabase.from('game_logs').select('score').eq('user_id', user.id),
            supabase.from('coin_transactions').select('amount').eq('user_id', user.id).gt('amount', 0),
            supabase.from('coin_transactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('reason', 'ATTENDANCE'),
        ]);

        totalScore = scoreData?.reduce((acc, log) => acc + (log.score || 0), 0) || 0
        totalGamesPlayed = scoreData?.length || 0
        totalCoinsEarned = coinData?.reduce((acc, tx) => acc + (tx.amount || 0), 0) || 0
        attendanceCount = attendanceCountFallback || 0
    }

    return {
        profile,
        activities: activities || [],
        rank,
        totalScore,
        totalCoinsEarned,
        totalGamesPlayed,
        attendanceCount,
        currentEquippedTitleId: titleData?.item_name || null
    }
}

// Helper to get KST midnight in UTC
function getKSTMidnightIso() {
    const now = new Date();
    // Convert to KST date string (YYYY-MM-DD)
    const kstDateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);

    // Create Date object for KST midnight (which handles the offset correctly)
    const kstMidnight = new Date(`${kstDateString}T00:00:00+09:00`);
    return kstMidnight.toISOString();
}

export async function checkAttendance() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { canAttend: false }

    const todayIso = getKSTMidnightIso();

    // Using maybeSingle() can error if duplicates exist. Using limit(1) is safer.
    const { data, error } = await supabase
        .from('coin_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('reason', 'ATTENDANCE')
        .gte('created_at', todayIso)
        .limit(1)

    if (error) {
        console.error("Check Attendance Error:", error)
        // If error, conservatively deny attendance to preveny abuse or confusing UI
        return { canAttend: false, error: '출석 정보를 불러오지 못했습니다.' }
    }

    // If no data found, can attend.
    return { canAttend: !data || data.length === 0 }
}

export async function performAttendance() {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { canAttend } = await checkAttendance()
    if (!canAttend) return { success: false, error: '이미 오늘 출석 체크를 하셨습니다!' }

    const COIN_REWARD = ATTENDANCE_COIN_REWARD

    try {
        // 1. Record Transaction (Use Admin Client to bypass RLS)
        const { error: txError } = await adminClient
            .from('coin_transactions')
            .insert({
                user_id: user.id,
                amount: COIN_REWARD,
                reason: 'ATTENDANCE'
            })

        if (txError) {
            console.error("Attendance TX Error:", txError);
            throw new Error(`트랜잭션 기록 실패: ${txError.message}`);
        }

        // 2. Increment Balance (Use Admin Client)
        const { error: profileError } = await adminClient.rpc('increment_coin_balance', {
            user_id_arg: user.id,
            amount_arg: COIN_REWARD
        })

        if (profileError) {
            console.warn("RPC increment_coin_balance failed, trying manual update:", profileError)

            const { data: profile } = await adminClient.from('profiles').select('coin_balance').eq('id', user.id).single()
            const newBalance = (profile?.coin_balance || 0) + COIN_REWARD

            const { error: updateError } = await adminClient
                .from('profiles')
                .update({ coin_balance: newBalance })
                .eq('id', user.id)

            if (updateError) {
                console.error("Manual Balance Update Error:", updateError)
                throw new Error("코인 잔액 업데이트에 실패했습니다. 관리자에게 문의하세요.");
            }
        }

        revalidatePath('/student/dashboard')
        return { success: true, message: `오늘의 출석 보상 ${COIN_REWARD} 코인을 받았습니다!`, newBalance: 0 }
    } catch (e: any) {
        console.error("Perform Attendance Critical Error:", e)
        return { success: false, error: e.message || '출석 체크 처리 중 오류가 발생했습니다.' }
    }
}

export async function equipTitleAction(titleId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    // Remove any existing equipped title
    const { error: deleteError } = await adminClient
        .from('student_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', 'EQUIPPED_TITLE_SLOT');

    if (deleteError) {
        console.error("Failed to unequip old title:", deleteError);
        return { success: false, error: "기존 칭호 해제 실패" };
    }

    // Equip new title
    const { error: insertError } = await adminClient
        .from('student_items')
        .insert({
            user_id: user.id,
            item_id: 'EQUIPPED_TITLE_SLOT',
            item_name: titleId,
            quantity: 1
        });

    if (insertError) {
        console.error("Failed to equip new title:", insertError);
        return { success: false, error: "칭호 적용 장착 실패" };
    }

    revalidatePath('/student/dashboard');
    return { success: true };
}
