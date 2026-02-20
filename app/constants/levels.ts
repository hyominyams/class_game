export function calculateLevel(totalScore: number): number {
    if (totalScore < 0) return 1;

    // 점차 요구 점수가 증가하는 방식
    // LV 1: 0~99
    // LV 2: 100~299 (200점 필요)
    // LV 3: 300~599 (300점 필요)
    // LV 4: 600~999 (400점 필요)
    // 수학적 공식: 필요한 총 점수 = 50 * L * (L - 1)
    // 2차 방정식 50L^2 - 50L - totalScore = 0 의 해 (양수)
    // 근의 공식 적용 후 버림 처리

    // 좀 더 단순하고 직관적인 지수/거듭제곱 수식 형태
    // 요구 경험치가 기하급수적(n^2 비율)으로 늘어나게 설정
    // Level = floor(sqrt(totalScore / 100)) + 1
    // L1: 0~99
    // L2: 100~399 (폭 300)
    // L3: 400~899 (폭 500)
    // L4: 900~1599 (폭 700)
    // L5: 1600~2499 (폭 900)
    // L6: 2500~3599 (폭 1100)
    // L10: 8100~9999 (폭 1900)

    // 점수가 증가할수록 레벨업이 현저히 힘들어지게 만듦
    const level = Math.floor(Math.sqrt(totalScore / 100)) + 1;
    return level;
}

export function getNextLevelRequirement(currentLevel: number): number {
    // 다음 레벨(currentLevel + 1)을 위한 최소 달성 점수
    // totalScore >= 100 * (L - 1)^2
    return 100 * Math.pow(currentLevel, 2);
}

export function getCurrentLevelProgress(totalScore: number) {
    const level = calculateLevel(totalScore);
    const currentLevelBaseScore = 100 * Math.pow(level - 1, 2);
    const nextLevelTargetScore = getNextLevelRequirement(level);

    const requiredScoreForThisLevel = nextLevelTargetScore - currentLevelBaseScore;
    const earnedScoreInThisLevel = totalScore - currentLevelBaseScore;

    // 퍼센티지 및 디테일 정보 반환
    const percentage = requiredScoreForThisLevel > 0
        ? Math.min(100, Math.max(0, (earnedScoreInThisLevel / requiredScoreForThisLevel) * 100))
        : 100;

    return {
        level,
        totalScore,
        currentBase: currentLevelBaseScore,
        nextTarget: nextLevelTargetScore,
        earnedInLevel: earnedScoreInThisLevel,
        requiredInLevel: requiredScoreForThisLevel,
        percentage
    };
}
