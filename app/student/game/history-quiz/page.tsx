import { HistoryQuizGame } from "@/components/games/history-quiz/history-quiz-game";
import { getRuntimeQuestions } from "@/app/actions/game-data";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function HistoryQuizPage() {
    const runtimeData = await getRuntimeQuestions("history-quiz");

    return (
        <div className="flex flex-col flex-1 min-h-[calc(100vh-60px)] bg-[#1c110a] bg-[radial-gradient(ellipse_at_center,#2d1c15_0%,#1c110a_100%)] justify-center items-center w-full p-4 md:p-8">
            <div className="w-full max-w-5xl">
                <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><Loader2 className="h-10 w-10 animate-spin text-[#ffd54f]" /></div>}>
                    <HistoryQuizGame runtimeData={runtimeData} />
                </Suspense>
            </div>
        </div>
    );
}
