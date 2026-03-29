"use client";

import { useState } from "react";
import type {
  QuestionCategoryRecord,
  QuestionType,
} from "@/utils/question-library";
import { getQuestionTypeLabel } from "@/utils/question-library";

const UNCATEGORIZED_GROUP_KEY = "__uncategorized__";

export type QuestionLibrarySelectorQuestion = {
  categoryId: string | null;
  id: string;
  linkedTestCount?: number;
  title: string;
  type: QuestionType;
};

type QuestionLibrarySelectorProps = {
  categories: QuestionCategoryRecord[];
  defaultOpen?: boolean;
  emptyMessage?: string;
  inputName?: string;
  onSelectedQuestionIdsChange?: (questionIds: string[]) => void;
  questions: QuestionLibrarySelectorQuestion[];
  selectedQuestionIds?: string[];
  summaryLabel?: string;
};

type QuestionGroup = {
  categoryId: string | null;
  key: string;
  name: string;
  questions: QuestionLibrarySelectorQuestion[];
};

function buildQuestionGroups(
  categories: QuestionCategoryRecord[],
  questions: QuestionLibrarySelectorQuestion[],
) {
  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const categoryOrder = new Map(
    categories.map((category, index) => [category.id, index]),
  );
  const groupedQuestions = new Map<string | null, QuestionLibrarySelectorQuestion[]>();

  for (const question of questions) {
    const existing = groupedQuestions.get(question.categoryId) ?? [];
    existing.push(question);
    groupedQuestions.set(question.categoryId, existing);
  }

  return Array.from(groupedQuestions.entries())
    .map<QuestionGroup>(([categoryId, categoryQuestions]) => ({
      categoryId,
      key: categoryId ?? UNCATEGORIZED_GROUP_KEY,
      name: categoryNameById.get(categoryId ?? "") ?? "Uncategorized",
      questions: categoryQuestions,
    }))
    .sort((left, right) => {
      const leftOrder = left.categoryId
        ? categoryOrder.get(left.categoryId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
      const rightOrder = right.categoryId
        ? categoryOrder.get(right.categoryId) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;

      return leftOrder - rightOrder;
    });
}

function toggleSelectedQuestion(
  selectedQuestionIds: string[],
  questionId: string,
  checked: boolean,
) {
  if (checked) {
    return selectedQuestionIds.includes(questionId)
      ? selectedQuestionIds
      : [...selectedQuestionIds, questionId];
  }

  return selectedQuestionIds.filter((selectedId) => selectedId !== questionId);
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function buildRandomSelection(
  questionGroups: QuestionGroup[],
  selectionCount: number,
) {
  const drawSize = Math.min(
    selectionCount,
    questionGroups.reduce((total, group) => total + group.questions.length, 0),
  );

  if (drawSize <= 0) {
    return [] as string[];
  }

  const buckets = questionGroups
    .map((group) => ({
      key: group.key,
      questionIds: shuffle(group.questions.map((question) => question.id)),
    }))
    .filter((group) => group.questionIds.length);
  const selectedQuestionIds: string[] = [];

  while (selectedQuestionIds.length < drawSize) {
    const availableBuckets = shuffle(
      buckets.filter((bucket) => bucket.questionIds.length),
    );

    if (!availableBuckets.length) {
      break;
    }

    for (const bucket of availableBuckets) {
      const questionId = bucket.questionIds.shift();

      if (!questionId) {
        continue;
      }

      selectedQuestionIds.push(questionId);

      if (selectedQuestionIds.length === drawSize) {
        break;
      }
    }
  }

  return selectedQuestionIds;
}

export function buildRandomQuestionSelection(
  categories: QuestionCategoryRecord[],
  questions: QuestionLibrarySelectorQuestion[],
  selectionCount: number,
) {
  return buildRandomSelection(
    buildQuestionGroups(categories, questions),
    selectionCount,
  );
}

export function QuestionLibrarySelector({
  categories,
  defaultOpen = false,
  emptyMessage = "No questions are available yet.",
  inputName = "questionIds",
  onSelectedQuestionIdsChange,
  questions,
  selectedQuestionIds = [],
  summaryLabel = "Choose questions",
}: QuestionLibrarySelectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(
    null,
  );
  const questionGroups = buildQuestionGroups(categories, questions);
  const selectedIds = selectedQuestionIds;
  const selectedIdSet = new Set(selectedQuestionIds);
  const activeGroup =
    questionGroups.find((group) => group.key === activeCategoryKey) ?? null;
  const activeGroupSelectedCount = activeGroup
    ? activeGroup.questions.filter((question) => selectedIdSet.has(question.id))
        .length
    : 0;

  return (
    <div className="rounded-[1.75rem] border border-[color:var(--color-gray-300)]/70 bg-[color:var(--color-gray-100)] p-5">
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            setActiveCategoryKey(null);
          }

          setIsOpen(!isOpen);
        }}
        className="flex w-full cursor-pointer flex-col gap-2 text-left lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-gray-900)]">
            {summaryLabel}
          </p>
          <p className="text-sm text-[color:var(--color-gray-600)]">
            {selectedIds.length} selected from {questions.length} reusable
            library questions
          </p>
        </div>

        <span className="status-pill bg-white text-[color:var(--color-indigo)]">
          {isOpen ? "Hide library" : "Expand library"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-5">
          {questions.length ? (
            <section className="rounded-[1.5rem] bg-white p-4 sm:p-5">
              {activeGroup ? (
                <>
                  <div className="flex flex-col gap-4 border-b border-[color:var(--color-gray-300)]/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveCategoryKey(null)}
                        className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-gray-300)] bg-[color:var(--color-gray-100)] px-3 py-2 text-sm font-semibold text-[color:var(--color-gray-700)] transition hover:border-[color:var(--color-indigo)]/40 hover:text-[color:var(--color-indigo)]"
                      >
                        <span aria-hidden="true">←</span>
                        Back to categories
                      </button>

                      <div>
                        <h4 className="text-base font-bold text-[color:var(--color-gray-900)]">
                          {activeGroup.name}
                        </h4>
                        <p className="mt-1 text-sm text-[color:var(--color-gray-600)]">
                          {activeGroup.questions.length} question
                          {activeGroup.questions.length === 1 ? "" : "s"} in
                          this category
                        </p>
                      </div>
                    </div>

                    <span className="status-pill bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]">
                      {activeGroupSelectedCount} selected
                    </span>
                  </div>

                  <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                    {activeGroup.questions.map((question) => {
                      const checkboxId = `question-selector-${question.id}`;

                      return (
                        <label
                          key={question.id}
                          htmlFor={checkboxId}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--color-gray-300)]/70 px-4 py-3 transition hover:border-[color:var(--color-indigo)]/30 hover:bg-[color:var(--color-indigo-light)]/15"
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={selectedIdSet.has(question.id)}
                            onChange={(event) => {
                              const { checked } = event.currentTarget;

                              onSelectedQuestionIdsChange?.(
                                toggleSelectedQuestion(
                                  selectedIds,
                                  question.id,
                                  checked,
                                ),
                              );
                            }}
                            className="mt-1 h-4 w-4 accent-[color:var(--color-indigo)]"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-[color:var(--color-gray-900)]">
                              {question.title}
                            </span>
                            <span className="mt-1 block text-sm text-[color:var(--color-gray-600)]">
                              {getQuestionTypeLabel(question.type)}
                              {question.linkedTestCount != null
                                ? ` · used in ${question.linkedTestCount} test${question.linkedTestCount === 1 ? "" : "s"}`
                                : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-[color:var(--color-gray-900)]">
                      Categories
                    </h4>
                    <p className="text-sm text-[color:var(--color-gray-600)]">
                      Choose a category to reveal and select its questions.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {questionGroups.map((group) => {
                      const selectedCount = group.questions.filter((question) =>
                        selectedIdSet.has(question.id),
                      ).length;

                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setActiveCategoryKey(group.key)}
                          className="flex min-h-32 flex-col justify-between rounded-[1.25rem] border border-[color:var(--color-gray-300)]/70 bg-[color:var(--color-gray-100)] px-4 py-4 text-left transition hover:border-[color:var(--color-indigo)]/40 hover:bg-[color:var(--color-indigo-light)]/25"
                        >
                          <div>
                            <span className="block font-semibold text-[color:var(--color-gray-900)]">
                              {group.name}
                            </span>
                            <span className="mt-2 block text-sm text-[color:var(--color-gray-600)]">
                              {group.questions.length} question
                              {group.questions.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-4">
                            <span className="text-sm font-medium text-[color:var(--color-gray-600)]">
                              {selectedCount
                                ? `${selectedCount} selected`
                                : "No selections yet"}
                            </span>
                            <span className="text-sm font-semibold text-[color:var(--color-indigo)]">
                              View questions
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          ) : (
            <p className="text-sm text-[color:var(--color-gray-600)]">
              {emptyMessage}
            </p>
          )}
        </div>
      ) : null}

      {selectedIds.map((questionId) => (
        <input
          key={questionId}
          type="hidden"
          name={inputName}
          value={questionId}
        />
      ))}
    </div>
  );
}
