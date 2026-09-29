"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { supabase } from "../lib/supabase";

type Programme = {
  id: number;
  name: string;
  award: string | null;
};

type AcademicYear = {
  id: number;
  programme_id: number;
  year_number: number;
};

type Semester = {
  id: number;
  academic_year_id: number;
  semester_number: number;
};

type Unit = {
  id: number;
  semester_id: number;
  name: string;
  code: string | null;
};

export default function CoursesPage() {
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [selectedYear, setSelectedYear] = useState(2);
  const [selectedSemester, setSelectedSemester] = useState(1);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAcademicUnits();
  }, []);

  async function loadAcademicUnits() {
    setLoading(true);
    setError("");

    try {
      /*
       * Data Science and Analytics is programme 7
       * in the current DataSphere academic structure.
       *
       * We deliberately load the programme rather than
       * hard-coding the unit list.
       */
      const { data: programmeData, error: programmeError } =
        await supabase
          .from("programmes")
          .select("id, name, award")
          .eq("id", 7)
          .maybeSingle();

      if (programmeError) {
        throw new Error(programmeError.message);
      }

      if (!programmeData) {
        throw new Error("Data Science and Analytics programme was not found.");
      }

      setProgramme(programmeData);

      /*
       * Load all academic years belonging to this programme.
       */
      const { data: yearData, error: yearError } = await supabase
        .from("academic_years")
        .select("id, programme_id, year_number")
        .eq("programme_id", programmeData.id)
        .order("year_number", { ascending: true });

      if (yearError) {
        throw new Error(yearError.message);
      }

      const loadedYears = yearData ?? [];
      setYears(loadedYears);

      /*
       * Load semesters belonging to those academic years.
       */
      const yearIds = loadedYears.map((year) => year.id);

      if (yearIds.length === 0) {
        setSemesters([]);
        setUnits([]);
        setLoading(false);
        return;
      }

      const { data: semesterData, error: semesterError } =
        await supabase
          .from("semesters")
          .select("id, academic_year_id, semester_number")
          .in("academic_year_id", yearIds)
          .order("semester_number", { ascending: true });

      if (semesterError) {
        throw new Error(semesterError.message);
      }

      const loadedSemesters = semesterData ?? [];
      setSemesters(loadedSemesters);

      /*
       * Load units belonging to all semesters.
       *
       * This is the important change:
       *
       * courses table ❌
       * academic units ✅
       */
      const semesterIds = loadedSemesters.map((semester) => semester.id);

      if (semesterIds.length === 0) {
        setUnits([]);
        setLoading(false);
        return;
      }

      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("id, semester_id, name, code")
        .in("semester_id", semesterIds)
        .order("code", { ascending: true });

      if (unitError) {
        throw new Error(unitError.message);
      }

      setUnits(unitData ?? []);
    } catch (err) {
      console.error("Academic catalogue error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the academic catalogue."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedYearRecord = useMemo(
    () =>
      years.find(
        (year) => year.year_number === selectedYear
      ) ?? null,
    [years, selectedYear]
  );

  const availableSemesters = useMemo(() => {
    if (!selectedYearRecord) {
      return [];
    }

    return semesters
      .filter(
        (semester) =>
          semester.academic_year_id === selectedYearRecord.id
      )
      .sort(
        (a, b) =>
          a.semester_number - b.semester_number
      );
  }, [semesters, selectedYearRecord]);

  const selectedSemesterRecord = useMemo(
    () =>
      availableSemesters.find(
        (semester) =>
          semester.semester_number === selectedSemester
      ) ?? null,
    [availableSemesters, selectedSemester]
  );

  const visibleUnits = useMemo(() => {
    if (!selectedSemesterRecord) {
      return [];
    }

    const query = search.trim().toLowerCase();

    return units
      .filter(
        (unit) =>
          unit.semester_id === selectedSemesterRecord.id
      )
      .filter((unit) => {
        if (!query) {
          return true;
        }

        return `${unit.code ?? ""} ${unit.name}`
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) =>
        `${a.code ?? ""}`.localeCompare(`${b.code ?? ""}`)
      );
  }, [units, selectedSemesterRecord, search]);

  function changeYear(yearNumber: number) {
    setSelectedYear(yearNumber);

    const firstSemester = semesters.find((semester) => {
      const year = years.find(
        (item) => item.id === semester.academic_year_id
      );

      return (
        year?.year_number === yearNumber &&
        semester.semester_number === 1
      );
    });

    setSelectedSemester(
      firstSemester?.semester_number ?? 1
    );

    setSearch("");
  }

  function changeSemester(semesterNumber: number) {
    setSelectedSemester(semesterNumber);
    setSearch("");
  }

  const totalCurrentUnits = selectedSemesterRecord
    ? units.filter(
        (unit) =>
          unit.semester_id === selectedSemesterRecord.id
      ).length
    : 0;

  return (
    <div className="ds-shell flex">
      <Sidebar />

      <main className="ds-main">
        <div className="ds-content">
          <Topbar />

          {/* INTRO */}
          <section className="py-7">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="ds-kicker">
                  Academic catalogue
                </p>

                <h1 className="ds-title">
                  Available Units
                </h1>

                <p className="ds-subtitle">
                  Explore the units in your academic programme,
                  organised by year and semester.
                </p>
              </div>

              {programme && (
                <div className="border-l-4 border-[#20D6D2] pl-4">
                  <p className="text-xs font800 uppercase tracking-[0.14em] text-[#7d7782]">
                    Programme
                  </p>

                  <p className="mt-1 text-sm font800 text-[#171A21]">
                    {programme.name}
                  </p>

                  {programme.award && (
                    <p className="mt-1 text-xs text-[#625d67]">
                      {programme.award}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ERROR */}
          {error && (
            <div className="mb-6 border-l-4 border-[#FF6B6B] bg-[#fff1f0] px-4 py-4">
              <p className="text-sm font750 text-[#8f3028]">
                {error}
              </p>

              <button
                type="button"
                onClick={loadAcademicUnits}
                className="mt-3 text-xs font800 text-[#8f3028] underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {/* YEAR NAVIGATION */}
          {!loading && years.length > 0 && (
            <section className="mb-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#dedbe0] pb-3">
                <span className="mr-2 text-[10px] font800 uppercase tracking-[0.16em] text-[#89828d]">
                  Year
                </span>

                {years.map((year) => {
                  const active =
                    year.year_number === selectedYear;

                  return (
                    <button
                      key={year.id}
                      type="button"
                      onClick={() =>
                        changeYear(year.year_number)
                      }
                      className={[
                        "border px-4 py-2 text-xs font800 transition-all duration-200",
                        active
                          ? "border-[#171A21] bg-[#171A21] text-white"
                          : "border-[#dedbe0] bg-white text-[#625d67] hover:-translate-y-0.5 hover:border-[#20D6D2] hover:text-[#171A21]",
                      ].join(" ")}
                    >
                      Year {year.year_number}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* SEMESTER NAVIGATION */}
          {!loading &&
            selectedYearRecord &&
            availableSemesters.length > 0 && (
              <section className="mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-2 text-[10px] font800 uppercase tracking-[0.16em] text-[#89828d]">
                    Semester
                  </span>

                  {availableSemesters.map((semester) => {
                    const active =
                      semester.semester_number ===
                      selectedSemester;

                    return (
                      <button
                        key={semester.id}
                        type="button"
                        onClick={() =>
                          changeSemester(
                            semester.semester_number
                          )
                        }
                        className={[
                          "border px-4 py-2 text-xs font800 transition-all duration-200",
                          active
                            ? "border-[#20D6D2] bg-[#20D6D2] text-[#102426]"
                            : "border-[#dedbe0] bg-white text-[#625d67] hover:-translate-y-0.5 hover:border-[#20D6D2]",
                        ].join(" ")}
                      >
                        Semester{" "}
                        {semester.semester_number}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

          {/* TOOLBAR */}
          {!loading && selectedSemesterRecord && (
            <section className="mb-5 flex flex-col gap-4 border-y border-[#dedbe0] py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font800 uppercase tracking-[0.16em] text-[#89828d]">
                  Current selection
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg font800 text-[#171A21]">
                    Year {selectedYear}
                  </span>

                  <span className="text-[#89828d]">
                    /
                  </span>

                  <span className="text-lg font800 text-[#171A21]">
                    Semester {selectedSemester}
                  </span>

                  <span className="ml-1 bg-[#B8FF3D] px-2 py-1 text-[10px] font900 text-[#171A21]">
                    {totalCurrentUnits} units
                  </span>
                </div>
              </div>

              <div className="relative w-full sm:max-w-sm">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search unit code or name..."
                  className="ds-input w-full"
                />
              </div>
            </section>
          )}

          {/* LOADING */}
          {loading && (
            <div className="border-y border-[#dedbe0] bg-white">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-5 border-b border-[#ebe8ec] px-5 py-7 last:border-b-0"
                >
                  <div className="h-5 w-8 bg-[#f0edf1]" />
                  <div className="h-10 w-20 bg-[#f0edf1]" />

                  <div className="flex-1">
                    <div className="h-4 w-2/5 bg-[#f0edf1]" />
                    <div className="mt-2 h-3 w-1/4 bg-[#f0edf1]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NO YEAR/SEMESTER */}
          {!loading &&
            !error &&
            years.length === 0 && (
              <div className="border-y border-[#dedbe0] bg-white px-6 py-12 text-center">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-[#FFB7D5] text-lg font900 text-[#171A21]">
                    !
                  </div>

                  <h2 className="text-lg font800 text-[#171A21]">
                    No academic years found
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#625d67]">
                    This programme does not yet have academic
                    years connected to it in DataSphere.
                  </p>
                </div>
              </div>
            )}

          {!loading &&
            !error &&
            years.length > 0 &&
            availableSemesters.length === 0 && (
              <div className="border-y border-[#dedbe0] bg-white px-6 py-12 text-center">
                <h2 className="text-lg font800 text-[#171A21]">
                  Semester not configured
                </h2>

                <p className="mt-2 text-sm text-[#625d67]">
                  Year {selectedYear} does not currently have
                  semester data connected.
                </p>
              </div>
            )}

          {/* UNIT DIRECTORY */}
          {!loading &&
            !error &&
            selectedSemesterRecord &&
            visibleUnits.length > 0 && (
              <section className="border-y border-[#dedbe0] bg-white">
                <div className="flex items-center justify-between border-b border-[#dedbe0] px-5 py-3">
                  <p className="text-[10px] font800 uppercase tracking-[0.16em] text-[#89828d]">
                    Unit directory
                  </p>

                  <p className="text-xs font750 text-[#89828d]">
                    {visibleUnits.length}{" "}
                    {visibleUnits.length === 1
                      ? "unit"
                      : "units"}
                  </p>
                </div>

                {visibleUnits.map((unit, index) => (
                  <Link
                    key={unit.id}
                    href={`/units/${unit.id}`}
                    className="group flex items-center gap-4 border-b border-[#ebe8ec] px-5 py-5 transition-all duration-200 last:border-b-0 hover:bg-[#fbfafc] sm:gap-6"
                  >
                    {/* NUMBER */}
                    <span className="w-7 shrink-0 text-xs font800 text-[#aaa4ad]">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* CODE */}
                    <span
                      className={[
                        "grid min-h-10 min-w-[82px] shrink-0 place-items-center px-3 text-center text-xs font900 transition-transform duration-200 group-hover:-translate-y-0.5",
                        index % 5 === 0
                          ? "bg-[#FFB7D5] text-[#171A21]"
                          : index % 5 === 1
                            ? "bg-[#20D6D2] text-[#102426]"
                            : index % 5 === 2
                              ? "bg-[#B8FF3D] text-[#171A21]"
                              : index % 5 === 3
                                ? "bg-[#8B5CF6] text-white"
                                : "bg-[#FFD84D] text-[#171A21]",
                      ].join(" ")}
                    >
                      {unit.code || "UNIT"}
                    </span>

                    {/* NAME */}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font850 text-[#171A21] transition-colors duration-200 group-hover:text-[#3f6f68] sm:text-[15px]">
                        {unit.name}
                      </h2>

                      <p className="mt-1 text-xs text-[#89828d]">
                        Academic unit
                      </p>
                    </div>

                    {/* OPEN */}
                    <span className="hidden shrink-0 text-sm font850 text-[#89828d] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#171A21] sm:block">
                      Open →
                    </span>

                    <span className="shrink-0 text-lg font400 text-[#89828d] sm:hidden">
                      →
                    </span>
                  </Link>
                ))}
              </section>
            )}

          {/* SEARCH EMPTY */}
          {!loading &&
            !error &&
            selectedSemesterRecord &&
            visibleUnits.length === 0 &&
            search.trim() !== "" && (
              <div className="border-y border-[#dedbe0] bg-white px-6 py-12 text-center">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-[#FFB7D5] text-lg font900 text-[#171A21]">
                    ?
                  </div>

                  <h2 className="text-lg font800 text-[#171A21]">
                    No units found
                  </h2>

                  <p className="mt-2 text-sm text-[#625d67]">
                    Nothing in Year {selectedYear},
                    Semester {selectedSemester} matches{" "}
                    <strong>
                      &quot;{search}&quot;
                    </strong>
                    .
                  </p>

                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-5 border border-[#171A21] bg-[#171A21] px-4 py-2 text-xs font800 text-white transition hover:bg-[#20D6D2] hover:text-[#102426]"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}

          {/* EMPTY SEMESTER */}
          {!loading &&
            !error &&
            selectedSemesterRecord &&
            visibleUnits.length === 0 &&
            search.trim() === "" && (
              <div className="border-y border-[#dedbe0] bg-white px-6 py-12 text-center">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-4 h-1 w-16 bg-[#20D6D2]" />

                  <h2 className="text-lg font800 text-[#171A21]">
                    No units connected yet
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#625d67]">
                    Year {selectedYear}, Semester{" "}
                    {selectedSemester} exists, but there are
                    currently no units connected to it.
                  </p>
                </div>
              </div>
            )}

          {/* FOOTER CONTEXT */}
          {!loading && programme && (
            <div className="flex flex-col gap-3 py-6 text-xs text-[#89828d] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {programme.name}
              </span>

              <Link
                href="/my-courses"
                className="font800 text-[#3f6f68] transition-colors hover:text-[#171A21]"
              >
                View my enrolled learning →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}