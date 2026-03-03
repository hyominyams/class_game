-- Harden specialized question tables with scope-aware RLS via question_sets ownership/scope.

ALTER TABLE IF EXISTS public.word_chain_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.short_answer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ox_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matching_questions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY (ARRAY[
              'word_chain_questions',
              'short_answer_questions',
              'ox_questions',
              'matching_questions'
          ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY word_chain_questions_select_by_set_scope
ON public.word_chain_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = word_chain_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY word_chain_questions_write_by_set_scope
ON public.word_chain_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = word_chain_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = word_chain_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY short_answer_questions_select_by_set_scope
ON public.short_answer_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = short_answer_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY short_answer_questions_write_by_set_scope
ON public.short_answer_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = short_answer_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = short_answer_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY ox_questions_select_by_set_scope
ON public.ox_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = ox_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY ox_questions_write_by_set_scope
ON public.ox_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = ox_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = ox_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY matching_questions_select_by_set_scope
ON public.matching_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = matching_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY matching_questions_write_by_set_scope
ON public.matching_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = matching_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = matching_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);
