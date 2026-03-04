import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentMyPageClient } from "@/components/student/student-my-page-client";

export default async function StudentMyPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("nickname, username")
        .eq("id", user.id)
        .single();

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-pixel text-3xl font-bold mb-2">마이페이지</h1>
                <p className="font-pixel text-sm text-gray-600">닉네임과 비밀번호를 변경할 수 있습니다.</p>
            </header>

            <StudentMyPageClient
                username={profile?.username || ""}
                initialNickname={profile?.nickname || ""}
            />
        </div>
    );
}
