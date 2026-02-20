export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import { AddStudentModal } from "@/components/teacher/add-student-modal";
import { BulkCreateStudentModal } from "@/components/teacher/bulk-create-student-modal";
import { createClient } from "@/lib/supabase/server";
import { StudentList } from "@/components/teacher/student-list";
import { redirect } from "next/navigation";

export default async function TeacherAccountsPage() {
    const supabase = await createClient();

    // 1. 현재 사용자(교사) 정보 및 학급 정보 조회
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('grade, class')
        .eq('id', user.id)
        .single();

    // 2. 같은 학년/반 학생 목록 조회
    const { data: students } = await supabase
        .from('profiles')
        .select('id, nickname, username, grade, class, coin_balance')
        .eq('role', 'student')
        .eq('grade', profile?.grade || 0)
        .eq('class', profile?.class || 0)
        .order('nickname', { ascending: true });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-100 p-6 border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-pixel mb-1">학생 계정 관리</h2>
                    <p className="text-sm text-gray-500">우리 반 학생들의 계정을 생성하고 관리합니다. ({profile?.grade}학년 {profile?.class}반)</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <BulkCreateStudentModal teacherProfile={profile}>
                        <Button className="bg-[#00b894] hover:bg-[#00a885] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all font-bold">
                            + 일괄 생성
                        </Button>
                    </BulkCreateStudentModal>
                    <AddStudentModal teacherProfile={profile}>
                        <Button className="bg-[#6c5ce7] hover:bg-[#5f27cd] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all font-bold">
                            + 학생 계정 생성
                        </Button>
                    </AddStudentModal>
                </div>
            </div>

            <StudentList initialStudents={students || []} />
        </div>
    );
}
