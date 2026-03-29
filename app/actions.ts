"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminContext, requireUserContext } from "@/utils/auth/session";
import {
  coerceQuestionType,
  getStoredQuestionTitle,
  type QuestionCategoryRecord,
} from "@/utils/question-library";
import { createClient } from "@/utils/supabase/server";
import { createSessionForUser } from "@/utils/test-sessions";

type AdminSupabaseClient = Awaited<
  ReturnType<typeof requireAdminContext>
>["supabase"];

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

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
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

function withQuestionLibraryState(params: {
  drawer?: "new";
  error?: string;
  message?: string;
  questionId?: string;
}) {
  const destination = new URL(
    withFlash("/admin/questions", {
      error: params.error,
      message: params.message,
    }),
    "http://localhost",
  );

  if (params.drawer) {
    destination.searchParams.set("drawer", params.drawer);
  }

  if (params.questionId) {
    destination.searchParams.set("questionId", params.questionId);
  }

  return `${destination.pathname}${destination.search}`;
}

function getQuestionOptionInputs(formData: FormData) {
  return Array.from({ length: 4 }, (_, index) =>
    asString(formData, `option${index}`),
  );
}

function normalizeCategoryName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseQuestionInput(formData: FormData) {
  const type = coerceQuestionType(asString(formData, "type"));
  const optionInputs =
    type === "true_false"
      ? getQuestionOptionInputs(formData).slice(0, 2)
      : getQuestionOptionInputs(formData);
  const selectedCorrectOptionIndex = asString(formData, "correctOptionIndex");
  const parsedCorrectOptionIndex = Number.parseInt(
    selectedCorrectOptionIndex,
    10,
  );
  const hasValidCorrectOptionIndex =
    Number.isInteger(parsedCorrectOptionIndex) &&
    parsedCorrectOptionIndex >= 0 &&
    parsedCorrectOptionIndex < optionInputs.length;
  const correctAnswer = hasValidCorrectOptionIndex
    ? (optionInputs[parsedCorrectOptionIndex] ?? "")
    : "";

  return {
    categoryName: normalizeCategoryName(asString(formData, "categoryName")),
    correctAnswer,
    hasValidCorrectOptionIndex,
    optionInputs,
    options: optionInputs.filter(Boolean),
    questionText: asString(formData, "questionText"),
    selectedCorrectOptionIndex,
    type,
  };
}

