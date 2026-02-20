import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = {
    params: Promise<{ grade: string }>;
};

async function getGradeClasses(grade: number) {
    if (isNaN(grade)) {
        console.error("Invalid grade: NaN");
        return [];
    }

    const supabase = await createClient();

    // Fetch profiles in this grade
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('grade', grade);

    if (error) {
        console.error("Supabase Error in getGradeClasses:", error.message, error.details, error.hint);
        return [];
    }

    // Group by class
    const classMap = new Map<number, { classNum: number, teachers: any[], students: number }>();

    profiles.forEach(p => {
        if (!p.class) return;

        if (!classMap.has(p.class)) {
            classMap.set(p.class, { classNum: p.class, teachers: [], students: 0 });
        }

        const data = classMap.get(p.class)!;

        if (p.role === 'teacher') {
            data.teachers.push(p);
        } else if (p.role === 'student') {
            data.students++;
        }
    });

    return Array.from(classMap.values()).sort((a, b) => a.classNum - b.classNum);
}

export default async function GradeDetailPage({ params }: Props) {
    const { grade: gradeStr } = await params;
    const grade = parseInt(gradeStr);
    const classes = await getGradeClasses(grade);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                <div>
                    <h2 className="text-xl font-bold">{grade}학년 학급 관리</h2>
                    <p className="text-sm text-gray-500">각 반의 담임 교사와 학생 현황을 확인합니다.</p>
                </div>
                <Link href="/admin/classes">
                    <Button variant="outline" className="border-black">뒤로 가기</Button>
                </Link>
            </div>

            <div className="grid gap-6">
                {classes.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white border-2 border-gray-200 border-dashed rounded">
                        등록된 반 정보가 없습니다.
                    </div>
                ) : (
                    classes.map((cls) => (
                        <StudentPixelCard key={cls.classNum} className="bg-white" title={`${cls.classNum}반`}>
                            <div className="flex items-center justify-between mt-2 bg-gray-50 p-4 border border-gray-200 rounded">
                                <div className="grid grid-cols-2 gap-8 text-center w-full max-w-xl">
                                    <div className="text-left">
                                        <span className="block text-gray-500 text-xs">담임 교사</span>
                                        {cls.teachers.length > 0 ? (
                                            cls.teachers.map((t: any) => (
                                                <div key={t.id} className="font-bold text-lg">
                                                    {t.nickname} ({t.username || 'ID N/A'})
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 font-bold">미배정</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">학생 수</span>
                                        <span className="font-bold text-xl">{cls.students}명</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/admin/classes/${grade}/${cls.classNum}`}>
                                        <Button variant="outline" size="sm" className="border-black">반 상세 보기</Button>
                                    </Link>
                                    <Button variant="outline" size="sm" className="border-black" disabled>설정</Button>
                                </div>
                            </div>
                        </StudentPixelCard>
                    ))
                )}
            </div>
        </div>
    );
}
