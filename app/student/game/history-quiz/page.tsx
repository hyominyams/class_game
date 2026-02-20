import { HistoryQuizGame } from "@/components/student/history-quiz-game";
import { getQuestionSets } from "@/app/actions/game-data";

export default async function HistoryQuizPage() {
    const sets = await getQuestionSets("history-quiz");

    return (
        <div className="container mx-auto py-8">
            <HistoryQuizGame sets={sets || []} />
        </div>
    );
}