function getQuestionValidationError(
  input: ReturnType<typeof parseQuestionInput>,
) {
  if (!input.categoryName || !input.questionText) {
    return "Enter a category and the question text.";
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

async function resolveQuestionCategoryId(
  supabase: AdminSupabaseClient,
  categoryName: string,
) {
  const normalizedCategoryName = normalizeCategoryName(categoryName);

  if (!normalizedCategoryName) {
    throw new Error("Enter a category.");
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("question_categories")
    .select("id, name")
    .returns<Pick<QuestionCategoryRecord, "id" | "name">[]>();

  if (categoriesError) {
    throw categoriesError;
  }

  const existingCategory = (categories ?? []).find(
    (category) =>
      normalizeCategoryName(category.name).toLowerCase() ===
      normalizedCategoryName.toLowerCase(),
  );

  if (existingCategory) {
    return existingCategory.id;
  }

  const { data: createdCategory, error: createCategoryError } = await supabase
    .from("question_categories")
    .insert({
      name: normalizedCategoryName,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (createCategoryError) {
    throw createCategoryError;
  }

  if (!createdCategory) {
    throw new Error("The category could not be created.");
  }

  return createdCategory.id;
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

function isAuthUserMissingError(error: unknown) {
  const message = getErrorMessage(error, "").toLowerCase();

  return message.includes("user not found") || message.includes("not found");
}

async function deleteAuthUserIfPresent(
  supabase: AdminSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    if (isAuthUserMissingError(error)) {
      return;
    }

    throw error;
  }

  if (!data.user) {
    return;
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    throw deleteError;
  }
}

async function deleteTraineeSessions(
  supabase: AdminSupabaseClient,
  traineeId: string,
) {
  const { data: sessions, error: sessionsError } = await supabase
    .from("test_sessions")
    .select("id")
    .eq("trainee_id", traineeId)
    .returns<Array<{ id: string }>>();

  if (sessionsError) {
    throw sessionsError;
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);

  if (!sessionIds.length) {
    return;
  }

  const { error: answersError } = await supabase
    .from("answers")
    .delete()
    .in("session_id", sessionIds);

  if (answersError) {
    throw answersError;
  }

  const { error: sessionQuestionsError } = await supabase
    .from("session_questions")
    .delete()
    .in("session_id", sessionIds);

  if (sessionQuestionsError) {
    throw sessionQuestionsError;
  }

  const { error: deleteSessionsError } = await supabase
    .from("test_sessions")
    .delete()
    .eq("trainee_id", traineeId);

  if (deleteSessionsError) {
    throw deleteSessionsError;
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(withFlash("/", { message: "You have been signed out." }));
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
        : withFlash("/", {
            error: result.error ?? "The test could not be started.",
          });
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
  const { supabase } = await requireAdminContext("/admin/tests/new");
  let destination = withFlash("/admin/tests/new", {
    error: "The test could not be created.",
  });

  try {
    const title = asString(formData, "title");
    const timeLimit = asInt(formData, "timeLimitMins", 60);
    const questionsPerAttempt = asInt(formData, "questionsPerAttempt", 30);
    const questionIds = asStringList(formData, "questionIds");

    if (!title) {
      destination = withFlash("/admin/tests/new", {
        error: "A title is required.",
      });
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
        destination = withFlash("/admin/tests/new", { error: error.message });
      } else if (!createdTest) {
        destination = withFlash("/admin/tests/new", {
          error: "The test could not be created.",
        });
      } else {
        try {
          await syncTestQuestions(supabase, createdTest.id, questionIds);
          destination = withFlash(`/admin/tests/${createdTest.id}`, {
            message: `Created "${createdTest.title}".`,
          });
        } catch (error) {
          destination = withFlash(`/admin/tests/${createdTest.id}`, {
            error: getErrorMessage(
              error,
              "The test was created, but the selected questions could not be saved.",
            ),
          });
        }
      }
    }
  } catch (error) {
    destination = withFlash("/admin/tests/new", {
      error: getErrorMessage(error, "The test could not be created."),
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tests");
  revalidatePath("/admin/results");
  redirect(destination);
}

export async function updateTestAction(formData: FormData) {
  const testId = asString(formData, "testId");
  const detailPath = testId ? `/admin/tests/${testId}` : "/admin/tests";
  const { supabase } = await requireAdminContext(detailPath);
  let destination = withFlash(detailPath, {
    error: "The test could not be updated.",
  });

  if (testId) {
    try {
      const title = asString(formData, "title");
      const timeLimit = asInt(formData, "timeLimitMins", 60);
      const questionsPerAttempt = asInt(formData, "questionsPerAttempt", 30);
      const questionIds = asStringList(formData, "questionIds");

      if (!title) {
        destination = withFlash(detailPath, { error: "A title is required." });
      } else {
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
          destination = withFlash(detailPath, { error: error.message });
        } else {
          try {
            await syncTestQuestions(supabase, testId, questionIds);
            destination = withFlash(detailPath, {
              message: `Saved "${title}".`,
            });
          } catch (error) {
            destination = withFlash(detailPath, {
              error: getErrorMessage(
                error,
                "The test settings were saved, but the selected questions could not be updated.",
              ),
            });
          }
        }
      }
    } catch (error) {
      destination = withFlash(detailPath, {
        error: getErrorMessage(error, "The test could not be updated."),
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tests");
  revalidatePath(detailPath);
  revalidatePath("/admin/results");
  redirect(destination);
}

export async function createQuestionCategoryAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  let destination = withFlash("/admin/questions", {
    error: "The category could not be created.",
  });

  try {
    const name = normalizeCategoryName(asString(formData, "name"));

    if (!name) {
      destination = withFlash("/admin/questions", {
        error: "Enter a category name.",
      });
    } else {
      const { error } = await supabase
        .from("question_categories")
        .insert({ name });

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
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function createQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  let destination = withQuestionLibraryState({
    drawer: "new",
    error: "The question could not be created.",
  });

  try {
    const input = parseQuestionInput(formData);
    const validationError = getQuestionValidationError(input);

    if (validationError) {
      destination = withQuestionLibraryState({
        drawer: "new",
        error: validationError,
      });
    } else {
      const categoryId = await resolveQuestionCategoryId(
        supabase,
        input.categoryName,
      );
      const { data: createdQuestion, error } = await supabase
        .from("questions")
        .insert({
          category_id: categoryId,
          type: input.type,
          question_text: input.questionText,
          title: getStoredQuestionTitle(input.questionText),
          options: input.options,
          correct_answer: input.correctAnswer,
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (error) {
        destination = withQuestionLibraryState({
          drawer: "new",
          error: error.message,
        });
      } else if (!createdQuestion) {
        destination = withQuestionLibraryState({
          drawer: "new",
          error: "The question could not be created.",
        });
      } else {
        destination = withQuestionLibraryState({
          message: "Question added to the library.",
          questionId: createdQuestion.id,
        });
      }
    }
  } catch {
    destination = withQuestionLibraryState({
      drawer: "new",
      error: "The question could not be created.",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
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
        destination = withQuestionLibraryState({
          error: validationError,
          questionId,
        });
      } else {
        const categoryId = await resolveQuestionCategoryId(
          supabase,
          input.categoryName,
        );
        const { error } = await supabase
          .from("questions")
          .update({
            category_id: categoryId,
            type: input.type,
            question_text: input.questionText,
            title: getStoredQuestionTitle(input.questionText),
            options: input.options,
            correct_answer: input.correctAnswer,
          })
          .eq("id", questionId);

        destination = error
          ? withQuestionLibraryState({ error: error.message, questionId })
          : withQuestionLibraryState({
              message: "Question updated.",
              questionId,
            });
      }
    } catch {
      destination = withQuestionLibraryState({
        error: "The question could not be updated.",
        questionId,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/tests");
  redirect(destination);
}

export async function deleteQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  const questionId = asString(formData, "questionId");
  let destination = withQuestionLibraryState({
    error: "The question could not be removed.",
    questionId: questionId || undefined,
  });

  if (questionId) {
    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      destination = error
        ? withQuestionLibraryState({ error: error.message, questionId })
        : withQuestionLibraryState({ message: "Question removed." });
    } catch {
      destination = withQuestionLibraryState({
        error: "The question could not be removed.",
        questionId,
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
      const retakesRemaining = Math.max(
        0,
        asInt(formData, "retakesRemaining", 0),
      );
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

export async function deleteTraineeAction(formData: FormData) {
  const { profile, supabase, user } = await requireAdminContext(
    "/admin/trainees",
  );
  const traineeId = asString(formData, "traineeId");
  let destination = withFlash("/admin/trainees", {
    error: "The trainee could not be deleted.",
  });

  if (!traineeId) {
    redirect(destination);
  }

  if (traineeId === user.id || traineeId === profile.id) {
    destination = withFlash("/admin/trainees", {
      error: "You cannot delete the account you are currently using.",
    });
    redirect(destination);
  }

  try {
    const { data: trainee, error: traineeError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", traineeId)
      .maybeSingle<{ email: string; id: string; role: string }>();

    if (traineeError) {
      throw traineeError;
    }

    if (!trainee) {
      destination = withFlash("/admin/trainees", {
        error: "That trainee no longer exists.",
      });
    } else if (trainee.role !== "trainee") {
      destination = withFlash("/admin/trainees", {
        error: "Only trainee profiles can be deleted here.",
      });
    } else {
      await deleteAuthUserIfPresent(supabase, trainee.id);
      await deleteTraineeSessions(supabase, trainee.id);

      const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", trainee.id)
        .eq("role", "trainee");

      if (deleteProfileError) {
        throw deleteProfileError;
      }

      destination = withFlash("/admin/trainees", {
        message: `Deleted trainee "${trainee.email}".`,
      });
    }
  } catch (error) {
    destination = withFlash("/admin/trainees", {
      error: getErrorMessage(error, "The trainee could not be deleted."),
    });
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/trainees");
  revalidatePath("/admin/results");
  revalidatePath("/admin/tests");
  redirect(destination);
}
