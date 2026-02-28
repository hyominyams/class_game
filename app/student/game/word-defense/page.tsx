import { WordDefenseGame } from "@/components/games/word-runner/word-runner-game";
import { getRuntimeQuestions } from "@/app/actions/game-data";

export default async function WordDefensePage() {
    const runtimeData = await getRuntimeQuestions("word-runner");

    return (
        <div className="container mx-auto py-8">
            <WordDefenseGame runtimeData={runtimeData} />
        </div>
    );
}
