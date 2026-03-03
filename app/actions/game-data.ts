"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type UserRole = Database["public"]["Enums"]["user_role"];
type QuestionType = "multiple_choice" | "flexible_answer";
type WordQuestionMode = "en_to_ko" | "ko_to_en" | "mixed";

type MultipleChoiceQuestionInput = {
    question_text: string;
    options?: string[] | null;
    correct_answer?: number | null;
    answer_text?: string | null;
    type?: string | null;
};

type WordChainQuestionInput = {
    prompt: string;
    answer: string;
    accepted_answers?: string[] | string | null;
};

type QuestionInput = MultipleChoiceQuestionInput | WordChainQuestionInput;

type WordChainQuestionInsert = {
    set_id: string;
    prompt: string;
    answer: string;
    accepted_answers: string[];
};

type AuthContext = {
    userId: string;
    role: UserRole;
    grade: number | null;
    classNum: number | null;
};

type QuestionSetOptions = {
    questionMode?: WordQuestionMode | null;
};

type RuntimeSourceScope = "CLASS" | "GLOBAL";

type RuntimeQuestionsResult = {
    success: boolean;
    setId: string | null;
    sourceScope: RuntimeSourceScope | null;
    questionMode: WordQuestionMode;
    questions: unknown[];
    error?: string;
};

const GAME_QUESTION_TYPES: Record<string, QuestionType> = {
    "word-runner": "multiple_choice",
    "history-quiz": "multiple_choice",
    "pixel-runner": "multiple_choice",
    "word-chain": "flexible_answer",
};

const DEFAULT_WORD_QUESTION_MODE: WordQuestionMode = "en_to_ko";

function getQuestionType(gameId: string): QuestionType {
    return GAME_QUESTION_TYPES[gameId] || "multiple_choice";
}

function normalizeQuestionMode(value: unknown): WordQuestionMode {
    if (value === "ko_to_en" || value === "mixed" || value === "en_to_ko") {
        return value;
    }

    return DEFAULT_WORD_QUESTION_MODE;
}

function normalizeAcceptedAnswers(value: string[] | string | null | undefined) {
    if (Array.isArray(value)) {
        return value.map((item) => item.trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item).trim()).filter(Boolean);
            }
        } catch {
            return value
                .split(value.includes("|") ? "|" : ",")
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    return [];
}

function buildMultipleChoiceRows(setId: string, questionsData: QuestionInput[]) {
    const rows: Database["public"]["Tables"]["questions"]["Insert"][] = [];

    questionsData.forEach((question) => {
        if (!("question_text" in question)) {
            return;
        }

        rows.push({
            set_id: setId,
            question_text: question.question_text,
            options: Array.isArray(question.options) ? question.options : [],
            correct_answer: question.correct_answer ?? null,
            answer_text: question.answer_text ?? null,
            type: question.type || "multiple-choice",
        });
    });

    return rows;
}

function buildWordChainRows(setId: string, questionsData: QuestionInput[]) {
    const rows: WordChainQuestionInsert[] = [];

    questionsData.forEach((question) => {
        if (!("prompt" in question) || !("answer" in question)) {
            return;
        }

        rows.push({
            set_id: setId,
            prompt: question.prompt,
            answer: question.answer,
            accepted_answers: normalizeAcceptedAnswers(question.accepted_answers),
        });
    });

    return rows;
}

async function getAuthContext(): Promise<AuthContext | { error: string }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not logged in" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, grade, class")
        .eq("id", user.id)
        .single();

    if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
        return { error: "Unauthorized" };
    }

    return {
        userId: user.id,
        role: profile.role,
        grade: profile.grade,
        classNum: profile.class,
    };
}

function isAuthError(context: AuthContext | { error: string }): context is { error: string } {
    return "error" in context;
}

function ensureTeacherScope(context: AuthContext, grade: number | null, classNum: number | null): string | null {
    if (context.role !== "teacher") {
        return null;
    }

    if (context.grade === null || context.classNum === null) {
        return "Teacher profile scope is missing";
    }

    if (context.grade !== grade || context.classNum !== classNum) {
        return "Teachers can only manage question sets for their own class";
    }

    return null;
}

