export const DAILY_GAME_COIN_LIMIT = 90;
export const ATTENDANCE_COIN_REWARD = 10;
export const DAILY_TOTAL_COIN_LIMIT = DAILY_GAME_COIN_LIMIT + ATTENDANCE_COIN_REWARD;

export const GAME_REWARD_RULE = {
    correctCoinPerAnswer: 1,
    maxCorrectReward: 15,
    scorePerCoin: 200,
    maxScoreReward: 15,
    perfectBonus: 5,
    maxPerGameReward: 35,
} as const;

export const RANKING_INCLUDED_REASON_PREFIXES = [
    "GAME_REWARD:",
    "TOURNAMENT_REWARD:",
] as const;

export const RANKING_INCLUDED_REASON_EXACT = new Set<string>([
    "ATTENDANCE",
]);

export function isRankingEligibleReason(reason: string | null | undefined) {
    if (!reason) return false;
    if (RANKING_INCLUDED_REASON_EXACT.has(reason)) return true;
    return RANKING_INCLUDED_REASON_PREFIXES.some((prefix) => reason.startsWith(prefix));
}

export const WEEKLY_RANK_REWARDS = [
    { minRank: 1, maxRank: 1, tier: "Diamond", amount: 150 },
    { minRank: 2, maxRank: 2, tier: "Platinum", amount: 110 },
    { minRank: 3, maxRank: 5, tier: "Gold", amount: 80 },
    { minRank: 6, maxRank: 10, tier: "Silver", amount: 50 },
    { minRank: 11, maxRank: Number.MAX_SAFE_INTEGER, tier: "Bronze", amount: 20 },
] as const;

export function getWeeklyRewardByRank(rank: number) {
    const matched = WEEKLY_RANK_REWARDS.find((rule) => rank >= rule.minRank && rank <= rule.maxRank);
    return matched || WEEKLY_RANK_REWARDS[WEEKLY_RANK_REWARDS.length - 1];
}
