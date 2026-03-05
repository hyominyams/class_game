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

const WORD_CHAIN_MAX_SEGMENT_LENGTH = 24;
const WORD_CHAIN_MAX_ACCEPTED_ANSWERS = 4;
const WORD_CHAIN_ALLOWED_TOKEN_REGEX = /^[\p{L}\p{N}]+$/u;
const WORD_CHAIN_FORBIDDEN_MARK_REGEX = /[.!?,:;()[\]{}"'`~]/;
const WORD_CHAIN_WHITESPACE_REGEX = /\s/;
const WORD_RUNNER_MAX_ENGLISH_LENGTH = 40;
const WORD_RUNNER_MAX_KOREAN_LENGTH = 50;
const WORD_RUNNER_ALLOWED_ENGLISH_REGEX = /^[A-Za-z0-9][A-Za-z0-9' -]*$/;
const HISTORY_MAX_QUESTION_LENGTH = 180;
const HISTORY_MAX_SHORT_ANSWER_LENGTH = 80;

function normalizeCompactText(value: unknown) {
    if (typeof value !== "string") return "";
    return value.trim().replace(/\s+/g, "");
}

function isWordChainToken(value: string) {
    if (!value || value.length > WORD_CHAIN_MAX_SEGMENT_LENGTH) {
        return false;
    }

    if (WORD_CHAIN_WHITESPACE_REGEX.test(value) || WORD_CHAIN_FORBIDDEN_MARK_REGEX.test(value)) {
        return false;
    }

    return WORD_CHAIN_ALLOWED_TOKEN_REGEX.test(value);
}

function normalizeWordChainAcceptedAnswers(value: unknown, answer: string) {
    const raw = Array.isArray(value) ? value : [];
    const normalized = [answer, ...raw.map((item) => normalizeCompactText(item))]
        .filter((item) => isWordChainToken(item))
        .slice(0, WORD_CHAIN_MAX_ACCEPTED_ANSWERS);

    return Array.from(new Set(normalized.map((item) => item.toLowerCase())))
        .map((lowered) => normalized.find((item) => item.toLowerCase() === lowered) || lowered)
        .slice(0, WORD_CHAIN_MAX_ACCEPTED_ANSWERS);
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
    const defaultTopic = getDefaultTopicForGame(gameId);
    const providedTopic = normalizeText(input.topic);
    const topic = providedTopic || defaultTopic;

    if (topicMode === "general" && !providedTopic) {
        throw new Error("General topic is required.");
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
        throw new Error("AI difficulty distribution does not match the request.");
    }
}

function ensureDistinctByKey<T>(rows: T[], keyFn: (row: T) => string, label: string) {
    const seen = new Set<string>();
    for (const row of rows) {
        const key = keyFn(row);
        if (seen.has(key)) {
            throw new Error(`AI generated duplicate ${label}. Please try again.`);
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
        const apiError = payload?.error?.message || `OpenAI request failed with status ${response.status}.`;
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
        `- high: ${counts.high}`,
        `- medium: ${counts.medium}`,
        `- low: ${counts.low}`,
    ].join("\n");
}

async function generateWordRunnerQuestions(request: ParsedRequest): Promise<WordRunnerQuestion[]> {
    const systemPrompt = [
        "You generate safe classroom English vocabulary questions.",
        "Return strict JSON only. No markdown.",
    ].join(" ");

    const userPrompt = [
        "Game: word-runner",
        `Requested topic: ${request.topic}`,
        "Every question must be tightly scoped to the requested topic text above.",
        `Total questions: ${request.totalQuestions}`,
        "Difficulty distribution:",
        buildDifficultyGuide(request.counts),
        "JSON format:",
        '{"questions":[{"difficulty":"low|medium|high","english":"...","korean":"..."}]}',
        "Rules:",
        "- Return exactly the requested number of questions.",
        "- Match the requested difficulty distribution exactly.",
        "- Keep each english value to a short classroom-safe word or phrase (max 3 words).",
        "- Provide natural Korean meaning for each english value (translation only, no explanation sentence).",
        "- english must use only letters, numbers, apostrophes, hyphens, and spaces.",
        "- No duplicates.",
        "- No political, sexual, hate, violent, or age-inappropriate content.",
    ].join("\n");

    const raw = await requestJsonFromOpenAI(systemPrompt, userPrompt);
    const rows = Array.isArray((raw as { questions?: unknown[] }).questions)
        ? (raw as { questions: unknown[] }).questions
        : [];

    const normalized = rows
        .map((item) => {
            const row = item as { difficulty?: unknown; english?: unknown; korean?: unknown };
            const difficulty = normalizeDifficulty(row.difficulty);
            const english = normalizeText(row.english);
            const korean = normalizeText(row.korean);
            const englishWordCount = english.split(/\s+/).filter(Boolean).length;

            if (!difficulty || !english || !korean) {
                return null;
            }

            if (
                englishWordCount < 1 ||
                englishWordCount > 3 ||
                english.length > WORD_RUNNER_MAX_ENGLISH_LENGTH ||
                korean.length > WORD_RUNNER_MAX_KOREAN_LENGTH ||
                !WORD_RUNNER_ALLOWED_ENGLISH_REGEX.test(english) ||
                /[.!?]/.test(korean)
            ) {
                return null;
            }

            return { difficulty, english, korean };
        })
        .filter((item): item is { difficulty: keyof DifficultyCounts; english: string; korean: string } => Boolean(item));

    if (normalized.length !== request.totalQuestions) {
        throw new Error("AI response question count does not match the request.");
    }

    ensureDifficultyDistribution(request.counts, normalized);
    ensureDistinctByKey(normalized, (row) => `${row.english.toLowerCase()}::${row.korean}`, "vocabulary");

    return normalized.map((row) => ({ english: row.english, korean: row.korean }));
}

async function generateWordChainQuestions(request: ParsedRequest): Promise<WordChainQuestion[]> {
    const systemPrompt = [
        "You generate safe classroom word-chain split pairs.",
        "Return strict JSON only. No markdown.",
    ].join(" ");

    const userPrompt = [
        "Game: word-chain",
        `Requested topic: ${request.topic}`,
        "Every question must be tightly scoped to the requested topic text above.",
        `Total questions: ${request.totalQuestions}`,
        "Difficulty distribution:",
        buildDifficultyGuide(request.counts),
        "JSON format:",
        '{"questions":[{"difficulty":"low|medium|high","fullWord":"...","prompt":"...","answer":"...","acceptedAnswers":["..."]}]}',
        "Rules:",
        "- Return exactly the requested number of questions.",
        "- Match the requested difficulty distribution exactly.",
        "- fullWord must be one contiguous token (no spaces).",
        "- prompt must be the leading part of fullWord.",
        "- answer must be the remaining tail part so fullWord === prompt + answer.",
        "- prompt and answer must be short token segments, not clue sentences or explanations.",
        "- prompt and answer must not contain punctuation or whitespace.",
        "- acceptedAnswers must include answer.",
        "- acceptedAnswers length must be 1 to 4.",
        "- No duplicates.",
        "- No political, sexual, hate, violent, or age-inappropriate content.",
    ].join("\n");

    const raw = await requestJsonFromOpenAI(systemPrompt, userPrompt);
    const rows = Array.isArray((raw as { questions?: unknown[] }).questions)
        ? (raw as { questions: unknown[] }).questions
        : [];

    const normalized = rows
        .map((item) => {
            const row = item as {
                difficulty?: unknown;
                fullWord?: unknown;
                prompt?: unknown;
                answer?: unknown;
                acceptedAnswers?: unknown;
            };

            const difficulty = normalizeDifficulty(row.difficulty);
            const prompt = normalizeCompactText(row.prompt);
            const answer = normalizeCompactText(row.answer);
            const fullWord = normalizeCompactText(row.fullWord || `${prompt}${answer}`);

            if (!difficulty || !prompt || !answer) {
                return null;
            }

            if (
                !isWordChainToken(prompt) ||
                !isWordChainToken(answer) ||
                !isWordChainToken(fullWord) ||
                fullWord !== `${prompt}${answer}`
            ) {
                return null;
            }

            const combinedAnswers = normalizeWordChainAcceptedAnswers(row.acceptedAnswers, answer);
            if (combinedAnswers.length === 0) {
                return null;
            }

            return {
                difficulty,
                prompt,
                answer,
                acceptedAnswers: combinedAnswers,
            };
        })
        .filter((item): item is {
            difficulty: keyof DifficultyCounts;
            prompt: string;
            answer: string;
            acceptedAnswers: string[];
        } => Boolean(item));

    if (normalized.length !== request.totalQuestions) {
        throw new Error("AI response question count does not match the request.");
    }

    ensureDifficultyDistribution(request.counts, normalized);
    ensureDistinctByKey(
        normalized,
        (row) => `${row.prompt.toLowerCase()}::${row.answer.toLowerCase()}`,
        "question"
    );

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
        `Game: ${request.gameId}`,
        `Requested topic: ${request.topic}`,
        "Every question must be tightly scoped to the requested topic text above.",
        `Total questions: ${request.totalQuestions}`,
        `Question type rule: ${forceMultipleChoice ? "multiple-choice only" : "multiple-choice + short-answer allowed"}`,
        "Difficulty distribution:",
        buildDifficultyGuide(request.counts),
        "JSON format:",
        '{"questions":[{"difficulty":"low|medium|high","type":"multiple-choice|short-answer","text":"...","options":["...","...","...","..."],"answerIndex":0,"answerText":"..."}]}',
        "Rules:",
        "- Return exactly the requested number of questions.",
        "- Match the requested difficulty distribution exactly.",
        "- multiple-choice: options must be 4 and answerIndex must be 0..3.",
        "- short-answer: answerText is required and options may be empty.",
        forceMultipleChoice
            ? "- short-answer is not allowed for this game."
            : "- if total questions >= 6, include at least one short-answer question.",
        "- No duplicates.",
        "- No political, sexual, hate, violent, or age-inappropriate content.",
    ].join("\n");

    const raw = await requestJsonFromOpenAI(systemPrompt, userPrompt);
    const rows = Array.isArray((raw as { questions?: unknown[] }).questions)
        ? (raw as { questions: unknown[] }).questions
        : [];

    const normalized = rows
        .map((item) => {
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
            const type: HistoryQuestionType = rawType === "short-answer" ? "short-answer" : "multiple-choice";

            if (!difficulty || !text) {
                return null;
            }

            if (text.length > HISTORY_MAX_QUESTION_LENGTH) {
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
            if (!answerText || answerText.length > HISTORY_MAX_SHORT_ANSWER_LENGTH) {
                return null;
            }

            return {
                difficulty,
                text,
                type,
                options: ["", "", "", ""] as [string, string, string, string],
                answer: answerText,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    if (normalized.length !== request.totalQuestions) {
        throw new Error("AI response question count does not match the request.");
    }

    ensureDifficultyDistribution(request.counts, normalized);
    ensureDistinctByKey(normalized, (row) => row.text.toLowerCase(), "question");

    if (!forceMultipleChoice && request.totalQuestions >= 6) {
        const shortAnswerCount = normalized.filter((row) => row.type === "short-answer").length;
        if (shortAnswerCount < 1) {
            throw new Error("AI response must include at least one short-answer question.");
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
        const message = error instanceof Error ? error.message : "Invalid AI generation request.";
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
        const message = error instanceof Error
            ? error.message
            : "An error occurred during AI question generation.";

        return {
            success: false as const,
            error: message,
        };
    }
}
