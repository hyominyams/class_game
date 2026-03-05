-- Normalize malformed question rows and add safety constraints so
-- AI/CSV/manual inputs cannot store structurally invalid payloads.

-- 1) Normalize existing word-chain rows.
UPDATE public.word_chain_questions AS wc
SET
    prompt = regexp_replace(btrim(wc.prompt), '\s+', '', 'g'),
    answer = regexp_replace(btrim(wc.answer), '\s+', '', 'g'),
    accepted_answers = COALESCE(
        (
            SELECT to_jsonb(array_agg(v ORDER BY ord))
            FROM (
                SELECT DISTINCT ON (lower(candidate)) candidate AS v, ord
                FROM (
                    SELECT regexp_replace(btrim(wc.answer), '\s+', '', 'g') AS candidate, 0 AS ord
                    UNION ALL
                    SELECT regexp_replace(btrim(elem.value), '\s+', '', 'g') AS candidate, elem.ord::int AS ord
                    FROM jsonb_array_elements_text(
                        CASE
                            WHEN jsonb_typeof(wc.accepted_answers) = 'array' THEN wc.accepted_answers
                            ELSE '[]'::jsonb
                        END
                    ) WITH ORDINALITY AS elem(value, ord)
                ) AS normalized_candidates
                WHERE candidate <> ''
                ORDER BY lower(candidate), ord
                LIMIT 4
            ) AS deduped
        ),
        '[]'::jsonb
    );

-- 2) Normalize generic question text fields.
UPDATE public.questions
SET
    question_text = btrim(question_text),
    answer_text = NULLIF(btrim(COALESCE(answer_text, '')), '');

-- 3) Backfill word-pair type where missing for word-runner style sets.
UPDATE public.questions AS q
SET type = 'word-pair'
FROM public.question_sets AS qs
WHERE
    q.set_id = qs.id
    AND qs.game_id IN ('word-runner', 'word-defense')
    AND (q.type IS NULL OR q.type = 'multiple-choice')
    AND q.answer_text IS NOT NULL;

-- 4) Harden word-chain content constraints.
CREATE OR REPLACE FUNCTION public.is_valid_word_chain_answers(p_answers jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_value text;
BEGIN
    IF jsonb_typeof(p_answers) <> 'array' THEN
        RETURN false;
    END IF;

    IF jsonb_array_length(p_answers) < 1 OR jsonb_array_length(p_answers) > 4 THEN
        RETURN false;
    END IF;

    FOR v_value IN SELECT value FROM jsonb_array_elements_text(p_answers) AS t(value)
    LOOP
        IF
            char_length(v_value) = 0
            OR char_length(v_value) > 24
            OR v_value ~ '\s'
            OR v_value ~ '[.!?,:;()\[\]{}"''`~]'
        THEN
            RETURN false;
        END IF;
    END LOOP;

    RETURN true;
END;
$$;

ALTER TABLE public.word_chain_questions
    DROP CONSTRAINT IF EXISTS word_chain_questions_prompt_token_check,
    DROP CONSTRAINT IF EXISTS word_chain_questions_answer_token_check,
    DROP CONSTRAINT IF EXISTS word_chain_questions_accepted_answers_shape_check,
    DROP CONSTRAINT IF EXISTS word_chain_questions_answer_in_accepted_check;

ALTER TABLE public.word_chain_questions
    ADD CONSTRAINT word_chain_questions_prompt_token_check CHECK (
        char_length(prompt) BETWEEN 1 AND 24
        AND prompt !~ '\s'
        AND prompt !~ '[.!?,:;()\[\]{}"''`~]'
    ) NOT VALID,
    ADD CONSTRAINT word_chain_questions_answer_token_check CHECK (
        char_length(answer) BETWEEN 1 AND 24
        AND answer !~ '\s'
        AND answer !~ '[.!?,:;()\[\]{}"''`~]'
    ) NOT VALID,
    ADD CONSTRAINT word_chain_questions_accepted_answers_shape_check CHECK (
        public.is_valid_word_chain_answers(accepted_answers)
    ) NOT VALID,
    ADD CONSTRAINT word_chain_questions_answer_in_accepted_check CHECK (
        accepted_answers ? answer
    ) NOT VALID;

-- 5) Add lightweight non-empty constraints to generic questions.
ALTER TABLE public.questions
    DROP CONSTRAINT IF EXISTS questions_question_text_nonempty_check,
    DROP CONSTRAINT IF EXISTS questions_short_answer_nonempty_check,
    DROP CONSTRAINT IF EXISTS questions_word_pair_nonempty_check;

ALTER TABLE public.questions
    ADD CONSTRAINT questions_question_text_nonempty_check CHECK (
        char_length(btrim(question_text)) > 0
    ) NOT VALID,
    ADD CONSTRAINT questions_short_answer_nonempty_check CHECK (
        type IS DISTINCT FROM 'short-answer'
        OR (answer_text IS NOT NULL AND char_length(btrim(answer_text)) > 0 AND char_length(answer_text) <= 80)
    ) NOT VALID,
    ADD CONSTRAINT questions_word_pair_nonempty_check CHECK (
        type IS DISTINCT FROM 'word-pair'
        OR (
            answer_text IS NOT NULL
            AND char_length(btrim(answer_text)) > 0
            AND char_length(answer_text) <= 40
            AND question_text !~ '[.!?]'
        )
    ) NOT VALID;
