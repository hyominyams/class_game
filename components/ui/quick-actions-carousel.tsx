'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy, UserPlus, Coins, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

import Link from 'next/link';

interface QuickAction {
    id: string;
    title: string;
    icon: string; // key for icon mapping
    color: string;
    path: string;
}

interface QuickActionsCarouselProps {
    actions: QuickAction[];
}

const iconMap: Record<string, React.ElementType> = {
    trophy: Trophy,
    plus: UserPlus,
    coins: Coins,
    pencil: Pencil,
};

export function QuickActionsCarousel({ actions }: QuickActionsCarouselProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1 === actions.length ? 0 : prevIndex + 1));
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 < 0 ? actions.length - 1 : prevIndex - 1));
    };

    const IconComponent = iconMap[actions[currentIndex].icon] || Trophy;

    return (
        <div className="relative group w-full max-w-md mx-auto">
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
                            <div className="relative w-32 h-32 mb-4 border-4 border-white rounded-lg shadow-lg overflow-hidden bg-white/20 flex items-center justify-center">
                                <IconComponent className="w-16 h-16 text-white drop-shadow-md" />
                            </div>
                            <h3 className="text-2xl font-black text-white drop-shadow-md mb-4">
                                {actions[currentIndex].title}
                            </h3>
                            <Link href={actions[currentIndex].path} passHref>
                                <Button
                                    className="bg-white text-black border-2 border-black hover:bg-gray-100 font-bold"
                                >
                                    실행하기
                                </Button>
                            </Link>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <button
                onClick={prevSlide}
                className="absolute top-1/2 -left-12 -translate-y-1/2 p-2 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[-50%] hover:scale-110 transition-transform active:scale-95 z-10"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={nextSlide}
                className="absolute top-1/2 -right-12 -translate-y-1/2 p-2 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[-50%] hover:scale-110 transition-transform active:scale-95 z-10"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            <div className="flex justify-center mt-4 gap-2">
                {actions.map((_, index) => (
                    <div
                        key={index}
                        className={`w-3 h-3 rounded-full border-2 border-black transition-colors ${index === currentIndex ? 'bg-[#ff2e63]' : 'bg-white'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
