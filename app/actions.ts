"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminContext, requireUserContext } from "@/utils/auth/session";
import { createClient } from "@/utils/supabase/server";
import { createSessionForUser } from "@/utils/test-sessions";

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

function parseQuestionOptions(type: string, rawOptions: string) {
  if (type === "true_false") {
    return ["True", "False"];
  }

  return rawOptions
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
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

    if (!title) {
      destination = withFlash("/admin/tests", { error: "A title is required." });
    } else {
      const { error } = await supabase.from("tests").insert({
        title,
        time_limit_mins: Math.max(1, timeLimit),
        questions_per_attempt: Math.max(1, questionsPerAttempt),
        is_active: asBoolean(formData, "isActive"),
      });

      destination = error
        ? withFlash("/admin/tests", { error: error.message })
        : withFlash("/admin/tests", { message: `Created "${title}".` });
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

      const { error } = await supabase
        .from("tests")
        .update({
          title,
          time_limit_mins: Math.max(1, timeLimit),
          questions_per_attempt: Math.max(1, questionsPerAttempt),
          is_active: asBoolean(formData, "isActive"),
        })
        .eq("id", testId);

      destination = error
        ? withFlash("/admin/tests", { error: error.message })
        : withFlash("/admin/tests", { message: `Saved "${title}".` });
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

export async function createQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  let destination = withFlash("/admin/questions", {
    error: "The question could not be created.",
  });

  try {
    const testId = asString(formData, "testId");
    const type = asString(formData, "type") || "multiple_choice";
    const questionText = asString(formData, "questionText");
    const correctAnswer = asString(formData, "correctAnswer");
    const options = parseQuestionOptions(type, asString(formData, "optionsText"));

    if (!testId || !questionText) {
      destination = withFlash("/admin/questions", {
        error: "Pick a test and enter the question text.",
      });
    } else if (options.length < 2) {
      destination = withFlash("/admin/questions", {
        error: "Each question needs at least two options.",
      });
    } else if (!options.includes(correctAnswer)) {
      destination = withFlash("/admin/questions", {
        error: "The correct answer must match one of the options exactly.",
      });
    } else {
      const { error } = await supabase.from("questions").insert({
        test_id: testId,
        type,
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
      });

      destination = error
        ? withFlash("/admin/questions", { error: error.message })
        : withFlash("/admin/questions", { message: "Question added to the bank." });
    }
  } catch {
    destination = withFlash("/admin/questions", {
      error: "The question could not be created.",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
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
      const testId = asString(formData, "testId");
      const type = asString(formData, "type") || "multiple_choice";
      const questionText = asString(formData, "questionText");
      const correctAnswer = asString(formData, "correctAnswer");
      const options = parseQuestionOptions(type, asString(formData, "optionsText"));

      if (!testId || !questionText) {
        destination = withFlash("/admin/questions", {
          error: "Pick a test and enter the question text.",
        });
      } else if (options.length < 2) {
        destination = withFlash("/admin/questions", {
          error: "Each question needs at least two options.",
        });
      } else if (!options.includes(correctAnswer)) {
        destination = withFlash("/admin/questions", {
          error: "The correct answer must match one of the options exactly.",
        });
      } else {
        const { error } = await supabase
          .from("questions")
          .update({
            test_id: testId,
            type,
            question_text: questionText,
            options,
            correct_answer: correctAnswer,
          })
          .eq("id", questionId);

        destination = error
          ? withFlash("/admin/questions", { error: error.message })
          : withFlash("/admin/questions", { message: "Question updated." });
      }
    } catch {
      destination = withFlash("/admin/questions", {
        error: "The question could not be updated.",
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/questions");
  redirect(destination);
}

export async function deleteQuestionAction(formData: FormData) {
  const { supabase } = await requireAdminContext("/admin/questions");
  const questionId = asString(formData, "questionId");
  let destination = withFlash("/admin/questions", {
    error: "The question could not be removed.",
  });

  if (questionId) {
    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionId);

      destination = error
        ? withFlash("/admin/questions", { error: error.message })
        : withFlash("/admin/questions", { message: "Question removed." });
    } catch {
      destination = withFlash("/admin/questions", {
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
