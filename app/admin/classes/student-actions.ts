'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/app/actions/security/guards";

function normalizeAdminCoinReason(reason: string, amount: number) {
    const trimmedReason = reason.trim() || 'manual-adjustment';
    if (
        trimmedReason.startsWith('ADMIN_GRANT:')
        || trimmedReason.startsWith('ADMIN_REVOKE:')
    ) {
        return trimmedReason;
    }

    return amount >= 0 ? `ADMIN_GRANT:${trimmedReason}` : `ADMIN_REVOKE:${trimmedReason}`;
}

export async function updateStudentCoin(studentId: string, amount: number, reason: string) {
    const actorResult = await requireActor(["admin"]);
    if (!actorResult.ok) {
        return { error: actorResult.error, status: actorResult.status };
    }

    const supabaseAdmin = createAdminClient();
    const normalizedReason = normalizeAdminCoinReason(reason, amount);

    const { data: studentProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', studentId)
        .single();

    if (!studentProfile || studentProfile.role !== 'student') {
        return { error: 'Only student accounts can receive this adjustment.' };
    }

    // 1. Update Balance via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('increment_coin_balance', {
        user_id_arg: studentId,
        amount_arg: amount
    });

    if (rpcError) {
        console.error("RPC Error in updateStudentCoin:", rpcError);
        // Fallback
        const { data: profile } = await supabaseAdmin.from('profiles').select('coin_balance').eq('id', studentId).single();
        if (!profile) return { error: '학생 정보를 찾을 수 없습니다.' };
        const newBalance = (profile.coin_balance || 0) + amount;
        const { error: updateError } = await supabaseAdmin.from('profiles').update({ coin_balance: newBalance }).eq('id', studentId);
        if (updateError) return { error: '코인 업데이트 실패' };
    }

    // 2. Log transaction
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

    revalidatePath('/admin/classes');
    revalidatePath('/student/dashboard');
    return { success: true, message: '코인이 지급/회수 되었습니다.' };
}

export async function deleteStudentAccount(studentId: string) {
    const actorResult = await requireActor(["admin"]);
    if (!actorResult.ok) {
        return { error: actorResult.error, status: actorResult.status };
    }

    const supabaseAdmin = createAdminClient();

    const { data: studentProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', studentId)
        .single();

    if (!studentProfile || studentProfile.role !== 'student') {
        return { error: 'Only student accounts can be deleted here.' };
    }

    // 1. Delete User from Auth (This usually cascades if set up, but let's be safe)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(studentId);

    if (deleteError) {
        return { error: '계정 삭제 실패: ' + deleteError.message };
    }

    // 2. Ideally, profile should cascade delete. If not, we might need manual cleanup.
    // Assuming cascade is ON for profiles.id -> auth.users.id

    revalidatePath('/admin/classes');
    return { success: true, message: '계정이 삭제되었습니다.' };
}
