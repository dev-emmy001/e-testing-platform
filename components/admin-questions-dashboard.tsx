"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
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
  initialDrawerMode: "closed" | "detail" | "new";
  initialSelectedQuestionId?: string | null;
  questions: QuestionLibraryEntryRecord[];
  updateQuestionAction: QuestionAction;
};

const ALL_CATEGORIES_FILTER_VALUE = "__all_categories__";
const UNCATEGORIZED_FILTER_VALUE = "__uncategorized__";

type QuestionSortMode = "category" | "newest" | "oldest" | "title";

function getQuestionTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function compareQuestionTitles(
  left: QuestionLibraryEntryRecord,
  right: QuestionLibraryEntryRecord,
) {
  return getQuestionTitle(left).localeCompare(getQuestionTitle(right));
}

function compareQuestionCategories(
  left: QuestionLibraryEntryRecord,
  right: QuestionLibraryEntryRecord,
) {
  if (left.category_id && !right.category_id) {
    return -1;
  }

  if (!left.category_id && right.category_id) {
    return 1;
  }

  const categoryComparison = left.categoryName.localeCompare(right.categoryName);

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  return compareQuestionTitles(left, right);
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
  initialDrawerMode,
  initialSelectedQuestionId,
  questions,
  updateQuestionAction,
}: AdminQuestionsDashboardProps) {
  const router = useRouter();
  const [drawerMode, setDrawerMode] = useState(initialDrawerMode);
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    initialSelectedQuestionId ?? null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    ALL_CATEGORIES_FILTER_VALUE,
  );
  const [sortMode, setSortMode] = useState<QuestionSortMode>("newest");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const selectedQuestion =
    questions.find((question) => question.id === selectedQuestionId) ?? null;
  const isNewDrawerOpen = drawerMode === "new";
  const isDetailDrawerOpen =
    drawerMode === "detail" && Boolean(selectedQuestion);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const hasUncategorizedQuestions = questions.some(
    (question) => question.category_id == null,
  );
  const hasActiveFilters =
    selectedCategoryId !== ALL_CATEGORIES_FILTER_VALUE ||
    Boolean(searchQuery.trim()) ||
    sortMode !== "newest";
  const visibleQuestions = questions
    .filter((question) => {
      const matchesCategory =
        selectedCategoryId === ALL_CATEGORIES_FILTER_VALUE
          ? true
          : selectedCategoryId === UNCATEGORIZED_FILTER_VALUE
            ? question.category_id == null
            : question.category_id === selectedCategoryId;
      const matchesSearch = normalizedSearchQuery
        ? question.searchableText.includes(normalizedSearchQuery)
        : true;

      return matchesCategory && matchesSearch;
    })
    .sort((left, right) => {
      switch (sortMode) {
        case "category":
          return compareQuestionCategories(left, right);
        case "oldest":
          return (
            getQuestionTimestamp(left.created_at) -
            getQuestionTimestamp(right.created_at)
          );
        case "title":
          return compareQuestionTitles(left, right);
        case "newest":
        default:
          return (
            getQuestionTimestamp(right.created_at) -
            getQuestionTimestamp(left.created_at)
          );
      }
    });

  const resetControls = () => {
    setSearchQuery("");
    setSelectedCategoryId(ALL_CATEGORIES_FILTER_VALUE);
    setSortMode("newest");
  };

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

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Search
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, prompt, option, or answer"
              className="field-shell w-full px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="field-shell w-full px-4 py-3 outline-none"
            >
              <option value={ALL_CATEGORIES_FILTER_VALUE}>All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {hasUncategorizedQuestions ? (
                <option value={UNCATEGORIZED_FILTER_VALUE}>
                  Uncategorized
                </option>
              ) : null}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Sort
            </label>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as QuestionSortMode)
              }
              className="field-shell w-full px-4 py-3 outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A-Z</option>
              <option value="category">Category A-Z</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[1.5rem] bg-gray-100 px-4 py-3 text-sm text-gray-700 lg:flex-row lg:items-center lg:justify-between">
          <p>
            Showing {visibleQuestions.length} of {questions.length} question
            {questions.length === 1 ? "" : "s"}.
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetControls}
              className="secondary-button px-4 py-2 text-sm"
            >
              Reset view
            </button>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {questions.length ? (
            visibleQuestions.length ? (
              visibleQuestions.map((question) => (
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
                    </div>

                    <span className="text-sm font-semibold text-(--color-indigo)">
                      Open details
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-700">
                <p>
                  No questions match the current search or category filters.
                </p>
                <button
                  type="button"
                  onClick={resetControls}
                  className="secondary-button mt-4 px-4 py-2 text-sm"
                >
                  Reset view
                </button>
              </div>
            )
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
          title="Add a question"
          description="Tip: Create the question once, pick an existing category or type a new one, and reuse it across any test you build."
          onClose={closeDrawer}
        >
          <div className="space-y-4">
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
