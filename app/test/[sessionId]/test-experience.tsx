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
  const questionSwapTimeoutRef = useRef<number | null>(null);
  const questionRevealTimeoutRef = useRef<number | null>(null);
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
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isQuestionVisible, setIsQuestionVisible] = useState(true);
  const [jumpTarget, setJumpTarget] = useState("");
  const [jumpError, setJumpError] = useState("");

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

  useEffect(() => {
    return () => {
      if (questionSwapTimeoutRef.current) {
        window.clearTimeout(questionSwapTimeoutRef.current);
      }

      if (questionRevealTimeoutRef.current) {
        window.clearTimeout(questionRevealTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setActiveQuestionIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(questions.length - 1, 0)),
    );
    setIsQuestionVisible(true);
  }, [questions.length]);

  useEffect(() => {
    const currentQuestion = questions[activeQuestionIndex];
    setJumpTarget(currentQuestion ? String(currentQuestion.position) : "");
  }, [activeQuestionIndex, questions]);

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
  const countdownLabel = formatCountdown(remainingMs);
  const highestQuestionNumber = questions.length
    ? Math.max(...questions.map((question) => question.position))
    : 0;
  const activeQuestion = questions[activeQuestionIndex];
  const isLastQuestion = activeQuestionIndex === questions.length - 1;
  const activeQuestionAnswered = activeQuestion
    ? Boolean(answers[activeQuestion.questionId])
    : false;

  function renderTimerCard() {
    return (
      <div className="rounded-[1.75rem] bg-gray-100 px-6 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Time left
        </p>
        <p className={`mt-2 font-mono font-bold tracking-tight ${timerTone}`}>
          <span className="text-4xl">{countdownLabel}</span>
        </p>
      </div>
    );
  }

  function setActiveQuestion(nextQuestionIndex: number) {
    if (
      nextQuestionIndex < 0 ||
      nextQuestionIndex >= questions.length ||
      nextQuestionIndex === activeQuestionIndex
    ) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setActiveQuestionIndex(nextQuestionIndex);
      setIsQuestionVisible(true);
      return;
    }

    if (questionSwapTimeoutRef.current) {
      window.clearTimeout(questionSwapTimeoutRef.current);
    }

    if (questionRevealTimeoutRef.current) {
      window.clearTimeout(questionRevealTimeoutRef.current);
    }

    setIsQuestionVisible(false);

    questionSwapTimeoutRef.current = window.setTimeout(() => {
      setActiveQuestionIndex(nextQuestionIndex);

      questionRevealTimeoutRef.current = window.setTimeout(() => {
        setIsQuestionVisible(true);
      }, 20);
    }, 180);
  }

  function jumpToQuestion(questionNumber: number) {
    const targetQuestionIndex = questions.findIndex(
      (question) => question.position === questionNumber,
    );

    if (targetQuestionIndex < 0) {
      setJumpError(`Enter a question number from 1 to ${highestQuestionNumber}.`);
      return;
    }

    setJumpError("");
    setJumpTarget(String(questionNumber));
    setActiveQuestion(targetQuestionIndex);
  }

  function handleAnswerChange(questionId: string, selectedAnswer: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: selectedAnswer,
    }));
    void persistAnswer(questionId, selectedAnswer);
  }

  function handleJumpAttempt() {
    const questionNumber = Number.parseInt(jumpTarget, 10);

    if (!Number.isFinite(questionNumber)) {
      setJumpError(`Enter a question number from 1 to ${highestQuestionNumber}.`);
      return;
    }

    jumpToQuestion(questionNumber);
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

          <div>{renderTimerCard()}</div>
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
          <input
            key={question.questionId}
            type="hidden"
            name={`answer:${question.questionId}`}
            value={answers[question.questionId] ?? ""}
            readOnly
          />
        ))}

        {activeQuestion ? (
          <section className="surface-card overflow-hidden rounded-4xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(196,196,216,0.5)] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                  Question {activeQuestion.position} of {questions.length}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {activeQuestionAnswered
                    ? "Answer saved for this question."
                    : "Select an answer, then continue when you are ready."}
                </p>
              </div>

              <span className="status-pill bg-(--color-indigo-light) text-(--color-indigo)">
                {activeQuestion.type === "true_false"
                  ? "True / False"
                  : "Multiple choice"}
              </span>
            </div>

            <section className="border-b border-[rgba(196,196,216,0.5)] bg-[rgba(245,246,255,0.7)] px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Question Graph
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Filled boxes are answered. The highlighted box is your current question.
                  </p>
                </div>
                <p className="text-xs font-semibold text-gray-600">
                  {answeredCount}/{questions.length} answered
                </p>
              </div>

              <div className="mt-4 flex w-full flex-wrap gap-1">
                {questions.map((question, index) => {
                  const isAnswered = Boolean(answers[question.questionId]);
                  const isCurrentQuestion = index === activeQuestionIndex;

                  return (
                    <button
                      key={question.questionId}
                      type="button"
                      onClick={() => jumpToQuestion(question.position)}
                      aria-label={`Question ${question.position}${isAnswered ? ", answered" : ", unanswered"}${isCurrentQuestion ? ", current" : ""}`}
                      title={`Question ${question.position}`}
                      className={`h-4 w-4 rounded-[0.25rem] border transition-transform duration-150 hover:scale-105 ${
                        isCurrentQuestion
                          ? isAnswered
                            ? "border-[color:var(--color-purple)] bg-[color:var(--color-purple)] shadow-[0_0_0_2px_rgba(127,86,217,0.2)]"
                            : "border-[color:var(--color-purple)] bg-[rgba(127,86,217,0.18)] shadow-[0_0_0_2px_rgba(127,86,217,0.2)]"
                          : isAnswered
                            ? "border-[color:var(--color-indigo)] bg-[color:var(--color-indigo)]"
                            : "border-[rgba(196,196,216,0.8)] bg-[rgba(225,227,240,0.7)]"
                      }`}
                    >
                      <span className="sr-only">Question {question.position}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="primary-button px-5 py-3 text-sm"
                >
                  Submit assessment
                </button>
              </div>
            </section>

            <div
              key={activeQuestion.questionId}
              className={`transition-[opacity,transform] duration-200 ${
                isQuestionVisible
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0"
              }`}
            >
              <div className="flex flex-col gap-6 p-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {activeQuestion.questionText}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {activeQuestion.options.map((option) => {
                    const checked = answers[activeQuestion.questionId] === option;

                    return (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-4 transition-all duration-200 hover:scale-[1.01] hover:border-(--color-indigo)/30 ${
                          checked
                            ? "border-(--color-indigo) bg-(--color-indigo-light)"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`choice-${activeQuestion.questionId}`}
                          value={option}
                          checked={checked}
                          onChange={() =>
                            handleAnswerChange(activeQuestion.questionId, option)
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

                <div className="flex flex-col gap-4 border-t border-[rgba(196,196,216,0.5)] pt-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full max-w-sm">
                    <label
                      htmlFor="question-jump"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500"
                    >
                      Jump to question
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        id="question-jump"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={highestQuestionNumber}
                        value={jumpTarget}
                        onChange={(event) => {
                          setJumpTarget(event.target.value);
                          if (jumpError) {
                            setJumpError("");
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleJumpAttempt();
                          }
                        }}
                        placeholder={`1-${highestQuestionNumber}`}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-(--color-indigo)"
                      />
                      <button
                        type="button"
                        onClick={handleJumpAttempt}
                        className="secondary-button shrink-0 px-4 py-3 text-sm"
                      >
                        Go
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      {jumpError ||
                        `Type a question number from 1 to ${highestQuestionNumber}.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveQuestion(activeQuestionIndex - 1)}
                      disabled={activeQuestionIndex === 0}
                      className="secondary-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveQuestion(activeQuestionIndex + 1)}
                      disabled={isLastQuestion}
                      className="primary-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </form>
    </div>
  );
}
