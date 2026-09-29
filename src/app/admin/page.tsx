"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Stats = {
  universities: number;
  schools: number;
  departments: number;
  programmes: number;
  academicYears: number;
  semesters: number;
  units: number;
  courses: number;
  assignments: number;
  cats: number;
  pastPapers: number;
  exams: number;
  students: number;
  conversations: number;
};

type AdminUser = {
  id: string;
  email?: string;
};

const initialStats: Stats = {
  universities: 0,
  schools: 0,
  departments: 0,
  programmes: 0,
  academicYears: 0,
  semesters: 0,
  units: 0,
  courses: 0,
  assignments: 0,
  cats: 0,
  pastPapers: 0,
  exams: 0,
  students: 0,
  conversations: 0,
};

export default function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setUser({
        id: user.id,
        email: user.email,
      });

      setAuthorized(true);

      const [
        universities,
        schools,
        departments,
        programmes,
        academicYears,
        semesters,
        units,
        courses,
        assignments,
        cats,
        pastPapers,
        exams,
        students,
        conversations,
      ] = await Promise.all([
        countRows("universities"),
        countRows("schools"),
        countRows("departments"),
        countRows("programmes"),
        countRows("academic_years"),
        countRows("semesters"),
        countRows("units"),
        countRows("courses"),
        countRows("assignments"),
        countRows("cats"),
        countRows("past_papers"),
        countRows("exams"),
        countStudents(),
        countRows("ai_conversations"),
      ]);

      setStats({
        universities,
        schools,
        departments,
        programmes,
        academicYears,
        semesters,
        units,
        courses,
        assignments,
        cats,
        pastPapers,
        exams,
        students,
        conversations,
      });
    } catch (err) {
      console.error("Admin dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function countRows(table: string) {
    const { count, error } = await supabase
      .from(table)
      .select("*", {
        count: "exact",
        head: true,
      });

    if (error) {
      console.error(`Unable to count ${table}:`, error);
      return 0;
    }

    return count || 0;
  }

  async function countStudents() {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("role", "student");

    if (error) {
      console.error("Unable to count students:", error);
      return 0;
    }

    return count || 0;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">
              Loading admin dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
              🔒
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Access Denied
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              This area is restricted to DataSphere administrators.
            </p>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-3 text-left text-sm text-red-700">
                {error}
              </div>
            )}

            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-2xl text-white">
                ⚙️
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  DataSphere Administration
                </p>

                <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
                  Admin Dashboard
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Manage the academic platform from one place.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Student Dashboard
              </Link>

              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {user?.email && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              Signed in as{" "}
              <span className="font-medium text-gray-900">
                {user.email}
              </span>
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                ADMIN
              </span>
            </div>
          )}
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PLATFORM OVERVIEW */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Platform Overview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current records across the DataSphere platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <StatCard
              icon="🎓"
              label="Universities"
              value={stats.universities}
            />

            <StatCard
              icon="🏫"
              label="Schools"
              value={stats.schools}
            />

            <StatCard
              icon="🏢"
              label="Departments"
              value={stats.departments}
            />

            <StatCard
              icon="📚"
              label="Programmes"
              value={stats.programmes}
            />

            <StatCard
              icon="📖"
              label="Units"
              value={stats.units}
            />

            <StatCard
              icon="👨‍🎓"
              label="Students"
              value={stats.students}
            />

            <StatCard
              icon="🤖"
              label="AI Conversations"
              value={stats.conversations}
            />
          </div>
        </section>

        {/* MANAGEMENT */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage academic structures and learning resources.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ManagementCard
              href="/admin/academic"
              icon="🎓"
              title="Academic Management"
              description="Manage universities, schools, departments, programmes, years, semesters and units."
              value={`${stats.universities + stats.schools + stats.departments + stats.programmes + stats.academicYears + stats.semesters + stats.units} records`}
            />

            <ManagementCard
              href="/admin/assignments"
              icon="📝"
              title="Assignments"
              description="Upload and manage assignments attached to DataSphere units."
              value={`${stats.assignments} assignments`}
            />

            <ManagementCard
              href="/admin/past-papers"
              icon="📄"
              title="Past Papers"
              description="Manage examination papers and revision resources."
              value={`${stats.pastPapers} papers`}
            />

            <ManagementCard
              href="/admin/exams"
              icon="🗓️"
              title="Exams"
              description="Create and manage CATs, final examinations and other assessments."
              value={`${stats.exams} exams`}
            />

            <ManagementCard
              href="/admin/cats"
              icon="✏️"
              title="CATs"
              description="Manage continuous assessment tests and related resources."
              value={`${stats.cats} CATs`}
            />

            <ManagementCard
              href="/courses"
              icon="📚"
              title="Courses & Units"
              description="Review the learning units currently available across DataSphere."
              value={`${stats.courses} courses`}
            />
          </div>
        </section>

        {/* ACADEMIC STRUCTURE */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Academic Structure
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Overview of the academic hierarchy.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <HierarchyItem
                number={stats.universities}
                label="Universities"
              />

              <HierarchyItem
                number={stats.schools}
                label="Schools"
              />

              <HierarchyItem
                number={stats.departments}
                label="Departments"
              />

              <HierarchyItem
                number={stats.programmes}
                label="Programmes"
              />

              <HierarchyItem
                number={stats.academicYears}
                label="Academic Years"
              />

              <HierarchyItem
                number={stats.semesters}
                label="Semesters"
              />

              <HierarchyItem
                number={stats.units}
                label="Units"
              />

              <div className="flex items-center justify-center">
                <Link
                  href="/admin/academic"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open Academic Manager →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* LEARNING CONTENT */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Learning Content
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Content available to students.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ContentCard
              icon="📝"
              title="Assignments"
              value={stats.assignments}
              href="/admin/assignments"
            />

            <ContentCard
              icon="✏️"
              title="CATs"
              value={stats.cats}
              href="/admin/cats"
            />

            <ContentCard
              icon="📄"
              title="Past Papers"
              value={stats.pastPapers}
              href="/admin/past-papers"
            />
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Quick Actions
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/academic"
              icon="➕"
              title="Add Academic Record"
            />

            <QuickAction
              href="/admin/assignments"
              icon="📤"
              title="Upload Assignment"
            />

            <QuickAction
              href="/admin/past-papers"
              icon="📥"
              title="Upload Past Paper"
            />

            <QuickAction
              href="/admin/exams"
              icon="🗓️"
              title="Create Exam"
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          DataSphere Administration • Academic platform control center
        </footer>
      </div>
    </main>
  );
}

