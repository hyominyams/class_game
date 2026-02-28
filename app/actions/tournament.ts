"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_TOURNAMENT_ATTEMPTS = 3;
const MAX_TOURNAMENT_WRITE_RETRIES = 5;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type TournamentTarget = "CLASS" | "GRADE";

type TournamentGameSelection = {
    gameId: string;
    questionSetId: string;
};

type TournamentScope = {
    target: TournamentTarget;
    grade: number;
    classNum: number | null;
};

type UserProfile = {
    role: string | null;
    grade: number | null;
    class: number | null;
};

type TournamentRow = {
    id: string;
    title: string | null;
    game_id: string | null;
    question_set_id: string | null;
    grade: number | null;
    class: number | null;
    start_time: string | null;
    end_time: string | null;
    is_active: boolean | null;
};

type ParticipantRow = {
    attempts_used: number | null;
    best_score: number | null;
    last_played_at: string | null;
};

type AttemptWriteResult = {
    success: boolean;
    attemptsUsed?: number;
    attemptsLeft?: number;
    bestScore?: number;
    previousAttemptsUsed?: number;
    previousBestScore?: number;
    previousLastPlayedAt?: string | null;
    error?: string;
};

function normalizeTournamentSelections(data: {
    gameSetSelections?: TournamentGameSelection[];
    gameId?: string;
    questionSetId?: string;
}) {
    if (Array.isArray(data.gameSetSelections) && data.gameSetSelections.length > 0) {
        return data.gameSetSelections;
    }

    if (data.gameId && data.questionSetId) {
        return [{ gameId: data.gameId, questionSetId: data.questionSetId }];
    }

    return [];
}

function parseIntegerOrNull(value: unknown) {
    if (typeof value === "number" && Number.isInteger(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isInteger(parsed)) return parsed;
    }
    return null;
}

function isTournamentActiveNow(tournament: Pick<TournamentRow, "start_time" | "end_time" | "is_active">) {
    const now = Date.now();
    const startAt = tournament.start_time ? new Date(tournament.start_time).getTime() : null;
    const endAt = tournament.end_time ? new Date(tournament.end_time).getTime() : null;

    return Boolean(tournament.is_active)
        && (startAt === null || startAt <= now)
        && (endAt === null || endAt >= now);
}

function isStudentInTournamentScope(profile: UserProfile, tournament: Pick<TournamentRow, "grade" | "class">) {
    if (profile.grade === null || tournament.grade === null) {
        return false;
    }

    if (tournament.class === null) {
        return profile.grade === tournament.grade;
    }

    if (profile.class === null) {
        return false;
    }

    return profile.grade === tournament.grade && profile.class === tournament.class;
}

function normalizeScore(score: number) {
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.floor(score));
}

function isSetCompatibleWithScope(
    scope: TournamentScope,
    questionSet: { grade: number | null; class: number | null }
) {
    const isGlobal = questionSet.grade === null && questionSet.class === null;
    const sameGrade = questionSet.grade === scope.grade;
    const sameClass = sameGrade && questionSet.class === scope.classNum;
    const gradeWide = sameGrade && questionSet.class === null;

    if (scope.target === "CLASS") {
        return sameClass || gradeWide || isGlobal;
    }

    return gradeWide || isGlobal;
}

function resolveTournamentScope(profile: UserProfile, data: {
    target: TournamentTarget;
    grade?: number;
    classNum?: number;
}): { scope?: TournamentScope; error?: string } {
    if (profile.role === "teacher") {
        if (data.target === "GRADE") {
            return { error: "Teachers can only create CLASS tournaments." };
        }

        if (profile.grade === null || profile.class === null) {
            return { error: "Teacher class information is missing." };
        }

        return {
            scope: {
                target: "CLASS",
                grade: profile.grade,
                classNum: profile.class,
            },
        };
    }

    if (profile.role === "admin") {
        const grade = parseIntegerOrNull(data.grade);

        if (data.target === "GRADE") {
            if (grade === null) {
                return { error: "GRADE tournaments require a grade." };
            }

            return {
                scope: {
                    target: "GRADE",
                    grade,
                    classNum: null,
                },
            };
        }

        const classNum = parseIntegerOrNull(data.classNum);
        if (grade === null || classNum === null) {
            return { error: "CLASS tournaments require grade and class." };
        }

        return {
            scope: {
                target: "CLASS",
                grade,
                classNum,
            },
        };
    }

    return { error: "Unauthorized" };
}

