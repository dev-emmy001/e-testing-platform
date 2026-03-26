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
  categoryName?: string;
  categories: QuestionCategoryRecord[];
  pendingLabel: string;
  question?: QuestionRecord;
  submitLabel: string;
};

export function QuestionEditorForm({
  action,
  categoryName,
  categories,
  pendingLabel,
  question,
  submitLabel,
}: QuestionEditorFormProps) {
  const initialQuestionType = question?.type ?? "multiple_choice";
  const defaultOptions = parseOptions(question?.options).slice(0, 4);

  while (defaultOptions.length < 4) {
    defaultOptions.push("");
  }

  const defaultCorrectOptionIndex = defaultOptions.findIndex(
    (option) => option === question?.correct_answer,
  );
  const [questionType, setQuestionType] = useState(initialQuestionType);
  const [optionValues, setOptionValues] = useState(defaultOptions);
  const [selectedCorrectOptionIndex, setSelectedCorrectOptionIndex] = useState<
    string | null
  >(
    defaultCorrectOptionIndex >= 0 &&
      (initialQuestionType === "multiple_choice" ||
        defaultCorrectOptionIndex < 2)
      ? String(defaultCorrectOptionIndex)
      : null,
  );
  const visibleOptionCount = questionType === "true_false" ? 2 : 4;
  const optionInstructions =
    questionType === "true_false"
      ? "Select the correct option with the radio beside it. True / False questions use exactly two answer inputs."
      : "Select the correct option with the radio beside it. The first two options are required and the last two are optional.";

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

      <div className="lg:col-span-2">
        <label className="mb-2 block text-sm font-semibold text-gray-700">
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

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Category
        </label>
        <input
          name="categoryName"
          list="question-editor-categories"
          required
          defaultValue={categoryName ?? ""}
          placeholder="Web development"
          className="field-shell w-full px-4 py-3 outline-none"
        />
        <datalist id="question-editor-categories">
          {categories.map((category) => (
            <option key={category.id} value={category.name} />
          ))}
        </datalist>
        <p className="mt-2 text-xs leading-6 text-gray-500">
          Choose an existing category or type a new one.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Type
        </label>
        <select
          name="type"
          value={questionType}
          onChange={(event) => {
            const nextType =
              event.target.value === "true_false"
                ? "true_false"
                : "multiple_choice";

            setQuestionType(nextType);

            if (
              nextType === "true_false" &&
              selectedCorrectOptionIndex != null &&
              Number.parseInt(selectedCorrectOptionIndex, 10) >= 2
            ) {
              setSelectedCorrectOptionIndex(null);
            }
          }}
          className="field-shell w-full px-4 py-3 outline-none"
        >
          <option value="multiple_choice">Multiple choice</option>
          <option value="true_false">True / False</option>
        </select>
      </div>

      <div className="rounded-[1.25rem] lg:col-span-2 bg-gray-100 px-4 py-4 text-sm text-gray-700">
        {optionInstructions}
      </div>

      <div className="lg:col-span-2">
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Options
        </label>
        <div className="grid gap-3 lg:grid-cols-2">
          {optionValues.slice(0, visibleOptionCount).map((option, index) => {
            const optionNumber = index + 1;
            const isChecked = selectedCorrectOptionIndex === String(index);

            return (
              <div
                key={optionNumber}
                className="rounded-[1.25rem] border border-gray-300/70 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`option-${optionNumber}`}
                    className="text-sm font-semibold text-gray-700"
                  >
                    Option {optionNumber}
                    {index < 2 ? " *" : " (optional)"}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color-indigo)">
                    <input
                      type="radio"
                      name="correctOptionPicker"
                      checked={isChecked}
                      onChange={(event) =>
                        setSelectedCorrectOptionIndex(
                          event.target.checked ? String(index) : null,
                        )
                      }
                      className="h-4 w-4 accent-(--color-indigo)"
                    />
                    Correct
                  </label>
                </div>

                <input
                  id={`option-${optionNumber}`}
                  name={`option${index}`}
                  required={index < 2}
                  value={option}
                  onChange={(event) =>
                    setOptionValues((current) => {
                      const next = [...current];
                      next[index] = event.target.value;
                      return next;
                    })
                  }
                  placeholder={`Option ${optionNumber}`}
                  className="field-shell mt-3 w-full px-4 py-3 outline-none"
                />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-6 text-gray-500">
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
