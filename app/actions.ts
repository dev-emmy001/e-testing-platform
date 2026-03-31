"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOnboardingPath,
  getPostAuthRedirectPath,
} from "@/utils/auth/redirect";
import { requireAdminContext, requireUserContext } from "@/utils/auth/session";
import { clearFlash, setFlash, type FlashState } from "@/utils/flash";
import { normalizeProfileText } from "@/utils/profile";
import {
  coerceQuestionType,
  getStoredQuestionTitle,
  type QuestionCategoryRecord,
} from "@/utils/question-library";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { createSessionForUser, incrementFocusLossCount } from "@/utils/test-sessions";

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

function getProfileInput(formData: FormData) {
  return {
    name: normalizeProfileText(asString(formData, "name")),
    track: normalizeProfileText(asString(formData, "track")),
    successStory: normalizeProfileText(asString(formData, "successStory")),
    location: normalizeProfileText(asString(formData, "location")),
  };
}

function getProfileValidationError(
  input: ReturnType<typeof getProfileInput>,
  mode: "complete" | "update",
) {
  const continuation = mode === "complete" ? "before you continue" : "before you save";

  if (!input.name && !input.track && !input.successStory && !input.location) {
    return `Enter your name, track, success story, and location ${continuation}.`;
  }

  if (!input.name) {
    return `Enter your name ${continuation}.`;
  }

  if (!input.track) {
    return `Enter your track ${continuation}.`;
  }

  if (!input.location) {
    return `Enter your location ${continuation}.`;
  }

  if (!input.successStory) {
    return `Enter your success story ${continuation}.`;
  }

  return null;
}

