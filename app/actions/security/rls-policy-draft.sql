-- Agent B draft: hardened RBAC/RLS policy set for ClassQuest.
-- NOTE: Per Area split rule R1, this file is a draft contract only.
-- Final migration write/apply should be done by Area D.

-- Helper predicates (inlined in policies)
-- admin: exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
-- teacher same class: exists (
--   select 1 from profiles p
--   where p.id = auth.uid() and p.role = 'teacher' and p.grade = <grade> and p.class = <class>
-- )
-- student self: <owner_id> = auth.uid()

alter table if exists profiles enable row level security;
alter table if exists question_sets enable row level security;
alter table if exists questions enable row level security;
alter table if exists game_logs enable row level security;
alter table if exists coin_transactions enable row level security;
alter table if exists student_items enable row level security;
alter table if exists tournaments enable row level security;
alter table if exists tournament_participants enable row level security;
alter table if exists tournament_logs enable row level security;

-- profiles
drop policy if exists profiles_select_self_teacher_admin on profiles;
create policy profiles_select_self_teacher_admin
on profiles
for select
using (
    id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
        select 1 from profiles p
        where p.id = auth.uid()
          and p.role = 'teacher'
          and p.grade = profiles.grade
          and p.class = profiles.class
    )
);

drop policy if exists profiles_update_self_or_admin on profiles;
create policy profiles_update_self_or_admin
on profiles
for update
using (
    id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
    id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- question_sets
drop policy if exists question_sets_select_by_scope on question_sets;
create policy question_sets_select_by_scope
on question_sets
for select
using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or (
        grade is not null and class is not null
        and exists (
            select 1 from profiles p
            where p.id = auth.uid()
              and (
                (p.role = 'teacher' and p.grade = question_sets.grade and p.class = question_sets.class)
                or (p.role = 'student' and p.grade = question_sets.grade and p.class = question_sets.class)
              )
        )
    )
    or (
        grade is null and class is null
        and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher', 'student'))
    )
);

drop policy if exists question_sets_write_teacher_admin on question_sets;
create policy question_sets_write_teacher_admin
on question_sets
for all
using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or (
        exists (
            select 1 from profiles p
            where p.id = auth.uid()
              and p.role = 'teacher'
              and p.grade = question_sets.grade
              and p.class = question_sets.class
        )
    )
)
with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or (
        exists (
            select 1 from profiles p
            where p.id = auth.uid()
              and p.role = 'teacher'
              and p.grade = question_sets.grade
              and p.class = question_sets.class
        )
    )
);

-- questions (scope inherited from parent set)
drop policy if exists questions_access_via_set_scope on questions;
create policy questions_access_via_set_scope
on questions
for all
using (
    exists (
        select 1
        from question_sets qs
        where qs.id = questions.set_id
          and (
            exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
            or (
                qs.grade is not null and qs.class is not null
                and exists (
                    select 1 from profiles p
                    where p.id = auth.uid()
                      and (
                        (p.role = 'teacher' and p.grade = qs.grade and p.class = qs.class)
                        or (p.role = 'student' and p.grade = qs.grade and p.class = qs.class)
                      )
                )
            )
          )
    )
)
with check (
    exists (
        select 1
        from question_sets qs
        where qs.id = questions.set_id
          and (
            exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
            or exists (
                select 1 from profiles p
                where p.id = auth.uid()
                  and p.role = 'teacher'
                  and p.grade = qs.grade
                  and p.class = qs.class
            )
          )
    )
);

-- game_logs
drop policy if exists game_logs_select_self_teacher_admin on game_logs;
create policy game_logs_select_self_teacher_admin
on game_logs
for select
using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
        select 1
        from profiles actor
        join profiles target on target.id = game_logs.user_id
        where actor.id = auth.uid()
          and actor.role = 'teacher'
          and actor.grade = target.grade
          and actor.class = target.class
    )
);

drop policy if exists game_logs_insert_self on game_logs;
create policy game_logs_insert_self
on game_logs
for insert
with check (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- coin_transactions
drop policy if exists coin_transactions_select_scope on coin_transactions;
create policy coin_transactions_select_scope
on coin_transactions
for select
using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
        select 1
        from profiles actor
        join profiles target on target.id = coin_transactions.user_id
        where actor.id = auth.uid()
          and actor.role = 'teacher'
          and actor.grade = target.grade
          and actor.class = target.class
    )
);

-- student_items
drop policy if exists student_items_select_scope on student_items;
create policy student_items_select_scope
on student_items
for select
using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
        select 1
        from profiles actor
        join profiles target on target.id = student_items.user_id
        where actor.id = auth.uid()
          and actor.role = 'teacher'
          and actor.grade = target.grade
          and actor.class = target.class
    )
);

drop policy if exists student_items_write_self_admin on student_items;
create policy student_items_write_self_admin
on student_items
for all
using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- tournaments (CLASS/grade scope aligned)
drop policy if exists tournaments_select_scope on tournaments;
create policy tournaments_select_scope
on tournaments
for select
using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
        select 1 from profiles p
        where p.id = auth.uid()
          and (
            (p.role = 'teacher' and p.grade = tournaments.grade and p.class = tournaments.class)
            or (p.role = 'student' and p.grade = tournaments.grade and p.class = tournaments.class)
          )
    )
);
