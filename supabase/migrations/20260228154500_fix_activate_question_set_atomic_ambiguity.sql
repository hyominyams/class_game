-- Hotfix: resolve ambiguous reference caused by RETURNS TABLE column `game_id`
-- in activate_question_set_atomic.
-- Use explicit table aliases in UPDATE predicates.

CREATE OR REPLACE FUNCTION public.activate_question_set_atomic(
    p_set_id UUID,
    p_actor_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    activated_set_id UUID,
    game_id TEXT,
    applied_scope TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target public.question_sets%ROWTYPE;
    v_actor_role public.user_role;
    v_actor_grade INTEGER;
    v_actor_class INTEGER;
    v_effective_actor_id UUID;
    v_is_service_actor BOOLEAN := current_user IN ('service_role', 'postgres', 'supabase_admin');
BEGIN
    SELECT *
    INTO v_target
    FROM public.question_sets
    WHERE id = p_set_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'QUESTION_SET_NOT_FOUND';
    END IF;

    IF v_target.game_id IS NULL THEN
        RAISE EXCEPTION 'QUESTION_SET_GAME_ID_REQUIRED';
    END IF;

    v_effective_actor_id := COALESCE(p_actor_id, auth.uid());

    IF NOT v_is_service_actor THEN
        IF v_effective_actor_id IS NULL THEN
            RAISE EXCEPTION 'UNAUTHORIZED';
        END IF;

        SELECT role, grade, class
        INTO v_actor_role, v_actor_grade, v_actor_class
        FROM public.profiles
        WHERE id = v_effective_actor_id;

        IF v_actor_role NOT IN ('admin', 'teacher') THEN
            RAISE EXCEPTION 'FORBIDDEN';
        END IF;

        IF v_actor_role = 'teacher' THEN
            IF v_target.grade IS NULL OR v_target.class IS NULL THEN
                RAISE EXCEPTION 'TEACHER_CANNOT_ACTIVATE_GLOBAL_SET';
            END IF;

            IF v_actor_grade IS DISTINCT FROM v_target.grade
                OR v_actor_class IS DISTINCT FROM v_target.class THEN
                RAISE EXCEPTION 'TEACHER_SCOPE_MISMATCH';
            END IF;
        END IF;
    END IF;

    IF v_target.grade IS NULL AND v_target.class IS NULL THEN
        PERFORM qs.id
        FROM public.question_sets AS qs
        WHERE qs.game_id = v_target.game_id
          AND qs.grade IS NULL
          AND qs.class IS NULL
        ORDER BY qs.id
        FOR UPDATE;

        UPDATE public.question_sets AS qs
        SET is_active = FALSE
        WHERE qs.game_id = v_target.game_id
          AND qs.grade IS NULL
          AND qs.class IS NULL
          AND qs.is_active IS TRUE
          AND qs.id <> v_target.id;

        UPDATE public.question_sets AS qs
        SET is_active = TRUE
        WHERE qs.id = v_target.id;

        RETURN QUERY SELECT v_target.id, v_target.game_id, 'GLOBAL'::TEXT;
        RETURN;
    END IF;

    IF v_target.grade IS NULL OR v_target.class IS NULL THEN
        RAISE EXCEPTION 'QUESTION_SET_SCOPE_INVALID';
    END IF;

    PERFORM qs.id
    FROM public.question_sets AS qs
    WHERE qs.game_id = v_target.game_id
      AND qs.grade = v_target.grade
      AND qs.class = v_target.class
    ORDER BY qs.id
    FOR UPDATE;

    UPDATE public.question_sets AS qs
    SET is_active = FALSE
    WHERE qs.game_id = v_target.game_id
      AND qs.grade = v_target.grade
      AND qs.class = v_target.class
      AND qs.is_active IS TRUE
      AND qs.id <> v_target.id;

    UPDATE public.question_sets AS qs
    SET is_active = TRUE
    WHERE qs.id = v_target.id;

    RETURN QUERY SELECT v_target.id, v_target.game_id, 'CLASS'::TEXT;
END;
$$;
