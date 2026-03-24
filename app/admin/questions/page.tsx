import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import {
  createQuestionAction,
  deleteQuestionAction,
  updateQuestionAction,
} from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { getSearchParamValue, parseOptions } from "@/utils/format";

type AdminQuestionsPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

type QuestionRecord = {
  created_at: string;
  correct_answer: string;
  id: string;
  options: unknown;
  question_text: string;
  test_id: string;
  type: "multiple_choice" | "true_false";
};

type TestOption = {
  id: string;
  title: string;
};

export default async function AdminQuestionsPage({
  searchParams,
}: AdminQuestionsPageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const { supabase } = await requireAdminContext("/admin/questions");

  const [{ data: tests }, { data: questions }] = await Promise.all([
    supabase
      .from("tests")
      .select("id, title")
      .order("title", { ascending: true })
      .returns<TestOption[]>(),
    supabase
      .from("questions")
      .select("id, test_id, type, question_text, options, correct_answer, created_at")
      .order("created_at", { ascending: false })
      .returns<QuestionRecord[]>(),
  ]);

  const testMap = new Map((tests ?? []).map((test) => [test.id, test.title]));

  return (
    <>
      <section className="surface-card rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
          Question bank
        </p>
        <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
          Build and maintain your question library
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
          Support multiple-choice and true/false questions only. For multiple choice,
          enter one option per line and make the correct answer match exactly.
        </p>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>

        <form action={createQuestionAction} className="mt-8 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
              Test
            </label>
            <select name="testId" required className="field-shell w-full px-4 py-3 outline-none">
              <option value="">Select a test</option>
              {(tests ?? []).map((test) => (
                <option key={test.id} value={test.id}>
                  {test.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
              Type
            </label>
            <select name="type" defaultValue="multiple_choice" className="field-shell w-full px-4 py-3 outline-none">
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True / False</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
              Question text
            </label>
            <textarea
              name="questionText"
              required
              rows={4}
              placeholder="What is the primary benefit of version control?"
              className="field-shell w-full px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
              Options
            </label>
            <textarea
              name="optionsText"
              rows={6}
              placeholder={"Option A\nOption B\nOption C\nOption D"}
              className="field-shell w-full px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
              Correct answer
            </label>
            <input
              name="correctAnswer"
              required
              placeholder="Option B"
              className="field-shell w-full px-4 py-3 outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <SubmitButton
              pendingLabel="Adding..."
              className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Add question
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {(questions ?? []).map((question) => (
          <article key={question.id} className="surface-card rounded-[2rem] p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
                  {testMap.get(question.test_id) ?? "Unknown test"}
                </p>
                <h3 className="mt-2 text-xl font-bold text-[color:var(--color-gray-900)]">
                  {question.question_text}
                </h3>
              </div>

              <form action={deleteQuestionAction}>
                <input type="hidden" name="questionId" value={question.id} />
                <SubmitButton
                  pendingLabel="Removing..."
                  className="rounded-full border border-[color:var(--color-orange)] px-4 py-2 text-sm font-semibold text-[color:var(--color-orange)]"
                >
                  Delete
                </SubmitButton>
              </form>
            </div>

            <form action={updateQuestionAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="questionId" value={question.id} />

              <div>
                <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                  Test
                </label>
                <select
                  name="testId"
                  defaultValue={question.test_id}
                  className="field-shell w-full px-4 py-3 outline-none"
                >
                  {(tests ?? []).map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.title}
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
                  defaultValue={question.type}
                  className="field-shell w-full px-4 py-3 outline-none"
                >
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                  Question text
                </label>
                <textarea
                  name="questionText"
                  rows={4}
                  defaultValue={question.question_text}
                  className="field-shell w-full px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                  Options
                </label>
                <textarea
                  name="optionsText"
                  rows={6}
                  defaultValue={parseOptions(question.options).join("\n")}
                  className="field-shell w-full px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                  Correct answer
                </label>
                <input
                  name="correctAnswer"
                  defaultValue={question.correct_answer}
                  className="field-shell w-full px-4 py-3 outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <SubmitButton
                  pendingLabel="Saving..."
                  className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
                >
                  Save question
                </SubmitButton>
              </div>
            </form>
          </article>
        ))}

        {!questions?.length ? (
          <section className="surface-card rounded-[2rem] p-8 text-sm text-[color:var(--color-gray-700)]">
            Add your first question to start building a randomized question bank.
          </section>
        ) : null}
      </section>
    </>
  );
}
