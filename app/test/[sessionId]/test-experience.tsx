"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { formatCountdown } from "@/utils/format";

type ExperienceQuestion = {
  categoryName: string;
  questionId: string;
  position: number;
  type: "multiple_choice" | "true_false";
  questionText: string;
  options: string[];
  selectedAnswer: string | null;
};

type TestExperienceProps = {
  expiresAt: string;
  optionShuffleSeed: string;
  questions: ExperienceQuestion[];
  sessionId: string;
  testTitle: string;
};

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  return function nextRandom() {
    let next = seed + 0x6d2b79f5;
    seed = next;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleQuestionOptions(
  questions: ExperienceQuestion[],
  optionShuffleSeed: string,
) {
  return Object.fromEntries(
    questions.map((question) => {
      const shuffledOptions = [...question.options];
      const random = createSeededRandom(
        hashSeed(`${optionShuffleSeed}:${question.questionId}`),
      );

      for (let index = shuffledOptions.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [shuffledOptions[index], shuffledOptions[swapIndex]] = [
          shuffledOptions[swapIndex],
          shuffledOptions[index],
        ];
      }

      return [question.questionId, shuffledOptions];
    }),
  );
}

export function TestExperience({
  expiresAt,
  optionShuffleSeed,
  questions,
  sessionId,
  testTitle,
}: TestExperienceProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasSubmittedRef = useRef(false);
  const questionSwapTimeoutRef = useRef<number | null>(null);
  const questionRevealTimeoutRef = useRef<number | null>(null);
  const questionContentRef = useRef<HTMLDivElement>(null);
  const timerCardRef = useRef<HTMLDivElement>(null);
  const [questionOptionsById] = useState<Record<string, string[]>>(() =>
    shuffleQuestionOptions(questions, optionShuffleSeed),
  );
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
  const [isFloatingQuestionNavigationVisible, setIsFloatingQuestionNavigationVisible] =
    useState(false);
  const [isFloatingTimerVisible, setIsFloatingTimerVisible] = useState(false);
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

  useEffect(() => {
    const timerCardElement = timerCardRef.current;

    if (!timerCardElement || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsFloatingTimerVisible(!entry.isIntersecting);
    });

    observer.observe(timerCardElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const questionContentElement = questionContentRef.current;

    if (!questionContentElement) {
      setIsFloatingQuestionNavigationVisible(false);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsFloatingQuestionNavigationVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFloatingQuestionNavigationVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
      },
    );

    observer.observe(questionContentElement);

    return () => observer.disconnect();
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
  const activeQuestionOptions = activeQuestion
    ? questionOptionsById[activeQuestion.questionId] ?? activeQuestion.options
    : [];
  const isLastQuestion = activeQuestionIndex === questions.length - 1;
  const activeQuestionAnswered = activeQuestion
    ? Boolean(answers[activeQuestion.questionId])
    : false;

  function renderQuestionNavigationButton({
    direction,
    floating = false,
  }: {
    direction: "next" | "previous";
    floating?: boolean;
  }) {
    const isPrevious = direction === "previous";
    const isDisabled = isPrevious ? activeQuestionIndex === 0 : isLastQuestion;

    return (
      <button
        type="button"
        onClick={() =>
          setActiveQuestion(
            activeQuestionIndex + (isPrevious ? -1 : 1),
          )
        }
        disabled={isDisabled}
        aria-label={isPrevious ? "Previous question" : "Next question"}
        className={
          floating
            ? `disabled:cursor-not-allowed disabled:opacity-50 ${
                isPrevious ? "secondary-button" : "primary-button"
              } inline-flex h-12 w-12 items-center justify-center rounded-full text-sm shadow-[0_18px_35px_rgba(42,40,101,0.16)] sm:h-14 sm:min-w-26 sm:w-auto sm:gap-2 sm:px-4`
            : `disabled:cursor-not-allowed disabled:opacity-50 ${
                isPrevious ? "secondary-button" : "primary-button"
              } px-5 py-3 text-sm`
        }
      >
        {isPrevious ? (
          <>
            <span aria-hidden="true" className="text-base leading-none">
              ←
            </span>
            <span className="hidden sm:inline">Previous</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Next</span>
            <span aria-hidden="true" className="text-base leading-none">
              →
            </span>
          </>
        )}
      </button>
    );
  }

  function renderTimerCard({ floating = false }: { floating?: boolean } = {}) {
    return (
      <div
        className={
          floating
            ? "rounded-3xl border border-[rgba(196,196,216,0.55)] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-center shadow-[0_20px_40px_rgba(42,40,101,0.16)] backdrop-blur-xl"
            : "rounded-[1.75rem] bg-gray-100 px-6 py-4 text-center"
        }
      >
        <p
          className={
            floating
              ? "text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gray-500"
              : "text-xs font-semibold uppercase tracking-[0.2em] text-gray-500"
          }
        >
          Time left
        </p>
        <p className={`mt-2 font-mono font-bold tracking-tight ${timerTone}`}>
          <span className={floating ? "text-2xl sm:text-3xl" : "text-4xl"}>
            {countdownLabel}
          </span>
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
      {isFloatingTimerVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed right-3 top-3 z-50 sm:right-4 sm:top-4 lg:right-8"
        >
          {renderTimerCard({ floating: true })}
        </div>
      ) : null}

      {activeQuestion && isFloatingQuestionNavigationVisible ? (
        <>
          <div className="fixed left-2 top-1/2 z-40 -translate-y-1/2 sm:left-3 xl:left-6">
            {renderQuestionNavigationButton({
              direction: "previous",
              floating: true,
            })}
          </div>
          <div className="fixed right-2 top-1/2 z-40 -translate-y-1/2 sm:right-3 xl:right-6">
            {renderQuestionNavigationButton({
              direction: "next",
              floating: true,
            })}
          </div>
        </>
      ) : null}

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

          <div ref={timerCardRef}>{renderTimerCard()}</div>
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
            <div className="border-b border-[rgba(196,196,216,0.5)] px-6 py-5">
              <p className="text-sm text-gray-600">
                {activeQuestionAnswered
                  ? "Answer saved for this question."
                  : "Select an answer, then continue when you are ready."}
              </p>
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
                      aria-label={`Question ${question.position}, ${question.categoryName}${isAnswered ? ", answered" : ", unanswered"}${isCurrentQuestion ? ", current" : ""}`}
                      title={`Question ${question.position} · ${question.categoryName}`}
                      className={`h-4 w-4 rounded-sm border transition-transform duration-150 hover:scale-105 ${
                        isCurrentQuestion
                          ? isAnswered
                            ? "border-(--color-purple) bg-(--color-purple) shadow-[0_0_0_2px_rgba(127,86,217,0.2)]"
                            : "border-(--color-purple) bg-[rgba(127,86,217,0.18)] shadow-[0_0_0_2px_rgba(127,86,217,0.2)]"
                          : isAnswered
                            ? "border-(--color-indigo) bg-(--color-indigo)"
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
              <div className="flex flex-col gap-6 p-6 lg:px-8 lg:py-8">
                <div ref={questionContentRef} className="flex w-full flex-col gap-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-pill bg-gray-100 text-gray-700">
                          {activeQuestion.categoryName}
                        </span>
                        <span className="status-pill bg-(--color-indigo-light) text-(--color-indigo)">
                          {activeQuestion.type === "true_false"
                            ? "True / False"
                            : "Multiple choice"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Question {activeQuestion.position} out of {questions.length}
                      </p>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-gray-900 sm:text-2xl">
                      {activeQuestion.questionText}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeQuestionOptions.map((option) => {
                      const checked =
                        answers[activeQuestion.questionId] === option;

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
                              handleAnswerChange(
                                activeQuestion.questionId,
                                option,
                              )
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

                <div className="flex flex-col items-center gap-4 border-t border-[rgba(196,196,216,0.5)] pt-4">
                  <div className="mx-auto w-full max-w-sm">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Jump to question
                    </p>
                    <label htmlFor="question-jump" className="sr-only">
                      Jump to question
                    </label>
                    <div className="mt-2 flex items-center justify-center gap-3">
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
                        className="w-24 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-center text-sm text-gray-900 outline-none transition focus:border-(--color-indigo)"
                      />
                      <button
                        type="button"
                        onClick={handleJumpAttempt}
                        className="secondary-button shrink-0 px-4 py-3 text-sm"
                      >
                        Go
                      </button>
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-600">
                      {jumpError ||
                        `Type a question number from 1 to ${highestQuestionNumber}.`}
                    </p>
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
