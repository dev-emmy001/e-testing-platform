"use client";

import { useState } from "react";
import {
  QuestionLibrarySelector,
  buildRandomQuestionSelection,
} from "@/components/question-library-selector";
import { SubmitButton } from "@/components/submit-button";
import type { QuestionCategoryRecord } from "@/utils/question-library";
import type { TestLibraryQuestion } from "@/utils/admin-tests";

type TestAction = (formData: FormData) => void | Promise<void>;

type TestEditorFormProps = {
  action: TestAction;
  activeLabel?: string;
  categories: QuestionCategoryRecord[];
  defaultIsActive?: boolean;
  defaultQuestionsPerAttempt?: number;
  defaultTitle?: string;
  defaultTimeLimitMins?: number;
  emptyMessage?: string;
  libraryQuestions: TestLibraryQuestion[];
  pendingLabel: string;
  selectedQuestionIds?: string[];
  selectorDefaultOpen?: boolean;
  selectorSummaryLabel?: string;
  submitLabel: string;
  testId?: string;
};

export function TestEditorForm({
  action,
  activeLabel = "Active",
  categories,
  defaultIsActive = false,
  defaultQuestionsPerAttempt = 30,
  defaultTitle = "",
  defaultTimeLimitMins = 60,
  emptyMessage = "No library questions are available yet.",
  libraryQuestions,
  pendingLabel,
  selectedQuestionIds = [],
  selectorDefaultOpen = false,
  selectorSummaryLabel = "Select questions for this test",
  submitLabel,
  testId,
}: TestEditorFormProps) {
  const [questionsPerAttemptInput, setQuestionsPerAttemptInput] = useState(
    String(defaultQuestionsPerAttempt),
  );
  const [selectedIds, setSelectedIds] = useState(selectedQuestionIds);
  const parsedQuestionsPerAttempt = Number.parseInt(questionsPerAttemptInput, 10);
  const autoSelectCount = Number.isFinite(parsedQuestionsPerAttempt)
    ? Math.max(0, parsedQuestionsPerAttempt)
    : 0;

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-4">
      {testId ? <input type="hidden" name="testId" value={testId} /> : null}

      <div className="lg:col-span-2">
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Title
        </label>
        <input
          name="title"
          required
          defaultValue={defaultTitle}
          placeholder="Digital Skills Cohort A"
          className="field-shell w-full px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Time limit (mins)
        </label>
        <input
          name="timeLimitMins"
          type="number"
          min="1"
          defaultValue={defaultTimeLimitMins}
          className="field-shell w-full px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Questions / attempt
        </label>
        <input
          name="questionsPerAttempt"
          type="number"
          min="1"
          value={questionsPerAttemptInput}
          onChange={(event) => setQuestionsPerAttemptInput(event.currentTarget.value)}
          className="field-shell w-full px-4 py-3 outline-none"
        />
        <button
          type="button"
          onClick={() =>
            setSelectedIds(
              buildRandomQuestionSelection(
                categories,
                libraryQuestions,
                autoSelectCount,
              ),
            )
          }
          disabled={autoSelectCount < 1 || !libraryQuestions.length}
          className="secondary-button mt-3 inline-flex items-center justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Auto-select random questions
        </button>
        <p className="mt-2 text-xs leading-5 text-[color:var(--color-gray-500)]">
          Uses the number above and spreads the random selection across the
          linked categories where possible.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold text-[color:var(--color-gray-700)]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultIsActive}
          className="h-4 w-4 accent-[color:var(--color-indigo)]"
        />
        {activeLabel}
      </label>

      <div className="lg:col-span-4">
        <QuestionLibrarySelector
          categories={categories}
          defaultOpen={selectorDefaultOpen}
          emptyMessage={emptyMessage}
          onSelectedQuestionIdsChange={setSelectedIds}
          questions={libraryQuestions}
          selectedQuestionIds={selectedIds}
          summaryLabel={selectorSummaryLabel}
        />
      </div>

      <div className="lg:col-span-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-[color:var(--color-gray-600)]">
          Tests draw randomly from the selected pool when a trainee starts an
          attempt. Use auto-select to quickly build a balanced random pool from
          the library.
        </p>

        <SubmitButton
          pendingLabel={pendingLabel}
          className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
