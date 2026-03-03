"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActor } from "@/app/actions/security/guards";
import { canAccessClassScope, canManageStudent } from "@/app/actions/security/rbac";

type LooseRpcError = { code?: string; message?: string } | null;

function normalizeManualCoinReason(reason: string, role: 'teacher' | 'admin', amount: number) {
    const trimmedReason = reason.trim() || 'manual-adjustment';
    if (
        trimmedReason.startsWith('TEACHER_GRANT:')
        || trimmedReason.startsWith('ADMIN_GRANT:')
        || trimmedReason.startsWith('TEACHER_REVOKE:')
        || trimmedReason.startsWith('ADMIN_REVOKE:')
    ) {
        return trimmedReason;
    }

    if (amount >= 0) {
        return role === 'teacher' ? `TEACHER_GRANT:${trimmedReason}` : `ADMIN_GRANT:${trimmedReason}`;
    }

    return role === 'teacher' ? `TEACHER_REVOKE:${trimmedReason}` : `ADMIN_REVOKE:${trimmedReason}`;
}

function isActivateRpcMissingError(error: LooseRpcError) {
    if (!error) return false;
    return error.code === "PGRST202" || (error.message || "").includes("activate_question_set_atomic");
}

/**
 * Create a question set.
 */
export async function createQuestionSetAction(data: {
    title: string;
    gameId: string;
    grade: number;
    classNum: number;
    subject?: string;
}) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor, supabase } = actorResult;

    if (actor.role === "teacher" && !canAccessClassScope(actor, data.grade, data.classNum)) {
        return { success: false, error: "Forbidden: You can only create sets for your own class." };
    }

    const { data: insertedData, error } = await supabase
        .from('question_sets')
        .insert({
            title: data.title,
            game_id: data.gameId || 'pixel-runner',
            created_by: actor.userId,
            grade: data.grade,
            class: data.classNum,
            is_active: false
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating question set:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/teacher/questions');
    return { success: true, data: insertedData };
}

/**
 * Toggle active state for a question set.
 * Keep only one active set per game/scope.
 */
export async function toggleQuestionSetAction(setId: string, gameId: string, active: boolean) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor, supabase } = actorResult;
    const adminClient = createAdminClient();

    const updateClient = actor.role === "admin" ? adminClient : supabase;
    const { data: targetSet, error: targetSetError } = await updateClient
        .from("question_sets")
        .select("grade, class")
        .eq("id", setId)
        .single();

    if (targetSetError || !targetSet) {
        return { success: false, error: "Question set not found" };
    }

    if (actor.role === "teacher" && !canAccessClassScope(actor, targetSet.grade, targetSet.class)) {
        return { success: false, error: "Forbidden: You can only manage sets in your own class." };
    }

    if (active) {
        const rpcClient = supabase as unknown as {
            rpc: (
                fn: string,
                params?: Record<string, unknown>
            ) => Promise<{ data: unknown; error: LooseRpcError }>
        };

        const { error: rpcError } = await rpcClient.rpc("activate_question_set_atomic", {
            p_set_id: setId,
            p_actor_id: actor.userId,
        });

        if (!rpcError) {
            revalidatePath("/teacher/questions");
            revalidatePath("/admin/questions");
            revalidatePath("/student/game");
            return { success: true };
        }

        if (!isActivateRpcMissingError(rpcError)) {
            return { success: false, error: rpcError.message || "Failed to activate question set atomically." };
        }

        // Fallback: keep legacy path for environments where RPC is not deployed yet.
        let deactivateQuery = updateClient
            .from("question_sets")
            .update({ is_active: false })
            .eq("game_id", gameId);

        if (targetSet.grade !== null && targetSet.class !== null) {
            deactivateQuery = deactivateQuery.eq("grade", targetSet.grade).eq("class", targetSet.class);
        } else {
            deactivateQuery = deactivateQuery.is("grade", null).is("class", null);
        }

        const { error: deactivateError } = await deactivateQuery;
        if (deactivateError) return { success: false, error: deactivateError.message };
    }

    let activateQuery = updateClient
        .from("question_sets")
        .update({ is_active: active })
        .eq("id", setId);

    const { error } = await activateQuery;
    if (error) return { success: false, error: error.message };

    revalidatePath("/teacher/questions");
    revalidatePath("/admin/questions");
    revalidatePath("/student/game");

    return { success: true };
}

/**
 * Replace all questions in a set.
 */
