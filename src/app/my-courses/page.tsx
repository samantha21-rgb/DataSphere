"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { supabase } from "../lib/supabase";

type Course = {
  id: number;
  title: string;
  code: string;
  description: string;
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        courses (
          id,
          title,
          code,
          description
        )
        `
      )
      .eq("user_id", user.id);

    if (!error) {
      setCourses(
        data
          ?.map((item: any) => item.courses)
          .filter(Boolean) || []
      );
    }

    setLoading(false);
  }

  const filteredCourses = useMemo(() => {
    const term = query.toLowerCase().trim();

    if (!term) {
      return courses;
    }

    return courses.filter((course) =>
      `${course.title} ${course.code} ${course.description}`
        .toLowerCase()
        .includes(term)
    );
  }, [courses, query]);

  return (
    <div className="ds-shell flex">
      <Sidebar />

      <main className="ds-main">
        <div className="ds-content">

          <Topbar />

          {/* PAGE INTRO */}
          <section className="mycourses-intro">
            <div>
              <p className="mycourses-eyebrow">
                MY LEARNING
              </p>

              <h1>
                My courses
              </h1>

              <p className="mycourses-description">
                Your enrolled academic units in one
                place. Select a course to continue
                learning.
              </p>
            </div>

            <div className="mycourses-total">
              <strong>
                {courses.length}
              </strong>

              <span>
                {courses.length === 1
                  ? "enrolled course"
                  : "enrolled courses"}
              </span>
            </div>
          </section>

          {/* SEARCH + ACTION */}
          <section className="mycourses-toolbar">

            <div className="mycourses-search">
              <SearchIcon />

              <input
                type="search"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search your courses..."
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                >
                  Clear
                </button>
              )}
            </div>

            <Link
              href="/courses"
              className="mycourses-browse"
            >
              Browse courses
              <ArrowRightIcon />
            </Link>

          </section>

          {/* CONTENT */}
          {loading ? (
            <CoursesLoading />
          ) : courses.length === 0 ? (
            <EmptyCourses />
          ) : filteredCourses.length === 0 ? (
            <NoSearchResults
              onClear={() => setQuery("")}
            />
          ) : (
            <section className="mycourses-directory">

              <div className="mycourses-directory-header">
                <div>
                  <p className="mycourses-eyebrow">
                    ACTIVE ENROLMENTS
                  </p>

                  <h2>
                    Continue learning
                  </h2>
                </div>

                <span>
                  {filteredCourses.length} shown
                </span>
              </div>

              <div className="mycourses-list">
                {filteredCourses.map(
                  (course, index) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      index={index}
                    />
                  )
                )}
              </div>

            </section>
          )}

        </div>
      </main>
    </div>
  );
}

/* =========================================================
   COURSE ROW
   ========================================================= */

function CourseRow({
  course,
  index,
}: {
  course: Course;
  index: number;
}) {
  const accent =
    index % 5 === 0
      ? "pink"
      : index % 5 === 1
        ? "turquoise"
        : index % 5 === 2
          ? "green"
          : index % 5 === 3
            ? "violet"
            : "yellow";

  return (
    <Link
      href={`/courses`}
      className={`mycourse-row mycourse-${accent}`}
    >
      <div className="mycourse-index">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="mycourse-code">
        {course.code?.slice(0, 3) || "UNI"}
      </div>

      <div className="mycourse-content">

        <div className="mycourse-title-line">
          <h3>
            {course.title}
          </h3>

          <span className="mycourse-code-full">
            {course.code}
          </span>
        </div>

        <p>
          {course.description ||
            "Academic learning material and resources for this course."}
        </p>

        <div className="mycourse-meta">
          <span>
            Enrolled
          </span>

          <span className="mycourse-dot" />

          <span>
            Learning workspace
          </span>
        </div>

      </div>

      <div className="mycourse-open">
        <span>
          Open
        </span>

        <ArrowUpRightIcon />
      </div>
    </Link>
  );
}

/* =========================================================
   EMPTY
   ========================================================= */

function EmptyCourses() {
  return (
    <section className="mycourses-empty">

      <div className="mycourses-empty-mark">
        <BookIcon />
      </div>

      <div className="mycourses-empty-content">

        <p className="mycourses-eyebrow">
          YOUR LEARNING SPACE
        </p>

        <h2>
          No courses yet
        </h2>

        <p>
          You haven't enrolled in any courses.
          Browse the catalogue to find courses
          available to you.
        </p>

        <Link
          href="/courses"
          className="mycourses-empty-action"
        >
          Browse available courses
          <ArrowRightIcon />
        </Link>

      </div>

    </section>
  );
}

/* =========================================================
   SEARCH EMPTY
   ========================================================= */

function NoSearchResults({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <section className="mycourses-empty search-empty">

      <div className="mycourses-empty-mark">
        <SearchIcon />
      </div>

      <div className="mycourses-empty-content">

        <p className="mycourses-eyebrow">
          SEARCH
        </p>

        <h2>
          No matching courses
        </h2>

        <p>
          Try another course name, code or
          description.
        </p>

        <button
          type="button"
          onClick={onClear}
          className="mycourses-empty-action"
        >
          Clear search
        </button>

      </div>

    </section>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function CoursesLoading() {
  return (
    <section className="mycourses-directory">

      <div className="mycourses-directory-header">
        <div>
          <div className="course-skeleton-label" />
          <div className="course-skeleton-title" />
        </div>
      </div>

      <div className="mycourses-list">

        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="mycourse-loading-row"
          >
            <div className="course-loading-index" />

            <div className="course-loading-code" />

            <div className="course-loading-content">
              <div />
              <div />
              <div />
            </div>

            <div className="course-loading-action" />
          </div>
        ))}

      </div>

    </section>
  );
}

/* =========================================================
   ICONS
   ========================================================= */

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M16 16l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M7 17L17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M5 4.5A2.5 2.5 0 017.5 2H20v17H7.5A2.5 2.5 0 015 21.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M5 5h15M9 6v7l2-1.4 2 1.4V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}