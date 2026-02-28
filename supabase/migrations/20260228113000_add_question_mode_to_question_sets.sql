ALTER TABLE public.question_sets
ADD COLUMN IF NOT EXISTS question_mode TEXT NOT NULL DEFAULT 'en_to_ko';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'question_sets_question_mode_check'
    ) THEN
        ALTER TABLE public.question_sets
        ADD CONSTRAINT question_sets_question_mode_check
        CHECK (question_mode IN ('en_to_ko', 'ko_to_en', 'mixed'));
    END IF;
END $$;
