export const TITLES = [
    { id: 'title_newbie', name: '새내기', requiredCoins: 0, icon: '🌱', description: '갓 모험을 시작한 새내기' },
    { id: 'title_beginner', name: '초보자', requiredCoins: 100, icon: '🌟', description: '세상의 규칙에 눈을 뜬 초보자' },
    { id: 'title_adventurer', name: '모험가', requiredCoins: 300, icon: '🧭', description: '본격적으로 길을 나선 모험가' },
    { id: 'title_expert', name: '숙련자', requiredCoins: 1000, icon: '⚔️', description: '수많은 역경을 이겨낸 숙련자' },
    { id: 'title_legend', name: '전설', requiredCoins: 3000, icon: '👑', description: '모두가 우러러보는 전설적인 존재' },
    { id: 'title_god', name: '신', requiredCoins: 10000, icon: '✨', description: '궁극의 경지에 도달한 픽셀의 신' }
] as const;

export type TitleId = typeof TITLES[number]['id'];

export function getUnlockedTitles(totalCoinsEarned: number) {
    return TITLES.filter(title => totalCoinsEarned >= title.requiredCoins);
}

export function getHighestTitle(totalCoinsEarned: number) {
    const unlocked = getUnlockedTitles(totalCoinsEarned);
    return unlocked[unlocked.length - 1];
}
