import { GameListClient } from "@/components/game/game-list-client";
import { createClient } from "@/lib/supabase/server";

type ActiveTournament = {
    id: string;
    game_id: string;
};

type TournamentParticipation = {
    tournament_id: string;
    attempts_used: number | null;
};

export default async function GameListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let activeTournaments: ActiveTournament[] = [];
    const participationMap: Record<string, { allowed: boolean, attemptsLeft: number }> = {};

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("grade, class")
            .eq("id", user.id)
            .single();

        if (profile && profile.grade !== null && profile.class !== null) {
            // CLASS + GRADE tournaments are both visible; CLASS has higher priority per game.
            const now = new Date().toISOString();
            const { data: tournaments } = await supabase
                .from("tournaments")
                .select("id, game_id, class, end_time")
                .eq("grade", profile.grade)
                .eq("is_active", true)
                .or(`class.eq.${profile.class},class.is.null`)
                .lte("start_time", now)
                .gte("end_time", now)
                .order("end_time", { ascending: true });

            const sortedTournaments = (tournaments || []).sort((a, b) => {
                const aPriority = a.class === profile.class ? 0 : 1;
                const bPriority = b.class === profile.class ? 0 : 1;
                if (aPriority !== bPriority) return aPriority - bPriority;

                const aEnd = a.end_time ? new Date(a.end_time).getTime() : Number.MAX_SAFE_INTEGER;
                const bEnd = b.end_time ? new Date(b.end_time).getTime() : Number.MAX_SAFE_INTEGER;
                return aEnd - bEnd;
            });

            const tournamentsByGame = new Map<string, ActiveTournament>();
            for (const tournament of sortedTournaments) {
                if (!tournament.game_id || tournamentsByGame.has(tournament.game_id)) {
                    continue;
                }
                tournamentsByGame.set(tournament.game_id, {
                    id: tournament.id,
                    game_id: tournament.game_id,
                });
            }
            activeTournaments = Array.from(tournamentsByGame.values());

            const participationByTournamentId = new Map<string, number>();
            const activeTournamentIds = activeTournaments.map((t) => t.id);
            if (activeTournamentIds.length > 0) {
                const { data: participations } = await supabase
                    .from("tournament_participants")
                    .select("tournament_id, attempts_used")
                    .eq("user_id", user.id)
                    .in("tournament_id", activeTournamentIds);

                (participations as TournamentParticipation[] | null)?.forEach((participation) => {
                    participationByTournamentId.set(participation.tournament_id, participation.attempts_used ?? 0);
                });
            }

            const participationList = activeTournaments.map((t) => {
                const attemptsUsed = participationByTournamentId.get(t.id) ?? 0;
                return {
                    gameId: t.game_id,
                    allowed: attemptsUsed < 3,
                    attemptsLeft: Math.max(0, 3 - attemptsUsed),
                };
            });

            for (const participation of participationList) {
                participationMap[participation.gameId] = {
                    allowed: participation.allowed,
                    attemptsLeft: participation.attemptsLeft,
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
