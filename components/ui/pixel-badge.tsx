import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-sm border-2 border-black px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-pixel shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
    {
        variants: {
            variant: {
                default:
                    "bg-white text-foreground hover:bg-black/5",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                primary: "bg-primary text-primary-foreground hover:bg-primary/80",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface PixelBadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function PixelBadge({ className, variant, ...props }: PixelBadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { PixelBadge, badgeVariants }
