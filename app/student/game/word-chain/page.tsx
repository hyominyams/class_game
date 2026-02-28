import { WordChainGame } from "@/components/games/word-chain/word-chain-game";
import { getRuntimeQuestions } from "@/app/actions/game-data";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function WordChainPage() {
    const runtimeData = await getRuntimeQuestions("word-chain");

    return (
        <div className="min-h-screen bg-[#100f1c] flex items-center justify-center p-4 lg:p-12">
            <div className="w-full max-w-5xl">
                <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>}>
                    <WordChainGame runtimeData={runtimeData} />
                </Suspense>
            </div>
        </div>
    );
}
