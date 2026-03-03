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
    { id: 'rich_kid', name: "저축왕", icon: "💰", description: "보유 코인 1000개 돌파", category: 'collection' },
    { id: 'ranking_master', name: "명예의 전당", icon: "👑", description: "게임 랭킹 1위 달성", category: 'special' },
    { id: 'effort_king', name: "노력왕", icon: "💎", description: "코인 한도 도달 후에도 5회 더 플레이", category: 'achievement' },
    { id: 'combo_master', name: "콤보 마스터", icon: "🎢", description: "연속 정답 10번 이상 달성", category: 'achievement' },
    { id: 'night_owl', name: "올빼미족", icon: "🦉", description: "밤 10시 이후 새벽에 플레이", category: 'achievement' },
    { id: 'early_bird', name: "얼리버드", icon: "🌅", description: "아침 8시 이전 일찍 플레이", category: 'achievement' },
    { id: 'tournament_champion', name: "황금 트로피", icon: "🏆", description: "대회 모드에서 우승 차지", category: 'special' },
    { id: 'history_buff', name: "역사 학자", icon: "📜", description: "역사 퀴즈 누적 10,000점 돌파", category: 'collection' },
    { id: 'marathoner', name: "마라토너", icon: "👟", description: "픽셀 러너 모드 50판 이상 플레이", category: 'achievement' },
    { id: 'word_hero', name: "어휘의 달인", icon: "🗣️", description: "워드 체인에서 어려운 제시어 정답", category: 'special' },
    { id: 'never_give_up', name: "칠전팔기", icon: "🥊", description: "한 게임 5번 실패 후 결국 클리어", category: 'achievement' },
    { id: 'lucky_seven', name: "럭키 세븐", icon: "🎰", description: "최종 게임 점수로 777점 획득", category: 'special' },
    { id: 'team_player', name: "팀 멘토", icon: "🤝", description: "학급 대항전 참여 기록 누적 10회", category: 'social' },
];
