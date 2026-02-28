import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import type { ActorScope, AppRole } from "./rbac";

const ALL_ROLES: readonly AppRole[] = ["admin", "teacher", "student"];

export type AuthActor = ActorScope & {
    user: User;
    userId: string;
};

export type GuardFailure = {
    ok: false;
    status: 401 | 403;
    error: string;
};

export type GuardSuccess = {
    ok: true;
    actor: AuthActor;
    supabase: Awaited<ReturnType<typeof createClient>>;
};

export type GuardResult = GuardFailure | GuardSuccess;

export async function requireActor(allowedRoles: readonly AppRole[]): Promise<GuardResult> {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, grade, class")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || !profile.role) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    if (!allowedRoles.includes(profile.role)) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    return {
        ok: true,
        supabase,
        actor: {
            user,
            userId: user.id,
            role: profile.role,
            grade: profile.grade,
            classNum: profile.class,
        },
    };
}

export async function requireAuthenticatedActor() {
    return requireActor(ALL_ROLES);
}

export function guardError(error: string, status: 401 | 403 = 403) {
    return { success: false as const, error, status };
}