export async function updateQuestionsAction(setId: string, questions: {
    question_text: string;
    options: string[];
    correct_answer: number;
}[]) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor, supabase } = actorResult;
    const adminClient = createAdminClient();
    const updateClient = actor.role === "admin" ? adminClient : supabase;

    const { data: targetSet, error: setError } = await updateClient
        .from("question_sets")
        .select("grade, class")
        .eq("id", setId)
        .single();

    if (setError || !targetSet) {
        return { success: false, error: "Question set not found" };
    }

    if (actor.role === "teacher" && !canAccessClassScope(actor, targetSet.grade, targetSet.class)) {
        return { success: false, error: "Forbidden: You can only edit sets in your own class." };
    }

    // Remove existing questions first (simple full overwrite).
    const { error: deleteError } = await updateClient
        .from('questions')
        .delete()
        .eq('set_id', setId);

    if (deleteError) return { success: false, error: deleteError.message };

    const insertData = questions.map(q => ({
        set_id: setId,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer
    }));

    const { error: insertError } = await updateClient
        .from('questions')
        .insert(insertData);

    if (insertError) return { success: false, error: insertError.message };

    revalidatePath('/teacher/questions');
    revalidatePath('/student/game');

    return { success: true };
}

/**
 * Create one student account.
 * Teachers can only create students in their own grade/class.
 */
export async function createStudentAction(data: {
    nickname: string;
    username: string;
    grade: number;
    classNum: number;
}) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor } = actorResult;

    if (actor.role === "teacher" && !canAccessClassScope(actor, data.grade, data.classNum)) {
        return { success: false, error: "You can only register students in your own grade/class." };
    }

    // Create account through admin client.
    const adminSupabase = createAdminClient();
    const email = `${data.username}@classquest.edu`;
    const password = "1234"; // Initial password

    const { error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: 'student',
            nickname: data.nickname,
            username: data.username,
            grade: data.grade,
            class: data.classNum
        }
    });

    if (authError) {
        console.error("Auth creation error:", authError);
        return { success: false, error: authError.message };
    }

    revalidatePath('/teacher/accounts');
    return { success: true };
}

/**
 * Create student accounts in bulk.
 */
export async function createBulkStudentsAction(students: {
    nickname: string;
    username: string;
    grade: number;
    classNum: number;
}[]) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor } = actorResult;

    const adminSupabase = createAdminClient();
    const results = {
        successCount: 0,
        failures: [] as { username: string; error: string }[]
    };

    // 2) Create accounts in a loop.
    for (const student of students) {
        if (actor.role === "teacher" && !canAccessClassScope(actor, student.grade, student.classNum)) {
            results.failures.push({ username: student.username, error: "Cannot create students outside your class." });
            continue;
        }

        const email = `${student.username}@classquest.edu`; // Derived email pattern
        const password = "1234";

        const { error: authError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                role: 'student',
                nickname: student.nickname,
                username: student.username,
                grade: student.grade,
                class: student.classNum
            }
        });

        if (authError) {
            console.error(`Failed to create user ${student.username}:`, authError);
            results.failures.push({ username: student.username, error: authError.message });
        } else {
            results.successCount++;
        }
    }

    revalidatePath('/teacher/accounts');
    revalidatePath('/teacher/dashboard');
    return { success: true, results };
}

/**
 * Grant or revoke coins for a student.
 */
export async function giveCoinToStudentAction(studentId: string, amount: number, reason: string) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const { actor } = actorResult;
    const supabaseAdmin = createAdminClient();

    const { data: targetStudent, error: targetStudentError } = await supabaseAdmin
        .from("profiles")
        .select("role, grade, class")
        .eq("id", studentId)
        .single();

    if (targetStudentError || !targetStudent) {
        return { success: false, error: "Student not found" };
    }

    if (!canManageStudent(actor, {
        role: targetStudent.role,
        grade: targetStudent.grade,
        classNum: targetStudent.class,
    })) {
        return { success: false, error: "Forbidden: You can only adjust your own class students." };
    }

    const issuerRole = actor.role === "teacher" ? "teacher" : "admin";
    const normalizedReason = normalizeManualCoinReason(reason, issuerRole, amount);

    // 1. Update Balance via RPC (Atomic & Bypasses RLS since it's SECURITY DEFINER)
    const { error: rpcError } = await supabaseAdmin.rpc('increment_coin_balance', {
        user_id_arg: studentId,
        amount_arg: amount
    });

    if (rpcError) {
        console.error("RPC Error:", rpcError);
        // Fallback to manual update if RPC fails for some reason
        const { data: currentProfile } = await supabaseAdmin.from('profiles').select('coin_balance').eq('id', studentId).single();
        const newBalance = (currentProfile?.coin_balance || 0) + amount;
        const { error: updateError } = await supabaseAdmin.from('profiles').update({ coin_balance: newBalance }).eq('id', studentId);
        if (updateError) return { success: false, error: updateError.message };
    }

    // 2. Record Transaction
    const { error: logError } = await supabaseAdmin
        .from('coin_transactions')
        .insert({
            user_id: studentId,
            amount: amount,
            reason: normalizedReason,
            type: amount > 0 ? 'admin_grant' : 'admin_revoke'
        });

    if (logError) {
        console.error('Transaction Log Error:', logError);
    }

    revalidatePath('/teacher/accounts');
    revalidatePath('/student/dashboard');
    return { success: true };
}
