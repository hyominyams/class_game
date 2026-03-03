"use server";

import { guardError, requireActor } from "@/app/actions/security/guards";
import {
    getDefaultTopicForGame,
    getQuestionLimitForGame,
    isPixelRunnerGame,
    isWordChainGame,
    isWordRunnerGame,
    type AiTopicMode,
    type DifficultyCounts,
} from "@/lib/questions/ai-config";

type GenerateQuestionsWithAIInput = {
    gameId: string;
    difficultyCounts: Partial<DifficultyCounts>;
    topicMode?: AiTopicMode;
    topic?: string | null;
};

type ParsedRequest = {
    gameId: string;
    counts: DifficultyCounts;
    totalQuestions: number;
    maxQuestions: number;
    topicMode: AiTopicMode;
    topic: string;
};

type HistoryQuestionType = "multiple-choice" | "short-answer";

type WordRunnerQuestion = {
    english: string;
    korean: string;
};

type WordChainQuestion = {
    prompt: string;
    answer: string;
    acceptedAnswers: string[];
};

type HistoryQuestion = {
    text: string;
    type: HistoryQuestionType;
    options: [string, string, string, string];
    answer: number | string;
};

type OpenAIChatCompletionResponse = {
    choices?: Array<{
        message?: {
            content?: string | null;
        };
    }>;
    error?: {
        message?: string;
    };
};

function toNonNegativeInt(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
}

function normalizeText(value: unknown) {
    if (typeof value !== "string") return "";
    return value.trim();
}

function normalizeDifficulty(value: unknown): keyof DifficultyCounts | null {
    if (value === "high" || value === "medium" || value === "low") return value;
    return null;
}

function parseRequest(input: GenerateQuestionsWithAIInput): ParsedRequest {
    const gameId = normalizeText(input.gameId);
    if (!gameId) {
        throw new Error("gameId is required.");
    }

    const counts: DifficultyCounts = {
        high: toNonNegativeInt(input.difficultyCounts?.high),
        medium: toNonNegativeInt(input.difficultyCounts?.medium),
        low: toNonNegativeInt(input.difficultyCounts?.low),
    };

    const totalQuestions = counts.high + counts.medium + counts.low;
    const maxQuestions = getQuestionLimitForGame(gameId);

    if (totalQuestions <= 0) {
        throw new Error("문항 수를 1개 이상 입력해 주세요.");
    }

    if (totalQuestions > maxQuestions) {
        throw new Error(`총 문항 수는 최대 ${maxQuestions}개까지 가능합니다.`);
    }

    const topicMode: AiTopicMode = input.topicMode === "general" ? "general" : "default";
    const providedTopic = normalizeText(input.topic);
    const topic = topicMode === "default" ? getDefaultTopicForGame(gameId) : providedTopic;

    if (topicMode === "general" && !topic) {
        throw new Error("General 주제를 입력해 주세요.");
    }

    return {
        gameId,
        counts,
        totalQuestions,
        maxQuestions,
        topicMode,
        topic,
    };
}

function ensureDifficultyDistribution(
    counts: DifficultyCounts,
    rows: Array<{ difficulty: keyof DifficultyCounts }>
) {
    const actual: DifficultyCounts = { high: 0, medium: 0, low: 0 };

    rows.forEach((row) => {
        actual[row.difficulty] += 1;
    });

    if (
        actual.high !== counts.high ||
        actual.medium !== counts.medium ||
        actual.low !== counts.low
    ) {
        throw new Error("AI 응답의 난이도별 문항 수가 요청값과 일치하지 않습니다.");
    }
}

function ensureDistinctByKey<T>(rows: T[], keyFn: (row: T) => string, label: string) {
    const seen = new Set<string>();
    for (const row of rows) {
        const key = keyFn(row);
        if (seen.has(key)) {
            throw new Error(`AI가 중복된 ${label}을 생성했습니다. 다시 시도해 주세요.`);
        }
        seen.add(key);
    }
}

async function requestJsonFromOpenAI(systemPrompt: string, userPrompt: string): Promise<unknown> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured.");
    }

    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
        cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as OpenAIChatCompletionResponse | null;

    if (!response.ok) {
        const apiError =
            payload?.error?.message ||
            `OpenAI request failed with status ${response.status}.`;
        throw new Error(apiError);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("AI response was empty.");
    }

    try {
        return JSON.parse(content);
    } catch {
        throw new Error("AI returned invalid JSON.");
    }
}

function buildDifficultyGuide(counts: DifficultyCounts) {
    return [
        `- high: ${counts.high}개 (중학교 수준)`,
        `- medium: ${counts.medium}개 (초등학교 고학년 수준)`,
        `- low: ${counts.low}개 (초등학교 저학년 수준)`,
    ].join("\n");
}

