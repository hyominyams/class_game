'use server'

import { createClient } from '@/lib/supabase/server'
import { BADGES } from '@/app/constants/badges'
import { revalidatePath } from 'next/cache'

const EQUIPPED_BADGE_SLOT_ID = 'EQUIPPED_BADGE_SLOT';

import { createAdminClient } from '@/lib/supabase/admin';

export async function getStudentStatsData() {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) return null;

    // 2. Fetch Game Logs (All time)
    const { data: logs, count } = await supabase
        .from('game_logs')
        .select('id, score, play_time, game_id, created_at, metadata', { count: 'exact' })
        .eq('user_id', user.id);

    const totalPlays = count || 0;
    const totalScore = logs?.reduce((sum, log) => sum + (log.score || 0), 0) || 0;
    const totalPlayTime = logs?.reduce((sum, log) => sum + (log.play_time || 0), 0) || 0;
    const avgScore = totalPlays > 0 ? Math.round(totalScore / totalPlays) : 0;

    // 3. Fetch Owned Badges (Use Admin Client to ensure we see all items regardless of RLS)
    const { data: userItems } = await adminClient
        .from('student_items')
        .select('item_id, item_name')
        .eq('user_id', user.id);

    const ownedBadgeIds = new Set(
        userItems
            ?.filter(item => item.item_id.startsWith('badge_'))
            .map(item => item.item_id.replace('badge_', ''))
    );

    // 4. Check for New Badges
    const newBadges: string[] = [];

    // Condition Checks
    if (totalPlays >= 1 && !ownedBadgeIds.has('first_step')) newBadges.push('first_step');
    if (logs?.some(l => (l.score || 0) >= 1000) && !ownedBadgeIds.has('math_genius')) newBadges.push('math_genius');

    // "speed_racer"
    if (logs?.some(l => (l.play_time || 999) <= 30 && (l.score || 0) > 0) && !ownedBadgeIds.has('speed_racer')) newBadges.push('speed_racer');

    // "rich_kid"
    if ((profile.coin_balance || 0) >= 1000 && !ownedBadgeIds.has('rich_kid')) newBadges.push('rich_kid');

    // "effort_king"
    if (!ownedBadgeIds.has('effort_king')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayLogs = logs?.filter(l => new Date(l.created_at || '').getTime() >= today.getTime()) || [];

        // Count games played today with 0 coins earned (excluding attendance)
        const { data: todayTransactions } = await adminClient
            .from('coin_transactions')
            .select('reference_id, amount')
            .eq('user_id', user.id)
            .ilike('reason', 'GAME_REWARD:%')
            .gte('created_at', today.toISOString());

        const rewardedLogIds = new Set(todayTransactions?.filter(tx => tx.amount > 0).map(tx => tx.reference_id) || []);
        const zeroRewardGamesCount = todayLogs.filter(log => !rewardedLogIds.has(log.id)).length;

        if (zeroRewardGamesCount >= 5) {
            newBadges.push('effort_king');
        }
    }

    // Grant new badges (Use Admin Client)
    if (newBadges.length > 0) {
        const newBadgeItems = newBadges.map(badgeId => ({
            user_id: user.id,
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
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    // Verify ownership (Use Admin Client)
    const { data: owned } = await adminClient
        .from('student_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', `badge_${badgeId}`)
        .single();

    if (!owned) {
        // Double check formatting just in case
        console.warn(`Badge ownership check failed for user ${user.id}, badge_${badgeId}`);
        return { success: false, error: "You don't own this badge!" };
    }

    // 2. Remove any existing equipped badge (Use Admin Client)
    const { error: deleteError } = await adminClient
        .from('student_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', EQUIPPED_BADGE_SLOT_ID);

    if (deleteError) {
        console.error("Failed to unequip old badge:", deleteError);
        return { success: false, error: "기존 뱃지 해제 실패" };
    }

    // 3. Equip new badge (Use Admin Client)
    const { error: insertError } = await adminClient
        .from('student_items')
        .insert({
            user_id: user.id,
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