async function insertQuestions(
    questionType: QuestionType,
    setId: string,
    questionsData: QuestionInput[]
) {
    const adminClient = createAdminClient();

    if (questionType === "flexible_answer") {
        const rows = buildWordChainRows(setId, questionsData);
        if (rows.length === 0) return { error: null };

        const { error } = await adminClient
            .from("word_chain_questions" as never)
            .insert(rows as never);

        return { error };
    }

    const rows = buildMultipleChoiceRows(setId, questionsData);
    if (rows.length === 0) return { error: null };

    const { error } = await adminClient
        .from("questions")
        .insert(rows);

    return { error };
}

async function deleteQuestionsByType(questionType: QuestionType, setId: string) {
    const adminClient = createAdminClient();

    if (questionType === "flexible_answer") {
        const { error } = await adminClient
            .from("word_chain_questions" as never)
            .delete()
            .eq("set_id", setId);

        return { error };
    }

    const { error } = await adminClient
        .from("questions")
        .delete()
        .eq("set_id", setId);

    return { error };
}

function revalidateQuestionPages() {
    revalidatePath("/teacher/questions");
    revalidatePath("/teacher/dashboard");
    revalidatePath("/admin/questions");
    revalidatePath("/student/game");
}

export async function createQuestionSet(
    gameId: string,
    title: string,
    grade: number | null,
    classNum: number | null,
    questionsData: QuestionInput[],
    options?: QuestionSetOptions
) {
    const context = await getAuthContext();
    if (isAuthError(context)) {
        return { success: false, error: context.error };
    }

    const scopeError = ensureTeacherScope(context, grade, classNum);
    if (scopeError) {
        return { success: false, error: scopeError };
    }

    const questionMode = normalizeQuestionMode(options?.questionMode);

    const adminClient = createAdminClient();
    const { data: set, error: setError } = await adminClient
        .from("question_sets")
        .insert({
            game_id: gameId,
            title,
            grade,
            class: classNum,
            created_by: context.userId,
            is_active: false,
            question_mode: questionMode,
        })
        .select("id")
        .single();

    if (setError || !set) {
        return { success: false, error: setError?.message || "Failed to create question set" };
    }

    const questionType = getQuestionType(gameId);
    const { error: insertError } = await insertQuestions(questionType, set.id, questionsData);

    if (insertError) {
        return { success: false, error: insertError.message };
    }

    revalidateQuestionPages();

    return { success: true, setId: set.id };
}

export async function updateQuestionSet(
    setId: string,
    title: string,
    grade: number | null,
    classNum: number | null,
    questionsData: QuestionInput[],
    options?: QuestionSetOptions
) {
    const context = await getAuthContext();
    if (isAuthError(context)) {
        return { success: false, error: context.error };
    }

    const adminClient = createAdminClient();

    const { data: currentSet, error: fetchError } = await adminClient
        .from("question_sets")
        .select("created_by, is_active, game_id, grade, class, question_mode")
        .eq("id", setId)
        .single();

    if (fetchError || !currentSet) {
        return { success: false, error: "Question set not found" };
    }

    if (context.role === "teacher" && currentSet.created_by !== context.userId) {
        return { success: false, error: "Unauthorized: You can only edit your own question sets" };
    }

    const scopeError = ensureTeacherScope(context, grade, classNum);
    if (scopeError) {
        return { success: false, error: scopeError };
    }

    const wasActive = Boolean(currentSet.is_active);
    const questionType = getQuestionType(currentSet.game_id || "");
    const questionMode = normalizeQuestionMode(options?.questionMode ?? currentSet.question_mode);

    if (wasActive) {
        const { error: deactivateError } = await adminClient
            .from("question_sets")
            .update({ is_active: false })
            .eq("id", setId);

        if (deactivateError) {
            return { success: false, error: "Failed to deactivate set for update" };
        }
    }

    const { error: updateSetError } = await adminClient
        .from("question_sets")
        .update({
            title,
            grade,
            class: classNum,
            question_mode: questionMode,
        })
        .eq("id", setId);

    if (updateSetError) {
        return { success: false, error: updateSetError.message };
    }

    const { error: deleteError } = await deleteQuestionsByType(questionType, setId);
    if (deleteError) {
        return { success: false, error: deleteError.message };
    }

    const { error: insertError } = await insertQuestions(questionType, setId, questionsData);
    if (insertError) {
        return { success: false, error: insertError.message };
    }

    if (wasActive) {
        const { error: activateError } = await adminClient
            .from("question_sets")
            .update({ is_active: true })
            .eq("id", setId);

        if (activateError) {
            return { success: true, message: "Updated, but failed to reactivate automatically." };
        }
    }

    revalidateQuestionPages();
    return { success: true };
}

