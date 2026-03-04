'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/app/actions/security/guards";

export async function getAccounts(role: 'teacher' | 'student', grade?: number, classNum?: number) {
    const actorResult = await requireActor(["admin"]);
    if (!actorResult.ok) {
        return [];
    }

    const supabaseAdmin = createAdminClient();
    let query = supabaseAdmin.from('profiles').select('*').eq('role', role);

    if (grade) {
        query = query.eq('grade', grade);
    }
    if (classNum) {
        query = query.eq('class', classNum);
    }

    const { data: profiles, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching accounts:', error);
        return [];
    }

    return profiles;
}

export async function deleteAccount(id: string) {
    const actorResult = await requireActor(["admin"]);
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error, status: actorResult.status };
    }

    const supabaseAdmin = createAdminClient();

    // Break profile FK dependencies first so auth/profile deletion does not fail.
    const { error: unlinkQuestionSetsError } = await supabaseAdmin
        .from('question_sets')
        .update({ created_by: null })
        .eq('created_by', id);
    if (unlinkQuestionSetsError) {
        console.error('Error unlinking question sets from account:', unlinkQuestionSetsError);
    }

    const { error: unlinkTournamentsError } = await supabaseAdmin
        .from('tournaments')
        .update({ created_by: null })
        .eq('created_by', id);
    if (unlinkTournamentsError) {
        console.error('Error unlinking tournaments from account:', unlinkTournamentsError);
    }

    const { error: deleteItemsError } = await supabaseAdmin
        .from('student_items')
        .delete()
        .eq('user_id', id);
    if (deleteItemsError) {
        console.error('Error deleting student items for account:', deleteItemsError);
    }

    // Try hard-delete first; if blocked by FK constraints, fall back to soft-delete.
    const { error: hardDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (hardDeleteError) {
        const isNotFound = hardDeleteError.message.toLowerCase().includes('not found');
        if (!isNotFound) {
            const { error: softDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id, true);
            if (softDeleteError && !softDeleteError.message.toLowerCase().includes('not found')) {
                console.error('Error deleting auth user:', hardDeleteError, softDeleteError);
                return { success: false, error: 'Failed to delete auth account.' };
            }
        }
    }

    // Clean up orphaned profile row when auth cascade is not available.
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id);
    if (profileError) {
        console.error('Error deleting profile:', profileError);
        return { success: false, error: 'Failed to delete profile record.' };
    }

    revalidatePath('/admin/accounts');
    return { success: true };
}

export type BulkUserRow = {
    role: 'teacher' | 'student';
    grade: number;
    classNum: number;
    nickname: string;
    loginId: string;
    password?: string;
};

export async function bulkCreateAccounts(users: BulkUserRow[]) {
    const actorResult = await requireActor(["admin"]);
    if (!actorResult.ok) {
        return {
            success: false,
            error: actorResult.error,
            status: actorResult.status,
            results: {
                successCount: 0,
                failures: [] as { loginId: string; reason: string }[],
            },
        };
    }

    const supabaseAdmin = createAdminClient();
    const results = {
        successCount: 0,
        failures: [] as { loginId: string; reason: string }[],
    };

    for (const user of users) {
        try {
            const password = user.password || 'a123456789';
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: `${user.loginId}@classquest.local`,
                password: password,
                email_confirm: true,
                user_metadata: {
                    nickname: user.nickname,
                    grade: user.grade,
                    class: user.classNum,
                    role: user.role,
                    username: user.loginId,
                },
            });

            if (error) {
                results.failures.push({ loginId: user.loginId, reason: error.message });
                continue;
            }

            if (data.user) {
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        nickname: user.nickname,
                        username: user.loginId,
                        grade: user.grade,
                        class: user.classNum,
                        role: user.role,
                        coin_balance: 0,
                    });

                if (profileError) {
                    await supabaseAdmin.auth.admin.deleteUser(data.user.id); // Rollback
                    results.failures.push({ loginId: user.loginId, reason: 'Failed to create profile (rolled back auth).' });
                } else {
                    results.successCount++;
                }
            } else {
                results.failures.push({ loginId: user.loginId, reason: 'Unknown auth create error' });
            }
        } catch (err: unknown) {
            const reason = err instanceof Error ? err.message : 'Unexpected error';
            results.failures.push({ loginId: user.loginId, reason });
        }
    }

    revalidatePath('/admin/accounts');
    return { success: true, results };
}
