"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/dashboard/Sidebar";
import Topbar from "../../components/dashboard/Topbar";
import { supabase } from "../../lib/supabase";

type Programme = {
  id: number;
  department_id: number;
  name: string;
  award: string | null;
};

type Department = {
  id: number;
  school_id: number;
  name: string;
};

type School = {
  id: number;
  university_id: number;
  name: string;
};

type University = {
  id: number;
  name: string;
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
  code: string | null;
  name: string;
};

type YearWithSemesters = AcademicYear & {
  semesters: (Semester & {
    units: Unit[];
  })[];
};

export default function ProgrammePage() {
  const params = useParams();
  const router = useRouter();

  const rawId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const programmeId = rawId ? Number(rawId) : NaN;

  const [programme, setProgramme] =
    useState<Programme | null>(null);

  const [department, setDepartment] =
    useState<Department | null>(null);

  const [school, setSchool] =
    useState<School | null>(null);

  const [university, setUniversity] =
    useState<University | null>(null);

  const [academicYears, setAcademicYears] = useState<
    YearWithSemesters[]
  >([]);

  const [openYear, setOpenYear] = useState<number | null>(null);
  const [openSemester, setOpenSemester] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(programmeId) || programmeId <= 0) {
      setError("Invalid programme ID.");
      setLoading(false);
      return;
    }

    loadProgramme(programmeId);
  }, [programmeId]);

  async function loadProgramme(id: number) {
    setLoading(true);
    setError("");

    setProgramme(null);
    setDepartment(null);
    setSchool(null);
    setUniversity(null);
    setAcademicYears([]);

    try {
      // -------------------------------------------------------
      // PROGRAMME
      // -------------------------------------------------------

      const {
        data: programmeData,
        error: programmeError,
      } = await supabase
        .from("programmes")
        .select("id, department_id, name, award")
        .eq("id", id)
        .maybeSingle();

      if (programmeError) {
        throw new Error(programmeError.message);
      }

      if (!programmeData) {
        throw new Error(
          `Programme ${id} was not found in the database.`
        );
      }

      setProgramme(programmeData);

      // -------------------------------------------------------
      // DEPARTMENT
      // -------------------------------------------------------

      const {
        data: departmentData,
        error: departmentError,
      } = await supabase
        .from("departments")
        .select("id, school_id, name")
        .eq("id", programmeData.department_id)
        .maybeSingle();

      if (departmentError) {
        throw new Error(departmentError.message);
      }

      if (!departmentData) {
        throw new Error(
          "The department connected to this programme could not be found."
        );
      }

      setDepartment(departmentData);

      // -------------------------------------------------------
      // SCHOOL
      // -------------------------------------------------------

      const {
        data: schoolData,
        error: schoolError,
      } = await supabase
        .from("schools")
        .select("id, university_id, name")
        .eq("id", departmentData.school_id)
        .maybeSingle();

      if (schoolError) {
        throw new Error(schoolError.message);
      }

      if (!schoolData) {
        throw new Error(
          "The school connected to this department could not be found."
        );
      }

      setSchool(schoolData);

      // -------------------------------------------------------
      // UNIVERSITY
      // -------------------------------------------------------

      const {
        data: universityData,
        error: universityError,
      } = await supabase
        .from("universities")
        .select("id, name")
        .eq("id", schoolData.university_id)
        .maybeSingle();

      if (universityError) {
        throw new Error(universityError.message);
      }

      if (universityData) {
        setUniversity(universityData);
      }

      // -------------------------------------------------------
      // ACADEMIC YEARS
      // -------------------------------------------------------

      const {
        data: yearData,
        error: yearError,
      } = await supabase
        .from("academic_years")
        .select("id, programme_id, year_number")
        .eq("programme_id", id)
        .order("year_number");

      if (yearError) {
        throw new Error(yearError.message);
      }

      const years = yearData ?? [];

      // -------------------------------------------------------
      // SEMESTERS
      // -------------------------------------------------------

      const yearIds = years.map((year) => year.id);

      let semesterData: Semester[] = [];

      if (yearIds.length > 0) {
        const {
          data,
          error: semesterError,
        } = await supabase
          .from("semesters")
          .select(
            "id, academic_year_id, semester_number"
          )
          .in("academic_year_id", yearIds)
          .order("semester_number");

        if (semesterError) {
          throw new Error(semesterError.message);
        }

        semesterData = data ?? [];
      }

      // -------------------------------------------------------
      // UNITS
      // -------------------------------------------------------

      const semesterIds = semesterData.map(
        (semester) => semester.id
      );

      let unitData: Unit[] = [];

      if (semesterIds.length > 0) {
        const {
          data,
          error: unitError,
        } = await supabase
          .from("units")
          .select("id, semester_id, code, name")
          .in("semester_id", semesterIds)
          .order("name");

        if (unitError) {
          throw new Error(unitError.message);
        }

        unitData = data ?? [];
      }

      // -------------------------------------------------------
      // BUILD HIERARCHY
      // -------------------------------------------------------

      const hierarchy: YearWithSemesters[] = years.map(
        (year) => ({
          ...year,

          semesters: semesterData
            .filter(
              (semester) =>
                semester.academic_year_id === year.id
            )
            .map((semester) => ({
              ...semester,

              units: unitData.filter(
                (unit) =>
                  unit.semester_id === semester.id
              ),
            })),
        })
      );

      setAcademicYears(hierarchy);

      if (hierarchy.length > 0) {
        setOpenYear(hierarchy[0].id);

        if (hierarchy[0].semesters.length > 0) {
          setOpenSemester(
            hierarchy[0].semesters[0].id
          );
        }
      }
    } catch (err) {
      console.error("Programme loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load programme."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredYears = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return academicYears;
    }

    return academicYears
      .map((year) => ({
        ...year,

        semesters: year.semesters
          .map((semester) => ({
            ...semester,

            units: semester.units.filter((unit) => {
              const code =
                unit.code?.toLowerCase() ?? "";

              const name =
                unit.name.toLowerCase();

              return (
                code.includes(query) ||
                name.includes(query)
              );
            }),
          }))
          .filter(
            (semester) => semester.units.length > 0
          ),
      }))
      .filter(
        (year) => year.semesters.length > 0
      );
  }, [academicYears, search]);

  const totalUnits = academicYears.reduce(
    (yearTotal, year) =>
      yearTotal +
      year.semesters.reduce(
        (semesterTotal, semester) =>
          semesterTotal + semester.units.length,
        0
      ),
    0
  );

  const totalSemesters = academicYears.reduce(
    (total, year) => total + year.semesters.length,
    0
  );

  if (loading) {
    return (
      <div className="ds-shell flex min-h-screen">
        <Sidebar />

        <main className="ds-main min-w-0 flex-1">
          <div className="ds-content">
            <Topbar />

            <div className="py-16">
              <p className="ds-kicker">
                Academic programme
              </p>

              <h1 className="ds-title mt-2">
                Loading programme...
              </h1>

              <p className="ds-subtitle mt-2">
                Retrieving the academic structure.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !programme) {
    return (
      <div className="ds-shell flex min-h-screen">
        <Sidebar />

        <main className="ds-main min-w-0 flex-1">
          <div className="ds-content">
            <Topbar />

            <div className="py-12">
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-6 text-sm font-bold text-[#696762] transition hover:text-[#171A21]"
              >
                ← Back
              </button>

              <div className="border border-red-200 bg-red-50 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-500">
                  Programme error
                </p>

                <h1 className="mt-2 text-2xl font-black text-red-900">
                  Unable to load programme
                </h1>

                <p className="mt-3 text-sm text-red-700">
                  {error ||
                    "This programme could not be found."}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      Number.isInteger(programmeId) &&
                      programmeId > 0
                    ) {
                      loadProgramme(programmeId);
                    }
                  }}
                  className="mt-5 border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ds-shell flex min-h-screen">
      <Sidebar />

      <main className="ds-main min-w-0 flex-1">
        <div className="ds-content">
          <Topbar />

          {/* HEADER */}
          <section className="border-b border-[#d9d7d0] py-7">
            <Link
              href="/programmes"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#696762] transition hover:text-[#171A21]"
            >
              ← Academic programmes
            </Link>

            <div className="mt-7 max-w-4xl">
              <p className="ds-kicker">
                Programme
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-[#171A21] md:text-5xl">
                {programme.name}
              </h1>

              {programme.award && (
                <p className="mt-3 text-base font-semibold text-[#696762]">
                  {programme.award}
                </p>
              )}
            </div>

            {/* BREADCRUMB */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold text-[#97948d]">
              {university && (
                <>
                  <span>{university.name}</span>
                  <span>/</span>
                </>
              )}

              {school && (
                <>
                  <span>{school.name}</span>
                  <span>/</span>
                </>
              )}

              {department && (
                <>
                  <span>{department.name}</span>
                  <span>/</span>
                </>
              )}

              <span className="text-[#171A21]">
                {programme.name}
              </span>
            </div>
          </section>

          {/* SUMMARY */}
          <section className="grid gap-0 border-b border-[#d9d7d0] md:grid-cols-3">
            <div className="border-b border-[#d9d7d0] px-1 py-5 md:border-b-0 md:border-r md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#97948d]">
                Academic years
              </p>

              <p className="mt-1 text-3xl font-black text-[#171A21]">
                {academicYears.length}
              </p>
            </div>

            <div className="border-b border-[#d9d7d0] px-1 py-5 md:border-b-0 md:border-r md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#97948d]">
                Semesters
              </p>

              <p className="mt-1 text-3xl font-black text-[#171A21]">
                {totalSemesters}
              </p>
            </div>

            <div className="px-1 py-5 md:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#97948d]">
                Units
              </p>

              <p className="mt-1 text-3xl font-black text-[#171A21]">
                {totalUnits}
              </p>
            </div>
          </section>

          {/* SEARCH */}
          <section className="border-b border-[#d9d7d0] py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#171A21]">
                  Academic structure
                </p>

                <p className="mt-1 text-xs text-[#696762]">
                  Browse units by year and semester.
                </p>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search units..."
                className="ds-input w-full sm:max-w-xs"
              />
            </div>
          </section>

          {/* YEARS */}
          <section className="py-7">
            {filteredYears.length === 0 ? (
              <div className="ds-empty">
                {search
                  ? "No units match your search."
                  : "No academic years have been configured for this programme yet."}
              </div>
            ) : (
              <div className="divide-y divide-[#d9d7d0]">
                {filteredYears.map((year) => {
                  const isYearOpen =
                    openYear === year.id;

                  const yearUnitCount =
                    year.semesters.reduce(
                      (total, semester) =>
                        total + semester.units.length,
                      0
                    );

                  return (
                    <section
                      key={year.id}
                      className="py-6 first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenYear(
                            isYearOpen ? null : year.id
                          );

                          if (
                            !isYearOpen &&
                            year.semesters.length > 0
                          ) {
                            setOpenSemester(
                              year.semesters[0].id
                            );
                          }
                        }}
                        className="group flex w-full items-center justify-between gap-5 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#B8FF3D] text-lg font-black text-[#171A21]">
                            {year.year_number}
                          </span>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#97948d]">
                              Academic year
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-[#171A21]">
                              Year {year.year_number}
                            </h2>

                            <p className="mt-1 text-xs text-[#696762]">
                              {year.semesters.length}{" "}
                              {year.semesters.length === 1
                                ? "semester"
                                : "semesters"}{" "}
                              · {yearUnitCount}{" "}
                              {yearUnitCount === 1
                                ? "unit"
                                : "units"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-2xl transition-transform ${
                            isYearOpen
                              ? "rotate-90"
                              : ""
                          }`}
                        >
                          →
                        </span>
                      </button>

                      {isYearOpen && (
                        <div className="mt-6 ml-0 border-l-2 border-[#FFB7D5] pl-5 md:ml-6">
                          <div className="divide-y divide-[#e5e2da]">
                            {year.semesters.map(
                              (semester) => {
                                const isSemesterOpen =
                                  openSemester ===
                                  semester.id;

                                return (
                                  <div
                                    key={semester.id}
                                    className="py-5 first:pt-0 last:pb-0"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenSemester(
                                          isSemesterOpen
                                            ? null
                                            : semester.id
                                        )
                                      }
                                      className="flex w-full items-center justify-between gap-4 text-left"
                                    >
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#20a8a5]">
                                          Semester
                                        </p>

                                        <h3 className="mt-1 text-lg font-black text-[#171A21]">
                                          Semester{" "}
                                          {
                                            semester.semester_number
                                          }
                                        </h3>

                                        <p className="mt-1 text-xs text-[#696762]">
                                          {
                                            semester.units
                                              .length
                                          }{" "}
                                          {semester.units
                                            .length === 1
                                            ? "unit"
                                            : "units"}
                                        </p>
                                      </div>

                                      <span
                                        className={`text-xl transition-transform ${
                                          isSemesterOpen
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      >
                                        →
                                      </span>
                                    </button>

                                    {isSemesterOpen && (
                                      <div className="mt-4 divide-y divide-[#eeeae2] border-y border-[#eeeae2]">
                                        {semester.units
                                          .length === 0 ? (
                                          <div className="px-3 py-5 text-sm text-[#97948d]">
                                            No units have been
                                            added to this
                                            semester yet.
                                          </div>
                                        ) : (
                                          semester.units.map(
                                            (unit) => (
                                              <Link
                                                key={unit.id}
                                                href={`/units/${unit.id}`}
                                                className="group flex items-center justify-between gap-4 px-3 py-4 transition hover:bg-[#f7f5ef]"
                                              >
                                                <div className="flex min-w-0 items-center gap-4">
                                                  <span className="shrink-0 text-xs font-black uppercase tracking-wider text-[#8B5CF6]">
                                                    {unit.code ||
                                                      "UNIT"}
                                                  </span>

                                                  <span className="truncate text-sm font-bold text-[#171A21] group-hover:text-[#8B5CF6]">
                                                    {unit.name}
                                                  </span>
                                                </div>

                                                <span className="shrink-0 text-lg transition-transform group-hover:translate-x-1">
                                                  →
                                                </span>
                                              </Link>
                                            )
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}