import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { grantRetakeAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import {
  formatDateTime,
  getSearchParamValue,
  getStatusClasses,
} from "@/utils/format";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type AdminTraineesPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

type TraineeProfile = {
  email: string;
  id: string;
  role: string;
};

export default async function AdminTraineesPage({
  searchParams,
}: AdminTraineesPageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const { supabase } = await requireAdminContext("/admin/trainees");

  const [{ data: trainees }, { data: tests }, { data: sessions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, role")
      .eq("role", "trainee")
      .order("email", { ascending: true })
      .returns<TraineeProfile[]>(),
    supabase
      .from("tests")
      .select("id, title, time_limit_mins, questions_per_attempt, is_active")
      .order("title", { ascending: true })
      .returns<TestRecord[]>(),
    supabase
      .from("test_sessions")
      .select(
        "id, test_id, trainee_id, started_at, expires_at, submitted_at, status, score, total_questions, attempt_number, retakes_remaining",
      )
      .order("started_at", { ascending: false })
      .returns<SessionRecord[]>(),
  ]);

  const activeTestCount = (tests ?? []).filter((test) => test.is_active).length;
  const testMap = new Map((tests ?? []).map((test) => [test.id, test.title]));

  return (
    <>
      <section className="surface-card rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
          Completion tracker
        </p>
        <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
          Monitor attempts and manage retakes
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
          Adjust the remaining retakes on the most recent session for each trainee and test.
        </p>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>
      </section>

      <section className="space-y-4">
        {(trainees ?? []).map((trainee) => {
          const traineeSessions = (sessions ?? []).filter(
            (session) => session.trainee_id === trainee.id,
          );
          const latestSessionsByTest = new Map<string, SessionRecord>();

          for (const session of traineeSessions) {
            if (!latestSessionsByTest.has(session.test_id)) {
              latestSessionsByTest.set(session.test_id, session);
            }
          }

          const latestSessions = Array.from(latestSessionsByTest.values());
          const completedCount = latestSessions.filter(
            (session) => session.status !== "in_progress",
          ).length;

          return (
            <article key={trainee.id} className="surface-card rounded-[2rem] p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
                    {trainee.email}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--color-gray-700)]">
                    {completedCount}/{activeTestCount} active tests completed
                  </p>
                </div>

                <span className="status-pill bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]">
                  {traineeSessions.length} total attempts
                </span>
              </div>

              {latestSessions.length ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                        <th className="px-3 py-2">Test</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Attempt</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Last activity</th>
                        <th className="px-3 py-2">Retakes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestSessions.map((session) => (
                        <tr key={session.id} className="bg-white text-sm text-[color:var(--color-gray-900)]">
                          <td className="rounded-l-[1.5rem] px-3 py-4 font-medium">
                            {testMap.get(session.test_id) ?? "Unknown test"}
                          </td>
                          <td className="px-3 py-4">
                            <span className={`status-pill ${getStatusClasses(session.status)}`}>
                              {session.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-3 py-4">{session.attempt_number}</td>
                          <td className="px-3 py-4">
                            {session.score ?? 0}/{session.total_questions ?? "—"}
                          </td>
                          <td className="px-3 py-4">
                            {formatDateTime(session.submitted_at ?? session.started_at)}
                          </td>
                          <td className="rounded-r-[1.5rem] px-3 py-4">
                            <form action={grantRetakeAction} className="flex items-center gap-2">
                              <input type="hidden" name="sessionId" value={session.id} />
                              <input
                                type="number"
                                name="retakesRemaining"
                                min="0"
                                defaultValue={session.retakes_remaining}
                                className="field-shell w-20 px-3 py-2 text-sm outline-none"
                              />
                              <SubmitButton
                                pendingLabel="Saving..."
                                className="primary-button inline-flex items-center justify-center px-4 py-2 text-xs"
                              >
                                Update
                              </SubmitButton>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-5 text-sm text-[color:var(--color-gray-700)]">
                  No attempts recorded for this trainee yet.
                </p>
              )}
            </article>
          );
        })}

        {!trainees?.length ? (
          <section className="surface-card rounded-[2rem] p-8 text-sm text-[color:var(--color-gray-700)]">
            No trainee profiles are available yet.
          </section>
        ) : null}
      </section>
    </>
  );
}
