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

export default function ProgrammesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAcademicStructure();
  }, []);

  async function loadAcademicStructure() {
    setLoading(true);
    setError("");

    const [
      universitiesResult,
      schoolsResult,
      departmentsResult,
      programmesResult,
    ] = await Promise.all([
      supabase
        .from("universities")
        .select("id, name")
        .order("name"),

      supabase
        .from("schools")
        .select("id, university_id, name")
        .order("name"),

      supabase
        .from("departments")
        .select("id, school_id, name")
        .order("name"),

      supabase
        .from("programmes")
        .select("id, department_id, name, award")
        .order("name"),
    ]);

    const firstError =
      universitiesResult.error ||
      schoolsResult.error ||
      departmentsResult.error ||
      programmesResult.error;

    if (firstError) {
      console.error("Academic structure error:", firstError);
      setError(firstError.message);
    }

    const universityData = universitiesResult.data ?? [];

    setUniversities(universityData);
    setSchools(schoolsResult.data ?? []);
    setDepartments(departmentsResult.data ?? []);
    setProgrammes(programmesResult.data ?? []);

    if (
      selectedUniversityId === null &&
      universityData.length > 0
    ) {
      setSelectedUniversityId(universityData[0].id);
    }

    setLoading(false);
  }

  const visibleUniversities = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return universities;
    }

    return universities.filter((university) =>
      university.name.toLowerCase().includes(query)
    );
  }, [universities, search]);

  const selectedUniversity =
    universities.find(
      (university) => university.id === selectedUniversityId
    ) ?? null;

  const selectedSchools = selectedUniversity
    ? schools.filter(
        (school) => school.university_id === selectedUniversity.id
      )
    : [];

  return (
    <div className="ds-shell flex min-h-screen">
      <Sidebar />

      <main className="ds-main min-w-0 flex-1">
        <div className="ds-content">
          <Topbar />

          <section className="py-7">
            <p className="ds-kicker">Academic network</p>

            <h1 className="ds-title">Programmes</h1>

            <p className="ds-subtitle">
              Explore universities, schools, departments and academic
              programmes available in DataSphere.
            </p>
          </section>

          {error && (
            <div className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-bold">Unable to load academic structure</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search universities..."
              className="ds-input w-full max-w-md"
            />

            <button
              type="button"
              onClick={loadAcademicStructure}
              className="ds-btn ds-btn-secondary"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="ds-empty">
              Loading academic structure...
            </div>
          ) : visibleUniversities.length === 0 ? (
            <div className="ds-empty">
              No universities found.
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* UNIVERSITIES */}
              <aside className="border-r border-[#d9d7d0] pr-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#97948d]">
                      Universities
                    </p>

                    <p className="mt-1 text-sm text-[#696762]">
                      {visibleUniversities.length} available
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#d9d7d0] border-y border-[#d9d7d0]">
                  {visibleUniversities.map((university) => {
                    const isSelected =
                      selectedUniversityId === university.id;

                    const schoolCount = schools.filter(
                      (school) =>
                        school.university_id === university.id
                    ).length;

                    return (
                      <button
                        key={university.id}
                        type="button"
                        onClick={() =>
                          setSelectedUniversityId(university.id)
                        }
                        className={`group flex w-full items-center justify-between gap-4 px-3 py-4 text-left transition ${
                          isSelected
                            ? "bg-[#FFB7D5]"
                            : "bg-transparent hover:bg-[#f7f5ef]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-[#171A21]">
                            {university.name}
                          </p>

                          <p className="mt-1 text-xs text-[#696762]">
                            {schoolCount}{" "}
                            {schoolCount === 1
                              ? "school"
                              : "schools"}
                          </p>
                        </div>

                        <span
                          className={`text-lg transition-transform ${
                            isSelected
                              ? "translate-x-1"
                              : "group-hover:translate-x-1"
                          }`}
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* ACADEMIC STRUCTURE */}
              <section className="min-w-0">
                {selectedUniversity ? (
                  <>
                    <div className="border-b border-[#d9d7d0] pb-5">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#20a8a5]">
                        Selected university
                      </p>

                      <h2 className="mt-2 text-3xl font-black tracking-tight text-[#171A21]">
                        {selectedUniversity.name}
                      </h2>

                      <p className="mt-2 text-sm text-[#696762]">
                        Academic structure
                      </p>
                    </div>

                    <div className="mt-7">
                      {selectedSchools.length === 0 ? (
                        <div className="ds-empty">
                          No schools have been added for this university.
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {selectedSchools.map((school) => {
                            const schoolDepartments =
                              departments.filter(
                                (department) =>
                                  department.school_id ===
                                  school.id
                              );

                            return (
                              <section key={school.id}>
                                <div className="flex items-baseline justify-between gap-4 border-b border-[#d9d7d0] pb-3">
                                  <h3 className="text-xl font-black text-[#171A21]">
                                    {school.name}
                                  </h3>

                                  <span className="text-xs font-bold uppercase tracking-wider text-[#97948d]">
                                    {schoolDepartments.length}{" "}
                                    {schoolDepartments.length === 1
                                      ? "department"
                                      : "departments"}
                                  </span>
                                </div>

                                <div className="mt-4">
                                  {schoolDepartments.length === 0 ? (
                                    <p className="py-3 text-sm text-[#97948d]">
                                      No departments added yet.
                                    </p>
                                  ) : (
                                    <div className="divide-y divide-[#e5e2da]">
                                      {schoolDepartments.map(
                                        (department) => {
                                          const departmentProgrammes =
                                            programmes.filter(
                                              (programme) =>
                                                programme.department_id ===
                                                department.id
                                            );

                                          return (
                                            <div
                                              key={department.id}
                                              className="py-5"
                                            >
                                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8B5CF6]">
                                                    Department
                                                  </p>

                                                  <h4 className="mt-1 text-base font-extrabold text-[#171A21]">
                                                    {department.name}
                                                  </h4>
                                                </div>

                                                <span className="text-xs text-[#97948d]">
                                                  {
                                                    departmentProgrammes.length
                                                  }{" "}
                                                  {departmentProgrammes.length ===
                                                  1
                                                    ? "programme"
                                                    : "programmes"}
                                                </span>
                                              </div>

                                              {departmentProgrammes.length >
                                              0 ? (
                                                <div className="mt-4 divide-y divide-[#eeeae2] border-y border-[#eeeae2]">
                                                  {departmentProgrammes.map(
                                                    (programme) => (
                                                      <Link
                                                        key={
                                                          programme.id
                                                        }
                                                        href={`/programmes/${programme.id}`}
                                                        className="group flex items-center justify-between gap-4 px-3 py-4 transition hover:bg-[#f7f5ef]"
                                                      >
                                                        <div className="min-w-0">
                                                          <p className="font-bold text-[#171A21] group-hover:text-[#8B5CF6]">
                                                            {
                                                              programme.name
                                                            }
                                                          </p>

                                                          {programme.award && (
                                                            <p className="mt-1 text-xs text-[#696762]">
                                                              {
                                                                programme.award
                                                              }
                                                            </p>
                                                          )}
                                                        </div>

                                                        <span className="shrink-0 text-lg transition-transform group-hover:translate-x-1">
                                                          →
                                                        </span>
                                                      </Link>
                                                    )
                                                  )}
                                                </div>
                                              ) : (
                                                <p className="mt-4 text-sm text-[#97948d]">
                                                  No programmes added
                                                  yet.
                                                </p>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="ds-empty">
                    Select a university to explore its academic structure.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}