async function generateWordRunnerQuestions(request: ParsedRequest): Promise<WordRunnerQuestion[]> {
    const systemPrompt = [
        "You generate safe classroom English vocabulary questions.",
        "Return strict JSON only. No markdown.",
    ].join(" ");

    const userPrompt = [
        `게임: word-runner`,
        `주제: ${request.topic}`,
        `총 문항: ${request.totalQuestions}`,
        "난이도 분배:",
        buildDifficultyGuide(request.counts),
        "JSON 형식:",
        '{"questions":[{"difficulty":"low|medium|high","english":"...","korean":"..."}]}',
        "규칙:",
        "- 정확히 총 문항 수만 생성할 것",
        "- 난이도 분배를 정확히 맞출 것",
        "- english는 소문자 기준 단어/짧은 구문(최대 3단어)",
        "- korean은 자연스러운 한국어 뜻",
        "- 중복 금지",
        "- 욕설/정치/성인/폭력적 소재 금지",
    ].join("\n");

    const raw = await requestJsonFromOpenAI(systemPrompt, userPrompt);
    const rows = Array.isArray((raw as { questions?: unknown[] }).questions)
        ? ((raw as { questions: unknown[] }).questions)
        : [];

    const normalized = rows.map((item) => {
        const row = item as { difficulty?: unknown; english?: unknown; korean?: unknown };
        const difficulty = normalizeDifficulty(row.difficulty);
        const english = normalizeText(row.english);
        const korean = normalizeText(row.korean);

        if (!difficulty || !english || !korean) {
            return null;
        }

        return { difficulty, english, korean };
    }).filter((item): item is { difficulty: keyof DifficultyCounts; english: string; korean: string } => Boolean(item));

    if (normalized.length !== request.totalQuestions) {
        throw new Error("AI 응답 문항 수가 요청값과 다릅니다.");
    }

    ensureDifficultyDistribution(request.counts, normalized);
    ensureDistinctByKey(normalized, (row) => `${row.english.toLowerCase()}::${row.korean}`, "단어");

    return normalized.map((row) => ({ english: row.english, korean: row.korean }));
}

async function generateWordChainQuestions(request: ParsedRequest): Promise<WordChainQuestion[]> {
    const systemPrompt = [
        "You generate safe classroom prompt-answer pairs.",
        "Return strict JSON only. No markdown.",
    ].join(" ");

    const userPrompt = [
        `게임: word-chain`,
        `주제: ${request.topic}`,
        `총 문항: ${request.totalQuestions}`,
        "난이도 분배:",
        buildDifficultyGuide(request.counts),
        "JSON 형식:",
        '{"questions":[{"difficulty":"low|medium|high","prompt":"...","answer":"...","acceptedAnswers":["..."]}]}',
        "규칙:",
        "- 정확히 총 문항 수만 생성할 것",
        "- 난이도 분배를 정확히 맞출 것",
        "- acceptedAnswers에는 정답(answer)을 포함할 것",
        "- acceptedAnswers는 1~4개",
        "- 중복 금지",
        "- 기본 주제가 영어일 때 prompt는 한국어 뜻/설명, answer는 영어 단어/표현",
        "- 욕설/정치/성인/폭력적 소재 금지",
    ].join("\n");

    const raw = await requestJsonFromOpenAI(systemPrompt, userPrompt);
    const rows = Array.isArray((raw as { questions?: unknown[] }).questions)
        ? ((raw as { questions: unknown[] }).questions)
        : [];

    const normalized = rows.map((item) => {
        const row = item as {
            difficulty?: unknown;
            prompt?: unknown;
            answer?: unknown;
            acceptedAnswers?: unknown;
        };

        const difficulty = normalizeDifficulty(row.difficulty);
        const prompt = normalizeText(row.prompt);
        const answer = normalizeText(row.answer);

        const acceptedAnswersRaw = Array.isArray(row.acceptedAnswers)
            ? row.acceptedAnswers
            : [];

        const acceptedAnswers = acceptedAnswersRaw
            .map((value) => normalizeText(value))
            .filter(Boolean);

        if (!difficulty || !prompt || !answer) {
            return null;
        }

        const combinedAnswers = Array.from(new Set([answer, ...acceptedAnswers])).slice(0, 4);

        if (combinedAnswers.length === 0) {
            return null;
        }

        return {
            difficulty,
            prompt,
            answer,
            acceptedAnswers: combinedAnswers,
        };
    }).filter((item): item is {
        difficulty: keyof DifficultyCounts;
        prompt: string;
        answer: string;
        acceptedAnswers: string[];
    } => Boolean(item));

    if (normalized.length !== request.totalQuestions) {
        throw new Error("AI 응답 문항 수가 요청값과 다릅니다.");
    }

    ensureDifficultyDistribution(request.counts, normalized);
    ensureDistinctByKey(normalized, (row) => `${row.prompt.toLowerCase()}::${row.answer.toLowerCase()}`, "문항");

    return normalized.map((row) => ({
        prompt: row.prompt,
        answer: row.answer,
        acceptedAnswers: row.acceptedAnswers,
    }));
}

