import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAdminClassesStats } from "./actions";
import { CreateTeacherModal } from "./create-teacher-modal";

export default async function AdminClassesPage() {
    const grades = await getAdminClassesStats();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                <div>
                    <h2 className="text-xl font-bold">학교 조직 관리</h2>
                    <p className="text-sm text-gray-500">학년 및 반을 구성하고 담임 교사를 배정합니다.</p>
                </div>
                <CreateTeacherModal />
            </div>

            <div className="grid gap-6">
                {grades.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white border-2 border-gray-200 border-dashed rounded">
                        등록된 학급 정보가 없습니다. 상단 버튼을 눌러 추가해주세요.
                    </div>
                ) : (
                    grades.map((g) => (
                        <StudentPixelCard key={g.grade} className="bg-white" title={`${g.grade}학년`}>
                            <div className="flex items-center justify-between mt-2 bg-gray-50 p-4 border border-gray-200 rounded">
                                <div className="grid grid-cols-3 gap-8 text-center w-full max-w-2xl">
                                    <div>
                                        <span className="block text-gray-500 text-xs">학급 수</span>
                                        <span className="font-bold text-xl">{g.classes}개 반</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">교사</span>
                                        <span className="font-bold text-xl">{g.teachers}명</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 text-xs">학생</span>
                                        <span className="font-bold text-xl">{g.students}명</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/admin/classes/${g.grade}`}>
                                        <Button variant="outline" size="sm" className="border-black">상세 보기</Button>
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
