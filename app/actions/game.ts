'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'
import { createAdminClient } from '@/lib/supabase/admin'

const DAILY_COIN_LIMIT = 300;

export async function getDailyCoinProgress() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { current: 0, limit: DAILY_COIN_LIMIT };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: transactions, error } = await supabase
        .from('coin_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .ilike('reason', 'GAME_REWARD:%')
        .gte('created_at', today.toISOString());

    if (error) {
        console.error("Error fetching daily coin progress:", error);
        return { current: 0, limit: DAILY_COIN_LIMIT };
    }

    const currentCoins = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return { current: currentCoins, limit: DAILY_COIN_LIMIT };
}

export async function saveGameResult(
    gameId: string,
    score: number,
    playTime: number,
    metadata?: {
        correctCount?: number;
        totalQuestions?: number;
        isPerfect?: boolean;
    }
) {
    const supabase = await createClient() as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // 1. Get current daily progress
        const { current: todayTotal } = await getDailyCoinProgress();

        // 2. Calculate Potential Reward
        // New Balanced System for 300 Daily Limit
        let potentialReward = 0;

        // A. Knowledge Reward: 3 coins per correct answer
        if (metadata && typeof metadata.correctCount === 'number') {
            potentialReward += metadata.correctCount * 3;
        }

        // B. Performance Reward: 1 coin per 50 points (Max 50 coins per game)
        // Recognizes running distance/speed/combo
        const scoreReward = Math.min(50, Math.floor(score / 50));
        potentialReward += scoreReward;

        // C. Mastery Reward: Perfect Clear Bonus
        if (metadata?.isPerfect) {
            potentialReward += 30;
        }

        // 3. Apply Daily Limit (200)
        let actualReward = 0;
        let limitReached = false;

        if (todayTotal >= DAILY_COIN_LIMIT) {
            actualReward = 0;
            limitReached = true;
        } else if (todayTotal + potentialReward > DAILY_COIN_LIMIT) {
            actualReward = DAILY_COIN_LIMIT - todayTotal;
            limitReached = true;
        } else {
            actualReward = potentialReward;
        }

        // 4. Insert Game Log
        const { data: gameLog, error: logError } = await supabase
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
            const { error: txError } = await supabase
                .from('coin_transactions')
                .insert({
                    user_id: user.id,
                    amount: actualReward,
                    reason: `GAME_REWARD:${gameId}`,
                    reference_id: gameLog.id
                });

            if (txError) throw txError;

            await supabase.rpc('increment_coin_balance', {
                user_id_arg: user.id,
                amount_arg: actualReward
            });
        }

        // 6. Check for "Effort King" Badge (Played 5 games with 0 reward today)
        if (limitReached) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Count games today after limit reached (reward = 0)
            const { count: zeroRewardGames } = await supabase
                .from('game_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', today.toISOString())
            // This is a bit tricky: we need logs that don't have a coin_transaction or have a small one that completed the 200.
            // For simplicity, let's just count all logs today and subtract logs that have non-zero coin transactions.
            // But a simpler way is to check the count of logs today.

            // We'll rely on getStudentStatsData to calculate this badge on view for now, 
            // but we can trigger a check here if needed.
        }

        revalidatePath('/student/dashboard');

        return {
            success: true,
            coinsEarned: actualReward,
            dailyCoinsTotal: todayTotal + actualReward,
            dailyLimit: DAILY_COIN_LIMIT,
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

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch recent logs with transactions
    const { data: activities } = await supabase
        .from('game_logs')
        .select('*, coin_transactions!coin_transactions_reference_id_fkey(amount)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

    // Get rank (simplified)
    const { count: rankCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('grade', profile?.grade || 0)
        .eq('class', profile?.class || 0)
        .eq('role', 'student')
        .gt('coin_balance', profile?.coin_balance || 0)

    // Get cumulative stats
    const { data: scoreData } = await supabase
        .from('game_logs')
        .select('score')
        .eq('user_id', user.id)

    const totalScore = scoreData?.reduce((acc, log) => acc + (log.score || 0), 0) || 0
    const totalGamesPlayed = scoreData?.length || 0

    const { data: coinData } = await supabase
        .from('coin_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gt('amount', 0)

    const totalCoinsEarned = coinData?.reduce((acc, tx) => acc + (tx.amount || 0), 0) || 0

    // Get attendance days
    const { count: attendanceCount } = await supabase
        .from('coin_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reason', 'ATTENDANCE')

    // Get equipped title
    const { data: titleData } = await adminClient
        .from('student_items')
        .select('item_name')
        .eq('user_id', user.id)
        .eq('item_id', 'EQUIPPED_TITLE_SLOT')
        .single()

    return {
        profile,
        activities: activities || [],
        rank: (rankCount || 0) + 1,
        totalScore,
        totalCoinsEarned,
        totalGamesPlayed,
        attendanceCount: attendanceCount || 0,
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

    const COIN_REWARD = 50

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
