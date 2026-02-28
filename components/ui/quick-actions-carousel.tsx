"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Coins, Pencil, Trophy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAction {
    id: string;
    title: string;
    icon: string;
    color: string;
    path: string;
}

interface QuickActionsCarouselProps {
    actions: QuickAction[];
    showArrows?: boolean;
    showTabs?: boolean;
    initialIndex?: number;
}

const iconMap: Record<string, React.ElementType> = {
    trophy: Trophy,
    plus: UserPlus,
    coins: Coins,
    pencil: Pencil,
};

export function QuickActionsCarousel({
    actions,
    showArrows = true,
    showTabs = true,
    initialIndex = 0,
}: QuickActionsCarouselProps) {
    const normalizedInitialIndex = React.useMemo(() => {
        if (actions.length === 0) return 0;
        const flooredIndex = Math.floor(initialIndex);
        return ((flooredIndex % actions.length) + actions.length) % actions.length;
    }, [actions.length, initialIndex]);

    const [currentIndex, setCurrentIndex] = React.useState(normalizedInitialIndex);

    React.useEffect(() => {
        setCurrentIndex(normalizedInitialIndex);
    }, [normalizedInitialIndex]);

    if (actions.length === 0) {
        return (
            <div className="rounded-xl border-2 border-dashed border-black/30 p-6 text-center text-sm font-bold text-gray-500">
                빠른 실행 항목이 없습니다.
            </div>
        );
    }

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1 === actions.length ? 0 : prevIndex + 1));
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 < 0 ? actions.length - 1 : prevIndex - 1));
    };

    const IconComponent = iconMap[actions[currentIndex].icon] || Trophy;

    return (
        <div className="relative group w-full max-w-[320px] mx-auto">
            <div className="overflow-hidden rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white">
                <div className="relative h-64">
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                            style={{ backgroundColor: actions[currentIndex].color }}
                        >
                            <div className="relative w-28 h-28 mb-4 border-4 border-white rounded-lg shadow-lg overflow-hidden bg-white/15 flex items-center justify-center">
                                <IconComponent className="w-14 h-14 text-white drop-shadow-md" />
                            </div>
                            <h3 className="text-3xl font-black text-white drop-shadow-md mb-4 leading-none">{actions[currentIndex].title}</h3>

                            <Button
                                asChild
                                className="h-10 px-4 bg-white text-black border-2 border-black font-black shadow-[4px_4px_0_0_black] transition-all duration-100 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_black] active:translate-y-[3px] active:shadow-[1px_1px_0_0_black]"
                            >
                                <Link href={actions[currentIndex].path}>실행하기</Link>
                            </Button>
                        </motion.div>
                    </AnimatePresence>

                    {showArrows && actions.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prevSlide}
                                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border-2 border-white/90 bg-black/25 text-white backdrop-blur-[1px] hover:scale-105 active:scale-95 transition-transform z-10"
                                aria-label="이전 빠른 실행"
                            >
                                <ChevronLeft className="w-5 h-5 mx-auto" />
                            </button>
                            <button
                                type="button"
                                onClick={nextSlide}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border-2 border-white/90 bg-black/25 text-white backdrop-blur-[1px] hover:scale-105 active:scale-95 transition-transform z-10"
                                aria-label="다음 빠른 실행"
                            >
                                <ChevronRight className="w-5 h-5 mx-auto" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-center mt-4 gap-2">
                {actions.map((action, index) => (
                    <button
                        key={action.id}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full border-2 border-black transition-colors ${index === currentIndex ? "bg-[#ff2e63]" : "bg-white"}`}
                        aria-label={`빠른 실행 ${index + 1}번 보기`}
                    />
                ))}
            </div>

            {showTabs && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {actions.map((action, index) => {
                        const isActive = index === currentIndex;
                        return (
                            <button
                                key={action.id}
                                type="button"
                                onClick={() => setCurrentIndex(index)}
                                className={`h-9 rounded border-2 text-[11px] font-black transition-all ${isActive
                                    ? "bg-[#ff2e63] text-white border-black shadow-[2px_2px_0_0_black]"
                                    : "bg-white text-gray-700 border-black/60 hover:border-black"}`}
                            >
                                {action.title}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