async function updateParticipantAttemptWithRetry(
    supabase: SupabaseServerClient,
    tournamentId: string,
    userId: string,
    score: number,
): Promise<AttemptWriteResult> {
    for (let retry = 0; retry < MAX_TOURNAMENT_WRITE_RETRIES; retry++) {
        const { data: current, error: fetchError } = await supabase
            .from("tournament_participants")
            .select("attempts_used, best_score, last_played_at")
            .eq("tournament_id", tournamentId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
            return { success: false, error: fetchError.message };
        }

        const currentRow = (current || null) as ParticipantRow | null;

        if (!currentRow) {
            const { data: inserted, error: insertError } = await supabase
                .from("tournament_participants")
                .insert({
                    tournament_id: tournamentId,
                    user_id: userId,
                    attempts_used: 1,
                    best_score: score,
                    last_played_at: new Date().toISOString(),
                })
                .select("attempts_used, best_score")
                .maybeSingle();

            if (!insertError && inserted) {
                return {
                    success: true,
                    attemptsUsed: inserted.attempts_used || 1,
                    attemptsLeft: Math.max(0, MAX_TOURNAMENT_ATTEMPTS - (inserted.attempts_used || 1)),
                    bestScore: inserted.best_score || score,
                    previousAttemptsUsed: 0,
                    previousBestScore: 0,
                    previousLastPlayedAt: null,
                };
            }

            if (insertError?.code === "23505") {
                continue;
            }

            return { success: false, error: insertError?.message || "Failed to insert participant state." };
        }

        const used = currentRow.attempts_used || 0;
        const currentBest = currentRow.best_score || 0;

        if (used >= MAX_TOURNAMENT_ATTEMPTS) {
            return { success: false, error: "No attempts left" };
        }

        const nextUsed = used + 1;
        const nextBest = Math.max(currentBest, score);

        const { data: updated, error: updateError } = await supabase
            .from("tournament_participants")
            .update({
                attempts_used: nextUsed,
                best_score: nextBest,
                last_played_at: new Date().toISOString(),
            })
            .eq("tournament_id", tournamentId)
            .eq("user_id", userId)
            .eq("attempts_used", used)
            .select("attempts_used, best_score")
            .maybeSingle();

        if (updateError && updateError.code !== "PGRST116") {
            return { success: false, error: updateError.message };
        }

        if (updated) {
            return {
                success: true,
                attemptsUsed: updated.attempts_used || nextUsed,
                attemptsLeft: Math.max(0, MAX_TOURNAMENT_ATTEMPTS - (updated.attempts_used || nextUsed)),
                bestScore: updated.best_score || nextBest,
                previousAttemptsUsed: used,
                previousBestScore: currentBest,
                previousLastPlayedAt: currentRow.last_played_at,
            };
        }
    }

    return { success: false, error: "Concurrent attempt conflict. Please retry." };
}

async function rollbackParticipantAttempt(
    supabase: SupabaseServerClient,
    tournamentId: string,
    userId: string,
    previousAttemptsUsed: number,
    previousBestScore: number,
    previousLastPlayedAt: string | null | undefined,
    observedAttemptsUsed: number,
) {
    await supabase
        .from("tournament_participants")
        .update({
            attempts_used: previousAttemptsUsed,
            best_score: previousBestScore,
            last_played_at: previousLastPlayedAt || null,
        })
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .eq("attempts_used", observedAttemptsUsed);
}

