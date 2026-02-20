"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getQuestions } from "@/app/actions/game-data";
import { saveGameResult } from "@/app/actions/game";
import { useSearchParams, useRouter } from "next/navigation";
import { recordTournamentAttempt } from "@/app/actions/tournament";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Timer, Trophy, XCircle } from "lucide-react";
import Image from "next/image";
import { GameResultModal } from "@/components/game/game-result-modal";

interface QuestionSet {
    id: string;
    title: string;
    profiles: { nickname: string | null } | null;
}

interface Question {
    id: string;
    question_text: string;
    answer_text: string | null;
    correct_answer: any;
    options: any;
    type: string;
}

export function WordRunnerGame({ sets }: { sets: QuestionSet[] }) {
    const [gameState, setGameState] = useState<"menu" | "loading" | "playing" | "gameover">("menu");
    const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(120);
    const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
    const [result, setResult] = useState<{
        isOpen: boolean;
        isClear: boolean;
        score: number;
        coinsEarned: number;
        dailyCoinsTotal: number;
        dailyLimit: number;
        title?: string;
    }>({
        isOpen: false,
        isClear: false,
        score: 0,
        coinsEarned: 0,
        dailyCoinsTotal: 0,
        dailyLimit: 200
    });

    const router = useRouter();
    const startTimeRef = useRef<number>(0);

    // Generate options for the current question
    // Mix correct answer with 3 distractors from other questions
    const [currentOptions, setCurrentOptions] = useState<string[]>([]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (gameState === "playing" && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === "playing") {
            endGame();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    useEffect(() => {
        if (gameState === "playing" && questions.length > 0) {
            generateOptions();
        }
    }, [currentQuestionIndex, gameState, questions]);

    const startGame = async (set: QuestionSet) => {
        setSelectedSet(set);
        setGameState("loading");
        const qData = await getQuestions(set.id);
        if (qData && qData.length > 0) {
            // Shuffle questions
            const shuffled = [...qData].sort(() => Math.random() - 0.5);
            setQuestions(shuffled as unknown as Question[]);
            setScore(0);
            setCorrectCount(0);
            setTimeLeft(120);
            setCurrentQuestionIndex(0);
            startTimeRef.current = performance.now();
            setGameState("playing");
        } else {
            alert("이 세트에는 문제가 없습니다.");
            setGameState("menu");
        }
    };

    const generateOptions = () => {
        if (!questions.length) return;

        // For Word Pair, answer is in answer_text.
        // For manual options, it might be in options json.
        // Logic: Word Runner assumes English(Answer) - Korean(Question).

        const currentQ = questions[currentQuestionIndex];
        const correctAnswer = currentQ.answer_text || "";

        // Get 3 random distractors from other questions
        const otherQuestions = questions.filter(q => q.id !== currentQ.id);
        const distractors = otherQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(q => q.answer_text || "")
            .filter(t => t !== "");

        // If not enough questions for distractors, fill with placeholders or duplicates (but usually sets have > 4 words)
        while (distractors.length < 3) {
            distractors.push("Empty");
        }

        const opts = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
        setCurrentOptions(opts);
    };

    const checkAnswer = (selectedOption: string) => {
        const currentQ = questions[currentQuestionIndex];
        if (selectedOption === currentQ.answer_text) {
            setScore((prev) => prev + 100);
            setCorrectCount((prev) => prev + 1);
            setFeedback("correct");
        } else {
            // Penalty?
            setFeedback("wrong");
        }

        setTimeout(() => {
            setFeedback(null);
            // Next question
            // If end of list, loop back or reshuffle? 
            // Let's loop back for continuous play within time limit.
            setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
        }, 500); // short delay to show feedback
    };

    const searchParams = useSearchParams();

    const endGame = async () => {
        setGameState("gameover");
        const isClear = score > 0;
        const playTime = Math.floor((performance.now() - startTimeRef.current) / 1000);

        const saveResult = await saveGameResult("word-runner", score, playTime, {
            correctCount,
            totalQuestions: questions.length,
            isPerfect: correctCount === questions.length && questions.length > 0
        });

        if (saveResult.success) {
            setResult({
                isOpen: true,
                isClear,
                score,
                coinsEarned: saveResult.coinsEarned || 0,
                dailyCoinsTotal: saveResult.dailyCoinsTotal || 0,
                dailyLimit: saveResult.dailyLimit || 200,
                title: isClear ? "LEVEL CLEAR!" : "GAME OVER"
            });
        }

        const mode = searchParams.get('mode');
        const tournamentId = searchParams.get('tournamentId');

        if (mode === 'tournament' && tournamentId) {
            await recordTournamentAttempt(tournamentId, score);
        }
    };

    if (gameState === "menu") {
        return (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                <div className="col-span-full mb-4 text-center">
                    <h1 className="text-3xl font-bold font-pixel text-[#2d3436] mb-2">Word Runner</h1>
                    <p className="text-gray-600">제한 시간 동안 최대한 많은 단어를 맞추세요!</p>
                </div>
                {sets.map((set) => (
                    <Card
                        key={set.id}
                        className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-dashed border-gray-300 hover:border-[#fdcb6e] bg-white group"
                        onClick={() => startGame(set)}
                    >
                        <h3 className="font-bold text-lg mb-2 group-hover:text-[#e17055] transition-colors">{set.title}</h3>
                        <p className="text-sm text-gray-500">
                            Created by {set.profiles?.nickname || "Unknown"}
                        </p>
                        <div className="mt-4 flex justify-end">
                            <Button className="bg-[#fdcb6e] text-black hover:bg-[#fab1a0] font-bold">START</Button>
                        </div>
                    </Card>
                ))}
                {sets.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        등록된 문제 세트가 없습니다. 선생님께 문의하세요!
                    </div>
                )}
            </div>
        );
    }

    if (gameState === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-[#fdcb6e]" />
                <p className="mt-4 font-bold text-lg">Loading Game...</p>
            </div>
        )
    }

    if (gameState === "gameover") {
        return (
            <GameResultModal
                isOpen={result.isOpen}
                isClear={result.isClear}
                score={result.score}
                coinsEarned={result.coinsEarned}
                dailyCoinsTotal={result.dailyCoinsTotal}
                dailyLimit={result.dailyLimit}
                title={result.title}
                onRetry={() => {
                    setResult(prev => ({ ...prev, isOpen: false }));
                    if (selectedSet) startGame(selectedSet);
                }}
                onExit={() => {
                    setResult(prev => ({ ...prev, isOpen: false }));
                    router.back();
                }}
            />
        );
    }

    const currentQ = questions[currentQuestionIndex];

    return (
        <div className="max-w-2xl mx-auto relative pt-10">
            {/* HUD */}
            <div className="absolute top-0 w-full flex justify-between items-center mb-6 px-4 py-2 bg-white/80 backdrop-blur rounded-full border border-gray-200 shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-gray-500" />
                    <span className={`font-mono text-xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                </div>
                <div className="font-pixel text-xl font-bold text-[#e17055]">
                    Score: {score}
                </div>
            </div>

            {/* Game Area */}
            <div className="mt-12 bg-white rounded-xl shadow-xl border-4 border-[#fdcb6e] p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">

                {/* Flash Feedback Overlay */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className={`absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-sm`}
                        >
                            {feedback === "correct" ? (
                                <div className="bg-green-500 text-white p-6 rounded-full shadow-lg border-4 border-white font-bold text-2xl transform rotate-[-10deg]">
                                    CORRECT!
                                </div>
                            ) : (
                                <div className="bg-red-500 text-white p-6 rounded-full shadow-lg border-4 border-white font-bold text-2xl transform rotate-[10deg]">
                                    WRONG!
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1 flex flex-col items-center justify-center mb-8">
                    <span className="text-sm text-gray-400 font-bold mb-4 uppercase tracking-widest">Question {currentQuestionIndex + 1}</span>
                    <h2 className="text-4xl md:text-5xl font-bold text-center text-[#2d3436] leading-tight break-keep">
                        {currentQ.question_text}
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {currentOptions.map((opt, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            className="h-16 text-lg font-bold border-2 hover:border-[#e17055] hover:bg-[#ffeaa7] hover:text-black transition-all active:scale-95"
                            onClick={() => checkAnswer(opt)}
                            disabled={feedback !== null}
                        >
                            {opt}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
