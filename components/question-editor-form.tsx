"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type {
  QuestionCategoryRecord,
  QuestionRecord,
} from "@/utils/question-library";
import { parseOptions } from "@/utils/format";

type QuestionEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: QuestionCategoryRecord[];
  pendingLabel: string;
  question?: QuestionRecord;
  submitLabel: string;
};

export function QuestionEditorForm({
  action,
  categories,
  pendingLabel,
  question,
  submitLabel,
}: QuestionEditorFormProps) {
  const defaultOptions = parseOptions(question?.options).slice(0, 4);

  while (defaultOptions.length < 4) {
    defaultOptions.push("");
  }

  const defaultCorrectOptionIndex = defaultOptions.findIndex(
    (option) => option === question?.correct_answer,
  );
  const [selectedCorrectOptionIndex, setSelectedCorrectOptionIndex] = useState<
    string | null
  >(defaultCorrectOptionIndex >= 0 ? String(defaultCorrectOptionIndex) : null);

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      {question ? (
        <input type="hidden" name="questionId" value={question.id} />
      ) : null}
      {selectedCorrectOptionIndex != null ? (
        <input
          type="hidden"
          name="correctOptionIndex"
          value={selectedCorrectOptionIndex}
        />
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Title
        </label>
        <input
          name="title"
          required
          defaultValue={question?.title ?? ""}
          placeholder="Git basics: branching workflow"
          className="field-shell w-full px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Category
        </label>
        <select
          name="categoryId"
          required
          defaultValue={question?.category_id ?? ""}
          className="field-shell w-full px-4 py-3 outline-none"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Type
        </label>
        <select
          name="type"
          defaultValue={question?.type ?? "multiple_choice"}
          className="field-shell w-full px-4 py-3 outline-none"
        >
          <option value="multiple_choice">Multiple choice</option>
          <option value="true_false">True / False</option>
        </select>
      </div>

      <div className="rounded-[1.25rem] bg-[color:var(--color-gray-100)] px-4 py-4 text-sm text-[color:var(--color-gray-700)]">
        Select the correct option with the checkbox beside it. The first two
        options are required; the last two are optional so true / false
        questions can be created with just two answers.
      </div>

      <div className="lg:col-span-2">
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Question text
        </label>
        <textarea
          name="questionText"
          required
          rows={6}
          defaultValue={question?.question_text ?? ""}
          placeholder="Which Git command creates a new branch and switches to it immediately?"
          className="field-shell w-full px-4 py-3 outline-none"
        />
      </div>

      <div className="lg:col-span-2">
        <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
          Options
        </label>
        <div className="grid gap-3 lg:grid-cols-2">
          {defaultOptions.map((option, index) => {
            const optionNumber = index + 1;
            const isChecked = selectedCorrectOptionIndex === String(index);

            return (
              <div
                key={optionNumber}
                className="rounded-[1.25rem] border border-[color:var(--color-gray-300)]/70 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`option-${optionNumber}`}
                    className="text-sm font-semibold text-[color:var(--color-gray-700)]"
                  >
                    Option {optionNumber}
                    {index < 2 ? " *" : " (optional)"}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-indigo)]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) =>
                        setSelectedCorrectOptionIndex(
                          event.target.checked ? String(index) : null,
                        )
                      }
                      className="h-4 w-4 accent-[color:var(--color-indigo)]"
                    />
                    Correct
                  </label>
                </div>

                <input
                  id={`option-${optionNumber}`}
                  name={`option${index}`}
                  required={index < 2}
                  defaultValue={option}
                  placeholder={`Option ${optionNumber}`}
                  className="field-shell mt-3 w-full px-4 py-3 outline-none"
                />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-6 text-[color:var(--color-gray-500)]">
          Select exactly one correct option before saving.
        </p>
      </div>

      <div className="lg:col-span-2">
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
