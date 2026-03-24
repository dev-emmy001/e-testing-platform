import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { QuestionEditorForm } from "@/components/question-editor-form";
import { SubmitButton } from "@/components/submit-button";
import {
  deleteQuestionAction,
  updateQuestionAction,
} from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { formatDateTime, getSearchParamValue } from "@/utils/format";
import {
  getQuestionTitle,
  getQuestionTypeLabel,
  type QuestionCategoryRecord,
  type QuestionRecord,
  type TestQuestionLinkRecord,
} from "@/utils/question-library";

type AdminQuestionDetailPageProps = {
  params: Promise<{
    questionId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

type LinkedTestRecord = {
  id: string;
  is_active: boolean;
  title: string;
};

export default async function AdminQuestionDetailPage({
  params,
  searchParams,
}: AdminQuestionDetailPageProps) {
  const [{ questionId }, query] = await Promise.all([params, searchParams]);
  const error = getSearchParamValue(query.error);
  const message = getSearchParamValue(query.message);
  const { supabase } = await requireAdminContext(`/admin/questions/${questionId}`);

  const [{ data: question }, { data: categories }, { data: testQuestions }] =
    await Promise.all([
      supabase
        .from("questions")
        .select(
          "id, title, question_text, type, category_id, options, correct_answer, created_at",
        )
        .eq("id", questionId)
        .maybeSingle<QuestionRecord>(),
      supabase
        .from("question_categories")
        .select("id, name, created_at")
        .order("name", { ascending: true })
        .returns<QuestionCategoryRecord[]>(),
      supabase
        .from("test_questions")
        .select("test_id, question_id")
        .eq("question_id", questionId)
        .returns<TestQuestionLinkRecord[]>(),
    ]);

  if (!question) {
    notFound();
  }

  const categoryRows = categories ?? [];
  const linkedTestIds = Array.from(
    new Set((testQuestions ?? []).map((link) => link.test_id)),
  );
  const { data: linkedTests } = linkedTestIds.length
    ? await supabase
        .from("tests")
        .select("id, title, is_active")
        .in("id", linkedTestIds)
        .order("title", { ascending: true })
        .returns<LinkedTestRecord[]>()
    : { data: [] as LinkedTestRecord[] };
  const categoryName =
    categoryRows.find((category) => category.id === question.category_id)?.name ??
    "Uncategorized";

  return (
    <div className="space-y-4">
      <section className="surface-card rounded-[2rem] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/admin/questions"
              className="text-sm font-semibold text-[color:var(--color-indigo)]"
            >
              Back to library
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
              Question detail
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
              {getQuestionTitle(question)}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
              Update the full prompt, answer set, and category here. Tests pull
              from the shared library instead of owning their own questions.
            </p>
          </div>

          <form action={deleteQuestionAction}>
            <input type="hidden" name="questionId" value={question.id} />
            <SubmitButton
              pendingLabel="Removing..."
              className="rounded-full border border-[color:var(--color-orange)] px-5 py-3 text-sm font-semibold text-[color:var(--color-orange)]"
            >
              Delete question
            </SubmitButton>
          </form>
        </div>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
            <QuestionEditorForm
              action={updateQuestionAction}
              categories={categoryRows}
              pendingLabel="Saving..."
              question={question}
              submitLabel="Save question"
            />
          </article>

          <aside className="space-y-4">
            <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
              <h3 className="text-xl font-bold text-[color:var(--color-gray-900)]">
                Metadata
              </h3>
              <div className="mt-4 space-y-3 text-sm text-[color:var(--color-gray-700)]">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                    Category
                  </p>
                  <p className="mt-2 font-semibold text-[color:var(--color-gray-900)]">
                    {categoryName}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                    Type
                  </p>
                  <p className="mt-2 font-semibold text-[color:var(--color-gray-900)]">
                    {getQuestionTypeLabel(question.type)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                    Created
                  </p>
                  <p className="mt-2 font-semibold text-[color:var(--color-gray-900)]">
                    {formatDateTime(question.created_at)}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[color:var(--color-gray-900)]">
                    Linked tests
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
                    Manage where this question is selected from the tests
                    dashboard.
                  </p>
                </div>

                <Link
                  href="/admin/tests"
                  className="text-sm font-semibold text-[color:var(--color-indigo)]"
                >
                  Open tests
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {(linkedTests ?? []).length ? (
                  (linkedTests ?? []).map((test) => (
                    <span
                      key={test.id}
                      className={`status-pill ${
                        test.is_active
                          ? "bg-[color:var(--color-green)] text-white"
                          : "bg-white text-[color:var(--color-indigo)]"
                      }`}
                    >
                      {test.title}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[color:var(--color-gray-700)]">
                    This question is not linked to any test yet.
                  </p>
                )}
              </div>
            </article>
          </aside>
        </div>
      </section>
    </div>
  );
}
