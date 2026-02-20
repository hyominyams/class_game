import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-pixel border-4 border-black active:translate-y-[4px] active:shadow-none",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                outline:
                    "bg-background text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black/5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                ghost: "border-0 shadow-none active:translate-y-0 hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline border-0 shadow-none active:translate-y-0",
            },
            size: {
                default: "h-12 px-6 py-2",
                sm: "h-10 rounded-md px-4",
                lg: "h-14 rounded-md px-8 text-base",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface PixelButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const PixelButton = React.forwardRef<HTMLButtonElement, PixelButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
PixelButton.displayName = "PixelButton"

export { PixelButton, buttonVariants }