export async function createTournamentAction(data: {
    title: string;
    startTime: string;
    endTime: string;
    target: TournamentTarget;
    gameSetSelections?: TournamentGameSelection[];
    gameId?: string;
    questionSetId?: string;
    grade?: number;
    classNum?: number;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, grade, class")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return { success: false, error: "Profile not found" };
    }

    const { scope, error: scopeError } = resolveTournamentScope(profile as UserProfile, data);
    if (!scope) {
        return { success: false, error: scopeError || "Invalid tournament scope." };
    }

    const title = data.title.trim();
    if (!title) {
        return { success: false, error: "Tournament title is required." };
    }

    const startAt = new Date(data.startTime);
    const endAt = new Date(data.endTime);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        return { success: false, error: "Invalid tournament date range." };
    }
    if (endAt <= startAt) {
        return { success: false, error: "End time must be after start time." };
    }

    const { data: overlaps, error: overlapError } = await supabase
        .from("tournaments")
        .select("id, title, class, end_time")
        .eq("grade", scope.grade)
        .eq("is_active", true)
        .lte("start_time", data.endTime)
        .gte("end_time", data.startTime);

    if (overlapError) {
        console.error("Error checking overlapping tournaments:", overlapError);
        return { success: false, error: overlapError.message };
    }

    const scopedOverlaps = (overlaps || []).filter((item) => {
        if (scope.target === "GRADE") {
            return true;
        }

        return item.class === null || item.class === scope.classNum;
    });

    const conflict = scopedOverlaps[0];
    if (conflict) {
        const endDateText = conflict.end_time
            ? new Date(conflict.end_time).toLocaleString()
            : "unknown";

        return {
            success: false,
            error: `An overlapping tournament already exists (${conflict.title || "untitled"}, ends ${endDateText}).`,
        };
    }

    const selections = normalizeTournamentSelections(data);
    if (selections.length === 0) {
        return { success: false, error: "Select at least one game question set." };
    }

    const selectionMap = new Map<string, string>();
    for (const selection of selections) {
        if (!selection.gameId || !selection.questionSetId) continue;
        selectionMap.set(selection.gameId, selection.questionSetId);
    }

    if (selectionMap.size === 0) {
        return { success: false, error: "Select at least one valid game question set." };
    }

    const questionSetIds = Array.from(new Set(selectionMap.values()));

    let ownedSetQuery = supabase
        .from("question_sets")
        .select("id, game_id, created_by, grade, class")
        .in("id", questionSetIds);

    if (profile.role === "teacher") {
        ownedSetQuery = ownedSetQuery.eq("created_by", user.id);
    }

    const { data: ownedSets, error: setFetchError } = await ownedSetQuery;

    if (setFetchError) {
        console.error("Error validating tournament question sets:", setFetchError);
        return { success: false, error: setFetchError.message };
    }

    if (!ownedSets || ownedSets.length !== questionSetIds.length) {
        return { success: false, error: "Some selected question sets are invalid or not accessible." };
    }

    const setMap = new Map(ownedSets.map((set) => [set.id, set]));

    const rows = Array.from(selectionMap.entries()).map(([gameId, questionSetId]) => {
        const matchedSet = setMap.get(questionSetId);
        if (!matchedSet) {
            return null;
        }

        if (!matchedSet.game_id || matchedSet.game_id !== gameId) {
            return null;
        }

        if (!isSetCompatibleWithScope(scope, matchedSet)) {
            return null;
        }

        return {
            title,
            game_id: gameId,
            question_set_id: questionSetId,
            grade: scope.grade,
            class: scope.target === "CLASS" ? scope.classNum : null,
            start_time: data.startTime,
            end_time: data.endTime,
            created_by: user.id,
            is_active: true,
        };
    }).filter((row): row is {
        title: string;
        game_id: string;
        question_set_id: string;
        grade: number;
        class: number | null;
        start_time: string;
        end_time: string;
        created_by: string;
        is_active: boolean;
    } => row !== null);

    if (rows.length !== selectionMap.size) {
        return { success: false, error: "Each game must map to a scope-compatible question set." };
    }

    const { error } = await supabase.from("tournaments").insert(rows);

    if (error) {
        console.error("Error creating tournament:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/teacher/tournaments");
    revalidatePath("/admin/tournaments");
    revalidatePath("/student/game");

    return {
        success: true,
        createdCount: rows.length,
        target: scope.target,
        grade: scope.grade,
        classNum: scope.classNum,
    };
}

