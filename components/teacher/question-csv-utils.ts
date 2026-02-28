"use client";

export type WordDefenseCsvRow = {
    english: string;
    korean: string;
};

export type HistoryCsvRow = {
    text: string;
    type: "multiple-choice" | "short-answer";
    options: [string, string, string, string];
    answer: number | string;
};

export type WordChainCsvRow = {
    prompt: string;
    answer: string;
    acceptedAnswers: string[];
};

function normalizeHeader(value: string) {
    return value.trim().toLowerCase();
}

function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i += 1;
                continue;
            }
            inQuotes = !inQuotes;
            continue;
        }

        if (char === "," && !inQuotes) {
            fields.push(current);
            current = "";
            continue;
        }

        current += char;
    }

    fields.push(current);
    return fields.map((field) => field.trim());
}

function parseCsv(text: string): string[][] {
    const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return normalized
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map(parseCsvLine);
}

function findColumnIndex(headers: string[], aliases: string[]) {
    const normalizedHeaders = headers.map(normalizeHeader);
    for (const alias of aliases.map(normalizeHeader)) {
        const index = normalizedHeaders.indexOf(alias);
        if (index >= 0) return index;
    }
    return -1;
}

function ensureColumn(headers: string[], aliases: string[], label: string) {
    const index = findColumnIndex(headers, aliases);
    if (index < 0) {
        throw new Error(`CSV 필수 컬럼 누락: ${label}`);
    }
    return index;
}

function readCell(row: string[], index: number) {
    return (row[index] || "").trim();
}

function isBlankRow(row: string[]) {
    return row.every((cell) => cell.trim() === "");
}

