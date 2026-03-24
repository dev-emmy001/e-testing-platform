import Link from "next/link";
import { FlashBanner } from "@/components/flash-banner";
import { QuestionEditorForm } from "@/components/question-editor-form";
import { createQuestionAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { getSearchParamValue } from "@/utils/format";
import type { QuestionCategoryRecord } from "@/utils/question-library";

type AdminNewQuestionPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function AdminNewQuestionPage({
  searchParams,
}: AdminNewQuestionPageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const { supabase } = await requireAdminContext("/admin/questions/new");

  const { data: categories } = await supabase
    .from("question_categories")
    .select("id, name, created_at")
    .order("name", { ascending: true })
    .returns<QuestionCategoryRecord[]>();

  const categoryRows = categories ?? [];

  return (
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
            New question
          </p>
          <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
            Add a reusable library question
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
            Create the question once, assign it to a training-track category,
            and reuse it across any test you build.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <FlashBanner error={error} message={message} />
      </div>

      {categoryRows.length ? (
        <div className="mt-8">
          <QuestionEditorForm
            action={createQuestionAction}
            categories={categoryRows}
            pendingLabel="Creating..."
            submitLabel="Create question"
          />
        </div>
      ) : (
        <div className="mt-8 rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-6 text-sm text-[color:var(--color-gray-700)]">
          Create at least one category in the question library before adding a
          question.
        </div>
      )}
    </section>
  );
}
