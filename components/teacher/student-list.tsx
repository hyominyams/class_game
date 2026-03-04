"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditStudentModal } from "@/components/teacher/edit-student-modal";
import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { GiveCoinModal } from "@/components/teacher/give-coin-modal";
import { deleteStudentAction } from "@/app/actions/teacher-v2";

interface Student {
    id: string;
    nickname: string | null;
    username: string | null;
    grade: number | null;
    class: number | null;
    coin_balance: number | null;
}

export function StudentList({ initialStudents }: { initialStudents: Student[] }) {
    const [students, setStudents] = useState(initialStudents);
    const [searchTerm, setSearchTerm] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filteredStudents = students.filter((student) => (
        student.nickname?.includes(searchTerm) || student.username?.includes(searchTerm)
    ));

    const handleDelete = async (student: Student) => {
        const name = student.nickname || student.username || "학생";
        if (!confirm(`정말 ${name} 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        setDeletingId(student.id);
        try {
            const result = await deleteStudentAction(student.id);
            if (result.success) {
                setStudents((prev) => prev.filter((item) => item.id !== student.id));
                return;
            }

            alert(result.error || "삭제에 실패했습니다.");
        } catch (error) {
            console.error("Failed to delete student:", error);
            alert("삭제 중 오류가 발생했습니다.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <StudentPixelCard className="bg-white p-0 overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-gray-50 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                    placeholder="이름 또는 ID로 검색..."
                    className="max-w-xs border-black h-8 bg-white placeholder:font-normal placeholder:opacity-60"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-black bg-gray-100">
                            <th className="p-4 whitespace-nowrap font-pixel text-sm">이름</th>
                            <th className="p-4 whitespace-nowrap font-pixel text-sm">ID (학번)</th>
                            <th className="p-4 whitespace-nowrap font-pixel text-sm">학년/반</th>
                            <th className="p-4 whitespace-nowrap font-pixel text-sm">보유 코인</th>
                            <th className="p-4 whitespace-nowrap text-center font-pixel text-sm">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <tr key={student.id} className="border-b border-gray-200 last:border-0 hover:bg-[#dfe6e9] transition-colors">
                                    <td className="p-4 font-bold">{student.nickname}</td>
                                    <td className="p-4">
                                        <span className="font-mono text-gray-600 bg-gray-50 rounded px-2 border border-gray-300">
                                            {student.username}
                                        </span>
                                    </td>
                                    <td className="p-4">{student.grade}학년 {student.class}반</td>
                                    <td className="p-4 text-center font-bold text-yellow-600">
                                        <div className="flex items-center justify-center gap-1">
                                            <span>🪙</span>
                                            {student.coin_balance?.toLocaleString() || 0}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <GiveCoinModal studentId={student.id} studentName={student.nickname || "학생"}>
                                                <Button variant="outline" size="sm" className="h-8 border-black text-xs hover:bg-yellow-100 font-bold text-yellow-600 border-yellow-500">
                                                    코인
                                                </Button>
                                            </GiveCoinModal>
                                            <EditStudentModal
                                                student={{
                                                    id: Number.parseInt(student.id, 10) || 0,
                                                    name: student.nickname || "",
                                                    username: student.username || "",
                                                }}
                                            >
                                                <Button variant="outline" size="sm" className="h-8 border-black text-xs hover:bg-gray-100 font-bold">
                                                    수정
                                                </Button>
                                            </EditStudentModal>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(student)}
                                                disabled={deletingId === student.id}
                                                className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                                            >
                                                {deletingId === student.id ? "삭제 중..." : "삭제"}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    {searchTerm ? "검색 결과가 없습니다." : "등록된 학생이 없습니다."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </StudentPixelCard>
    );
}