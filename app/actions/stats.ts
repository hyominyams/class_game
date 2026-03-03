'use server'

import { createClient } from '@/lib/supabase/server'
import { BADGES } from '@/app/constants/badges'
import { revalidatePath } from 'next/cache'
import { requireActor } from './security/guards'

const EQUIPPED_BADGE_SLOT_ID = 'EQUIPPED_BADGE_SLOT';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getStudentStatsData() {
    const actorResult = await requireActor(['student']);
    if (!actorResult.ok) return null;

    const { supabase, actor } = actorResult;
    const adminClient = createAdminClient();

    // 1. Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', actor.userId)
        .single();

    if (!profile) return null;

    // 2. Fetch Game Logs (All time)
    const { data: logs, count } = await supabase
        .from('game_logs')
        .select('id, score, play_time, game_id, created_at, metadata', { count: 'exact' })
        .eq('user_id', actor.userId);

    const totalPlays = count || 0;
    const totalScore = logs?.reduce((sum, log) => sum + (log.score || 0), 0) || 0;
    const totalPlayTime = logs?.reduce((sum, log) => sum + (log.play_time || 0), 0) || 0;
    const avgScore = totalPlays > 0 ? Math.round(totalScore / totalPlays) : 0;

    // 3. Fetch Owned Badges (Use Admin Client to ensure we see all items regardless of RLS)
    const { data: userItems } = await adminClient
        .from('student_items')
        .select('item_id, item_name')
        .eq('user_id', actor.userId);

    const ownedBadgeIds = new Set(
        userItems
            ?.filter(item => item.item_id.startsWith('badge_'))
            .map(item => item.item_id.replace('badge_', ''))
    );

    // 4. Check for New Badges
    const newBadges: string[] = [];

    // Condition Checks
    if (totalPlays >= 1 && !ownedBadgeIds.has('first_step')) newBadges.push('first_step');

    if (!ownedBadgeIds.has('math_genius') && logs?.some(l => l.game_id === 'math-game' && (l.score || 0) >= 1000)) newBadges.push('math_genius');

    if (!ownedBadgeIds.has('perfect_aim') && logs?.some(l => (l.metadata as any)?.correctRate === 100 || (l.metadata as any)?.perfect === true)) newBadges.push('perfect_aim');

    // "speed_racer" - 30초 내 클리어
    if (!ownedBadgeIds.has('speed_racer') && logs?.some(l => (l.play_time || 999) <= 30 && (l.score || 0) > 0 && (l.metadata as any)?.status === 'CLEARED')) newBadges.push('speed_racer');

    // "quiz_explorer" - 모든 종류의 게임 1회 이상 플레이
    if (!ownedBadgeIds.has('quiz_explorer')) {
        const uniqueGames = new Set(logs?.map(l => l.game_id));
        if (uniqueGames.size >= 3) newBadges.push('quiz_explorer'); // 대략 3개 이상이면 탐험가로 간주
    }

    // "word_collector" - 영어 단어 게임 5회
    const wordDefensePlayCount =
        logs?.filter(l => l.game_id === 'word-runner' || l.game_id === 'word-defense').length || 0;
    if (!ownedBadgeIds.has('word_collector') && wordDefensePlayCount >= 5) newBadges.push('word_collector');

    // "rich_kid"
    if (!ownedBadgeIds.has('rich_kid') && (profile?.coin_balance || 0) >= 1000) newBadges.push('rich_kid');

    // "ranking_master"
    if (!ownedBadgeIds.has('ranking_master') && logs?.some(l => (l.metadata as any)?.rank === 1 || (l.metadata as any)?.is_first_place === true)) newBadges.push('ranking_master');

    // "effort_king"
    if (!ownedBadgeIds.has('effort_king')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = logs?.filter(l => new Date(l.created_at || '').getTime() >= today.getTime()) || [];
        const { data: todayTransactions } = await adminClient
            .from('coin_transactions')
            .select('reference_id, amount')
            .eq('user_id', actor.userId)
            .ilike('reason', 'GAME_REWARD:%')
            .gte('created_at', today.toISOString());
        const rewardedLogIds = new Set(todayTransactions?.filter(tx => tx.amount > 0).map(tx => tx.reference_id) || []);
        const zeroRewardGamesCount = todayLogs.filter(log => !rewardedLogIds.has(log.id)).length;
        if (zeroRewardGamesCount >= 5) newBadges.push('effort_king');
    }

    // New Badges
    if (!ownedBadgeIds.has('combo_master') && logs?.some(l => ((l.metadata as any)?.maxCombo || 0) >= 10)) newBadges.push('combo_master');

    if (!ownedBadgeIds.has('night_owl') && logs?.some(l => {
        const h = new Date(l.created_at || '').getHours();
        return h >= 22 || h < 4;
    })) newBadges.push('night_owl');

    if (!ownedBadgeIds.has('early_bird') && logs?.some(l => {
        const h = new Date(l.created_at || '').getHours();
        return h >= 4 && h < 8;
    })) newBadges.push('early_bird');

    if (!ownedBadgeIds.has('tournament_champion') && logs?.some(l => (l.metadata as any)?.mode === 'TOURNAMENT' && (l.metadata as any)?.rank === 1)) newBadges.push('tournament_champion');

    if (!ownedBadgeIds.has('history_buff') && (logs?.filter(l => l.game_id === 'history-quiz').reduce((sum, l) => sum + (l.score || 0), 0) || 0) >= 10000) newBadges.push('history_buff');

    if (!ownedBadgeIds.has('marathoner') && (logs?.filter(l => l.game_id === 'pixel-runner').length || 0) >= 50) newBadges.push('marathoner');

    if (!ownedBadgeIds.has('word_hero') && logs?.some(l => l.game_id === 'word-chain' && (l.play_time || 999) < 40 && (l.score || 0) > 0)) newBadges.push('word_hero');

    if (!ownedBadgeIds.has('never_give_up') && logs?.some(l => ((l.metadata as any)?.attempt_num || 0) >= 5 && (l.metadata as any)?.status === 'CLEARED')) newBadges.push('never_give_up');

    if (!ownedBadgeIds.has('lucky_seven') && logs?.some(l => (l.score || 0) === 777)) newBadges.push('lucky_seven');

    if (!ownedBadgeIds.has('team_player') && (logs?.filter(l => (l.metadata as any)?.mode === 'TOURNAMENT' || (l.metadata as any)?.is_class_battle === true).length || 0) >= 10) newBadges.push('team_player');

    // Grant new badges (Use Admin Client)
    if (newBadges.length > 0) {
        const newBadgeItems = newBadges.map(badgeId => ({
            user_id: actor.userId,
            item_id: `badge_${badgeId}`,
            item_name: BADGES.find(b => b.id === badgeId)?.name || 'Unknown Badge',
            quantity: 1
        }));

        await adminClient.from('student_items').insert(newBadgeItems);
        // Update local set for display
        newBadges.forEach(id => ownedBadgeIds.add(id));
    }

    // 5. Get Equipped Badge ID
    const equippedItem = userItems?.find(item => item.item_id === EQUIPPED_BADGE_SLOT_ID);
    const equippedBadgeId = equippedItem ? equippedItem.item_name : null;

    // 6. Recent History
    const recentLogs = logs?.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()).slice(0, 5) || [];

    return {
        profile,
        stats: {
            totalPlays,
            totalScore,
            totalPlayTime,
            avgScore
        },
        badges: BADGES.map(badge => ({
            ...badge,
            obtained: ownedBadgeIds.has(badge.id),
            isEquipped: badge.id === equippedBadgeId
        })),
        recentLogs
    };
}

