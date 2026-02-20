import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
    "rounded-lg border-4 border-black bg-[#fdf5e6] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all",
    {
        variants: {
            variant: {
                default: "p-6",
                compact: "p-4",
                game: "p-0 overflow-hidden",
                flat: "shadow-none border-2",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface PixelCardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
    title?: string;
    description?: string;
}

export function PixelCard({
    className,
    variant,
    title,
    description,
    children,
    ...props
}: PixelCardProps) {
    return (
        <div className={cn(cardVariants({ variant }), className)} {...props}>
            {(title || description) && (
                <div className="mb-4 space-y-1">
                    {title && <h3 className="font-pixel text-xl font-bold leading-none tracking-tight">{title}</h3>}
                    {description && <p className="text-sm text-gray-600 font-bold">{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
}
