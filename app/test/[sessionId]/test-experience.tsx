"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { formatCountdown } from "@/utils/format";

type TestExperienceProps = {
  expiresAt: string;
  questions: Array<{
    questionId: string;
    position: number;
    type: "multiple_choice" | "true_false";
    questionText: string;
    options: string[];
    selectedAnswer: string | null;
  }>;
  sessionId: string;
  testTitle: string;
};

export function TestExperience({
  expiresAt,
  questions,
  sessionId,
  testTitle,
}: TestExperienceProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasSubmittedRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      questions
        .filter((question) => question.selectedAnswer)
        .map((question) => [
          question.questionId,
          question.selectedAnswer as string,
        ]),
    ),
  );
  const [remainingMs, setRemainingMs] = useState(
    new Date(expiresAt).getTime() - Date.now(),
  );
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  async function persistAnswer(questionId: string, selectedAnswer: string) {
    setSaveState("saving");

    try {
      const response = await fetch(`/api/test-sessions/${sessionId}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          selectedAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist answer");
      }

      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const autoSubmit = useEffectEvent(() => {
    if (hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;
    formRef.current?.requestSubmit();
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextRemainingMs = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0) {
        window.clearInterval(timer);
        autoSubmit();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const timerTone =
    remainingMs <= 2 * 60_000
      ? "text-red-600"
      : remainingMs <= 10 * 60_000
        ? "text-[color:var(--color-orange)]"
        : "text-[color:var(--color-indigo)]";

  function handleAnswerChange(questionId: string, selectedAnswer: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: selectedAnswer,
    }));
    void persistAnswer(questionId, selectedAnswer);
  }

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-4xl p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
              In progress
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">
              {testTitle}
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              Answers save as you click them. Submission is automatic when the
              timer hits zero.
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-gray-100 px-6 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Time left
            </p>
            <p
              className={`mt-2 font-mono text-4xl font-bold tracking-tight ${timerTone}`}
            >
              {formatCountdown(remainingMs)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700">
              <span>Progress</span>
              <span>
                {answeredCount}/{questions.length} answered
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-(--color-indigo) transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {saveState === "saving"
              ? "Saving latest answer..."
              : saveState === "saved"
                ? "Latest answer saved."
                : saveState === "error"
                  ? "Live save failed. The final submission will retry while time remains."
                  : "Choose one option per question."}
          </p>
        </div>
      </section>

      <form
        ref={formRef}
        action={`/api/test-sessions/${sessionId}/submit`}
        method="POST"
        className="space-y-5"
        onSubmit={() => {
          hasSubmittedRef.current = true;
        }}
      >
        {questions.map((question) => (
          <section
            key={question.questionId}
            className="surface-card rounded-4xl p-6"
          >
            <input
              type="hidden"
              name={`answer:${question.questionId}`}
              value={answers[question.questionId] ?? ""}
              readOnly
            />

            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                    Question {question.position}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">
                    {question.questionText}
                  </h3>
                </div>

                <span className="status-pill bg-(--color-indigo-light) text-(--color-indigo)">
                  {question.type === "true_false"
                    ? "True / False"
                    : "Multiple choice"}
                </span>
              </div>

              <div className="grid gap-3">
                {question.options.map((option) => {
                  const checked = answers[question.questionId] === option;

                  return (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-4 transition ${
                        checked
                          ? "border-(--color-indigo) bg-(--color-indigo-light)"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`choice-${question.questionId}`}
                        value={option}
                        checked={checked}
                        onChange={() =>
                          handleAnswerChange(question.questionId, option)
                        }
                        className="mt-1 h-4 w-4 accent-(--color-indigo)"
                      />
                      <span className="text-sm leading-7 text-gray-900">
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        <div className="flex justify-end">
          <button type="submit" className="primary-button px-6 py-3 text-sm">
            Submit assessment
          </button>
        </div>
      </form>
    </div>
  );
}
