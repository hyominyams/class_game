"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getQuestions } from "@/app/actions/game-data";
import { saveGameResult } from "@/app/actions/game";
import { useSearchParams, useRouter } from "next/navigation";
import { recordTournamentAttempt } from "@/app/actions/tournament";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Timer, Trophy } from "lucide-react";
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
    correct_answer: number | null; // index for MC
    options: string[] | null;
    type: "multiple-choice" | "short-answer";
}

export function HistoryQuizGame({ sets }: { sets: QuestionSet[] }) {
    const [gameState, setGameState] = useState<"menu" | "loading" | "playing" | "gameover">("menu");
    const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(120);
    const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
    const [inputAnswer, setInputAnswer] = useState("");
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

    const searchParams = useSearchParams();

    const endGame = useCallback(async () => {
        setGameState("gameover");
        const isClear = score > 0;
        const playTime = Math.floor((performance.now() - startTimeRef.current) / 1000);

        const saveResult = await saveGameResult("history-quiz", score, playTime, {
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
                title: isClear ? "QUIZ COMPLETE!" : "GAME OVER"
            });
        }

        const mode = searchParams.get('mode');
        const tournamentId = searchParams.get('tournamentId');

        if (mode === 'tournament' && tournamentId) {
            await recordTournamentAttempt(tournamentId, score);
        }
    }, [score, correctCount, questions.length, searchParams]);
    // Actually timer calls endGame. If score changes, endGame ref changes.

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
    }, [gameState, timeLeft, endGame]);

    const startGame = async (set: QuestionSet) => {
        setSelectedSet(set);
        setGameState("loading");
        const qData = await getQuestions(set.id);
        if (qData && qData.length > 0) {
            // Shuffle questions
            const shuffled = [...qData].sort(() => Math.random() - 0.5);

            // Ensure options are parsed correctly (handle stringified JSON)
            const parsedQuestions = shuffled.map((q: any) => {
                let opts = q.options;
                if (typeof opts === 'string') {
                    try {
                        opts = JSON.parse(opts);
                    } catch (e) {
                        console.error("Failed to parse options for question:", q.id, e);
                        opts = [];
                    }
                }
                return {
                    ...q,
                    options: Array.isArray(opts) ? opts : []
                };
            });

            setQuestions(parsedQuestions);
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

    const handleCreateMCAnswer = (optionIndex: number) => {
        checkAnswer(optionIndex);
    };

    const handleShortAnswerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        checkAnswer(null, inputAnswer);
    }

    const checkAnswer = (selectedIndex: number | null, textAnswer?: string) => {
        const currentQ = questions[currentQuestionIndex];
        let isCorrect = false;

        if (currentQ.type === "multiple-choice") {
            if (selectedIndex === currentQ.correct_answer) {
                isCorrect = true;
            }
        } else if (currentQ.type === "short-answer") {
            // Simple string matching, trim and case insensitive
            if (textAnswer && currentQ.answer_text &&
                textAnswer.trim().toLowerCase() === currentQ.answer_text.trim().toLowerCase()) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            setScore((prev) => prev + 100);
            setCorrectCount((prev) => prev + 1);
            setFeedback("correct");
        } else {
            setFeedback("wrong");
        }

        setTimeout(() => {
            setFeedback(null);
            setInputAnswer("");
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                // End game if all questions done
                endGame();
            }
        }, 1000);
    };

    if (gameState === "menu") {
        return (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                <div className="col-span-full mb-4 text-center">
                    <h1 className="text-3xl font-bold font-pixel text-[#2d3436] mb-2">History Quiz Exploration</h1>
                    <p className="text-gray-600">역사 지식을 뽐내보세요!</p>
                </div>
                {sets.map((set) => (
                    <Card
                        key={set.id}
                        className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-dashed border-gray-300 hover:border-[#55efc4] bg-white group"
                        onClick={() => startGame(set)}
                    >
                        <h3 className="font-bold text-lg mb-2 group-hover:text-[#00b894] transition-colors">{set.title}</h3>
                        <p className="text-sm text-gray-500">
                            Created by {set.profiles?.nickname || "Unknown"}
                        </p>
                        <div className="mt-4 flex justify-end">
                            <Button className="bg-[#55efc4] text-black hover:bg-[#00b894] font-bold">START</Button>
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
                <Loader2 className="h-10 w-10 animate-spin text-[#55efc4]" />
                <p className="mt-4 font-bold text-lg">Loading Quiz...</p>
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
                <div className="font-pixel text-xl font-bold text-[#00b894]">
                    Score: {score}
                </div>
            </div>

            {/* Game Area */}
            <div className="mt-12 bg-white rounded-xl shadow-xl border-4 border-[#55efc4] p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">

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
                    <span className="text-sm text-gray-400 font-bold mb-4 uppercase tracking-widest">
                        Question {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-center text-[#2d3436] leading-snug break-keep">
                        {currentQ.question_text}
                    </h2>
                </div>

                <div className="w-full">
                    {currentQ.type === "multiple-choice" && Array.isArray(currentQ.options) && (
                        <div className="grid grid-cols-1 gap-3">
                            {currentQ.options.map((opt, idx) => (
                                <Button
                                    key={idx}
                                    variant="outline"
                                    className="h-14 text-lg justify-start px-6 border-2 hover:border-[#00b894] hover:bg-[#55efc4] hover:text-black transition-all active:scale-95 text-left"
                                    onClick={() => handleCreateMCAnswer(idx)}
                                    disabled={feedback !== null}
                                >
                                    <span className="font-bold mr-4 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">{idx + 1}</span>
                                    {opt}
                                </Button>
                            ))}
                        </div>
                    )}

                    {currentQ.type === "short-answer" && (
                        <form onSubmit={handleShortAnswerSubmit} className="flex gap-2">
                            <Input
                                value={inputAnswer}
                                onChange={(e) => setInputAnswer(e.target.value)}
                                placeholder="정답을 입력하세요"
                                className="text-lg h-14 border-2 border-gray-300 focus:border-[#00b894]"
                                autoFocus
                                disabled={feedback !== null}
                            />
                            <Button
                                type="submit"
                                className="h-14 px-8 bg-[#00b894] hover:bg-[#00cec9] text-black font-bold text-lg"
                                disabled={!inputAnswer.trim() || feedback !== null}
                            >
                                제출
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
