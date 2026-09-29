"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Unit = {
  id: number;
  code: string | null;
  name: string | null;
  title: string | null;
  credit_hours: number | null;
};

type LecturerAssignment = {
  id: number;
  unit_id: number;
  unit: Unit | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type UnitStats = {
  assignments: number;
  submissions: number;
  quizzes: number;
  attempts: number;
  discussions: number;
};

export default function LecturerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [assignments, setAssignments] = useState<LecturerAssignment[]>([]);
  const [stats, setStats] = useState<Record<number, UnitStats>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lecturerName =
    profile?.full_name ||
    profile?.name ||
    profile?.email?.split("@")[0] ||
    "Lecturer";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      // Load lecturer profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Only lecturers should use this portal.
      // Admins are allowed through as well so you can test the portal
      // before a real lecturer joins.
      if (
        profileData?.role &&
        profileData.role !== "lecturer" &&
        profileData.role !== "admin"
      ) {
        setError(
          "Your account does not have lecturer or administrator access."
        );
        return;
      }

      // Load units assigned to this lecturer
      const { data: lecturerUnits, error: lecturerUnitsError } =
        await supabase
          .from("lecturer_units")
          .select(
            `
              id,
              unit_id,
              unit:units (
                id,
                code,
                name,
                title,
                credit_hours
              )
            `
          )
          .eq("lecturer_id", user.id)
          .order("assigned_at", { ascending: false });

      if (lecturerUnitsError) throw lecturerUnitsError;

      const normalizedAssignments: LecturerAssignment[] =
        (lecturerUnits || []).map((item: any) => ({
          id: item.id,
          unit_id: item.unit_id,
          unit: Array.isArray(item.unit) ? item.unit[0] || null : item.unit,
        }));

      setAssignments(normalizedAssignments);

      // Load statistics for each assigned unit
      const statsMap: Record<number, UnitStats> = {};

      for (const assignment of normalizedAssignments) {
        const unitId = assignment.unit_id;

        const [
          assignmentsResult,
          submissionsResult,
          quizzesResult,
          attemptsResult,
          discussionsResult,
        ] = await Promise.all([
          supabase
            .from("assignments")
            .select("id", { count: "exact", head: true })
            .eq("unit_id", unitId),

          supabase
            .from("assignment_submissions")
            .select("id", { count: "exact", head: true })
            .in(
              "assignment_id",
              await getAssignmentIds(unitId)
            ),

          supabase
            .from("quizzes")
            .select("id", { count: "exact", head: true })
            .eq("unit_id", unitId),

          supabase
            .from("quiz_attempts")
            .select("id", { count: "exact", head: true })
            .in(
              "quiz_id",
              await getQuizIds(unitId)
            ),

          supabase
            .from("discussions")
            .select("id", { count: "exact", head: true })
            .eq("unit_id", unitId),
        ]);

        statsMap[unitId] = {
          assignments: assignmentsResult.count || 0,
          submissions: submissionsResult.count || 0,
          quizzes: quizzesResult.count || 0,
          attempts: attemptsResult.count || 0,
          discussions: discussionsResult.count || 0,
        };
      }

      setStats(statsMap);
    } catch (err: any) {
      console.error("Lecturer dashboard error:", err);
      setError(err?.message || "Failed to load lecturer dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function getAssignmentIds(unitId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from("assignments")
      .select("id")
      .eq("unit_id", unitId);

    if (error) {
      console.error("Assignment IDs error:", error);
      return [];
    }

    return (data || []).map((item: any) => item.id);
  }

  async function getQuizIds(unitId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id")
      .eq("unit_id", unitId);

    if (error) {
      console.error("Quiz IDs error:", error);
      return [];
    }

    return (data || []).map((item: any) => item.id);
  }

  const totals = useMemo(() => {
    return assignments.reduce(
      (acc, assignment) => {
        const unitStats = stats[assignment.unit_id];

        if (unitStats) {
          acc.assignments += unitStats.assignments;
          acc.submissions += unitStats.submissions;
          acc.quizzes += unitStats.quizzes;
          acc.attempts += unitStats.attempts;
          acc.discussions += unitStats.discussions;
        }

        return acc;
      },
      {
        assignments: 0,
        submissions: 0,
        quizzes: 0,
        attempts: 0,
        discussions: 0,
      }
    );
  }, [assignments, stats]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="mb-4 h-8 w-64 rounded bg-slate-200" />
            <div className="mb-8 h-4 w-96 rounded bg-slate-200" />

            <div className="grid gap-4 md:grid-cols-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl bg-slate-200"
                />
              ))}
            </div>

            <div className="mt-8 h-64 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="mb-4 text-4xl">⚠️</div>

            <h1 className="text-2xl font-bold text-slate-900">
              Lecturer Portal
            </h1>

            <p className="mt-3 text-slate-600">{error}</p>

            <button
              onClick={loadDashboard}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <section className="mb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Lecturer Portal
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                Welcome, {lecturerName}
              </h1>

              <p className="mt-2 text-slate-600">
                Manage your assigned units, assessments, submissions and
                student activity from one place.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ↻ Refresh
            </button>
          </div>
        </section>

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon="📚"
            label="Assigned Units"
            value={assignments.length}
          />

          <SummaryCard
            icon="📝"
            label="Assignments"
            value={totals.assignments}
          />

          <SummaryCard
            icon="📥"
            label="Submissions"
            value={totals.submissions}
          />

          <SummaryCard
            icon="❓"
            label="Quizzes"
            value={totals.quizzes}
          />

          <SummaryCard
            icon="💬"
            label="Discussions"
            value={totals.discussions}
          />
        </section>

        {/* Quick actions */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Jump directly into your teaching workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/assignments"
              icon="📝"
              title="Assignments"
              description="Create and manage assignments"
            />

            <QuickAction
              href="/admin/submissions"
              icon="📥"
              title="Submissions"
              description="Review and grade submissions"
            />

            <QuickAction
              href="/admin/gradebook"
              icon="📊"
              title="Gradebook"
              description="View student performance"
            />

            <QuickAction
              href="/admin/quizzes"
              icon="❓"
              title="Quizzes"
              description="Create and manage quizzes"
            />
          </div>
        </section>

        {/* Assigned units */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              My Assigned Units
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These are the academic units assigned to your lecturer account.
            </p>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="text-5xl">📚</div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No units assigned yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Once an administrator assigns units to this lecturer account,
                they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {assignments.map((assignment) => {
                const unit = assignment.unit;
                const unitStats = stats[assignment.unit_id] || {
                  assignments: 0,
                  submissions: 0,
                  quizzes: 0,
                  attempts: 0,
                  discussions: 0,
                };

                const unitName =
                  unit?.name ||
                  unit?.title ||
                  "Unnamed Unit";

                return (
                  <article
                    key={assignment.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="border-b border-slate-100 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {unit?.code || "UNIT"}
                          </span>

                          <h3 className="mt-3 text-lg font-bold text-slate-900">
                            {unitName}
                          </h3>

                          {unit?.credit_hours != null && (
                            <p className="mt-1 text-sm text-slate-500">
                              {unit.credit_hours} credit hour
                              {unit.credit_hours === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 text-xl">
                          📚
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-slate-100">
                      <MiniStat
                        label="Assignments"
                        value={unitStats.assignments}
                      />

                      <MiniStat
                        label="Submissions"
                        value={unitStats.submissions}
                      />

                      <MiniStat
                        label="Quizzes"
                        value={unitStats.quizzes}
                      />

                      <MiniStat
                        label="Discussions"
                        value={unitStats.discussions}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 p-4">
                      <a
                        href={`/lecturer/units/${assignment.unit_id}`}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        View Unit
                      </a>

                      <a
                        href={`/admin/submissions?unit=${assignment.unit_id}`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Submissions
                      </a>

                      <a
                        href={`/admin/gradebook?unit=${assignment.unit_id}`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Gradebook
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Portal status */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Lecturer Account
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {user?.email || "Authenticated user"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

              <span className="text-sm font-medium text-green-700">
                {profile?.role === "admin"
                  ? "Administrator"
                  : "Lecturer"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-lg">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 group-hover:underline">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}