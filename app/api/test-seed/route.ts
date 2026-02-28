import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type SeedAccount = {
    email: string;
    password: string;
    role: "teacher" | "student";
    nickname: string;
    username: string;
    grade: number;
    classNum: number;
};

export async function GET() {
    console.log("SEEDING TEACHER & STUDENT ACCOUNTS");
    const results: Array<{ email: string; status: string; id?: string; error?: string }> = [];

    try {
        const supabase = createAdminClient();

        const accounts: SeedAccount[] = [
            {
                email: "teacher@classquest.edu",
                password: "a123456789",
                role: "teacher",
                nickname: "담임선생님",
                username: "teacher",
                grade: 6,
                classNum: 1,
            },
            {
                email: "student@classquest.edu",
                password: "a123456789",
                role: "student",
                nickname: "전학생",
                username: "student",
                grade: 6,
                classNum: 1,
            },
        ];

        for (const acc of accounts) {
            const { data: usersData } = await supabase.auth.admin.listUsers();
            const existingUser = usersData?.users.find((u) => u.email === acc.email);

            let userId = existingUser?.id;

            if (!existingUser) {
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: acc.email,
                    password: acc.password,
                    email_confirm: true,
                });

                if (authError) {
                    results.push({ email: acc.email, status: "Auth Error", error: authError.message });
                    continue;
                }

                userId = authData.user.id;
                results.push({ email: acc.email, status: "Auth Created", id: userId });
            } else {
                results.push({ email: acc.email, status: "Auth Already Exists", id: userId });
            }

            if (userId) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .upsert({
                        id: userId,
                        role: acc.role,
                        nickname: acc.nickname,
                        username: acc.username,
                        grade: acc.grade,
                        class: acc.classNum,
                    });

                if (profileError) {
                    results.push({ email: acc.email, status: "Profile Error", error: profileError.message });
                } else {
                    results.push({ email: acc.email, status: "Profile Set" });
                }
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (e) {
        console.error("SEEDING ERROR:", e);
        return NextResponse.json(
            {
                success: false,
                error: e instanceof Error ? e.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
