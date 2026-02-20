"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTournamentAction(data: {
    title: string;
    gameId: string;
    questionSetId: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    target: "CLASS" | "GRADE";
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, grade, class')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'teacher' || profile.grade === null || profile.class === null) {
        return { success: false, error: "Unauthorized or class information missing" };
    }

    // Casting to number because we checked for null
    const grade = profile.grade as number;
    const classNum = profile.class as number;

    if (data.target === "GRADE") {
        return { success: false, error: "Currently only class-level tournaments are supported." };
    }

    const { error } = await supabase.from('tournaments').insert({
        title: data.title,
        game_id: data.gameId,
        question_set_id: data.questionSetId,
        grade: grade,
        class: classNum,
        start_time: data.startTime,
        end_time: data.endTime,
        created_by: user.id,
        is_active: true
    });

    if (error) {
        console.error("Error creating tournament:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/teacher/tournaments');
    return { success: true };
}

export async function getActiveTournamentsForClass(grade: number, classNum: number) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('tournaments')
        .select('*, question_sets(title)')
        .eq('grade', grade)
        .eq('class', classNum)
        .lte('start_time', now)
        .gte('end_time', now)
        .order('end_time', { ascending: true });

    if (error) {
        console.error("Error fetching active tournaments:", error);
        return [];
    }
    return data;
}

export async function checkTournamentEligibility(tournamentId: string, userId: string) {
    const supabase = await createClient();

    const { data: participation, error } = await supabase
        .from('tournament_participants')
        .select('attempts_used')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error checking eligibility:", error);
        return { allowed: false, error: error.message };
    }

    const used = participation?.attempts_used || 0;
    const allowed = used < 3;

    return { allowed, attemptsLeft: 3 - used, used };
}

export async function recordTournamentAttempt(tournamentId: string, score: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required" };
    const userId = user.id;

    const { data: current, error: fetchError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        return { success: false, error: fetchError.message };
    }

    const used = current?.attempts_used || 0;
    const currentBest = current?.best_score || 0;

    if (used >= 3) {
        return { success: false, error: "No attempts left" };
    }

    const { error: upsertError } = await supabase
        .from('tournament_participants')
        .upsert({
            tournament_id: tournamentId,
            user_id: userId,
            attempts_used: used + 1,
            best_score: Math.max(currentBest, score),
            last_played_at: new Date().toISOString()
        }, { onConflict: 'tournament_id, user_id' });

    if (upsertError) return { success: false, error: upsertError.message };

    const { error: logError } = await supabase
        .from('tournament_logs')
        .insert({
            tournament_id: tournamentId,
            user_id: userId,
            score: score
        });

    if (logError) console.error("Error logging tournament score:", logError);

    return { success: true };
}

export async function getTournamentRankings(tournamentId: string) {
    const supabase = await createClient();

    // Get participants
    const { data: participants, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('best_score', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching rankings:", error);
        return [];
    }

    if (!participants || participants.length === 0) return [];

    const userIds = participants.map(p => p.user_id);
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);

    return participants.map((p, index) => ({
        rank: index + 1,
        nickname: profileMap.get(p.user_id) || "Unknown",
        score: p.best_score,
        date: p.last_played_at ? new Date(p.last_played_at).toLocaleDateString() : "-"
    }));
}
