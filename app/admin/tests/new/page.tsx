import Link from "next/link";
import { FlashToast } from "@/components/flash-toast";
import { TestEditorForm } from "@/components/test-editor-form";
import { createTestAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { buildTestLibraryQuestions } from "@/utils/admin-tests";
import { readFlash } from "@/utils/flash";
import type { QuestionCategoryRecord, QuestionRecord, TestQuestionLinkRecord } from "@/utils/question-library";

type TestLibraryQuestionRecord = Pick<
  QuestionRecord,
  "category_id" | "id" | "question_text" | "title" | "type"
>;

export default async function NewAdminTestPage() {
  const { error, message } = await readFlash();
  const { supabase } = await requireAdminContext("/admin/tests/new");

  const [{ data: categories }, { data: questions }, { data: testQuestions }] =
    await Promise.all([
      supabase
        .from("question_categories")
        .select("id, name, created_at")
        .order("name", { ascending: true })
        .returns<QuestionCategoryRecord[]>(),
      supabase
        .from("questions")
        .select("id, title, question_text, type, category_id")
        .order("created_at", { ascending: false })
        .returns<TestLibraryQuestionRecord[]>(),
      supabase
        .from("test_questions")
        .select("test_id, question_id")
        .returns<TestQuestionLinkRecord[]>(),
    ]);

  const libraryQuestions = buildTestLibraryQuestions(
    questions ?? [],
    categories ?? [],
    testQuestions ?? [],
  );

  return (
    <>
      <FlashToast error={error} message={message} />

      <section className="surface-card rounded-4xl p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--color-gray-600)]">
              <Link href="/admin/tests" className="font-semibold text-[color:var(--color-indigo)]">
                Tests
              </Link>
              <span>/</span>
              <span>New test</span>
            </div>

            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
              New test
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
              Build a test from the shared question library
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
              Configure the assessment first, then choose which reusable
              questions can be drawn during each trainee attempt.
            </p>
          </div>

          <Link
            href="/admin/questions"
            className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            Manage questions
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
              Library questions
            </p>
            <p className="mt-3 text-4xl font-bold text-[color:var(--color-indigo)]">
              {libraryQuestions.length}
            </p>
          </article>

          <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
              Categories
            </p>
            <p className="mt-3 text-4xl font-bold text-[color:var(--color-cyan)]">
              {(categories ?? []).length}
            </p>
          </article>

          <article className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
              Recommended check
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-gray-700)]">
              Keep the selected pool larger than the draw size so random
              attempts do not repeat the same questions too often.
            </p>
          </article>
        </div>
      </section>

      <section className="surface-card rounded-4xl p-8">
        <TestEditorForm
          action={createTestAction}
          activeLabel="Make active immediately"
          categories={categories ?? []}
          emptyMessage="No library questions are available yet. Add questions first, or create the test now and link questions later."
          libraryQuestions={libraryQuestions}
          pendingLabel="Creating..."
          selectorDefaultOpen
          selectorSummaryLabel="Choose reusable questions for this test"
          submitLabel="Create test"
        />
      </section>
    </>
  );
}