<a
  href="/admin/quiz-attempts"
  className="block rounded-lg px-3 py-2 hover:bg-gray-100"
>
  Quiz Attempts
</a>
function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xl">{icon}</div>

        <div className="text-2xl font-bold text-gray-900">
          {value}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-gray-500">
        {label}
      </p>
    </div>
  );
}

function ManagementCard({
  href,
  icon,
  title,
  description,
  value,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl transition group-hover:bg-gray-900 group-hover:text-white">
          {icon}
        </div>

        <span className="text-gray-300 transition group-hover:text-gray-600">
          →
        </span>
      </div>

      <h3 className="mt-5 text-base font-bold text-gray-900">
        {title}
      </h3>

      <p className="mt-2 min-h-[48px] text-sm leading-6 text-gray-500">
        {description}
      </p>

      <div className="mt-4 border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500">
        {value}
      </div>
    </Link>
  );
}

function HierarchyItem({
  number,
  label,
}: {
  number: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="text-2xl font-bold text-gray-900">
        {number}
      </div>

      <div className="mt-1 text-xs font-medium text-gray-500">
        {label}
      </div>
    </div>
  );
}

function ContentCard({
  icon,
  title,
  value,
  href,
}: {
  icon: string;
  title: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:bg-gray-50"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-gray-900">
            {title}
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Learning resources
          </p>
        </div>
      </div>

      <div className="text-xl font-bold text-gray-900">
        {value}
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      <span className="text-lg">{icon}</span>
      <span>{title}</span>
    </Link>
  );
}