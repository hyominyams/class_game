import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
    "rounded-lg border-2 border-black bg-[#fdf5e6] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
    {
        variants: {
            variant: {
                default: "p-6",
                compact: "p-4",
                game: "p-0 overflow-hidden",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface StudentPixelCardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function StudentPixelCard({
    className,
    variant,
    title,
    description,
    action,
    children,
    ...props
}: StudentPixelCardProps) {
    return (
        <div className={cn(cardVariants({ variant }), className)} {...props}>
            {(title || description || action) && (
                <div className="mb-4 flex justify-between items-start">
                    <div className="space-y-1">
                        {title && <h3 className="text-xl font-bold leading-none tracking-tight">{title}</h3>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </div>
    );
}
