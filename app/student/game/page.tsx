import { GameListClient } from "@/components/game/game-list-client";
import { createClient } from "@/lib/supabase/server";

export default async function GameListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let activeTournaments: any[] = [];
    let participationMap: Record<string, { allowed: boolean, attemptsLeft: number }> = {};

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('grade, class').eq('id', user.id).single();
        if (profile) {
            // Fetch active tournaments for this class
            const now = new Date().toISOString();
            const { data: tournaments } = await supabase
                .from('tournaments')
                .select('*')
                .eq('grade', profile.grade)
                .eq('class', profile.class)
                .lte('start_time', now)
                .gte('end_time', now);

            activeTournaments = tournaments || [];

            // Check participation for each active tournament
            for (const t of activeTournaments) {
                const { data: p } = await supabase
                    .from('tournament_participants')
                    .select('attempts_used')
                    .eq('tournament_id', t.id)
                    .eq('user_id', user.id)
                    .single();

                const attemptsUsed = p ? p.attempts_used : 0;
                participationMap[t.game_id] = {
                    allowed: attemptsUsed < 3,
                    attemptsLeft: 3 - attemptsUsed
                };
            }
        }
    }

    return (
        <GameListClient
            activeTournaments={activeTournaments}
            participationMap={participationMap}
        />
    );
}
