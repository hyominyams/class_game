export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { GiveCoinModal } from "@/components/teacher/give-coin-modal";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherCoinsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, grade, class")
        .eq("id", user.id)
        .single();

    if (
        !profile
        || profile.role !== "teacher"
        || profile.grade === null
        || profile.class === null
    ) {
        redirect("/teacher/dashboard");
    }

    const { data: students } = await supabase
        .from("profiles")
        .select("id, nickname, username, coin_balance")
        .eq("role", "student")
        .eq("grade", profile.grade)
        .eq("class", profile.class)
        .order("nickname", { ascending: true });

    const studentList = students || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-100 p-6 border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-pixel mb-1">코인 지급</h2>
                    <p className="text-sm text-gray-500">
                        {profile.grade}학년 {profile.class}반 학생에게 보상을 지급합니다.
                    </p>
                </div>
                <Button
                    asChild
                    className="bg-white text-black border-2 border-black shadow-[3px_3px_0_0_black] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-bold"
                >
                    <Link href="/teacher/accounts">계정관리로 이동</Link>
                </Button>
            </div>

            {studentList.length === 0 ? (
                <StudentPixelCard className="bg-white border-4">
                    <p className="text-sm font-bold text-gray-500">현재 코인을 지급할 학생이 없습니다.</p>
                </StudentPixelCard>
            ) : (
                <div className="grid gap-3">
                    {studentList.map((student) => (
                        <StudentPixelCard
                            key={student.id}
                            className="bg-white border-4 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="text-base font-black truncate">{student.nickname || "학생"}</p>
                                <p className="text-xs text-gray-500 font-mono truncate">{student.username || "-"}</p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3">
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded border-2 border-black bg-[#fff3cd] text-sm font-black">
                                    <Coins className="w-3.5 h-3.5" />
                                    {(student.coin_balance || 0).toLocaleString()}
                                </div>
                                <GiveCoinModal studentId={student.id} studentName={student.nickname || "학생"}>
                                    <Button className="bg-[#00b894] hover:bg-[#00a885] text-white border-2 border-black shadow-[3px_3px_0_0_black] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-bold">
                                        코인 지급
                                    </Button>
                                </GiveCoinModal>
                            </div>
                        </StudentPixelCard>
                    ))}
                </div>
            )}
        </div>
    );
}
