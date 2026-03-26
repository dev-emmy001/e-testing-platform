"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { QuestionEditorForm } from "@/components/question-editor-form";
import { QuestionLibraryDrawer } from "@/components/question-library-drawer";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/utils/format";
import {
  getQuestionTitle,
  getQuestionTypeLabel,
  type QuestionCategoryRecord,
  type QuestionLibraryEntryRecord,
} from "@/utils/question-library";

type QuestionAction = (formData: FormData) => void | Promise<void>;

type AdminQuestionsDashboardProps = {
  categories: QuestionCategoryRecord[];
  createQuestionAction: QuestionAction;
  deleteQuestionAction: QuestionAction;
  error?: string | null;
  initialDrawerMode: "closed" | "detail" | "new";
  initialSelectedQuestionId?: string | null;
  message?: string | null;
  questions: QuestionLibraryEntryRecord[];
  updateQuestionAction: QuestionAction;
};

function getQuestionPreview(value: string) {
  const text = value.trim();

  if (text.length <= 150) {
    return text;
  }

  return `${text.slice(0, 147).trimEnd()}...`;
}

function QuestionMetadataSection({
  question,
}: {
  question: QuestionLibraryEntryRecord;
}) {
  return (
    <>
      <article className="rounded-[1.75rem] bg-gray-100 p-5">
        <h3 className="text-xl font-bold text-gray-900">Metadata</h3>
        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Category
            </p>
            <p className="mt-2 font-semibold text-gray-900">
              {question.categoryName}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Type
            </p>
            <p className="mt-2 font-semibold text-gray-900">
              {getQuestionTypeLabel(question.type)}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Created
            </p>
            <p className="mt-2 font-semibold text-gray-900">
              {formatDateTime(question.created_at)}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Session history
            </p>
            <p className="mt-2 font-semibold text-gray-900">
              {question.sessionUsageCount} assigned session
              {question.sessionUsageCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs leading-6 text-gray-600">
              {question.sessionUsageCount
                ? "Session copies are preserved, so deleting this library question will not change prompts that were already assigned."
                : "No session has captured this question yet."}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[1.75rem] bg-gray-100 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Linked tests</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Manage where this question is selected from the tests dashboard.
            </p>
          </div>

          <Link
            href="/admin/tests"
            className="text-sm font-semibold text-(--color-indigo)"
          >
            Open tests
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {question.linkedTests.length ? (
            question.linkedTests.map((test) => (
              <span
                key={test.id}
                className={`status-pill ${
                  test.is_active
                    ? "bg-(--color-green) text-white"
                    : "bg-white text-(--color-indigo)"
                }`}
              >
                {test.title}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-700">
              This question is not linked to any test yet.
            </p>
          )}
        </div>
      </article>
    </>
  );
}

export function AdminQuestionsDashboard({
  categories,
  createQuestionAction,
  deleteQuestionAction,
  error,
  initialDrawerMode,
  initialSelectedQuestionId,
  message,
  questions,
  updateQuestionAction,
}: AdminQuestionsDashboardProps) {
  const router = useRouter();
  const [drawerMode, setDrawerMode] = useState(initialDrawerMode);
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    initialSelectedQuestionId ?? null,
  );
  const selectedQuestion =
    questions.find((question) => question.id === selectedQuestionId) ?? null;
  const isNewDrawerOpen = drawerMode === "new";
  const isDetailDrawerOpen =
    drawerMode === "detail" && Boolean(selectedQuestion);

  const closeDrawer = () => {
    setDrawerMode("closed");
    setSelectedQuestionId(null);
    router.replace("/admin/questions", { scroll: false });
  };

  const openNewDrawer = () => {
    setDrawerMode("new");
    setSelectedQuestionId(null);
  };

  const openQuestionDrawer = (questionId: string) => {
    setDrawerMode("detail");
    setSelectedQuestionId(questionId);
  };

  return (
    <>
      <section className="surface-card rounded-4xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Library index</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              Open any question to edit the full prompt, answers, and metadata.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewDrawer}
            className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            Add question
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {questions.length ? (
            questions.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => openQuestionDrawer(question.id)}
                className="block w-full rounded-[1.75rem] border border-gray-300 bg-white p-5 text-left transition hover:border-(--color-indigo)"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill bg-(--color-indigo-light) text-(--color-indigo)">
                        {question.categoryName}
                      </span>
                      <span className="status-pill bg-gray-100 text-gray-700">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                    </div>

                    <h4 className="mt-3 text-xl font-bold text-gray-900">
                      {getQuestionTitle(question)}
                    </h4>
                    <p className="mt-2 text-sm leading-7 text-gray-700">
                      {getQuestionPreview(question.question_text)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 lg:justify-end">
                    <span className="status-pill bg-(--color-cyan)/12 text-(--color-cyan)">
                      {question.usageCount} linked test
                      {question.usageCount === 1 ? "" : "s"}
                    </span>
                    {question.sessionUsageCount ? (
                      <span className="status-pill bg-(--color-orange)/12 text-(--color-orange)">
                        {question.sessionUsageCount} used session
                        {question.sessionUsageCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    <span>Created {formatDateTime(question.created_at)}</span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-700">
              No questions are in the library yet. Add your first reusable
              question from the drawer to get started.
            </div>
          )}
        </div>
      </section>

      {isNewDrawerOpen ? (
        <QuestionLibraryDrawer
          eyebrow="New question"
          title="Add a reusable library question"
          description="Create the question once, pick an existing category or type a new one, and reuse it across any test you build."
          onClose={closeDrawer}
        >
          <div className="space-y-4">
            <FlashBanner error={error} message={message} />

            <article className="rounded-[1.75rem] bg-gray-100 p-5">
              <QuestionEditorForm
                action={createQuestionAction}
                categories={categories}
                pendingLabel="Creating..."
                submitLabel="Create question"
              />
            </article>
          </div>
        </QuestionLibraryDrawer>
      ) : null}

      {isDetailDrawerOpen && selectedQuestion ? (
        <QuestionLibraryDrawer
          eyebrow="Question detail"
          title={getQuestionTitle(selectedQuestion)}
          description="Update the full prompt, answer set, and category here. Tests pull from the shared library instead of owning their own questions."
          onClose={closeDrawer}
          actions={
            <form action={deleteQuestionAction}>
              <input
                type="hidden"
                name="questionId"
                value={selectedQuestion.id}
              />
              <SubmitButton
                pendingLabel="Removing..."
                className="rounded-full border border-(--color-orange) px-4 py-2 text-sm font-semibold text-(--color-orange)"
              >
                Delete
              </SubmitButton>
            </form>
          }
        >
          <div className="space-y-4">
            <FlashBanner error={error} message={message} />

            <article className="rounded-[1.75rem] bg-gray-100 p-5">
              <QuestionEditorForm
                action={updateQuestionAction}
                categoryName={selectedQuestion.categoryName}
                categories={categories}
                pendingLabel="Saving..."
                question={selectedQuestion}
                submitLabel="Save question"
              />
            </article>

            <QuestionMetadataSection question={selectedQuestion} />
          </div>
        </QuestionLibraryDrawer>
      ) : null}
    </>
  );
}
