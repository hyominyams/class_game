'use server';

// [작업 완료 확인]
// 1. 코인 미지급 문제 해결: 보상 지급 시 코인 잔액 수동 업데이트 로직 추가됨 (Line 151)
// 2. 지급 시기 설정: 매주 월요일 오전 8시 40분 체크 로직 추가됨 (Line 37)

import { createAdminClient } from '@/lib/supabase/admin';
import { getWeeklyRewardByRank, isRankingEligibleReason } from '@/app/constants/economy';
import { requireActor } from './security/guards';

export type WeeklySettlementResult = {
    settled: boolean;
    tier?: string;
    rank?: number;
    rewardAmount?: number;
    weekStartDate?: string;
};

export async function checkAndSettleWeeklyRewards(): Promise<WeeklySettlementResult> {
    const actorResult = await requireActor(['student']);
    if (!actorResult.ok) return { settled: false };

    const { actor, supabase } = actorResult;
    const adminClient = createAdminClient();

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, grade, class, coin_balance, last_weekly_settlement')
        .eq('id', actor.userId)
        .single();

    if (!profile || !profile.grade || !profile.class) return { settled: false };

    // 2. Determine "Last Week" range & Check Timing (Monday 08:40 AM)
    const now = new Date();
    // getMonday returns Monday 00:00:00 of the current week (or previous if today is Sunday)
    const currentWeekStart = getMonday(now);

    // Define Settlement Time: Monday 08:40 AM of the Current Week
    const settlementAvailableTime = new Date(currentWeekStart);
    settlementAvailableTime.setHours(8, 40, 0, 0);

    // If "Now" is before Monday 08:40 AM, we cannot settle for the *previous* week yet?
    // Let's assume the "new week" starts logically at 8:40 AM for settlement purposes.
    // If user logs in at Monday 08:30, they are technically in the "grace period".
    // We should wait until 08:40.
    if (now < settlementAvailableTime) {
        return { settled: false };
    }

    // Check if already settled for this week
    if (profile.last_weekly_settlement) {
        const lastSettlement = new Date(profile.last_weekly_settlement);
        // If last settlement was done AFTER (or AT) the start of this current week (Monday 00:00), 
        // then we have already settled for the previous week.
        if (lastSettlement >= currentWeekStart) {
            return { settled: false };
        }
    }

    // Calculate Last Week's Range (Monday to Sunday)
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(currentWeekStart);
    // lastWeekEnd is essentially currentWeekStart (Sunday 23:59:59 treated as Monday 00:00:00 boundary)

    // 3. Calculate Last Week's Ranking
    // Fetch all students in class
    const { data: students } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('grade', profile.grade)
        .eq('class', profile.class);

    if (!students || students.length === 0) return { settled: false };

    const studentIds = students.map(s => s.id);

    // Fetch transactions for last week
    const { data: transactions } = await adminClient
        .from('coin_transactions')
        .select('user_id, amount, reason')
        .in('user_id', studentIds)
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', lastWeekEnd.toISOString())
        .gt('amount', 0);

    // Aggregate scores
    const scoresMap: Record<string, number> = {};
    transactions
        ?.filter(tx => isRankingEligibleReason(tx.reason))
        .forEach(tx => {
        scoresMap[tx.user_id] = (scoresMap[tx.user_id] || 0) + tx.amount;
    });

    // Sort and find rank
    const rankedUsers = studentIds
        .map(id => ({ id, points: scoresMap[id] || 0 }))
        .sort((a, b) => b.points - a.points); // Descending

    const userRankIndex = rankedUsers.findIndex(u => u.id === actor.userId);
    if (userRankIndex === -1) return { settled: false };

    const rank = userRankIndex + 1;

    // 4. Determine tier/reward from centralized economy rules
    const rewardRule = getWeeklyRewardByRank(rank);
    const tier = rewardRule.tier;
    const rewardAmount = rewardRule.amount;

    // 5. Grant Reward
    if (rewardAmount > 0) {
        // Insert transaction
        // Correcting field name: 'description' -> 'reason' based on Supabase schema
        const { error: txError } = await adminClient.from('coin_transactions').insert({
            user_id: actor.userId,
            amount: rewardAmount,
            reason: `주간 랭킹 보상 (${tier} - ${rank}위)`,
        });

        if (txError) {
            console.error("Reward transaction failed:", txError);
            return { settled: false };
        }

        // Manual Balance Update (Safety net)
        // Fetch latest balance just in case
        const { data: latestProfile } = await adminClient
            .from('profiles')
            .select('coin_balance')
            .eq('id', actor.userId)
            .single();

        const currentBalance = latestProfile?.coin_balance || 0;

        await adminClient
            .from('profiles')
            .update({ coin_balance: currentBalance + rewardAmount })
            .eq('id', actor.userId);
    }

    // 6. Update last_weekly_settlement
    await adminClient
        .from('profiles')
        .update({ last_weekly_settlement: new Date().toISOString() })
        .eq('id', actor.userId);

    return {
        settled: true,
        tier,
        rank,
        rewardAmount,
        weekStartDate: lastWeekStart.toLocaleDateString()
    };
}

function getMonday(d: Date) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
