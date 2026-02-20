'use server'

import { createClient } from "@/lib/supabase/server";

export async function getAdminDashboardStats() {
    const supabase = await createClient();

    // 1. Total Students
    const { count: totalStudents, error: studentsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

    if (studentsError) {
        console.error('Error fetching total students:', studentsError);
    }

    // 2. Total Teachers
    const { count: totalTeachers, error: teachersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher');

    // 3. Daily Game Plays
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { count: gamePlays, error: gameError } = await supabase
        .from('game_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayIso);

    // 4. Total Classes (Approximate by distinct grade/class combinations from profiles)
    // We fetch distinct grade/class pairs to count active classes
    const { data: classData, error: classError } = await supabase
        .from('profiles')
        .select('grade, class')
        .not('grade', 'is', null)
        .not('class', 'is', null);

    // Calculate unique classes
    const uniqueClasses = new Set();
    if (classData) {
        classData.forEach(p => {
            if (p.grade && p.class) {
                uniqueClasses.add(`${p.grade}-${p.class}`);
            }
        });
    }

    return {
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalClasses: uniqueClasses.size,
        gamePlays: gamePlays || 0,
    };
}