async function saveProfileForCurrentUser(params: {
  name: string;
  profile: Awaited<ReturnType<typeof requireUserContext>>["profile"];
  track: string;
  successStory: string;
  location: string;
  user: Awaited<ReturnType<typeof requireUserContext>>["user"];
}) {
  const email = params.user.email?.trim() || params.profile?.email?.trim();

  if (!email) {
    throw new Error("Your account email is unavailable. Sign out and try again.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      email,
      id: params.user.id,
      name: params.name,
      role: params.profile?.role ?? "trainee",
      track: params.track,
      success_story: params.successStory,
      location: params.location,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

function revalidateProfilePaths() {
  revalidatePath("/");
  revalidatePath("/onboarding");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath("/admin/tests");
  revalidatePath("/admin/trainees");
}

function withFlash(
  path: string,
  params: FlashState,
) {
  return {
    flash: normalizeFlashState(params),
    path,
  };
}

function normalizeFlashState(params: FlashState) {
  const error = params.error?.trim();
  const message = params.message?.trim();

  if (!error && !message) {
    return undefined;
  }

  return { error, message };
}

function withQuestionLibraryState(params: {
  drawer?: "new";
  error?: string;
  message?: string;
  questionId?: string;
}) {
  const destination = new URL("/admin/questions", "http://localhost");

  if (params.drawer) {
    destination.searchParams.set("drawer", params.drawer);
  }

  if (params.questionId) {
    destination.searchParams.set("questionId", params.questionId);
  }

  return {
    flash: normalizeFlashState({
      error: params.error,
      message: params.message,
    }),
    path: `${destination.pathname}${destination.search}`,
  };
}

type RedirectDestination =
  | string
  | {
      flash?: FlashState;
      path: string;
    };

async function redirectWithDestination(destination: RedirectDestination) {
  await clearFlash();

  if (typeof destination !== "string" && destination.flash) {
    await setFlash(destination.flash);
  }

  redirect(typeof destination === "string" ? destination : destination.path);
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
  await redirectWithDestination(
    withFlash("/", { message: "You have been signed out." }),
  );
}

export async function completeOnboardingAction(formData: FormData) {
  const { profile, user } = await requireUserContext("/onboarding", {
    allowIncompleteProfile: true,
  });
  const input = getProfileInput(formData);
  const nextPath = asString(formData, "nextPath");
  const returnPath = getOnboardingPath(nextPath);
  let destination: RedirectDestination = withFlash(returnPath, {
    error: "Your profile could not be saved.",
  });
  const validationError = getProfileValidationError(input, "complete");

  if (validationError) {
    destination = withFlash(returnPath, {
      error: validationError,
    });
  } else {
    try {
      await saveProfileForCurrentUser({
        name: input.name,
        profile,
        track: input.track,
        location: input.location,
        successStory: input.successStory,
        user,
      });
      destination = withFlash(getPostAuthRedirectPath(nextPath, profile?.role), {
        message: `Welcome, ${input.name}.`,
      });
    } catch (error) {
      destination = withFlash(returnPath, {
        error: getErrorMessage(error, "Your profile could not be saved."),
      });
    }
  }

  revalidateProfilePaths();
  await redirectWithDestination(destination);
}

export async function updateProfileAction(formData: FormData) {
  const { profile, user } = await requireUserContext("/profile", {
    allowIncompleteProfile: true,
  });
  const input = getProfileInput(formData);
  let destination: RedirectDestination = withFlash("/profile", {
    error: "Your profile could not be updated.",
  });
  const validationError = getProfileValidationError(input, "update");

  if (validationError) {
    destination = withFlash("/profile", {
      error: validationError,
    });
  } else {
    try {
      await saveProfileForCurrentUser({
        name: input.name,
        profile,
        track: input.track,
        location: input.location,
        successStory: input.successStory,
        user,
      });
      destination = withFlash("/profile", {
        message: "Your profile has been updated.",
      });
    } catch (error) {
      destination = withFlash("/profile", {
        error: getErrorMessage(error, "Your profile could not be updated."),
      });
    }
  }

  revalidateProfilePaths();
  await redirectWithDestination(destination);
}

export async function startTestSessionAction(formData: FormData) {
  const { user } = await requireUserContext("/");
  const testId = asString(formData, "testId");
  let destination: RedirectDestination = withFlash("/", {
    error: "Choose a test to continue.",
  });

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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
  await redirectWithDestination(destination);
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
    await redirectWithDestination(destination);
  }

  if (traineeId === user.id || traineeId === profile.id) {
    destination = withFlash("/admin/trainees", {
      error: "You cannot delete the account you are currently using.",
    });
    await redirectWithDestination(destination);
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
      await deleteTraineeSessions(supabase, trainee.id);
      await deleteAuthUserIfPresent(supabase, trainee.id);

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
  await redirectWithDestination(destination);
}

export async function reportFocusLossAction(sessionId: string) {
  const { user } = await requireUserContext("/");
  try {
    const result = await incrementFocusLossCount(sessionId);
    return result;
  } catch (error) {
    console.error("Failed to report focus loss:", error);
    return { error: "Failed to record focus loss.", count: 0 };
  }
}

export async function incrementRetakeAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/results");
  const sessionId = asString(formData, "sessionId");

  let destination = withFlash("/admin/results", {
    error: "The retake allowance could not be updated.",
  });

  if (sessionId) {
    try {
      const { data: session, error: fetchError } = await supabase
        .from("test_sessions")
        .select("retakes_remaining")
        .eq("id", sessionId)
        .single();

      if (fetchError || !session) {
        destination = withFlash("/admin/results", { error: "Failed to locate session." });
      } else {
        const newRetakes = session.retakes_remaining + 1;
        const { error: updateError } = await supabase
          .from("test_sessions")
          .update({ retakes_remaining: newRetakes })
          .eq("id", sessionId);

        if (updateError) {
          destination = withFlash("/admin/results", { error: "Failed to grant retake." });
        } else {
          destination = withFlash("/admin/results", { message: "Granted 1 extra retake." });
        }
      }
    } catch {
      destination = withFlash("/admin/results", {
        error: "The retake allowance could not be updated.",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/results");
  revalidatePath("/admin");
  await redirectWithDestination(destination);
}
