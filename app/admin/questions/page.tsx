import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuestionSetManager, QuestionSetModalWrapper } from "@/components/teacher/question-set-manager";
import { deleteQuestionSet } from "@/app/actions/game-data";
import { toggleQuestionSetAction } from "@/app/actions/teacher-v2";
import { AdminQuestionFilters } from "@/components/admin/admin-question-filters";

type SearchParamsInput = Promise<{ gameId?: string; grade?: string; class?: string; }>;

type GameItem = {
    id: string;
    title: string;
};

type QuestionSetCardItem = {
    id: string;
    game_id: string | null;
    title: string;
    grade: number | null;
    class: number | null;
    is_active: boolean | null;
    question_mode: string | null;
    created_by: string | null;
    game: {
        title: string;
    } | null;
    creator: {
        nickname: string | null;
    } | null;
};

const FALLBACK_GAMES: GameItem[] = [
    { id: "word-runner", title: "단어 디펜스" },
    { id: "word-chain", title: "단어 연결" },
    { id: "history-quiz", title: "역사 퀴즈 어택" },
    { id: "pixel-runner", title: "픽셀러너" },
];

export default async function AdminQuestionsPage({
    searchParams,
}: {
    searchParams: SearchParamsInput;
}) {
    const resolvedParams = await searchParams;
    const selectedGameId = resolvedParams?.gameId || "";

    const adminClient = createAdminClient();

    const { data: gameRows } = await adminClient
        .from("games")
        .select("id, title")
        .order("id", { ascending: true });

    let games = (gameRows as GameItem[] | null) || [];
    if (games.length === 0) games = [...FALLBACK_GAMES];
    if (!games.some((game) => game.id === "word-chain")) {
        games = [...games, { id: "word-chain", title: "단어 연결" }];
    }

    let query = adminClient
        .from("question_sets")
        .select("id, game_id, title, grade, class, is_active, question_mode, created_by, game:games(title), creator:profiles!question_sets_created_by_fkey(nickname)");

    if (selectedGameId && selectedGameId !== "all") {
        query = query.eq("game_id", selectedGameId);
    }

    if (resolvedParams?.grade) {
        if (resolvedParams.grade === "global") {
            query = query.is("grade", null);
        } else {
            query = query.eq("grade", Number(resolvedParams.grade));
        }
    }
    if (resolvedParams?.class) {
        query = query.eq("class", Number(resolvedParams.class));
    }

    const { data: setRows } = await query.order("created_at", { ascending: false });
    const questionSets = (setRows as QuestionSetCardItem[] | null) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-pixel mb-1">문제 세트 관리 (관리자)</h2>
                    <p className="text-sm text-gray-500">전체 학년/반의 문제세트를 생성, 수정, 활성화할 수 있습니다.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <AdminQuestionFilters />
                    <QuestionSetManager games={games} initialGameId={selectedGameId} basePath="/admin/questions" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {questionSets.map((setItem) => (
                    <StudentPixelCard key={setItem.id} className="bg-white hover:bg-blue-50 flex flex-col h-full relative transition-all duration-200">
                        {setItem.is_active && (
                            <span className="absolute top-2 right-2 bg-[#00b894] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-black shadow-sm">
                                ACTIVE
                            </span>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border border-black ${setItem.grade ? "bg-[#ff7675] text-white" : "bg-[#74b9ff] text-white"}`}
                            >
                                {setItem.grade ? "CLASS" : "GLOBAL"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-black bg-gray-200 text-gray-700">
                                {setItem.game?.title || setItem.game_id || "unknown"}
                            </span>
                        </div>

                        <h3 className="font-bold text-lg mb-1 leading-tight">{setItem.title}</h3>
                        <p className="text-sm text-gray-500 mb-1">
                            {setItem.grade && setItem.class ? `${setItem.grade}학년 ${setItem.class}반` : "전체 공개"}
                        </p>
                        <p className="text-xs text-gray-400 mb-4">생성자: {setItem.creator?.nickname || "알 수 없음"}</p>

                        <div className="mt-auto flex gap-2 pt-4 border-t border-dashed border-gray-300">
                            <QuestionSetModalWrapper
                                setId={setItem.id}
                                initialTitle={setItem.title}
                                initialGrade={setItem.grade}
                                initialClass={setItem.class}
                                initialQuestionMode={setItem.question_mode}
                                selectedGameId={setItem.game_id || ""}
                                selectedGame={setItem.game_id ? games.find((game) => game.id === setItem.game_id) : undefined}
                            >
                                <Button size="sm" className="flex-1 bg-white hover:bg-gray-100 text-black border-2 border-black font-bold">
                                    수정
                                </Button>
                            </QuestionSetModalWrapper>

                            <form
                                action={async () => {
                                    "use server";
                                    if (!setItem.game_id) return;
                                    await toggleQuestionSetAction(setItem.id, setItem.game_id, !setItem.is_active);
                                }}
                                className="flex-1"
                            >
                                <Button
                                    size="sm"
                                    type="submit"
                                    className={`w-full border-2 border-black ${setItem.is_active
                                        ? "bg-gray-200 text-gray-500 hover:bg-gray-300 font-bold"
                                        : "bg-[#2d3436] hover:bg-black text-white font-bold"}`}
                                >
                                    {setItem.is_active ? "해제" : "활성화"}
                                </Button>
                            </form>

                            <form
                                action={async () => {
                                    "use server";
                                    await deleteQuestionSet(setItem.id);
                                }}
                            >
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="border-2 border-transparent hover:border-red-500 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all px-2"
                                    title="삭제"
                                >
                                    <span className="text-lg">✕</span>
                                </Button>
                            </form>
                        </div>
                    </StudentPixelCard>
                ))}
            </div>

            {questionSets.length === 0 && (
                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
                    <p className="text-gray-500">생성된 문제 세트가 없습니다.</p>
                </div>
            )}
        </div>
    );
}
