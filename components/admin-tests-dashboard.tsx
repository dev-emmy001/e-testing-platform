"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { formatDateTime } from "@/utils/format";
import type { AdminTestDashboardRecord } from "@/utils/admin-tests";

type AdminTestsDashboardProps = {
  tests: AdminTestDashboardRecord[];
};

type TestSortMode = "activity" | "attempts" | "newest" | "question_count" | "title";
type TestStatusFilter = "__all__" | "active" | "draft";
type TestReadinessFilter = "__all__" | "needs_questions" | "ready";
type ViewMode = "grid" | "list";

function getTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function ViewToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-(--color-indigo) shadow-[0_10px_24px_rgba(42,40,101,0.12)]"
          : "text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function TestGridCard({ test }: { test: AdminTestDashboardRecord }) {
  const isReady = test.bankGap === 0;

  return (
    <Link
      href={`/admin/tests/${test.id}`}
      className="surface-card block rounded-4xl p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(42,40,101,0.14)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span
            className={`status-pill ${
              test.isActive
                ? "bg-(--color-green) text-white"
                : "bg-(--color-indigo-light) text-(--color-indigo)"
            }`}
          >
            {test.isActive ? "Active" : "Draft"}
          </span>
          <span
            className={`status-pill ${
              isReady
                ? "bg-(--color-cyan) text-white"
                : "bg-(--color-orange) text-white"
            }`}
          >
            {isReady ? "Ready" : `${test.bankGap} short`}
          </span>
        </div>

        <span className="text-sm font-semibold text-(--color-indigo)">
          Open test
        </span>
      </div>

      <h3 className="mt-4 text-2xl font-bold text-gray-900">{test.title}</h3>
      <p className="mt-3 text-sm leading-7 text-gray-700">
        {test.questionCount} selected questions for a {test.timeLimitMins}
        -minute assessment with {test.questionsPerAttempt} questions per
        attempt.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Trainees
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {test.traineeCount}
          </p>
        </div>

        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Attempts
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {test.attemptCount}
          </p>
        </div>

        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Categories
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {test.categoryCoverage}
          </p>
        </div>

        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Avg score
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {test.averageScoreLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm text-gray-600">
        <span className="status-pill bg-gray-100 text-gray-700">
          {test.liveCount} live
        </span>
        <span className="status-pill bg-gray-100 text-gray-700">
          {test.submittedCount} submitted
        </span>
        <span className="status-pill bg-gray-100 text-gray-700">
          {test.expiredCount} expired
        </span>
      </div>

      <p className="mt-5 text-sm text-gray-600">
        Latest activity: {formatDateTime(test.latestActivityAt ?? test.createdAt)}
      </p>
    </Link>
  );
}

