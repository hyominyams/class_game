-- Area D / Phase 6
-- P6-1: 깨진 문자열(모지바케) 정리
-- P6-3: 음수 play_time 데이터 정제 + 가드

-- Normalize known mojibake-prone game descriptions.
UPDATE public.games
SET description = '알맞은 단어를 빠르게 입력해 성문을 지키는 영어 퀴즈 게임'
WHERE id = 'word-runner';

UPDATE public.games
SET description = '역사 지식을 퀴즈로 풀어보세요.'
WHERE id = 'history-quiz';

UPDATE public.games
SET description = '장애물을 피하고 퀴즈를 풀며 달려보세요.'
WHERE id = 'pixel-runner';

UPDATE public.games
SET description = '제시어를 보고 단어를 이어 입력하는 연상 정답 게임'
WHERE id = 'word-chain';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'game_logs'
          AND column_name = 'play_time'
    ) THEN
        UPDATE public.game_logs
        SET play_time = 0
        WHERE play_time < 0;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'game_logs_play_time_non_negative'
              AND conrelid = 'public.game_logs'::regclass
        ) THEN
            ALTER TABLE public.game_logs
            ADD CONSTRAINT game_logs_play_time_non_negative
            CHECK (play_time >= 0);
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tournament_logs'
          AND column_name = 'play_time'
    ) THEN
        UPDATE public.tournament_logs
        SET play_time = 0
        WHERE play_time < 0;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'tournament_logs_play_time_non_negative'
              AND conrelid = 'public.tournament_logs'::regclass
        ) THEN
            ALTER TABLE public.tournament_logs
            ADD CONSTRAINT tournament_logs_play_time_non_negative
            CHECK (play_time IS NULL OR play_time >= 0);
        END IF;
    END IF;
END $$;
