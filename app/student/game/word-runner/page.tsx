import { WordDefenseGame } from "@/components/games/word-runner/word-runner-game";
import { getRuntimeQuestions } from "@/app/actions/game-data";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function WordRunnerPage() {
    const runtimeData = await getRuntimeQuestions("word-runner");

    return (
        <div className="container mx-auto py-8">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>}>
                <WordDefenseGame runtimeData={runtimeData} />
            </Suspense>
        </div>
    );
}