export async function getTournamentQuestionSetSelection(tournamentId: string, gameId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Not logged in" };
    }

    const [{ data: profile, error: profileError }, { data: tournament, error: tournamentError }] = await Promise.all([
        supabase
            .from("profiles")
            .select("role, grade, class")
            .eq("id", user.id)
            .single(),
        supabase
            .from("tournaments")
            .select("id, title, game_id, question_set_id, grade, class, start_time, end_time, is_active")
            .eq("id", tournamentId)
            .single(),
    ]);

    if (profileError || !profile) {
        return { success: false, error: "Profile not found" };
    }

    if (tournamentError || !tournament) {
        return { success: false, error: "Tournament not found" };
    }

    if (tournament.game_id !== gameId) {
        return { success: false, error: "Tournament does not match this game." };
    }

    if (!tournament.question_set_id) {
        return { success: false, error: "Tournament question set is not configured." };
    }

    if (profile.role === "student" && !isStudentInTournamentScope(profile as UserProfile, tournament as TournamentRow)) {
        return { success: false, error: "You are not in this tournament scope." };
    }

    if (!isTournamentActiveNow(tournament as TournamentRow)) {
        return { success: false, error: "Tournament is not active." };
    }

    const { data: questionSet, error: questionSetError } = await supabase
        .from("question_sets")
        .select("question_mode")
        .eq("id", tournament.question_set_id)
        .single();

    if (questionSetError) {
        return { success: false, error: "Failed to load tournament question set mode." };
    }

    return {
        success: true,
        questionSetId: tournament.question_set_id,
        tournamentTitle: tournament.title || null,
        questionMode: questionSet?.question_mode || null,
        target: tournament.class === null ? "GRADE" : "CLASS",
    };
}

export async function getActiveTournamentsForClass(grade: number, classNum: number) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("grade", grade)
        .eq("is_active", true)
        .or(`class.eq.${classNum},class.is.null`)
        .lte("start_time", now)
        .gte("end_time", now)
        .order("end_time", { ascending: true });

    if (error) {
        console.error("Error fetching active tournaments:", error);
        return [];
    }

    const rows = (data || []).sort((a, b) => {
        const aPriority = a.class === classNum ? 0 : 1;
        const bPriority = b.class === classNum ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;

        const aEnd = a.end_time ? new Date(a.end_time).getTime() : Number.MAX_SAFE_INTEGER;
        const bEnd = b.end_time ? new Date(b.end_time).getTime() : Number.MAX_SAFE_INTEGER;
        return aEnd - bEnd;
    });

    const byGame = new Map<string, typeof rows[number]>();
    for (const row of rows) {
        if (!row.game_id || byGame.has(row.game_id)) continue;
        byGame.set(row.game_id, row);
    }

    return Array.from(byGame.values());
}

