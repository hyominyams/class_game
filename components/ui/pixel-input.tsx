import * as React from "react"
import { cn } from "@/lib/utils"

export interface PixelInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const PixelInput = React.forwardRef<HTMLInputElement, PixelInputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-12 w-full rounded-md border-4 border-black bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-pixel shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-y-[4px] transition-all",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
PixelInput.displayName = "PixelInput"

export { PixelInput }
