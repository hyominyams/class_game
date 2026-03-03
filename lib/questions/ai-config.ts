export type AiTopicMode = "default" | "general";

export type DifficultyCounts = {
    high: number;
    medium: number;
    low: number;
};

const DEFAULT_MAX_QUESTIONS = 30;
const PIXEL_RUNNER_MAX_QUESTIONS = 10;

export function isWordRunnerGame(gameId: string) {
    return gameId === "word-runner" || gameId === "word-defense";
}

export function isWordChainGame(gameId: string) {
    return gameId === "word-chain";
}

export function isPixelRunnerGame(gameId: string) {
    return gameId === "pixel-runner";
}

export function getQuestionLimitForGame(gameId: string) {
    if (isPixelRunnerGame(gameId)) {
        return PIXEL_RUNNER_MAX_QUESTIONS;
    }

    return DEFAULT_MAX_QUESTIONS;
}

export function getDefaultTopicForGame(gameId: string) {
    if (isWordRunnerGame(gameId) || isWordChainGame(gameId)) {
        return "영어";
    }

    return "역사";
}