export async function checkTournamentEligibility(tournamentId: string, userId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "Authentication required" };
    }

    const { data: requesterProfile, error: requesterError } = await supabase
        .from("profiles")
        .select("role, grade, class")
        .eq("id", user.id)
        .single();

    if (requesterError || !requesterProfile) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "Profile not found" };
    }

    const targetUserId = (requesterProfile.role === "admin" && userId) ? userId : user.id;

    if (requesterProfile.role !== "admin" && userId && userId !== user.id) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "Unauthorized scope" };
    }

    const profile = targetUserId === user.id
        ? (requesterProfile as UserProfile)
        : (await supabase
            .from("profiles")
            .select("role, grade, class")
            .eq("id", targetUserId)
            .single()).data as UserProfile | null;

    if (!profile) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "Target profile not found" };
    }

    const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, grade, class, start_time, end_time, is_active")
        .eq("id", tournamentId)
        .single();

    if (tournamentError || !tournament) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "Tournament not found" };
    }

    if (!isTournamentActiveNow(tournament as TournamentRow)) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "Tournament is not active" };
    }

    if (profile.role === "student" && !isStudentInTournamentScope(profile, tournament as TournamentRow)) {
        return { allowed: false, attemptsLeft: 0, used: 0, error: "You are not in this tournament scope" };
    }

    const { data: participation, error } = await supabase
        .from("tournament_participants")
        .select("attempts_used")
        .eq("tournament_id", tournamentId)
        .eq("user_id", targetUserId)
        .maybeSingle();

    if (error && error.code !== "PGRST116") {
        console.error("Error checking eligibility:", error);
        return { allowed: false, attemptsLeft: 0, used: 0, error: error.message };
    }

    const used = participation?.attempts_used || 0;
    const attemptsLeft = Math.max(0, MAX_TOURNAMENT_ATTEMPTS - used);
    const allowed = attemptsLeft > 0;

    return { allowed, attemptsLeft, used };
}

export async function recordTournamentAttempt(tournamentId: string, score: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required" };

    const [{ data: profile, error: profileError }, { data: tournament, error: tournamentError }] = await Promise.all([
        supabase
            .from("profiles")
            .select("role, grade, class")
            .eq("id", user.id)
            .single(),
        supabase
            .from("tournaments")
            .select("id, grade, class, start_time, end_time, is_active")
            .eq("id", tournamentId)
            .single(),
    ]);

    if (profileError || !profile) {
        return { success: false, error: "Profile not found" };
    }

    if (profile.role !== "student") {
        return { success: false, error: "Only students can submit tournament attempts" };
    }

    if (tournamentError || !tournament) {
        return { success: false, error: "Tournament not found" };
    }

    if (!isStudentInTournamentScope(profile as UserProfile, tournament as TournamentRow)) {
        return { success: false, error: "You are not in this tournament scope" };
    }

    if (!isTournamentActiveNow(tournament as TournamentRow)) {
        return { success: false, error: "Tournament is not active" };
    }

    const normalizedScore = normalizeScore(score);

    const attemptWrite = await updateParticipantAttemptWithRetry(
        supabase,
        tournamentId,
        user.id,
        normalizedScore,
    );

    if (!attemptWrite.success) {
        return {
            success: false,
            error: attemptWrite.error || "Failed to record attempt",
            attemptsLeft: attemptWrite.attemptsLeft,
        };
    }

    const { error: logError } = await supabase
        .from("tournament_logs")
        .insert({
            tournament_id: tournamentId,
            user_id: user.id,
            score: normalizedScore,
        });

    if (logError) {
        await rollbackParticipantAttempt(
            supabase,
            tournamentId,
            user.id,
            attemptWrite.previousAttemptsUsed || 0,
            attemptWrite.previousBestScore || 0,
            attemptWrite.previousLastPlayedAt,
            attemptWrite.attemptsUsed || 0,
        );

        return { success: false, error: "Failed to log tournament attempt" };
    }

    return {
        success: true,
        attemptsUsed: attemptWrite.attemptsUsed,
        attemptsLeft: attemptWrite.attemptsLeft,
        bestScore: attemptWrite.bestScore,
    };
}

export async function getTournamentRankings(tournamentId: string) {
    const supabase = await createClient();

    const { data: participants, error } = await supabase
        .from("tournament_participants")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("best_score", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching rankings:", error);
        return [];
    }

    if (!participants || participants.length === 0) return [];

    const userIds = participants.map((p) => p.user_id).filter((id): id is string => id !== null);
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.nickname]) || []);

    return participants.map((p, index) => ({
        rank: index + 1,
        nickname: (p.user_id ? profileMap.get(p.user_id) : null) || "Unknown",
        score: p.best_score,
        date: p.last_played_at ? new Date(p.last_played_at).toLocaleDateString() : "-",
    }));
}
