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

    // supabaseAdmin.auth.admin.deleteUser deletes the auth user.
    // The profile will ideally cascade or can be manually deleted.
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (profileError) {
        console.error('Error deleting profile:', profileError);
        return { success: false, error: '프로필 삭제에 실패했습니다.' };
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
        console.error('Error deleting auth user:', authError);
        return { success: false, error: '인증 계정 삭제에 실패했습니다.' };
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
        failures: [] as { loginId: string; reason: string }[]
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
                    username: user.loginId
                }
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
                        coin_balance: 0
                    });

                if (profileError) {
                    await supabaseAdmin.auth.admin.deleteUser(data.user.id); // Rollback
                    results.failures.push({ loginId: user.loginId, reason: '프로필 생성 실패 (롤백됨)' });
                } else {
                    results.successCount++;
                }
            } else {
                results.failures.push({ loginId: user.loginId, reason: '알 수 없는 에러' });
            }
        } catch (err: any) {
            results.failures.push({ loginId: user.loginId, reason: err.message || '예상치 못한 에러' });
        }
    }

    revalidatePath('/admin/accounts');
    return { success: true, results };
}
