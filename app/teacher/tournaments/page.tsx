import { Button } from "@/components/ui/button";
import { CreateTournamentModal } from "@/components/teacher/create-tournament-modal";
import { TournamentListClient } from "@/components/teacher/tournament-list-client";
import { createClient } from "@/lib/supabase/server";

type TournamentListItem = {
    id: string;
    title: string;
    end_time: string;
    game_id: string;
    is_active: boolean;
};

export default async function TeacherTournamentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null; // Or redirect to login

    // Fetch question sets for dropdown
    const { data: questionSets } = await supabase
        .from('question_sets')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

    // Fetch tournaments
    const { data: tournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

    const normalizedTournaments: TournamentListItem[] = (tournaments || []).flatMap((tournament) => {
        if (!tournament.game_id || !tournament.end_time) {
            return [];
        }

        return [{
            id: tournament.id,
            title: tournament.title || "Tournament",
            end_time: tournament.end_time,
            game_id: tournament.game_id,
            is_active: Boolean(tournament.is_active),
        }];
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-100 p-6 border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-pixel mb-1">대회 관리</h2>
                    <p className="text-sm text-gray-500">학급 리그 및 대항전을 운영합니다.</p>
                </div>
                <CreateTournamentModal questionSets={questionSets || []}>
                    <Button className="bg-[#2d3436] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all">
                        + 새 대회 개최
                    </Button>
                </CreateTournamentModal>
            </div>

            <TournamentListClient tournaments={normalizedTournaments} />
        </div>
    );
}
