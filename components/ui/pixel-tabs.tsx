"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const tabVariants = cva(
    "inline-flex h-12 items-center justify-center whitespace-nowrap px-6 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-pixel",
    {
        variants: {
            variant: {
                default: "border-t-4 border-x-4 border-transparent hover:bg-black/5 text-gray-500 mb-[-4px]",
                active: "bg-[#08d9d6] text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-4px] z-10 relative mb-[0px]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface TabRoute {
    label: string;
    href: string;
    exact?: boolean;
}

interface PixelTabsProps {
    className?: string;
    routes: TabRoute[];
}

export function PixelTabs({ className, routes }: PixelTabsProps) {
    const pathname = usePathname();

    return (
        <div className={cn("flex space-x-2 border-b-4 border-black bg-transparent px-4 items-end h-16", className)}>
            {routes.map((route) => {
                const isActive = route.exact
                    ? pathname === route.href
                    : pathname.startsWith(route.href);

                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            tabVariants({ variant: isActive ? "active" : "default" }),
                            "rounded-t-lg transition-transform"
                        )}
                    >
                        {route.label}
                    </Link>
                );
            })}
        </div>
    );
}