async function generateHistoryQuestions(request: ParsedRequest): Promise<HistoryQuestion[]> {
    const forceMultipleChoice = isPixelRunnerGame(request.gameId);

    const systemPrompt = [
        "You generate safe classroom quiz questions.",
        "Return strict JSON only. No markdown.",
    ].join(" ");

    const userPrompt = [
        `게임: ${request.gameId}`,
        `주제: ${request.topic}`,
        `총 문항: ${request.totalQuestions}`,
        `문항 타입: ${forceMultipleChoice ? "multiple-choice only" : "multiple-choice + short-answer allowed"}`,
        "난이도 분배:",
        buildDifficultyGuide(request.counts),
        "JSON 형식:",
        '{"questions":[{"difficulty":"low|medium|high","type":"multiple-choice|short-answer","text":"...","options":["...","...","...","..."],"answerIndex":0,"answerText":"..."}]}',
        "규칙:",
        "- 정확히 총 문항 수만 생성할 것",
        "- 난이도 분배를 정확히 맞출 것",
        "- multiple-choice: options 4개 필수, answerIndex(0~3) 필수",
        "- short-answer: answerText 필수, options는 빈 배열 허용",
        forceMultipleChoice ? "- 이 요청에서는 short-answer 금지" : "- total >= 6 이면 short-answer 최소 1개 포함",
        "- 중복 금지",
        "- 욕설/정치/성인/폭력적 소재 금지",
    ].join("\n");

    const raw = await requestJsonFromOpenAI(systemPrompt, userPrompt);
    const rows = Array.isArray((raw as { questions?: unknown[] }).questions)
        ? ((raw as { questions: unknown[] }).questions)
        : [];

    const normalized = rows.map((item) => {
        const row = item as {
            difficulty?: unknown;
            type?: unknown;
            text?: unknown;
            options?: unknown;
            answerIndex?: unknown;
            answerText?: unknown;
        };

        const difficulty = normalizeDifficulty(row.difficulty);
        const text = normalizeText(row.text);
        const rawType = normalizeText(row.type);
        const type: HistoryQuestionType =
            rawType === "short-answer" ? "short-answer" : "multiple-choice";

        if (!difficulty || !text) {
            return null;
        }

        if (forceMultipleChoice && type !== "multiple-choice") {
            return null;
        }

        if (type === "multiple-choice") {
            const optionsRaw = Array.isArray(row.options) ? row.options : [];
            const options = optionsRaw
                .map((value) => normalizeText(value))
                .filter(Boolean)
                .slice(0, 4);

            const answerIndex = Number(row.answerIndex);
            if (options.length !== 4 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
                return null;
            }

            const optionTuple: [string, string, string, string] = [
                options[0],
                options[1],
                options[2],
                options[3],
            ];

            return {
                difficulty,
                text,
                type,
                options: optionTuple,
                answer: answerIndex,
            };
        }

        const answerText = normalizeText(row.answerText);
        if (!answerText) {
            return null;
        }

        return {
            difficulty,
            text,
            type,
            options: ["", "", "", ""] as [string, string, string, string],
            answer: answerText,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    if (normalized.length !== request.totalQuestions) {
        throw new Error("AI 응답 문항 수가 요청값과 다릅니다.");
    }

    ensureDifficultyDistribution(request.counts, normalized);
    ensureDistinctByKey(normalized, (row) => row.text.toLowerCase(), "문제");

    if (!forceMultipleChoice && request.totalQuestions >= 6) {
        const shortAnswerCount = normalized.filter((row) => row.type === "short-answer").length;
        if (shortAnswerCount < 1) {
            throw new Error("AI 응답에 단답형 문항이 부족합니다. 다시 시도해 주세요.");
        }
    }

    return normalized.map((row) => ({
        text: row.text,
        type: row.type,
        options: row.options,
        answer: row.answer,
    }));
}

export async function generateQuestionsWithAI(input: GenerateQuestionsWithAIInput) {
    const actorResult = await requireActor(["teacher", "admin"]);
    if (!actorResult.ok) {
        return guardError(actorResult.error, actorResult.status);
    }

    let request: ParsedRequest;
    try {
        request = parseRequest(input);
    } catch (error) {
        const message = error instanceof Error ? error.message : "요청값이 올바르지 않습니다.";
        return { success: false, error: message };
    }

    try {
        let questions: WordRunnerQuestion[] | WordChainQuestion[] | HistoryQuestion[];

        if (isWordRunnerGame(request.gameId)) {
            questions = await generateWordRunnerQuestions(request);
        } else if (isWordChainGame(request.gameId)) {
            questions = await generateWordChainQuestions(request);
        } else {
            questions = await generateHistoryQuestions(request);
        }

        return {
            success: true as const,
            gameId: request.gameId,
            topic: request.topic,
            maxQuestions: request.maxQuestions,
            totalQuestions: questions.length,
            questions,
        };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "AI 문제 생성 중 오류가 발생했습니다.";

        return {
            success: false as const,
            error: message,
        };
    }
}
