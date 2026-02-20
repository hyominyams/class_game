"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 문제 세트 생성
 */
export async function createQuestionSetAction(data: {
    title: string;
    gameId: string;
    grade: number;
    classNum: number;
    subject?: string;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    // 프로필 정보 가져오기 (권한 확인)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'teacher') {
        return { success: false, error: "Only teachers can create question sets" };
    }

    const { data: insertedData, error } = await supabase
        .from('question_sets')
        .insert({
            title: data.title,
            game_id: data.gameId || 'pixel-runner',
            created_by: user.id,
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
 * 문제 세트 활성화/비활성화
 * 한 게임당 하나의 세트만 활성화 가능하도록 처리
 */
export async function toggleQuestionSetAction(setId: string, gameId: string, active: boolean) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    if (active) {
        // 기존에 활성화된 다른 세트들을 비활성화
        await supabase
            .from('question_sets')
            .update({ is_active: false })
            .eq('game_id', gameId)
            .eq('created_by', user.id);
    }

    const { error } = await supabase
        .from('question_sets')
        .update({ is_active: active })
        .eq('id', setId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/teacher/questions');
    return { success: true };
}

/**
 * 문제 추가/수정 (세트 내 문항 관리)
 */
export async function updateQuestionsAction(setId: string, questions: {
    question_text: string;
    options: string[];
    correct_answer: number;
}[]) {
    const supabase = await createClient();

    // 기존 문제 삭제 후 일괄 삽입 (단순화된 동기화)
    const { error: deleteError } = await supabase
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

    const { error: insertError } = await supabase
        .from('questions')
        .insert(insertData);

    if (insertError) return { success: false, error: insertError.message };

    revalidatePath('/teacher/questions');
    revalidatePath('/student/game');

    return { success: true };
}

/**
 * 학생 계정 생성
 * 교사는 본인의 학년/반 학생만 생성 가능
 */
export async function createStudentAction(data: {
    nickname: string;
    username: string;
    grade: number;
    classNum: number;
}) {
    const supabase = await createClient();

    // 1. 현재 사용자(교사) 정보 및 권한 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('role, grade, class')
        .eq('id', user.id)
        .single();

    if (!teacherProfile || teacherProfile.role !== 'teacher') {
        return { success: false, error: "Only teachers can create students" };
    }

    // 2. 학년/반 일치 확인 (PRD: 자기 학급 학생만 생성 가능)
    if (data.grade !== teacherProfile.grade || data.classNum !== teacherProfile.class) {
        return { success: false, error: "본인의 학년/반 학생만 등록할 수 있습니다." };
    }

    // 3. Admin Client를 이용한 계정 생성
    const adminSupabase = createAdminClient();
    const email = `${data.username}@classquest.edu`;
    const password = "1234"; // 초기 비밀번호

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
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
 * 학생 계정 일괄 생성
 */
export async function createBulkStudentsAction(students: {
    nickname: string;
    username: string;
    grade: number;
    classNum: number;
}[]) {
    const supabase = await createClient();

    // 1. 현재 사용자(교사) 정보 및 권한 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('role, grade, class')
        .eq('id', user.id)
        .single();

    if (!teacherProfile || teacherProfile.role !== 'teacher') {
        return { success: false, error: "Only teachers can create students" };
    }

    const adminSupabase = createAdminClient();
    const results = {
        successCount: 0,
        failures: [] as { username: string; error: string }[]
    };

    // 2. 일괄 생성 루프
    for (const student of students) {
        // 학년/반 일치 확인
        if (student.grade !== teacherProfile.grade || student.classNum !== teacherProfile.class) {
            results.failures.push({ username: student.username, error: "타 학급 학생 생성 불가" });
            continue;
        }

        const email = `${student.username}@classquest.edu`; // 도메인 정책 통일
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
 * 학생에게 코인 지급
 */
export async function giveCoinToStudentAction(studentId: string, amount: number, reason: string) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not logged in" };

    const { data: teacher } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
        return { success: false, error: "Unauthorized" };
    }

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
            reason: reason,
            type: amount > 0 ? 'admin_grant' : 'admin_revoke'
        });

    if (logError) {
        console.error('Transaction Log Error:', logError);
    }

    revalidatePath('/teacher/accounts');
    revalidatePath('/student/dashboard');
    return { success: true };
}