function TestListRow({ test }: { test: AdminTestDashboardRecord }) {
  const isReady = test.bankGap === 0;

  return (
    <Link
      href={`/admin/tests/${test.id}`}
      className="surface-card block rounded-[1.75rem] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(42,40,101,0.12)]"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span
              className={`status-pill ${
                test.isActive
                  ? "bg-(--color-green) text-white"
                  : "bg-(--color-indigo-light) text-(--color-indigo)"
              }`}
            >
              {test.isActive ? "Active" : "Draft"}
            </span>
            <span
              className={`status-pill ${
                isReady
                  ? "bg-(--color-cyan) text-white"
                  : "bg-(--color-orange) text-white"
              }`}
            >
              {isReady ? "Ready" : `${test.bankGap} short`}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold text-gray-900">{test.title}</h3>
          <p className="mt-2 text-sm text-gray-600">
            {test.questionCount} selected · {test.timeLimitMins} minutes ·{" "}
            {test.questionsPerAttempt} per attempt
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Trainees
          </p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {test.traineeCount}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Attempts
          </p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {test.attemptCount}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Avg score
          </p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {test.averageScoreLabel}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Last activity
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {formatDateTime(test.latestActivityAt ?? test.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function AdminTestsDashboard({ tests }: AdminTestsDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TestStatusFilter>("__all__");
  const [readinessFilter, setReadinessFilter] =
    useState<TestReadinessFilter>("__all__");
  const [sortMode, setSortMode] = useState<TestSortMode>("activity");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "__all__" ||
    readinessFilter !== "__all__" ||
    sortMode !== "activity";

  const visibleTests = tests
    .filter((test) => {
      const matchesSearch = normalizedSearchQuery
        ? test.searchText.includes(normalizedSearchQuery)
        : true;
      const matchesStatus =
        statusFilter === "__all__"
          ? true
          : statusFilter === "active"
            ? test.isActive
            : !test.isActive;
      const matchesReadiness =
        readinessFilter === "__all__"
          ? true
          : readinessFilter === "ready"
            ? test.bankGap === 0
            : test.bankGap > 0;

      return matchesSearch && matchesStatus && matchesReadiness;
    })
    .sort((left, right) => {
      switch (sortMode) {
        case "attempts":
          if (right.attemptCount !== left.attemptCount) {
            return right.attemptCount - left.attemptCount;
          }
          break;
        case "newest":
          return getTimestamp(right.createdAt) - getTimestamp(left.createdAt);
        case "question_count":
          if (right.questionCount !== left.questionCount) {
            return right.questionCount - left.questionCount;
          }
          break;
        case "title":
          return left.title.localeCompare(right.title);
        case "activity":
        default:
          if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1;
          }

          return (
            getTimestamp(right.latestActivityAt ?? right.createdAt) -
            getTimestamp(left.latestActivityAt ?? left.createdAt)
          );
      }

      return left.title.localeCompare(right.title);
    });

  const resetControls = () => {
    setSearchQuery("");
    setStatusFilter("__all__");
    setReadinessFilter("__all__");
    setSortMode("activity");
  };

  return (
    <section className="surface-card rounded-4xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Test index</h3>
          <p className="mt-2 text-sm leading-7 text-gray-700">
            Open any test to manage its question pool and inspect trainee
            history.
          </p>
        </div>

        <div className="flex rounded-[1.5rem] bg-gray-100 p-1">
          <ViewToggleButton
            active={viewMode === "grid"}
            label="Grid"
            onClick={() => setViewMode("grid")}
          />
          <ViewToggleButton
            active={viewMode === "list"}
            label="List"
            onClick={() => setViewMode("list")}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Search
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by test title"
            className="field-shell w-full px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as TestStatusFilter)
            }
            className="field-shell w-full px-4 py-3 outline-none"
          >
            <option value="__all__">All statuses</option>
            <option value="active">Active only</option>
            <option value="draft">Draft only</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Readiness
          </label>
          <select
            value={readinessFilter}
            onChange={(event) =>
              setReadinessFilter(event.target.value as TestReadinessFilter)
            }
            className="field-shell w-full px-4 py-3 outline-none"
          >
            <option value="__all__">All pools</option>
            <option value="ready">Draw-ready</option>
            <option value="needs_questions">Needs more questions</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Sort
          </label>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as TestSortMode)}
            className="field-shell w-full px-4 py-3 outline-none"
          >
            <option value="activity">Recent activity</option>
            <option value="newest">Newest created</option>
            <option value="attempts">Most attempts</option>
            <option value="question_count">Largest pool</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-[1.5rem] bg-gray-100 px-4 py-3 text-sm text-gray-700 lg:flex-row lg:items-center lg:justify-between">
        <p>
          Showing {visibleTests.length} of {tests.length} test
          {tests.length === 1 ? "" : "s"}.
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

      <div className="mt-6">
        {tests.length ? (
          visibleTests.length ? (
            viewMode === "grid" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleTests.map((test) => (
                  <TestGridCard key={test.id} test={test} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleTests.map((test) => (
                  <TestListRow key={test.id} test={test} />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-700">
              <p>No tests match the current search or filters.</p>
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
            No tests have been created yet. Start a new test to build the first
            assessment.
          </div>
        )}
      </div>
    </section>
  );
}
