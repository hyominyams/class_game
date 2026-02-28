import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
    getAllowedRolesForPath,
    getDashboardPathForRole,
    type AppRole,
} from "@/app/actions/security/rbac";

const PUBLIC_ROUTES = ["/", "/login", "/join", "/auth/callback", "/api/test-seed"];

function isPublicRoute(pathname: string) {
    if (pathname.startsWith("/auth/")) return true;
    return PUBLIC_ROUTES.some((route) => pathname === route);
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isPublic = isPublicRoute(pathname);

    if (!user && !isPublic) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isPublic || !user) {
        return response;
    }

    const allowedRoles = getAllowedRolesForPath(pathname);
    if (!allowedRoles) {
        return response;
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = (profile?.role ?? null) as AppRole | null;
    if (!role) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL(getDashboardPathForRole(role), request.url));
    }

    return response;
}
