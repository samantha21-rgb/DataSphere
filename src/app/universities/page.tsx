"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { supabase } from "../lib/supabase";

type University = {
  id: number;
  name: string;
};

type School = {
  id: number;
  university_id: number;
  name: string;
};

type Department = {
  id: number;
  school_id: number;
  name: string;
};

type Programme = {
  id: number;
  department_id: number;
  name: string;
  award: string | null;
};

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAcademicNetwork();
  }, []);

  async function loadAcademicNetwork() {
    setLoading(true);
    setError("");

    try {
      const [
        universitiesResult,
        schoolsResult,
        departmentsResult,
        programmesResult,
      ] = await Promise.all([
        supabase
          .from("universities")
          .select("id, name")
          .order("name", { ascending: true }),

        supabase
          .from("schools")
          .select("id, university_id, name")
          .order("name", { ascending: true }),

        supabase
          .from("departments")
          .select("id, school_id, name")
          .order("name", { ascending: true }),

        supabase
          .from("programmes")
          .select("id, department_id, name, award")
          .order("name", { ascending: true }),
      ]);

      if (universitiesResult.error) {
        throw new Error(universitiesResult.error.message);
      }

      if (schoolsResult.error) {
        throw new Error(schoolsResult.error.message);
      }

      if (departmentsResult.error) {
        throw new Error(departmentsResult.error.message);
      }

      if (programmesResult.error) {
        throw new Error(programmesResult.error.message);
      }

      const loadedUniversities =
        universitiesResult.data ?? [];

      setUniversities(loadedUniversities);
      setSchools(schoolsResult.data ?? []);
      setDepartments(departmentsResult.data ?? []);
      setProgrammes(programmesResult.data ?? []);

      /*
       * Automatically select the first university.
       *
       * This prevents the page from opening with an empty
       * right-hand side and makes the explorer immediately
       * useful.
       */
      setSelectedUniversityId((current) => {
        if (
          current !== null &&
          loadedUniversities.some(
            (university) => university.id === current
          )
        ) {
          return current;
        }

        return loadedUniversities[0]?.id ?? null;
      });
    } catch (err) {
      console.error(
        "Universities page loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the academic network."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadAcademicNetwork();
    setRefreshing(false);
  }

  const filteredUniversities = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return universities;
    }

    return universities.filter((university) =>
      university.name.toLowerCase().includes(query)
    );
  }, [universities, search]);

  const selectedUniversity = universities.find(
    (university) =>
      university.id === selectedUniversityId
  ) ?? null;

  const selectedSchools = selectedUniversity
    ? schools.filter(
        (school) =>
          school.university_id ===
          selectedUniversity.id
      )
    : [];

  const universitySchoolCount = selectedUniversity
    ? selectedSchools.length
    : 0;

  const universityDepartmentCount = selectedUniversity
    ? departments.filter((department) =>
        selectedSchools.some(
          (school) =>
            school.id === department.school_id
        )
      ).length
    : 0;

  const universityProgrammeCount = selectedUniversity
    ? programmes.filter((programme) =>
        departments.some(
          (department) =>
            selectedSchools.some(
              (school) =>
                school.id === department.school_id
            ) &&
            department.id === programme.department_id
        )
      ).length
    : 0;

  return (
    <div className="ds-shell flex">
      <Sidebar />

      <main className="ds-main">
        <div className="ds-content">
          <Topbar />

          {/* PAGE INTRO */}
          <section className="py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="ds-kicker">
                  Academic network
                </p>

                <h1 className="ds-title">
                  Universities
                </h1>

                <p className="ds-subtitle max-w-2xl">
                  Explore institutions, schools,
                  departments and programmes connected
                  to DataSphere.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="border-l-4 border-[#FFB7D5] pl-4">
                  <p className="text-[10px] font900 uppercase tracking-[0.16em] text-[#89828d]">
                    Network
                  </p>

                  <p className="mt-1 text-lg font900 text-[#171A21]">
                    {universities.length}
                  </p>

                  <p className="text-xs text-[#625d67]">
                    institutions
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  className="border border-[#171A21] bg-white px-4 py-2.5 text-xs font850 text-[#171A21] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#20D6D2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          {/* ERROR */}
          {error && (
            <section className="mb-6 border-l-4 border-[#FF6B6B] bg-[#fff1f0] px-5 py-4">
              <p className="text-xs font900 uppercase tracking-[0.12em] text-[#8f3028]">
                Academic network error
              </p>

              <p className="mt-1 text-sm text-[#8f3028]">
                {error}
              </p>

              <button
                type="button"
                onClick={refresh}
                className="mt-3 text-xs font850 text-[#8f3028] underline underline-offset-4"
              >
                Try again
              </button>
            </section>
          )}

          {/* SEARCH */}
          <section className="mb-6 flex flex-col gap-3 border-y border-[#dedbe0] py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font900 uppercase tracking-[0.16em] text-[#89828d]">
                Institution directory
              </p>

              <p className="mt-1 text-sm font750 text-[#171A21]">
                {filteredUniversities.length}{" "}
                {filteredUniversities.length === 1
                  ? "university"
                  : "universities"}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search universities..."
              className="ds-input w-full sm:max-w-sm"
            />
          </section>

          {/* LOADING */}
          {loading && (
            <section className="border-y border-[#dedbe0] bg-white">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-5 border-b border-[#ebe8ec] px-5 py-6 last:border-b-0"
                >
                  <div className="h-10 w-10 bg-[#f0edf1]" />

                  <div className="flex-1">
                    <div className="h-4 w-1/3 bg-[#f0edf1]" />
                    <div className="mt-2 h-3 w-1/5 bg-[#f0edf1]" />
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* EMPTY */}
          {!loading &&
            !error &&
            universities.length === 0 && (
              <section className="border-y border-[#dedbe0] bg-white px-6 py-14 text-center">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-5 grid h-12 w-12 place-items-center bg-[#FFB7D5] text-lg font900 text-[#171A21]">
                    U
                  </div>

                  <h2 className="text-lg font900 text-[#171A21]">
                    No universities yet
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#625d67]">
                    There are currently no
                    universities connected to the
                    DataSphere academic network.
                  </p>
                </div>
              </section>
            )}

          {/* SEARCH EMPTY */}
          {!loading &&
            universities.length > 0 &&
            filteredUniversities.length === 0 && (
              <section className="border-y border-[#dedbe0] bg-white px-6 py-14 text-center">
                <h2 className="text-lg font900 text-[#171A21]">
                  No matching university
                </h2>

                <p className="mt-2 text-sm text-[#625d67]">
                  Nothing matches "{search}".
                </p>

                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-5 bg-[#171A21] px-4 py-2 text-xs font850 text-white transition hover:bg-[#20D6D2] hover:text-[#102426]"
                >
                  Clear search
                </button>
              </section>
            )}

          {/* MAIN EXPLORER */}
          {!loading &&
            filteredUniversities.length > 0 && (
              <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                {/* UNIVERSITY LIST */}
                <div className="border-y border-[#dedbe0] bg-white">
                  <div className="border-b border-[#dedbe0] px-5 py-4">
                    <p className="text-[10px] font900 uppercase tracking-[0.16em] text-[#89828d]">
                      Institutions
                    </p>
                  </div>

                  {filteredUniversities.map(
                    (university, index) => {
                      const isSelected =
                        university.id ===
                        selectedUniversityId;

                      const schoolCount =
                        schools.filter(
                          (school) =>
                            school.university_id ===
                            university.id
                        ).length;

                      return (
                        <button
                          key={university.id}
                          type="button"
                          onClick={() =>
                            setSelectedUniversityId(
                              university.id
                            )
                          }
                          className={[
                            "group flex w-full items-center gap-4 border-b border-[#ebe8ec] px-5 py-5 text-left transition-all duration-200 last:border-b-0",
                            isSelected
                              ? "bg-[#f7fbfb]"
                              : "bg-white hover:bg-[#fbfafc]",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "grid h-10 w-10 shrink-0 place-items-center text-sm font900 transition-transform duration-200 group-hover:-translate-y-0.5",
                              index % 4 === 0
                                ? "bg-[#FFB7D5]"
                                : index % 4 === 1
                                  ? "bg-[#20D6D2]"
                                  : index % 4 === 2
                                    ? "bg-[#B8FF3D]"
                                    : "bg-[#FFD84D]",
                            ].join(" ")}
                          >
                            {university.name
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font850 text-[#171A21]">
                              {university.name}
                            </span>

                            <span className="mt-1 block text-xs text-[#89828d]">
                              {schoolCount}{" "}
                              {schoolCount === 1
                                ? "school"
                                : "schools"}
                            </span>
                          </span>

                          <span
                            className={[
                              "shrink-0 text-lg transition-all duration-200",
                              isSelected
                                ? "translate-x-1 text-[#20D6D2]"
                                : "text-[#aaa4ad] group-hover:translate-x-1 group-hover:text-[#171A21]",
                            ].join(" ")}
                          >
                            →
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* ACADEMIC STRUCTURE */}
                <div className="min-w-0 border-y border-[#dedbe0] bg-white">
                  {!selectedUniversity ? (
                    <div className="px-6 py-12">
                      <p className="text-sm text-[#625d67]">
                        Select a university to explore
                        its academic structure.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* SELECTED UNIVERSITY HEADER */}
                      <header className="border-b border-[#dedbe0] px-5 py-6 sm:px-7">
                        <p className="text-[10px] font900 uppercase tracking-[0.16em] text-[#20aaa7]">
                          Selected institution
                        </p>

                        <h2 className="mt-2 text-2xl font900 tracking-[-0.035em] text-[#171A21] sm:text-3xl">
                          {selectedUniversity.name}
                        </h2>

                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                          <div>
                            <span className="text-lg font900 text-[#171A21]">
                              {universitySchoolCount}
                            </span>

                            <span className="ml-2 text-xs text-[#89828d]">
                              schools
                            </span>
                          </div>

                          <div>
                            <span className="text-lg font900 text-[#171A21]">
                              {universityDepartmentCount}
                            </span>

                            <span className="ml-2 text-xs text-[#89828d]">
                              departments
                            </span>
                          </div>

                          <div>
                            <span className="text-lg font900 text-[#171A21]">
                              {universityProgrammeCount}
                            </span>

                            <span className="ml-2 text-xs text-[#89828d]">
                              programmes
                            </span>
                          </div>
                        </div>
                      </header>

                      {/* STRUCTURE */}
                      {selectedSchools.length ===
                      0 ? (
                        <div className="px-6 py-12">
                          <div className="h-1 w-14 bg-[#FFB7D5]" />

                          <h3 className="mt-4 text-lg font900 text-[#171A21]">
                            No schools connected
                          </h3>

                          <p className="mt-2 max-w-lg text-sm leading-6 text-[#625d67]">
                            This university exists in
                            DataSphere, but no schools
                            have been connected to it
                            yet.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {selectedSchools.map(
                            (school, schoolIndex) => {
                              const schoolDepartments =
                                departments.filter(
                                  (department) =>
                                    department.school_id ===
                                    school.id
                                );

                              return (
                                <div
                                  key={school.id}
                                  className="border-b border-[#dedbe0] last:border-b-0"
                                >
                                  {/* SCHOOL */}
                                  <div className="flex items-start gap-4 px-5 py-5 sm:px-7">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#FFB7D5] text-xs font900 text-[#171A21]">
                                      {String(
                                        schoolIndex + 1
                                      ).padStart(2, "0")}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font900 uppercase tracking-[0.14em] text-[#89828d]">
                                        School
                                      </p>

                                      <h3 className="mt-1 text-base font900 text-[#171A21]">
                                        {school.name}
                                      </h3>
                                    </div>

                                    <span className="text-xs font800 text-[#89828d]">
                                      {
                                        schoolDepartments.length
                                      }{" "}
                                      dept
                                      {schoolDepartments.length ===
                                      1
                                        ? ""
                                        : "s"}
                                    </span>
                                  </div>

                                  {/* DEPARTMENTS */}
                                  {schoolDepartments.length >
                                  0 ? (
                                    <div className="pb-2 pl-5 pr-5 sm:pl-20 sm:pr-7">
                                      {schoolDepartments.map(
                                        (
                                          department
                                        ) => {
                                          const departmentProgrammes =
                                            programmes.filter(
                                              (
                                                programme
                                              ) =>
                                                programme.department_id ===
                                                department.id
                                            );

                                          return (
                                            <div
                                              key={
                                                department.id
                                              }
                                              className="border-t border-[#ebe8ec] py-5"
                                            >
                                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                  <p className="text-[10px] font900 uppercase tracking-[0.14em] text-[#89828d]">
                                                    Department
                                                  </p>

                                                  <h4 className="mt-1 text-sm font850 text-[#171A21]">
                                                    {
                                                      department.name
                                                    }
                                                  </h4>
                                                </div>

                                                <span className="text-xs text-[#89828d]">
                                                  {
                                                    departmentProgrammes.length
                                                  }{" "}
                                                  programme
                                                  {departmentProgrammes.length ===
                                                  1
                                                    ? ""
                                                    : "s"}
                                                </span>
                                              </div>

                                              {/* PROGRAMMES */}
                                              {departmentProgrammes.length >
                                              0 ? (
                                                <div className="mt-4 border-l-2 border-[#20D6D2] pl-4">
                                                  {departmentProgrammes.map(
                                                    (
                                                      programme
                                                    ) => (
                                                      <Link
                                                        key={
                                                          programme.id
                                                        }
                                                        href={`/programmes/${programme.id}`}
                                                        className="group flex items-center justify-between gap-4 border-b border-[#f0edf1] py-3 last:border-b-0"
                                                      >
                                                        <span className="min-w-0">
                                                          <span className="block text-sm font750 text-[#171A21] transition-colors group-hover:text-[#3f6f68]">
                                                            {
                                                              programme.name
                                                            }
                                                          </span>

                                                          {programme.award && (
                                                            <span className="mt-1 block text-xs text-[#89828d]">
                                                              {
                                                                programme.award
                                                              }
                                                            </span>
                                                          )}
                                                        </span>

                                                        <span className="shrink-0 text-sm text-[#aaa4ad] transition-all group-hover:translate-x-1 group-hover:text-[#171A21]">
                                                          →
                                                        </span>
                                                      </Link>
                                                    )
                                                  )}
                                                </div>
                                              ) : (
                                                <p className="mt-4 border-l-2 border-[#ebe8ec] pl-4 text-xs text-[#89828d]">
                                                  No programmes
                                                  connected
                                                  yet.
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  ) : (
                                    <p className="px-5 pb-5 pl-20 text-xs text-[#89828d] sm:px-7 sm:pl-20">
                                      No departments
                                      connected yet.
                                    </p>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

          {/* FOOTER */}
          {!loading && (
            <footer className="flex flex-col gap-3 py-7 text-xs text-[#89828d] sm:flex-row sm:items-center sm:justify-between">
              <span>
                DataSphere academic network
              </span>

              <span>
                University → School → Department →
                Programme
              </span>
            </footer>
          )}
        </div>
      </main>
    </div>
  );
}