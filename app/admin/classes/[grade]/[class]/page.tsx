
export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase/server";
import { StudentList } from "../../student-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
    params: Promise<{
        grade: string;
        class: string;
    }>;
};

async function getClassStudents(grade: number, classNum: number) {
    if (isNaN(grade) || isNaN(classNum)) {
        console.error("Invalid grade or classNum: NaN");
        return [];
    }
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('grade', grade)
        .eq('class', classNum)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }

    // Transform data to match Student type if needed, but it should match mostly
    return data.map(p => ({
        id: p.id,
        nickname: p.nickname || 'Unknown',
        login_id: p.username || 'N/A',
        coin_balance: p.coin_balance || 0,
        created_at: p.created_at || new Date().toISOString()
    }));
}

export default async function ClassDetailPage({ params }: Props) {
    const { grade: gradeStr, class: classStr } = await params;
    const grade = parseInt(gradeStr);
    const classNum = parseInt(classStr);

    const students = await getClassStudents(grade, classNum);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                <div>
                    <h2 className="text-xl font-bold">{grade}학년 {classNum}반 학생 관리</h2>
                    <p className="text-sm text-gray-500">학생 목록을 확인하고 코인 관리 및 계정 삭제를 수행합니다.</p>
                </div>
                <Link href={`/admin/classes/${grade}`}>
                    <Button variant="outline" className="border-black">뒤로 가기</Button>
                </Link>
            </div>

            <StudentList students={students} />
        </div>
    );
}