export async function deleteQuestionSet(setId: string) {
    const context = await getAuthContext();
    if (isAuthError(context)) {
        return { success: false, error: context.error };
    }

    const adminClient = createAdminClient();

    const { data: set, error: fetchError } = await adminClient
        .from("question_sets")
        .select("created_by, game_id")
        .eq("id", setId)
        .single();

    if (fetchError || !set) {
        return { success: false, error: "Question set not found" };
    }

    if (context.role === "teacher" && set.created_by !== context.userId) {
        return { success: false, error: "Unauthorized: You can only delete your own question sets" };
    }

    const questionType = getQuestionType(set.game_id || "");

    const { error: deleteQuestionError } = await deleteQuestionsByType(questionType, setId);
    if (deleteQuestionError) {
        return { success: false, error: deleteQuestionError.message };
    }

    const { error: deleteSetError } = await adminClient
        .from("question_sets")
        .delete()
        .eq("id", setId);

    if (deleteSetError) {
        return { success: false, error: deleteSetError.message };
    }

    revalidateQuestionPages();
    return { success: true };
}

export async function getQuestionSets(gameId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    let query = adminClient
        .from("question_sets")
        .select("*, profiles!question_sets_created_by_fkey(nickname)")
        .eq("game_id", gameId)
        .eq("is_active", true);

    if (user) {
        const { data: profile } = await adminClient
            .from("profiles")
            .select("grade, class, role")
            .eq("id", user.id)
            .single();

        if (profile && profile.role !== "admin") {
            query = query.or(`grade.is.null,and(grade.eq.${profile.grade},class.eq.${profile.class})`);
        }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching sets:", error);
        return [];
    }

    return data || [];
}

export async function getRuntimeQuestions(gameId: string): Promise<RuntimeQuestionsResult> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            success: false,
            setId: null,
            sourceScope: null,
            questionMode: DEFAULT_WORD_QUESTION_MODE,
            questions: [],
            error: "Not logged in",
        };
    }

    const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("grade, class")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return {
            success: false,
            setId: null,
            sourceScope: null,
            questionMode: DEFAULT_WORD_QUESTION_MODE,
            questions: [],
            error: "Profile not found",
        };
    }

    let runtimeSet: { id: string; question_mode: string | null } | null = null;
    let sourceScope: RuntimeSourceScope | null = null;

    if (profile.grade !== null && profile.class !== null) {
        const { data: classSet } = await adminClient
            .from("question_sets")
            .select("id, question_mode")
            .eq("game_id", gameId)
            .eq("is_active", true)
            .eq("grade", profile.grade)
            .eq("class", profile.class)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (classSet) {
            runtimeSet = classSet;
            sourceScope = "CLASS";
        }
    }

    if (!runtimeSet) {
        const { data: globalSet } = await adminClient
            .from("question_sets")
            .select("id, question_mode")
            .eq("game_id", gameId)
            .eq("is_active", true)
            .is("grade", null)
            .is("class", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (globalSet) {
            runtimeSet = globalSet;
            sourceScope = "GLOBAL";
        }
    }

    if (!runtimeSet) {
        return {
            success: true,
            setId: null,
            sourceScope: null,
            questionMode: DEFAULT_WORD_QUESTION_MODE,
            questions: [],
        };
    }

    const questions = await getQuestions(runtimeSet.id);

    return {
        success: true,
        setId: runtimeSet.id,
        sourceScope,
        questionMode: normalizeQuestionMode(runtimeSet.question_mode),
        questions: Array.isArray(questions) ? questions : [],
    };
}

export async function getQuestions(setId: string) {
    const adminClient = createAdminClient();

    const { data: set } = await adminClient
        .from("question_sets")
        .select("game_id")
        .eq("id", setId)
        .single();

    const questionType = getQuestionType(set?.game_id || "");

    if (questionType === "flexible_answer") {
        const { data, error } = await adminClient
            .from("word_chain_questions" as never)
            .select("*")
            .eq("set_id", setId);

        if (error) {
            console.error("Error fetching word-chain questions:", error);
            return [];
        }

        return (data as unknown[]) || [];
    }

    const { data, error } = await adminClient
        .from("questions")
        .select("*")
        .eq("set_id", setId);

    if (error) {
        console.error("Error fetching questions:", error);
        return [];
    }

    return data || [];
}
