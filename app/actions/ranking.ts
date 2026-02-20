'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTournamentRankings } from './tournament'
import { BADGES } from '@/app/constants/badges'

export type RankUser = {
    rank: number;
    name: string;
    points: number;
    avatar: string; // Emoji
    comparison?: number; // Rank change (hard to calculate without history, so 0 for now)
    tier?: string; // For tournament
};

const EQUIPPED_BADGE_SLOT_ID = 'EQUIPPED_BADGE_SLOT';

async function getEquippedBadges(userIds: string[]) {
    if (userIds.length === 0) return {};
    const supabase = await createClient();
    const { data } = await supabase
        .from('student_items')
        .select('user_id, item_name')
        .eq('item_id', EQUIPPED_BADGE_SLOT_ID)
        .in('user_id', userIds);

    // Map user_id -> badge icon
    const map: Record<string, string> = {};
    data?.forEach(item => {
        const badge = BADGES.find(b => b.id === item.item_name);
        if (badge) {
            map[item.user_id] = badge.icon;
        }
    });
    return map;
}

export async function getMonthlyRankingAction() {
    const supabase = await createClient();

    // 1. Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('grade, class')
        .eq('id', user.id)
        .single();

    if (!profile) return [];

    // 2. Get monthly coin gains (from 1st of current month)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: students } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('role', 'student')
        .eq('grade', profile.grade || 0)
        .eq('class', profile.class || 0);

    if (!students || students.length === 0) return [];

    const studentIds = students.map(s => s.id);

    const adminClient = createAdminClient();

    const { data: transactions } = await adminClient
        .from('coin_transactions')
        .select('user_id, amount')
        .in('user_id', studentIds)
        .gte('created_at', firstDayOfMonth.toISOString())
        .gt('amount', 0);

    const gainsMap: Record<string, number> = {};
    transactions?.forEach(tx => {
        gainsMap[tx.user_id] = (gainsMap[tx.user_id] || 0) + tx.amount;
    });

    const badgeMap = await getEquippedBadges(studentIds);

    const rankings: RankUser[] = students
        .map(s => ({
            rank: 0,
            name: s.nickname || '익명',
            points: gainsMap[s.id] || 0,
            avatar: badgeMap[s.id] || "👤",
            comparison: 0
        }))
        .filter(r => r.points > 0)
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 }))
        .slice(0, 20);

    return rankings;
}

export async function getGameRankingAction(gameId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('grade, class')
        .eq('id', user.id)
        .single();

    if (!profile) return [];

    const { data: students } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('role', 'student')
        .eq('grade', profile.grade || 0)
        .eq('class', profile.class || 0);

    if (!students || students.length === 0) return [];

    const studentIds = students.map(s => s.id);

    const adminClient = createAdminClient();

    // Fetch scores for the game for these students
    const { data: logs } = await adminClient
        .from('game_logs')
        .select('user_id, score')
        .eq('game_id', gameId)
        .in('user_id', studentIds);

    // Get max score per user
    const maxScoresMap: Record<string, number> = {};
    logs?.forEach(log => {
        if (!maxScoresMap[log.user_id] || log.score > maxScoresMap[log.user_id]) {
            maxScoresMap[log.user_id] = log.score;
        }
    });

    const badgeMap = await getEquippedBadges(studentIds);

    const rankings: RankUser[] = students
        .map(s => ({
            rank: 0,
            name: s.nickname || '익명',
            points: maxScoresMap[s.id] || 0,
            avatar: badgeMap[s.id] || "🎮",
            comparison: 0
        }))
        .filter(r => r.points > 0)
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 }))
        .slice(0, 20);

    return rankings;
}

export async function getAvailableGamesAction() {
    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('games')
        .select('id, title')
        .order('title');
    return data || [];
}

export async function getWeeklyRankingAction() {
    const supabase = await createClient();

    // 1. Get current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('grade, class')
        .eq('id', user.id)
        .single();

    if (!profile) return [];

    // 2. Get weekly coin gains from transactions
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: students } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('role', 'student')
        .eq('grade', profile.grade || 0)
        .eq('class', profile.class || 0);

    if (!students || students.length === 0) return [];

    const studentIds = students.map(s => s.id);

    const adminClient = createAdminClient();

    const { data: transactions } = await adminClient
        .from('coin_transactions')
        .select('user_id, amount')
        .in('user_id', studentIds)
        .gte('created_at', sevenDaysAgo.toISOString())
        .gt('amount', 0);

    const gainsMap: Record<string, number> = {};
    transactions?.forEach(tx => {
        gainsMap[tx.user_id] = (gainsMap[tx.user_id] || 0) + tx.amount;
    });

    const badgeMap = await getEquippedBadges(studentIds);

    const rankings: RankUser[] = students
        .map(s => ({
            rank: 0,
            name: s.nickname || '익명',
            points: gainsMap[s.id] || 0,
            avatar: badgeMap[s.id] || "🌱",
            comparison: 0
        }))
        .filter(r => r.points > 0)
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 }))
        .slice(0, 20);

    return rankings;
}

export async function getTournamentRankingAction() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('grade, class')
        .eq('id', user.id)
        .single();

    if (!profile) return [];

    const now = new Date().toISOString();
    const { data: activeTournaments } = await supabase
        .from('tournaments')
        .select('id, title')
        .eq('grade', profile.grade || 0)
        .eq('class', profile.class || 0)
        .order('end_time', { ascending: false })
        .limit(1);

    if (!activeTournaments || activeTournaments.length === 0) return [];

    const tournamentId = activeTournaments[0].id;

    const rankings = await getTournamentRankings(tournamentId);

    return rankings.map((r, index) => ({
        rank: r.rank,
        name: r.nickname,
        points: r.score || 0,
        avatar: "🏆",
        comparison: 0,
        tier: index === 0 ? "Diamond" : index < 3 ? "Platinum" : "Gold"
    }));
}
