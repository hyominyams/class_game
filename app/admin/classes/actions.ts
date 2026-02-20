'use server'

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ClassStat = {
    grade: number;
    classId: number;
    teacherCount: number;
    studentCount: number;
};

export type GradeStat = {
    grade: number;
    classes: number; // Count of distinct classes
    teachers: number;
    students: number;
    classDetails: ClassStat[];
};

export async function getAdminClassesStats() {
    const supabase = await createClient();

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('grade, class, role');

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }

    // Aggregation
    const statsMap = new Map<number, GradeStat>();

    profiles.forEach(p => {
        if (!p.grade) return;

        // Initialize grade stat if not exists
        if (!statsMap.has(p.grade)) {
            statsMap.set(p.grade, {
                grade: p.grade,
                classes: 0,
                teachers: 0,
                students: 0,
                classDetails: []
            });
        }

        const gradeStat = statsMap.get(p.grade)!;

        if (p.role === 'teacher') gradeStat.teachers++;
        if (p.role === 'student') gradeStat.students++;

        // Class level aggregation (simplified for now, logic to count distinct classes)
        // To count distinct classes accurately we need to track seen classes
    });

    // Refined Aggregation logic
    const detailedStats: GradeStat[] = [];
    const gradeGroups = new Map<number, typeof profiles>();

    profiles.forEach(p => {
        if (!p.grade) return;
        if (!gradeGroups.has(p.grade)) gradeGroups.set(p.grade, []);
        gradeGroups.get(p.grade)!.push(p);
    });

    gradeGroups.forEach((gradeProfiles, grade) => {
        const classesSet = new Set<number>();
        let teacherCount = 0;
        let studentCount = 0;

        gradeProfiles.forEach(p => {
            if (p.class) classesSet.add(p.class);
            if (p.role === 'teacher') teacherCount++;
            if (p.role === 'student') studentCount++;
        });

        detailedStats.push({
            grade,
            classes: classesSet.size,
            teachers: teacherCount,
            students: studentCount,
            classDetails: [] // Can populate if needed for detail view
        });
    });

    return detailedStats.sort((a, b) => a.grade - b.grade);
}

export type CreateTeacherState = {
    message?: string;
    error?: string;
    success?: boolean;
}

export async function createTeacherAction(prevState: CreateTeacherState, formData: FormData): Promise<CreateTeacherState> {
    const supabaseAdmin = createAdminClient();

    const nickname = formData.get('nickname') as string;
    const loginId = formData.get('loginId') as string;
    const grade = parseInt(formData.get('grade') as string);
    const classNum = parseInt(formData.get('class') as string);
    const password = formData.get('password') as string || 'a123456789'; // Default password

    if (!nickname || !loginId || !grade || !classNum) {
        return { error: '모든 필드를 입력해주세요.' };
    }

    // 1. Create User
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: `${loginId}@classquest.local`, // Mock email since we use ID login
        password: password,
        email_confirm: true,
        user_metadata: {
            nickname,
            grade,
            class: classNum,
            role: 'teacher',
            username: loginId // Store original login ID as username
        }
    });

    if (createError) {
        console.error('Create User Error:', createError);
        return { error: createError.message };
    }

    if (!userData.user) {
        return { error: "User creation failed without error message" };
    }

    // 2. Update/Insert Profile
    // We update the profile to ensure it has the correct role and data. 
    // Usually trigger handles insert, so we define 'upsert' to be safe.
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userData.user.id,
            nickname,
            username: loginId, // Set the username in profile
            grade,
            class: classNum,
            role: 'teacher',
            coin_balance: 0 // Initialize
            // Created_at will be handled by DB default or upsert behavior
        });

    if (profileError) {
        console.error('Profile Upsert Error:', profileError);
        // Clean up created auth user if profile fails? 
        // Ideally yes, but for MVP keep it simple.
        return { error: '계정은 생성되었으나 프로필 설정에 실패했습니다.' };
    }

    revalidatePath('/admin/classes');
    return { success: true, message: '교사 계정이 생성되었습니다.' };
}
