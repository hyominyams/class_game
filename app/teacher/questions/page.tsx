import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { toggleQuestionSetAction } from "@/app/actions/teacher-v2";
import { deleteQuestionSet } from "@/app/actions/game-data";
import { QuestionSetManager, QuestionSetModalWrapper } from "@/components/teacher/question-set-manager";

export default async function TeacherQuestionsPage({
    searchParams,
}: {
    searchParams: { gameId?: string };
}) {
    const supabase = await createClient();
    const gameId = (await searchParams)?.gameId;

    // 현재 사용자 정보
    const { data: { user } } = await supabase.auth.getUser();

    // 게임 목록 조회
    let { data: games } = await supabase
        .from('games')
        .select('*');

    // DB에 게임이 없을 경우 기본 리스트 제공 (최초 설정용)
    if (!games || games.length === 0) {
        games = [
            { id: 'word-runner', title: '영단어 런닝' } as any,
            { id: 'history-quiz', title: '사회/역사 퀴즈' } as any,
            { id: 'pixel-runner', title: '픽셀 러너' } as any,
        ];
    }

    // 문제 세트 목록 조회 (게임 정보 포함)
    let qSetsQuery = supabase
        .from('question_sets')
        .select(`
            *,
            game:games(title)
        `);

    if (gameId && gameId !== 'all') {
        qSetsQuery = qSetsQuery.eq('game_id', gameId);
    }

    const { data: questionSets } = await qSetsQuery.order('created_at', { ascending: false });

    const teacherProfile = user ? await supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => data) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-100 p-6 border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-pixel mb-1">문제 세트 관리</h2>
                    <p className="text-sm text-gray-500">게임에 사용될 문제들을 관리합니다. (영역별 필터 가능)</p>
                </div>
                <QuestionSetManager
                    games={games || []}
                    initialGameId={gameId}
                    teacherProfile={teacherProfile}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {questionSets?.map((set) => (
                    <StudentPixelCard key={set.id} className="bg-white hover:bg-yellow-50 flex flex-col h-full relative transition-all duration-200">
                        {set.is_active && (
                            <span className="absolute top-2 right-2 bg-[#00b894] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-black shadow-sm blink-slow">
                                ACTIVE
                            </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-black ${set.grade ? 'bg-[#ff7675] text-white' : 'bg-[#74b9ff] text-white'}`}>
                                {set.grade ? 'CLASS' : 'GLOBAL'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-black bg-gray-200 text-gray-700">
                                {(set.game as any)?.title || set.game_id}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 leading-tight">{set.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{set.grade ? `${set.grade}학년 ${set.class}반` : '전체 공개'}</p>

                        <div className="mt-auto flex gap-2 pt-4 border-t border-dashed border-gray-300">
                            <QuestionSetModalWrapper
                                setId={set.id}
                                initialTitle={set.title}
                                selectedGameId={set.game_id!}
                                selectedGame={{ title: (set.game as any)?.title || '' }}
                                teacherProfile={teacherProfile}
                            >
                                <Button size="sm" className="flex-1 bg-white hover:bg-gray-100 text-black border-2 border-black font-bold">
                                    수정
                                </Button>
                            </QuestionSetModalWrapper>
                            <form action={async () => {
                                "use server";
                                if (set.game_id && set.id) {
                                    await toggleQuestionSetAction(set.id, set.game_id, !set.is_active);
                                }
                            }} className="flex-1">
                                <Button
                                    size="sm"
                                    type="submit"
                                    className={`w-full border-2 border-black ${set.is_active
                                        ? "bg-gray-200 text-gray-500 hover:bg-gray-300 font-bold"
                                        : "bg-[#2d3436] hover:bg-black text-white font-bold"}`}
                                >
                                    {set.is_active ? "해제" : "활성화"}
                                </Button>
                            </form>
                            <form action={async () => {
                                "use server";
                                if (set.id) {
                                    await deleteQuestionSet(set.id);
                                }
                            }}>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="border-2 border-transparent hover:border-red-500 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all px-2"
                                    title="삭제"
                                >
                                    <span className="text-lg">🗑️</span>
                                </Button>
                            </form>
                        </div>
                    </StudentPixelCard>
                ))}
            </div>
            {(!questionSets || questionSets.length === 0) && (
                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
                    <p className="text-gray-500">생성된 문제 세트가 없습니다.</p>
                </div>
            )}
        </div>
    );
}
