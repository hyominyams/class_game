import { WordRunnerGame } from "@/components/student/word-runner-game";
import { getQuestionSets } from "@/app/actions/game-data";
import { createClient } from "@/lib/supabase/server";

export default async function WordRunnerPage() {
    const sets = await getQuestionSets("word-runner");

    return (
        <div className="container mx-auto py-8">
            <WordRunnerGame sets={sets || []} />
        </div>
    );
}