export async function equipBadgeAction(badgeId: string) {
    const actorResult = await requireActor(['student']);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor } = actorResult;
    const adminClient = createAdminClient();

    // Verify ownership (Use Admin Client)
    const { data: owned } = await adminClient
        .from('student_items')
        .select('*')
        .eq('user_id', actor.userId)
        .eq('item_id', `badge_${badgeId}`)
        .single();

    if (!owned) {
        // Double check formatting just in case
        console.warn(`Badge ownership check failed for user ${actor.userId}, badge_${badgeId}`);
        return { success: false, error: "You don't own this badge!" };
    }

    // 2. Remove any existing equipped badge (Use Admin Client)
    const { error: deleteError } = await adminClient
        .from('student_items')
        .delete()
        .eq('user_id', actor.userId)
        .eq('item_id', EQUIPPED_BADGE_SLOT_ID);

    if (deleteError) {
        console.error("Failed to unequip old badge:", deleteError);
        return { success: false, error: "기존 뱃지 해제 실패" };
    }

    // 3. Equip new badge (Use Admin Client)
    const { error: insertError } = await adminClient
        .from('student_items')
        .insert({
            user_id: actor.userId,
            item_id: EQUIPPED_BADGE_SLOT_ID,
            item_name: badgeId,
            quantity: 1
        });

    if (insertError) {
        console.error("Failed to equip new badge:", insertError);
        return { success: false, error: "뱃지 장착 실패" };
    }

    revalidatePath('/student/stats');
    revalidatePath('/student/ranking');
    return { success: true };
}
