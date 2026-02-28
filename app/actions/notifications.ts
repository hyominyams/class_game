'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { isRankingEligibleReason } from '@/app/constants/economy'
import { requireActor } from './security/guards'

type StudentNotification = {
    id: string
    type: 'coin_grant' | 'rank_up' | 'rank_down'
    title: string
    description: string
    createdAt: string
    href: string
}

function isManualGrantReason(reason: string) {
    if (reason.startsWith('TEACHER_GRANT:') || reason.startsWith('ADMIN_GRANT:')) return true
    if (reason.startsWith('PURCHASE:')) return false
    if (reason.startsWith('SYSTEM:')) return false
    if (isRankingEligibleReason(reason)) return false
    if (reason.includes('주간 랭킹 보상')) return false
    return true
}

function extractGrantReason(reason: string) {
    return reason
        .replace('TEACHER_GRANT:', '')
        .replace('ADMIN_GRANT:', '')
        .trim()
}

function computeRank(pointsMap: Record<string, number>, classmateIds: string[], targetUserId: string) {
    const sorted = classmateIds
        .map((id) => ({ id, points: pointsMap[id] || 0 }))
        .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))
    return sorted.findIndex((item) => item.id === targetUserId) + 1
}

function toIso(value: string | null | undefined, fallbackIso: string) {
    if (!value) return fallbackIso
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return fallbackIso
    return date.toISOString()
}

export async function getStudentNotificationsAction(limit = 8) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 30) : 8

    const actorResult = await requireActor(['student'])
    if (!actorResult.ok) {
        return { notifications: [] as StudentNotification[], unreadCount: 0 }
    }

    const { actor } = actorResult
    const adminClient = createAdminClient()

    const nowIso = new Date().toISOString()
    const twoWeeksAgoIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const rankingWindowStartIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentCoinTransactions } = await adminClient
        .from('coin_transactions')
        .select('id, amount, reason, created_at')
        .eq('user_id', actor.userId)
        .gt('amount', 0)
        .gte('created_at', twoWeeksAgoIso)
        .order('created_at', { ascending: false })
        .limit(30)

    const coinNotifications: StudentNotification[] = (recentCoinTransactions || [])
        .filter((tx) => isManualGrantReason(tx.reason))
        .slice(0, safeLimit)
        .map((tx) => {
            const isAdminGrant = tx.reason.startsWith('ADMIN_GRANT:')
            const reasonText = extractGrantReason(tx.reason)
            const rewardSource = isAdminGrant ? '관리자 코인 지급' : '교사 코인 지급'

            return {
                id: tx.id,
                type: 'coin_grant',
                title: rewardSource,
                description: `${reasonText || '사유 없음'} (+${tx.amount} 코인)`,
                createdAt: toIso(tx.created_at, nowIso),
                href: '/student/dashboard',
            }
        })

    const rankingNotifications: StudentNotification[] = []
    if (actor.grade !== null && actor.classNum !== null) {
        const { data: classmates } = await adminClient
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .eq('grade', actor.grade)
            .eq('class', actor.classNum)

        const classmateIds = (classmates || []).map((item) => item.id)
        if (classmateIds.length > 0) {
            const { data: rankingTransactions } = await adminClient
                .from('coin_transactions')
                .select('user_id, amount, reason, created_at')
                .in('user_id', classmateIds)
                .gt('amount', 0)
                .order('created_at', { ascending: false })
                .range(0, 9999)

            const pointsNow: Record<string, number> = {}
            const pointsBefore: Record<string, number> = {}
            for (const id of classmateIds) {
                pointsNow[id] = 0
                pointsBefore[id] = 0
            }

            let rankChangedAt: string | null = null
            for (const tx of rankingTransactions || []) {
                if (!isRankingEligibleReason(tx.reason)) continue

                pointsNow[tx.user_id] = (pointsNow[tx.user_id] || 0) + (tx.amount || 0)

                const createdAtIso = toIso(tx.created_at, nowIso)
                if (createdAtIso < rankingWindowStartIso) {
                    pointsBefore[tx.user_id] = (pointsBefore[tx.user_id] || 0) + (tx.amount || 0)
                } else if (!rankChangedAt || createdAtIso > rankChangedAt) {
                    rankChangedAt = createdAtIso
                }
            }

            const currentRank = computeRank(pointsNow, classmateIds, actor.userId)
            const previousRank = computeRank(pointsBefore, classmateIds, actor.userId)

            if (currentRank > 0 && previousRank > 0 && currentRank !== previousRank) {
                const movement = previousRank - currentRank
                const movedUp = movement > 0
                const distance = Math.abs(movement)

                rankingNotifications.push({
                    id: `rank-change-${rankChangedAt || nowIso}`,
                    type: movedUp ? 'rank_up' : 'rank_down',
                    title: movedUp ? '랭킹 상승' : '랭킹 하락',
                    description: `최근 24시간 기준 ${distance}위 ${movedUp ? '상승' : '하락'} (현재 ${currentRank}위)`,
                    createdAt: rankChangedAt || nowIso,
                    href: '/student/ranking',
                })
            }
        }
    }

    const notifications = [...coinNotifications, ...rankingNotifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, safeLimit)

    return {
        notifications,
        unreadCount: notifications.length,
    }
}
