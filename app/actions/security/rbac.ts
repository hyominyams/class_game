import type { Database } from "@/types/supabase";

export type AppRole = Database["public"]["Enums"]["user_role"];

type RoleRule = {
    prefix: "/admin" | "/teacher" | "/student";
    allowedRoles: readonly AppRole[];
};

const ROLE_RULES: readonly RoleRule[] = [
    { prefix: "/admin", allowedRoles: ["admin"] },
    { prefix: "/teacher", allowedRoles: ["teacher", "admin"] },
    { prefix: "/student", allowedRoles: ["student"] },
];

export type ActorScope = {
    role: AppRole;
    grade: number | null;
    classNum: number | null;
};

export type StudentScope = {
    role: AppRole | null;
    grade: number | null;
    classNum: number | null;
};

function matchesPrefix(pathname: string, prefix: string) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getAllowedRolesForPath(pathname: string): readonly AppRole[] | null {
    const rule = ROLE_RULES.find(({ prefix }) => matchesPrefix(pathname, prefix));
    return rule?.allowedRoles ?? null;
}

export function isRoleAuthorizedForPath(pathname: string, role: AppRole) {
    const allowedRoles = getAllowedRolesForPath(pathname);
    if (!allowedRoles) return true;
    return allowedRoles.includes(role);
}

export function getDashboardPathForRole(role: AppRole) {
    if (role === "admin") return "/admin/dashboard";
    if (role === "teacher") return "/teacher/dashboard";
    return "/student/dashboard";
}

export function canAccessClassScope(
    actor: ActorScope,
    grade: number | null | undefined,
    classNum: number | null | undefined
) {
    if (actor.role === "admin") return true;
    if (actor.role !== "teacher") return false;
    if (actor.grade === null || actor.classNum === null) return false;
    return actor.grade === (grade ?? null) && actor.classNum === (classNum ?? null);
}

export function canManageStudent(actor: ActorScope, student: StudentScope) {
    if (student.role !== "student") return false;
    return canAccessClassScope(actor, student.grade, student.classNum);
}
