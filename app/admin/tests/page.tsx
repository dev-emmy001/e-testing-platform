import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { createTestAction, updateTestAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { getSearchParamValue } from "@/utils/format";
import type { TestRecord } from "@/utils/test-sessions";

type AdminTestsPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function AdminTestsPage({ searchParams }: AdminTestsPageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const { supabase } = await requireAdminContext("/admin/tests");

  const [{ data: tests }, { data: questions }] = await Promise.all([
    supabase
      .from("tests")
      .select("id, title, time_limit_mins, questions_per_attempt, is_active, created_at")
      .order("created_at", { ascending: false })
      .returns<TestRecord[]>(),
    supabase.from("questions").select("id, test_id"),
  ]);

  return (
    <>
      <section className="surface-card rounded-[2rem] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
              Test configuration
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
              Configure timed assessments
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--color-gray-700)]">
              Set the title, duration, and question quota for each test. A test only
              appears to trainees when it is active.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>

        <form action={createTestAction} className="mt-8 grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
              Title
            </label>
            <input
              name="title"
              required
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
              defaultValue="60"
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
              defaultValue="30"
              className="field-shell w-full px-4 py-3 outline-none"
            />
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-[color:var(--color-gray-700)]">
            <input type="checkbox" name="isActive" className="h-4 w-4 accent-[color:var(--color-indigo)]" />
            Make active immediately
          </label>
          <div className="lg:col-span-4">
            <SubmitButton
              pendingLabel="Creating..."
              className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Create test
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        {(tests ?? []).map((test) => {
          const questionCount = (questions ?? []).filter((question) => question.test_id === test.id).length;
          const bankWarning = questionCount < test.questions_per_attempt;

          return (
            <form
              key={test.id}
              action={updateTestAction}
              className="surface-card rounded-[2rem] p-6"
            >
              <input type="hidden" name="testId" value={test.id} />

              <div className="grid gap-4 lg:grid-cols-[1.3fr_220px_220px_auto]">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                    Title
                  </label>
                  <input
                    name="title"
                    defaultValue={test.title}
                    className="field-shell w-full px-4 py-3 outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[color:var(--color-gray-700)]">
                    Time limit
                  </label>
                  <input
                    name="timeLimitMins"
                    type="number"
                    min="1"
                    defaultValue={test.time_limit_mins}
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
                    defaultValue={test.questions_per_attempt}
                    className="field-shell w-full px-4 py-3 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 rounded-2xl bg-[color:var(--color-gray-100)] px-4 py-3 text-sm font-semibold text-[color:var(--color-gray-700)]">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={test.is_active}
                      className="h-4 w-4 accent-[color:var(--color-indigo)]"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--color-gray-600)]">
                  <span className="status-pill bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]">
                    {questionCount} questions in bank
                  </span>
                  {bankWarning ? (
                    <span className="status-pill bg-[color:var(--color-orange)] text-white">
                      Needs more questions before full random draw
                    </span>
                  ) : null}
                </div>

                <SubmitButton
                  pendingLabel="Saving..."
                  className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
                >
                  Save changes
                </SubmitButton>
              </div>
            </form>
          );
        })}

        {!tests?.length ? (
          <section className="surface-card rounded-[2rem] p-8 text-sm text-[color:var(--color-gray-700)]">
            No tests have been created yet.
          </section>
        ) : null}
      </section>
    </>
  );
}
