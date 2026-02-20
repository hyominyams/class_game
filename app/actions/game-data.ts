"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createQuestionSet(
    gameId: string,
    title: string,
    grade: number,
    classNum: number,
    questionsData: any[]
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not logged in" };
    }

    // 1. Create Question Set
    const { data: set, error: setError } = await supabase
        .from("question_sets")
        .insert({
            game_id: gameId,
            title: title,
            grade: grade,
            class: classNum,
            created_by: user.id,
            is_active: false, // Initially inactive
        })
        .select()
        .single();

    if (setError) {
        console.error("Error creating set:", setError);
        return { error: setError.message };
    }

    // 2. Create Questions
    const questionsToInsert = questionsData.map((q) => ({
        set_id: set.id,
        question_text: q.question_text,
        options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []),
        correct_answer: q.correct_answer, // Index for MC
        answer_text: q.answer_text, // String for Short Answer
        type: q.type || "multiple-choice",
    }));

    const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

    if (questionsError) {
        console.error("Error creating questions:", questionsError);
        return { error: questionsError.message };
    }

    revalidatePath("/teacher/questions");
    revalidatePath("/student/game");

    return { success: true, setId: set.id };
}

export async function updateQuestionSet(
    setId: string,
    title: string,
    grade: number,
    classNum: number,
    questionsData: any[]
) {
    const supabase = await createClient();
    const adminClient = createAdminClient(); // Use admin client for reliable updates
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not logged in" };
    }

    // 1. Verify Ownership & Existence (Use regular client)
    const { data: currentSet, error: fetchError } = await supabase
        .from("question_sets")
        .select("created_by, is_active")
        .eq("id", setId)
        .single();

    if (fetchError || !currentSet) {
        return { error: "Question set not found" };
    }

    if (currentSet.created_by !== user.id) {
        return { error: "Unauthorized: You can only edit your own question sets" };
    }

    const wasActive = currentSet.is_active;

    // 2. Temporarily deactivate to allow updates (Use Admin Client)
    if (wasActive) {
        const { error: deactivateError } = await adminClient
            .from("question_sets")
            .update({ is_active: false })
            .eq("id", setId);

        if (deactivateError) {
            console.error("Failed to deactivate set for update:", deactivateError);
            return { error: "Failed to deactivate set for update" };
        }
    }

    try {
        // 3. Update Question Set Details (Use Admin Client)
        const { error: setError } = await adminClient
            .from("question_sets")
            .update({
                title: title,
                grade: grade,
                class: classNum,
            })
            .eq("id", setId);

        if (setError) throw setError;

        // 4. Update Questions (Delete then Insert)
        // Delete all existing questions for this set (Use Admin Client)
        const { error: deleteError } = await adminClient
            .from("questions")
            .delete()
            .eq("set_id", setId);

        if (deleteError) throw deleteError;

        // Prepare new questions
        const questionsToInsert = questionsData.map((q) => ({
            set_id: setId,
            question_text: q.question_text,
            options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []),
            correct_answer: q.correct_answer,
            answer_text: q.answer_text,
            type: q.type || "multiple-choice",
        }));

        if (questionsToInsert.length > 0) {
            const { error: questionsError } = await adminClient
                .from("questions")
                .insert(questionsToInsert);

            if (questionsError) throw questionsError;
        }

        // 5. Restore Active status if checking 'wasActive' (Use Admin Client)
        if (wasActive) {
            const { error: activateError } = await adminClient
                .from("question_sets")
                .update({ is_active: true })
                .eq("id", setId);

            if (activateError) {
                // Non-fatal, but warn user
                console.warn("Failed to reactivate set:", activateError);
                return { success: true, message: "Updated, but failed to reactivate automatically." };
            }
        }

        revalidatePath("/teacher/questions");
        revalidatePath("/student/game");

        return { success: true };

    } catch (error: any) {
        console.error("Error updating question set:", error);
        // Attempt rollback of active status if possible?
        // For now, return error.
        return { error: error.message || "Failed to update question set" };
    }
}

export async function deleteQuestionSet(setId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not logged in" };

    try {
        // 1. Verify Ownership (Use regular client)
        const { data: set, error: fetchError } = await supabase
            .from("question_sets")
            .select("created_by")
            .eq("id", setId)
            .single();

        if (fetchError || !set) return { error: "Question set not found" };

        if (set.created_by !== user.id) {
            return { error: "Unauthorized: You can only delete your own question sets" };
        }

        // 2. Delete questions first (Use Admin Client)
        const { error: qError } = await adminClient
            .from("questions")
            .delete()
            .eq("set_id", setId);

        if (qError) throw qError;

        // 3. Delete the set (Use Admin Client)
        const { error: sError } = await adminClient
            .from("question_sets")
            .delete()
            .eq("id", setId);

        if (sError) throw sError;

        revalidatePath("/teacher/questions");
        revalidatePath("/student/game");

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting question set:", error);
        return { error: error.message || "Failed to delete question set" };
    }
}

export async function getQuestionSets(gameId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = adminClient
        .from("question_sets")
        .select("*, profiles!question_sets_created_by_fkey(nickname)")
        .eq("game_id", gameId)
        .eq("is_active", true);

    if (user) {
        // Use admin client to fetch profile to ensure we get it
        const { data: profile } = await adminClient
            .from('profiles')
            .select('grade, class, role')
            .eq('id', user.id)
            .single();

        if (profile && profile.role !== 'admin') {
            // Filter by grade/class or global (where grade is null)
            // Using query.or for the filter
            query = query.or(`grade.is.null,and(grade.eq.${profile.grade},class.eq.${profile.class})`);
        }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching sets:", error);
        return [];
    }
    return data;
}

export async function getQuestions(setId: string) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from("questions")
        .select("*")
        .eq("set_id", setId);

    if (error) {
        console.error("Error fetching questions:", error);
        return [];
    }
    return data;
}

