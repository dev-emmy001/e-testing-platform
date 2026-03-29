import Link from "next/link";
import { FlashToast } from "@/components/flash-toast";
import { requireAdminContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import {
  formatDateTime,
  formatPercentage,
  getStatusClasses,
} from "@/utils/format";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type ProfileRow = {
  email: string;
  id: string;
};

export default async function AdminResultsPage() {
  const { error, message } = await readFlash();
  const { supabase } = await requireAdminContext("/admin/results");

  const [{ data: tests }, { data: sessions }, { data: profiles }] = await Promise.all([
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
    supabase
      .from("profiles")
      .select("id, email")
      .returns<ProfileRow[]>(),
  ]);

  const testMap = new Map((tests ?? []).map((test) => [test.id, test.title]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));

  return (
    <>
      <FlashToast error={error} message={message} />

      <section className="surface-card rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
          Results and export
        </p>
        <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
          Review outcomes and download CSV reports
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
          Each export includes the session record plus answer-level detail for the selected
          test.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(tests ?? []).map((test) => (
            <article key={test.id} className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[color:var(--color-gray-900)]">
                    {test.title}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                    {test.questions_per_attempt} questions · {test.time_limit_mins} minutes
                  </p>
                </div>

                <span
                  className={`status-pill ${
                    test.is_active
                      ? "bg-[color:var(--color-green)] text-white"
                      : "bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]"
                  }`}
                >
                  {test.is_active ? "Active" : "Draft"}
                </span>
              </div>

              <Link
                href={`/api/admin/export/${test.id}`}
                className="primary-button mt-5 inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Export CSV
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-[2rem] p-6">
        <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
          Session history
        </h3>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                <th className="px-3 py-2">Trainee</th>
                <th className="px-3 py-2">Test</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Attempt</th>
                <th className="px-3 py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).map((session) => (
                <tr key={session.id} className="rounded-[1.5rem] bg-white text-sm text-[color:var(--color-gray-900)]">
                  <td className="rounded-l-[1.5rem] px-3 py-4 font-medium">
                    {profileMap.get(session.trainee_id) ?? "Unknown trainee"}
                  </td>
                  <td className="px-3 py-4">{testMap.get(session.test_id) ?? "Unknown test"}</td>
                  <td className="px-3 py-4">
                    <span className={`status-pill ${getStatusClasses(session.status)}`}>
                      {session.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    {session.score ?? 0}/{session.total_questions ?? "—"} (
                    {formatPercentage(session.score, session.total_questions)})
                  </td>
                  <td className="px-3 py-4">{session.attempt_number}</td>
                  <td className="rounded-r-[1.5rem] px-3 py-4">
                    {formatDateTime(session.submitted_at ?? session.started_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
