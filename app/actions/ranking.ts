'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { BADGES } from '@/app/constants/badges'
import { isRankingEligibleReason } from '@/app/constants/economy'
import { requireActor, requireAuthenticatedActor } from './security/guards'
import { getTournamentRankings } from './tournament'

export type RankUser = {
    rank: number;
    name: string;
    points: number;
    avatar: string;
    comparison?: number;
    tier?: string;
};

const EQUIPPED_BADGE_SLOT_ID = 'EQUIPPED_BADGE_SLOT';

type StudentClassContext = {
    grade: number;
    classNum: number;
};

type RankingStudent = {
    id: string;
    nickname: string | null;
};

async function getStudentClassContext(): Promise<StudentClassContext | null> {
    const actorResult = await requireActor(['student']);
    if (!actorResult.ok) return null;

    if (actorResult.actor.grade === null || actorResult.actor.classNum === null) {
        return null;
    }

    return {
        grade: actorResult.actor.grade,
        classNum: actorResult.actor.classNum,
    };
}

function getNickname(nickname: string | null) {
    const trimmed = (nickname || '').trim();
    return trimmed || '익명';
}

function sortAndRank(items: RankUser[]) {
    return items
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'ko'))
        .map((item, index) => ({ ...item, rank: index + 1 }));
}

async function getClassStudents(grade: number, classNum: number): Promise<RankingStudent[]> {
    const adminClient = createAdminClient();

    const { data: students } = await adminClient
        .from('profiles')
        .select('id, nickname')
        .eq('role', 'student')
        .eq('grade', grade)
        .eq('class', classNum)
        .order('created_at', { ascending: true });

    return (students || []) as RankingStudent[];
}

async function getEquippedBadges(userIds: string[]) {
    if (userIds.length === 0) return {};

    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('student_items')
        .select('user_id, item_name')
        .eq('item_id', EQUIPPED_BADGE_SLOT_ID)
        .in('user_id', userIds);

    const map: Record<string, string> = {};
    data?.forEach((item) => {
        const badge = BADGES.find((b) => b.id === item.item_name);
        if (badge) {
            map[item.user_id] = badge.icon;
        }
    });

    return map;
}

export async function getMonthlyRankingAction() {
    const context = await getStudentClassContext();
    if (!context) return [];

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const students = await getClassStudents(context.grade, context.classNum);
    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.id);
    const adminClient = createAdminClient();

    const { data: transactions } = await adminClient
        .from('coin_transactions')
        .select('user_id, amount, reason')
        .in('user_id', studentIds)
        .gte('created_at', firstDayOfMonth.toISOString())
        .gt('amount', 0);

    const gainsMap: Record<string, number> = {};
    transactions
        ?.filter((tx) => isRankingEligibleReason(tx.reason))
        .forEach((tx) => {
            gainsMap[tx.user_id] = (gainsMap[tx.user_id] || 0) + tx.amount;
        });

    const badgeMap = await getEquippedBadges(studentIds);

    return sortAndRank(
        students.map((s) => ({
            rank: 0,
            name: getNickname(s.nickname),
            points: gainsMap[s.id] || 0,
            avatar: badgeMap[s.id] || '👤',
            comparison: 0,
        }))
    );
}

export async function getGameRankingAction(gameId: string) {
    const context = await getStudentClassContext();
    if (!context) return [];

    const students = await getClassStudents(context.grade, context.classNum);
    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.id);
    const adminClient = createAdminClient();

    const { data: logs } = await adminClient
        .from('game_logs')
        .select('user_id, score')
        .eq('game_id', gameId)
        .in('user_id', studentIds);

    const maxScoresMap: Record<string, number> = {};
    logs?.forEach((log) => {
        if (!maxScoresMap[log.user_id] || log.score > maxScoresMap[log.user_id]) {
            maxScoresMap[log.user_id] = log.score;
        }
    });

    const badgeMap = await getEquippedBadges(studentIds);

    return sortAndRank(
        students.map((s) => ({
            rank: 0,
            name: getNickname(s.nickname),
            points: maxScoresMap[s.id] || 0,
            avatar: badgeMap[s.id] || '🎮',
            comparison: 0,
        }))
    );
}

export async function getAvailableGamesAction() {
    const actorResult = await requireAuthenticatedActor();
    if (!actorResult.ok) {
        return [];
    }

    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('games')
        .select('id, title')
        .order('title');

    return data || [];
}

export async function getWeeklyRankingAction() {
    const context = await getStudentClassContext();
    if (!context) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const students = await getClassStudents(context.grade, context.classNum);
    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.id);
    const adminClient = createAdminClient();

    const { data: transactions } = await adminClient
        .from('coin_transactions')
        .select('user_id, amount, reason')
        .in('user_id', studentIds)
        .gte('created_at', sevenDaysAgo.toISOString())
        .gt('amount', 0);

    const gainsMap: Record<string, number> = {};
    transactions
        ?.filter((tx) => isRankingEligibleReason(tx.reason))
        .forEach((tx) => {
            gainsMap[tx.user_id] = (gainsMap[tx.user_id] || 0) + tx.amount;
        });

    const badgeMap = await getEquippedBadges(studentIds);

    return sortAndRank(
        students.map((s) => ({
            rank: 0,
            name: getNickname(s.nickname),
            points: gainsMap[s.id] || 0,
            avatar: badgeMap[s.id] || '🌱',
            comparison: 0,
        }))
    );
}

export async function getTournamentRankingAction() {
    const context = await getStudentClassContext();
    if (!context) return [];

    const adminClient = createAdminClient();

    const { data: activeTournaments } = await adminClient
        .from('tournaments')
        .select('id, title')
        .eq('grade', context.grade)
        .eq('class', context.classNum)
        .order('end_time', { ascending: false })
        .limit(1);

    if (!activeTournaments || activeTournaments.length === 0) return [];

    const tournamentId = activeTournaments[0].id;
    const rankings = await getTournamentRankings(tournamentId);

    return rankings.map((r, index) => {
        const nickname = (r.nickname || '').trim();
        const name = !nickname || nickname.toLowerCase() === 'unknown' ? '익명' : nickname;

        return {
            rank: r.rank,
            name,
            points: r.score || 0,
            avatar: '🏆',
            comparison: 0,
            tier: index === 0 ? 'Diamond' : index < 3 ? 'Platinum' : 'Gold',
        };
    });
}
