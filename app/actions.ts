"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminContext, requireUserContext } from "@/utils/auth/session";
import { coerceQuestionType } from "@/utils/question-library";
import { createClient } from "@/utils/supabase/server";
import { createSessionForUser } from "@/utils/test-sessions";

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdminContext>>["supabase"];

function asString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function asInt(formData: FormData, key: string, fallback = 0) {
  const raw = asString(formData, key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function asStringList(formData: FormData, key: string) {
  return Array.from(
    new Set(
      formData
        .getAll(key)
        .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
        .filter(Boolean),
    ),
  );
}

function withFlash(
  path: string,
  params: {
    error?: string;
    message?: string;
  },
) {
  const query = new URLSearchParams();

  if (params.error) {
    query.set("error", params.error);
  }

  if (params.message) {
    query.set("message", params.message);
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function getQuestionOptionInputs(formData: FormData) {
  return Array.from({ length: 4 }, (_, index) => asString(formData, `option${index}`));
}

function parseQuestionInput(formData: FormData) {
  const type = coerceQuestionType(asString(formData, "type"));
  const optionInputs = getQuestionOptionInputs(formData);
  const selectedCorrectOptionIndex = asString(formData, "correctOptionIndex");
  const parsedCorrectOptionIndex = Number.parseInt(selectedCorrectOptionIndex, 10);
  const hasValidCorrectOptionIndex =
    Number.isInteger(parsedCorrectOptionIndex) &&
    parsedCorrectOptionIndex >= 0 &&
    parsedCorrectOptionIndex < optionInputs.length;
  const correctAnswer = hasValidCorrectOptionIndex
    ? optionInputs[parsedCorrectOptionIndex] ?? ""
    : "";

  return {
    categoryId: asString(formData, "categoryId"),
    correctAnswer,
    hasValidCorrectOptionIndex,
    optionInputs,
    options: optionInputs.filter(Boolean),
    questionText: asString(formData, "questionText"),
    selectedCorrectOptionIndex,
    title: asString(formData, "title"),
    type,
  };
}

function getQuestionValidationError(input: ReturnType<typeof parseQuestionInput>) {
  if (!input.categoryId || !input.title || !input.questionText) {
    return "Select a category, enter a title, and enter the question text.";
  }

  if (input.options.length < 2) {
    return "Enter at least two options.";
  }

  if (!input.selectedCorrectOptionIndex || !input.hasValidCorrectOptionIndex) {
    return "Select one correct option.";
  }

  if (!input.correctAnswer) {
    return "The correct option must have a value.";
  }

  return null;
}

async function syncTestQuestions(
  supabase: AdminSupabaseClient,
  testId: string,
  questionIds: string[],
) {
  if (questionIds.length) {
    const { data: matchingQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("id")
      .in("id", questionIds);

    if (questionsError) {
      throw questionsError;
    }

    if ((matchingQuestions ?? []).length !== questionIds.length) {
      throw new Error("One or more selected questions no longer exist.");
    }
  }

  const { error: deleteError } = await supabase
    .from("test_questions")
    .delete()
    .eq("test_id", testId);

  if (deleteError) {
    throw deleteError;
  }

  if (!questionIds.length) {
    return;
  }

  const { error: insertError } = await supabase.from("test_questions").insert(
    questionIds.map((questionId) => ({
      question_id: questionId,
      test_id: testId,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(withFlash("/sign-in", { message: "You have been signed out." }));
}

export async function startTestSessionAction(formData: FormData) {
  const { user } = await requireUserContext("/");
  const testId = asString(formData, "testId");
  let destination = withFlash("/", { error: "Choose a test to continue." });

  if (testId) {
    try {
      const result = await createSessionForUser(user.id, testId);

      destination = result.sessionId
        ? `/test/${result.sessionId}`
        : withFlash("/", { error: result.error ?? "The test could not be started." });
    } catch (error) {
      console.error("Unable to create a test session.", {
        error,
        testId,
        userId: user.id,
      });
      destination = withFlash("/", {
        error: "The test session could not be created right now.",
      });
    }
  }

  revalidatePath("/");
  redirect(destination);
}

export async function createTestAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/tests");
  let destination = withFlash("/admin/tests", {
    error: "The test could not be created.",
  });

  try {
    const title = asString(formData, "title");
    const timeLimit = asInt(formData, "timeLimitMins", 60);
    const questionsPerAttempt = asInt(formData, "questionsPerAttempt", 30);
    const questionIds = asStringList(formData, "questionIds");

    if (!title) {
      destination = withFlash("/admin/tests", { error: "A title is required." });
    } else {
      const { data: createdTest, error } = await supabase
        .from("tests")
        .insert({
          title,
          time_limit_mins: Math.max(1, timeLimit),
          questions_per_attempt: Math.max(1, questionsPerAttempt),
          is_active: asBoolean(formData, "isActive"),
        })
        .select("id, title")
        .maybeSingle<{ id: string; title: string }>();

      if (error) {
        destination = withFlash("/admin/tests", { error: error.message });
      } else if (!createdTest) {
        destination = withFlash("/admin/tests", {
          error: "The test could not be created.",
        });
      } else {
        await syncTestQuestions(supabase, createdTest.id, questionIds);
        destination = withFlash("/admin/tests", {
          message: `Created "${createdTest.title}".`,
        });
      }
    }
  } catch {
    destination = withFlash("/admin/tests", {
      error: "The test could not be created.",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function updateTestAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/tests");
  const testId = asString(formData, "testId");
  let destination = withFlash("/admin/tests", {
    error: "The test could not be updated.",
  });

  if (testId) {
    try {
      const title = asString(formData, "title");
      const timeLimit = asInt(formData, "timeLimitMins", 60);
      const questionsPerAttempt = asInt(formData, "questionsPerAttempt", 30);
      const questionIds = asStringList(formData, "questionIds");

      const { error } = await supabase
        .from("tests")
        .update({
          title,
          time_limit_mins: Math.max(1, timeLimit),
          questions_per_attempt: Math.max(1, questionsPerAttempt),
          is_active: asBoolean(formData, "isActive"),
        })
        .eq("id", testId);

      if (error) {
        destination = withFlash("/admin/tests", { error: error.message });
      } else {
        await syncTestQuestions(supabase, testId, questionIds);
        destination = withFlash("/admin/tests", { message: `Saved "${title}".` });
      }
    } catch {
      destination = withFlash("/admin/tests", {
        error: "The test could not be updated.",
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function createQuestionCategoryAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  let destination = withFlash("/admin/questions", {
    error: "The category could not be created.",
  });

  try {
    const name = asString(formData, "name");

    if (!name) {
      destination = withFlash("/admin/questions", {
        error: "Enter a category name.",
      });
    } else {
      const { error } = await supabase.from("question_categories").insert({ name });

      destination = error
        ? withFlash("/admin/questions", { error: error.message })
        : withFlash("/admin/questions", { message: `Created "${name}".` });
    }
  } catch {
    destination = withFlash("/admin/questions", {
      error: "The category could not be created.",
    });
  }

  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/new");
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function createQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions/new");
  let destination = withFlash("/admin/questions/new", {
    error: "The question could not be created.",
  });

  try {
    const input = parseQuestionInput(formData);
    const validationError = getQuestionValidationError(input);

    if (validationError) {
      destination = withFlash("/admin/questions/new", {
        error: validationError,
      });
    } else {
      const { data: createdQuestion, error } = await supabase
        .from("questions")
        .insert({
          category_id: input.categoryId,
          type: input.type,
          question_text: input.questionText,
          title: input.title,
          options: input.options,
          correct_answer: input.correctAnswer,
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (error) {
        destination = withFlash("/admin/questions/new", { error: error.message });
      } else if (!createdQuestion) {
        destination = withFlash("/admin/questions/new", {
          error: "The question could not be created.",
        });
      } else {
        destination = withFlash(`/admin/questions/${createdQuestion.id}`, {
          message: "Question added to the library.",
        });
      }
    }
  } catch {
    destination = withFlash("/admin/questions/new", {
      error: "The question could not be created.",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/new");
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function updateQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  const questionId = asString(formData, "questionId");
  let destination = withFlash("/admin/questions", {
    error: "The question could not be updated.",
  });

  if (questionId) {
    try {
      const input = parseQuestionInput(formData);
      const validationError = getQuestionValidationError(input);

      if (validationError) {
        destination = withFlash(`/admin/questions/${questionId}`, {
          error: validationError,
        });
      } else {
        const { error } = await supabase
          .from("questions")
          .update({
            category_id: input.categoryId,
            type: input.type,
            question_text: input.questionText,
            title: input.title,
            options: input.options,
            correct_answer: input.correctAnswer,
          })
          .eq("id", questionId);

        destination = error
          ? withFlash(`/admin/questions/${questionId}`, { error: error.message })
          : withFlash(`/admin/questions/${questionId}`, { message: "Question updated." });
      }
    } catch {
      destination = withFlash(`/admin/questions/${questionId}`, {
        error: "The question could not be updated.",
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/tests");
  if (questionId) {
    revalidatePath(`/admin/questions/${questionId}`);
  }
  redirect(destination);
}

export async function deleteQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  const questionId = asString(formData, "questionId");
  let destination = withFlash(
    questionId ? `/admin/questions/${questionId}` : "/admin/questions",
    {
      error: "The question could not be removed.",
    },
  );

  if (questionId) {
    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionId);

      destination = error
        ? withFlash(`/admin/questions/${questionId}`, { error: error.message })
        : withFlash("/admin/questions", { message: "Question removed." });
    } catch {
      destination = withFlash(`/admin/questions/${questionId}`, {
        error: "The question could not be removed.",
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function grantRetakeAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/trainees");
  const sessionId = asString(formData, "sessionId");
  let destination = withFlash("/admin/trainees", {
    error: "The retake allowance could not be updated.",
  });

  if (sessionId) {
    try {
      const retakesRemaining = Math.max(0, asInt(formData, "retakesRemaining", 0));
      const { error } = await supabase
        .from("test_sessions")
        .update({
          retakes_remaining: retakesRemaining,
        })
        .eq("id", sessionId);

      destination = error
        ? withFlash("/admin/trainees", { error: error.message })
        : withFlash("/admin/trainees", {
            message: `Retakes set to ${retakesRemaining}.`,
          });
    } catch {
      destination = withFlash("/admin/trainees", {
        error: "The retake allowance could not be updated.",
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/trainees");
  redirect(destination);
}