function escapeCsvCell(value: string) {
    if (value.includes('"') || value.includes(",") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function buildCsv(headers: string[], rows: string[][]) {
    return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function downloadWordDefenseTemplateCsv() {
    const headers = ["korean", "english"];
    const rows = [
        ["사과", "apple"],
        ["학교", "school"],
    ];

    downloadTextFile("word-defense-template.csv", buildCsv(headers, rows));
}

export function downloadHistoryTemplateCsv() {
    const headers = [
        "type",
        "question_text",
        "option_1",
        "option_2",
        "option_3",
        "option_4",
        "correct_answer",
        "answer_text",
    ];

    const rows = [
        ["multiple-choice", "대한민국의 수도는?", "서울", "부산", "대전", "광주", "1", ""],
        ["short-answer", "한글을 만든 왕은?", "", "", "", "", "", "세종대왕"],
    ];

    downloadTextFile("history-quiz-template.csv", buildCsv(headers, rows));
}

export function downloadWordChainTemplateCsv() {
    const headers = ["prompt", "answer", "accepted_answers"];
    const rows = [
        ["대한민국의 수도", "서울", "서울특별시|서울시|서울"],
        ["물의 화학식", "H2O", "h2o|물"],
    ];

    downloadTextFile("word-chain-template.csv", buildCsv(headers, rows));
}

export async function parseWordDefenseCsvFile(file: File): Promise<WordDefenseCsvRow[]> {
    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 2) {
        throw new Error("CSV 데이터가 비어 있습니다.");
    }

    const headers = rows[0];
    const koreanIndex = ensureColumn(headers, ["korean", "뜻", "question_text"], "korean");
    const englishIndex = ensureColumn(headers, ["english", "단어", "answer_text"], "english");

    const result: WordDefenseCsvRow[] = [];
    rows.slice(1).forEach((row, idx) => {
        if (isBlankRow(row)) return;

        const korean = readCell(row, koreanIndex);
        const english = readCell(row, englishIndex);

        if (!korean || !english) {
            throw new Error(`CSV ${idx + 2}행: korean, english 값이 모두 필요합니다.`);
        }

        result.push({ korean, english });
    });

    if (result.length === 0) {
        throw new Error("가져올 문제 행이 없습니다.");
    }

    return result;
}

export async function parseHistoryCsvFile(file: File): Promise<HistoryCsvRow[]> {
    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 2) {
        throw new Error("CSV 데이터가 비어 있습니다.");
    }

    const headers = rows[0];
    const typeIndex = ensureColumn(headers, ["type", "문항유형"], "type");
    const questionIndex = ensureColumn(headers, ["question_text", "question", "문제"], "question_text");
    const option1Index = ensureColumn(headers, ["option_1", "보기1"], "option_1");
    const option2Index = ensureColumn(headers, ["option_2", "보기2"], "option_2");
    const option3Index = ensureColumn(headers, ["option_3", "보기3"], "option_3");
    const option4Index = ensureColumn(headers, ["option_4", "보기4"], "option_4");
    const correctAnswerIndex = ensureColumn(headers, ["correct_answer", "정답번호"], "correct_answer");
    const answerTextIndex = ensureColumn(headers, ["answer_text", "주관식정답"], "answer_text");

    const result: HistoryCsvRow[] = [];

    rows.slice(1).forEach((row, idx) => {
        if (isBlankRow(row)) return;

        const textValue = readCell(row, questionIndex);
        const rawType = normalizeHeader(readCell(row, typeIndex));

        if (!textValue) {
            throw new Error(`CSV ${idx + 2}행: question_text 값이 필요합니다.`);
        }

        const isShortAnswer = rawType === "short-answer" || rawType === "short" || rawType === "주관식";
        if (isShortAnswer) {
            const answerText = readCell(row, answerTextIndex);
            if (!answerText) {
                throw new Error(`CSV ${idx + 2}행: short-answer 유형은 answer_text 값이 필요합니다.`);
            }

            result.push({
                text: textValue,
                type: "short-answer",
                options: ["", "", "", ""],
                answer: answerText,
            });
            return;
        }

        const options: [string, string, string, string] = [
            readCell(row, option1Index),
            readCell(row, option2Index),
            readCell(row, option3Index),
            readCell(row, option4Index),
        ];

        if (options.some((option) => !option)) {
            throw new Error(`CSV ${idx + 2}행: multiple-choice 유형은 option_1~option_4가 모두 필요합니다.`);
        }

        const correctRaw = readCell(row, correctAnswerIndex);
        if (!correctRaw) {
            throw new Error(`CSV ${idx + 2}행: multiple-choice 유형은 correct_answer 값이 필요합니다.`);
        }

        let answerIndex = -1;
        const numericValue = Number(correctRaw);

        if (!Number.isNaN(numericValue)) {
            if (numericValue >= 1 && numericValue <= 4) answerIndex = numericValue - 1;
            else if (numericValue >= 0 && numericValue <= 3) answerIndex = numericValue;
        } else {
            answerIndex = options.findIndex((option) => option === correctRaw);
        }

        if (answerIndex < 0 || answerIndex > 3) {
            throw new Error(`CSV ${idx + 2}행: correct_answer는 1~4, 0~3, 또는 보기 텍스트여야 합니다.`);
        }

        result.push({
            text: textValue,
            type: "multiple-choice",
            options,
            answer: answerIndex,
        });
    });

    if (result.length === 0) {
        throw new Error("가져올 문제 행이 없습니다.");
    }

    return result;
}

export async function parseWordChainCsvFile(file: File): Promise<WordChainCsvRow[]> {
    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 2) {
        throw new Error("CSV 데이터가 비어 있습니다.");
    }

    const headers = rows[0];
    const promptIndex = ensureColumn(headers, ["prompt", "제시어"], "prompt");
    const answerIndex = ensureColumn(headers, ["answer", "정답"], "answer");
    const acceptedIndex = ensureColumn(headers, ["accepted_answers", "유사정답"], "accepted_answers");

    const result: WordChainCsvRow[] = [];
    rows.slice(1).forEach((row, idx) => {
        if (isBlankRow(row)) return;

        const prompt = readCell(row, promptIndex);
        const answer = readCell(row, answerIndex);
        const acceptedRaw = readCell(row, acceptedIndex);

        if (!prompt || !answer) {
            throw new Error(`CSV ${idx + 2}행: prompt, answer 값이 필요합니다.`);
        }

        const delimiter = acceptedRaw.includes("|") ? "|" : ",";
        const acceptedAnswers = acceptedRaw
            .split(delimiter)
            .map((value) => value.trim())
            .filter(Boolean);

        result.push({ prompt, answer, acceptedAnswers });
    });

    if (result.length === 0) {
        throw new Error("가져올 문제 행이 없습니다.");
    }

    return result;
}
