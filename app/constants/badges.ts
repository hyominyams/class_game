export type Badge = {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: 'achievement' | 'collection' | 'social' | 'special';
};

export const BADGES: Badge[] = [
    { id: 'first_step', name: "첫 걸음", icon: "🌱", description: "첫 게임 완료", category: 'achievement' },
    { id: 'math_genius', name: "수학 천재", icon: "🧮", description: "수학 게임 1000점 달성", category: 'achievement' },
    { id: 'perfect_aim', name: "백발백중", icon: "🎯", description: "정답률 100% 달성 (한 게임)", category: 'achievement' },
    { id: 'diligent_king', name: "성실왕", icon: "🔥", description: "7일 연속 접속", category: 'achievement' },
    { id: 'speed_racer', name: "스피드 레이서", icon: "⚡", description: "30초 내 게임 클리어", category: 'achievement' },
    { id: 'quiz_explorer', name: "탐험가", icon: "🌍", description: "모든 종류의 게임 1회 이상 플레이", category: 'collection' },
    { id: 'word_collector', name: "단어 수집가", icon: "📚", description: "영어 단어 게임 5회 플레이", category: 'collection' },
    { id: 'rich_kid', name: "부자", icon: "💰", description: "보유 코인 1000개 돌파", category: 'collection' },
    { id: 'ranking_master', name: "랭커", icon: "👑", description: "랭킹 1위 달성", category: 'special' },
    { id: 'effort_king', name: "노력왕", icon: "💎", description: "코인 한도 도달 후에도 5회 더 플레이", category: 'achievement' },
];
