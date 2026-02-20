"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { createQuestionSet, updateQuestionSet, getQuestions } from "@/app/actions/game-data";

export function WordSetModal({
    children,
    gameId = "word-runner",
    gameTitle = "영단어",
    teacherProfile,
    setId,
    initialTitle = ""
}: {
    children: React.ReactNode,
    gameId?: string,
    gameTitle?: string,
    teacherProfile?: any,
    setId?: string,
    initialTitle?: string
}) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const [grade, setGrade] = useState(teacherProfile?.grade?.toString() || "");
    const [classNum, setClassNum] = useState(teacherProfile?.class?.toString() || "");
    const [words, setWords] = useState<{ english: string; korean: string }[]>([
        { english: "", korean: "" },
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && setId) {
            const loadData = async () => {
                setLoading(true);
                try {
                    const data = await getQuestions(setId);
                    if (data && data.length > 0) {
                        const formatted = data.map(q => ({
                            english: q.answer_text || "",
                            korean: q.question_text || ""
                        }));
                        setWords(formatted);
                    }
                } catch (e) {
                    console.error(e);
                }
                setLoading(false);
            };
            loadData();
        }
    }, [open, setId]);

    const addWord = () => {
        setWords([...words, { english: "", korean: "" }]);
    };

    const removeWord = (index: number) => {
        const newWords = [...words];
        newWords.splice(index, 1);
        setWords(newWords);
    };

    const updateWord = (
        index: number,
        field: "english" | "korean",
        value: string
    ) => {
        const newWords = [...words];
        newWords[index][field] = value;
        setWords(newWords);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const questionsData = words.map((w) => ({
            question_text: w.korean,
            answer_text: w.english,
            options: [w.english],
            type: "word-pair",
            correct_answer: 0,
        }));

        let res;
        if (setId) {
            res = await updateQuestionSet(
                setId,
                title,
                parseInt(grade),
                parseInt(classNum),
                questionsData
            );
        } else {
            res = await createQuestionSet(
                gameId,
                title,
                parseInt(grade),
                parseInt(classNum),
                questionsData
            );
        }

        setLoading(false);
        if (res.success) {
            setOpen(false);
            if (!setId) {
                setTitle("");
                setWords([{ english: "", korean: "" }]);
            }
            window.location.reload();
        } else {
            alert("Error: " + (res as any).error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 sm:rounded-xl">
                <DialogHeader className="bg-[#fdcb6e] p-6 border-b-4 border-black">
                    <DialogTitle className="font-pixel text-2xl text-black flex items-center gap-2">
                        <span className="bg-white/40 p-2 rounded-lg backdrop-blur-sm">🅰️</span>
                        {gameTitle} 세트 {setId ? "수정하기" : "만들기"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border-3 border-gray-200">
                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">학년 / 반</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        className="h-12 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] focus-visible:ring-0 focus-visible:border-[#fdcb6e] font-bold text-lg placeholder:text-gray-300 read-only:bg-gray-100 read-only:text-gray-500"
                                        placeholder="학년"
                                        required
                                        readOnly={!!teacherProfile?.grade}
                                    />
                                    <span className="absolute right-3 top-3 text-gray-400 font-bold text-xs pointer-events-none">학년</span>
                                </div>
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        value={classNum}
                                        onChange={(e) => setClassNum(e.target.value)}
                                        className="h-12 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] focus-visible:ring-0 focus-visible:border-[#fdcb6e] font-bold text-lg placeholder:text-gray-300 read-only:bg-gray-100 read-only:text-gray-500"
                                        placeholder="반"
                                        required
                                        readOnly={!!teacherProfile?.class}
                                    />
                                    <span className="absolute right-3 top-3 text-gray-400 font-bold text-xs pointer-events-none">반</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">세트 제목</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="예: 5과 필수 영단어"
                                className="h-12 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] focus-visible:ring-0 focus-visible:border-[#fdcb6e] font-bold text-lg placeholder:font-normal placeholder:opacity-60"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4 bg-yellow-50 p-6 rounded-xl border-3 border-black shadow-inner">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-lg font-pixel text-yellow-900 border-b-4 border-[#fdcb6e]">단어 목록 ({words.length})</Label>
                            <span className="text-sm font-medium text-yellow-700">영어 - 한국어 뜻</span>
                        </div>

                        <div className="space-y-3">
                            {words.map((word, idx) => (
                                <div key={idx} className="flex gap-3 items-center group">
                                    <span className="font-pixel text-lg w-8 text-center text-yellow-800 bg-white border-2 border-yellow-200 rounded py-2">{idx + 1}</span>
                                    <Input
                                        placeholder="English (예: Apple)"
                                        value={word.english}
                                        onChange={(e) => updateWord(idx, "english", e.target.value)}
                                        className="h-12 border-2 border-black font-bold focus:bg-white bg-white/80 placeholder:font-normal placeholder:opacity-60"
                                        required
                                    />
                                    <Input
                                        placeholder="한국어 뜻 (예: 사과)"
                                        value={word.korean}
                                        onChange={(e) => updateWord(idx, "korean", e.target.value)}
                                        className="h-12 border-2 border-black font-bold focus:bg-white bg-white/80 placeholder:font-normal placeholder:opacity-60"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeWord(idx)}
                                        disabled={words.length === 1}
                                        className="hover:bg-red-100 hover:text-red-600 rounded-full h-10 w-10 shrink-0"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={addWord}
                            className="w-full mt-4 border-3 border-black border-dashed bg-white hover:bg-yellow-100 text-yellow-900 font-bold py-6 text-lg"
                        >
                            <Plus className="h-5 w-5 mr-2" /> 단어 추가
                        </Button>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full h-14 bg-[#2d3436] hover:bg-black text-white font-pixel text-xl border-4 border-black shadow-[6px_6px_0_0_#fdcb6e] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">저장 중...</span>
                            ) : (
                                "세트 저장하고 완료하기"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
