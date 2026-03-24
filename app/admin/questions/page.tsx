import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import {
  createQuestionCategoryAction,
} from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { formatDateTime, getSearchParamValue } from "@/utils/format";
import {
  buildQuestionUsageCountMap,
  getQuestionTitle,
  getQuestionTypeLabel,
  type QuestionCategoryRecord,
  type QuestionRecord,
  type TestQuestionLinkRecord,
} from "@/utils/question-library";

type AdminQuestionsPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

type QuestionSummaryRecord = Pick<
  QuestionRecord,
  "category_id" | "created_at" | "id" | "question_text" | "title" | "type"
>;

function getQuestionPreview(value: string) {
  const text = value.trim();

  if (text.length <= 150) {
    return text;
  }

  return `${text.slice(0, 147).trimEnd()}...`;
}

export default async function AdminQuestionsPage({
  searchParams,
}: AdminQuestionsPageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const { supabase } = await requireAdminContext("/admin/questions");

  const [{ data: categories }, { data: questions }, { data: testQuestions }] =
    await Promise.all([
      supabase
        .from("question_categories")
        .select("id, name, created_at")
        .order("name", { ascending: true })
        .returns<QuestionCategoryRecord[]>(),
      supabase
        .from("questions")
        .select("id, title, question_text, type, category_id, created_at")
        .order("created_at", { ascending: false })
        .returns<QuestionSummaryRecord[]>(),
      supabase
        .from("test_questions")
        .select("test_id, question_id")
        .returns<TestQuestionLinkRecord[]>(),
    ]);

  const categoryRows = categories ?? [];
  const questionRows = questions ?? [];
  const testQuestionRows = testQuestions ?? [];
  const categoryNameById = new Map(
    categoryRows.map((category) => [category.id, category.name]),
  );
  const questionUsageCount = buildQuestionUsageCountMap(testQuestionRows);
  const questionsPerCategory = new Map<string, number>();

  for (const question of questionRows) {
    if (!question.category_id) {
      continue;
    }

    questionsPerCategory.set(
      question.category_id,
      (questionsPerCategory.get(question.category_id) ?? 0) + 1,
    );
  }

  return (
    <>
      <section className="surface-card rounded-[2rem] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
              Question library
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
              Organize reusable questions by training track
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
              Questions now live independently from tests. Create categories for
              each training track, then manage each question from its own detail
              page.
            </p>
          </div>

          <Link
            href="/admin/questions/new"
            className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            Add question
          </Link>
        </div>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
            <h3 className="text-xl font-bold text-[color:var(--color-gray-900)]">
              Add category
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
              Use categories for tracks such as web development, design,
              digital marketing, data analysis, and any new programs you add.
            </p>

            <form action={createQuestionCategoryAction} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                  Category name
                </label>
                <input
                  name="name"
                  required
                  placeholder="Web development"
                  className="field-shell w-full px-4 py-3 outline-none"
                />
              </div>

              <SubmitButton
                pendingLabel="Creating..."
                className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Create category
              </SubmitButton>
            </form>
          </article>

          <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="status-pill bg-white text-[color:var(--color-indigo)]">
                {categoryRows.length} categories
              </span>
              <span className="status-pill bg-white text-[color:var(--color-purple)]">
                {questionRows.length} questions
              </span>
              <span className="status-pill bg-white text-[color:var(--color-cyan)]">
                {testQuestionRows.length} test selections
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {categoryRows.length ? (
                categoryRows.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-full border border-white bg-white px-4 py-3 text-sm text-[color:var(--color-gray-700)]"
                  >
                    <span className="font-semibold text-[color:var(--color-gray-900)]">
                      {category.name}
                    </span>
                    <span className="ml-2 text-[color:var(--color-gray-500)]">
                      {questionsPerCategory.get(category.id) ?? 0} question
                      {(questionsPerCategory.get(category.id) ?? 0) === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[color:var(--color-gray-700)]">
                  Create your first category to start structuring the library.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
              Library index
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
              Open any question to edit the full prompt, answers, and metadata.
            </p>
          </div>

          {!categoryRows.length ? (
            <p className="text-sm font-semibold text-[color:var(--color-orange)]">
              Create at least one category before adding questions.
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {questionRows.length ? (
            questionRows.map((question) => (
              <Link
                key={question.id}
                href={`/admin/questions/${question.id}`}
                className="block rounded-[1.75rem] border border-[color:var(--color-gray-300)] bg-white p-5 transition hover:border-[color:var(--color-indigo)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-pill bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]">
                        {categoryNameById.get(question.category_id ?? "") ??
                          "Uncategorized"}
                      </span>
                      <span className="status-pill bg-[color:var(--color-gray-100)] text-[color:var(--color-gray-700)]">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                    </div>

                    <h4 className="mt-3 text-xl font-bold text-[color:var(--color-gray-900)]">
                      {getQuestionTitle(question)}
                    </h4>
                    <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
                      {getQuestionPreview(question.question_text)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--color-gray-500)] lg:justify-end">
                    <span className="status-pill bg-[color:var(--color-cyan)]/12 text-[color:var(--color-cyan)]">
                      {questionUsageCount.get(question.id) ?? 0} linked test
                      {(questionUsageCount.get(question.id) ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span>Created {formatDateTime(question.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[color:var(--color-gray-300)] bg-white px-5 py-6 text-sm text-[color:var(--color-gray-700)]">
              No questions are in the library yet. Add your first reusable
              question once your categories are ready.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
