"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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

export default function AdminProgrammesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] =
    useState<number | null>(null);

  const [selectedSchoolId, setSelectedSchoolId] =
    useState<number | null>(null);

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [programmeName, setProgrammeName] = useState("");
  const [award, setAward] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
      setError(firstError.message);
    }

    setUniversities(universitiesResult.data ?? []);
    setSchools(schoolsResult.data ?? []);
    setDepartments(departmentsResult.data ?? []);
    setProgrammes(programmesResult.data ?? []);

    setLoading(false);
  }

  const selectedUniversity = universities.find(
    (university) => university.id === selectedUniversityId
  );

  const selectedSchool = schools.find(
    (school) => school.id === selectedSchoolId
  );

  const selectedDepartment = departments.find(
    (department) => department.id === selectedDepartmentId
  );

  const visibleSchools = useMemo(() => {
    if (!selectedUniversityId) return [];

    return schools.filter(
      (school) => school.university_id === selectedUniversityId
    );
  }, [schools, selectedUniversityId]);

  const visibleDepartments = useMemo(() => {
    if (!selectedSchoolId) return [];

    return departments.filter(
      (department) => department.school_id === selectedSchoolId
    );
  }, [departments, selectedSchoolId]);

  const visibleProgrammes = useMemo(() => {
    let result = programmes;

    if (selectedUniversityId) {
      const schoolIds = schools
        .filter(
          (school) => school.university_id === selectedUniversityId
        )
        .map((school) => school.id);

      const departmentIds = departments
        .filter((department) =>
          schoolIds.includes(department.school_id)
        )
        .map((department) => department.id);

      result = result.filter((programme) =>
        departmentIds.includes(programme.department_id)
      );
    }

    if (selectedSchoolId) {
      const departmentIds = departments
        .filter(
          (department) => department.school_id === selectedSchoolId
        )
        .map((department) => department.id);

      result = result.filter((programme) =>
        departmentIds.includes(programme.department_id)
      );
    }

    if (selectedDepartmentId) {
      result = result.filter(
        (programme) =>
          programme.department_id === selectedDepartmentId
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((programme) => {
        const department = departments.find(
          (item) => item.id === programme.department_id
        );

        const school = department
          ? schools.find(
              (item) => item.id === department.school_id
            )
          : null;

        const university = school
          ? universities.find(
              (item) => item.id === school.university_id
            )
          : null;

        return `${programme.name}
          ${programme.award ?? ""}
          ${department?.name ?? ""}
          ${school?.name ?? ""}
          ${university?.name ?? ""}`
          .toLowerCase()
          .includes(query);
      });
    }

    return result;
  }, [
    programmes,
    schools,
    departments,
    universities,
    selectedUniversityId,
    selectedSchoolId,
    selectedDepartmentId,
    search,
  ]);

  function handleUniversityChange(value: string) {
    const id = value ? Number(value) : null;

    setSelectedUniversityId(id);
    setSelectedSchoolId(null);
    setSelectedDepartmentId(null);
  }

  function handleSchoolChange(value: string) {
    const id = value ? Number(value) : null;

    setSelectedSchoolId(id);
    setSelectedDepartmentId(null);
  }

  function handleDepartmentChange(value: string) {
    const id = value ? Number(value) : null;

    setSelectedDepartmentId(id);
  }

  function resetForm() {
    setProgrammeName("");
    setAward("");
    setEditingId(null);
  }

  function startEdit(programme: Programme) {
    setEditingId(programme.id);
    setProgrammeName(programme.name);
    setAward(programme.award ?? "");

    setSelectedDepartmentId(programme.department_id);

    const department = departments.find(
      (item) => item.id === programme.department_id
    );

    if (department) {
      setSelectedSchoolId(department.school_id);

      const school = schools.find(
        (item) => item.id === department.school_id
      );

      if (school) {
        setSelectedUniversityId(school.university_id);
      }
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProgramme(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setMessage("");

    const name = programmeName.trim();
    const programmeAward = award.trim();

    if (!selectedUniversityId) {
      setError("Select a university.");
      return;
    }

    if (!selectedSchoolId) {
      setError("Select a school.");
      return;
    }

    if (!selectedDepartmentId) {
      setError("Select a department.");
      return;
    }

    if (!name) {
      setError("Enter the programme name.");
      return;
    }

    setSaving(true);

    if (editingId) {
      const { error: updateError } = await supabase
        .from("programmes")
        .update({
          department_id: selectedDepartmentId,
          name,
          award: programmeAward || null,
        })
        .eq("id", editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setMessage("Programme updated successfully.");
    } else {
      const { error: insertError } = await supabase
        .from("programmes")
        .insert({
          department_id: selectedDepartmentId,
          name,
          award: programmeAward || null,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setMessage("Programme added successfully.");
    }

    resetForm();
    await loadData();

    setSaving(false);
  }

  async function deleteProgramme(id: number) {
    const programme = programmes.find(
      (item) => item.id === id
    );

    if (!programme) return;

    const confirmed = window.confirm(
      `Delete "${programme.name}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("programmes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Programme deleted successfully.");

    if (editingId === id) {
      resetForm();
    }

    await loadData();
  }

  function getDepartmentName(departmentId: number) {
    return (
      departments.find(
        (department) => department.id === departmentId
      )?.name ?? "Unknown department"
    );
  }

  function getSchoolName(departmentId: number) {
    const department = departments.find(
      (item) => item.id === departmentId
    );

    if (!department) return "Unknown school";

    return (
      schools.find(
        (school) => school.id === department.school_id
      )?.name ?? "Unknown school"
    );
  }

  function getUniversityName(departmentId: number) {
    const department = departments.find(
      (item) => item.id === departmentId
    );

    if (!department) return "Unknown university";

    const school = schools.find(
      (item) => item.id === department.school_id
    );

    if (!school) return "Unknown university";

    return (
      universities.find(
        (university) => university.id === school.university_id
      )?.name ?? "Unknown university"
    );
  }

  return (
    <div className="ds-admin-shell">
      <aside className="ds-admin-sidebar">
        <div className="ds-admin-brand">
          <div className="ds-admin-symbol">DS</div>

          <div>
            <b>DataSphere</b>
            <small>Administrator</small>
          </div>
        </div>

        <div className="ds-admin-private">
          <span />
          Private administration
        </div>

        <nav className="ds-admin-nav">
          <div className="ds-admin-group">
            <span className="ds-admin-label">
              Academic Structure
            </span>

            <Link
              href="/admin/universities"
              className="ds-admin-link"
            >
              Universities
            </Link>

            <Link
              href="/admin/schools"
              className="ds-admin-link"
            >
              Schools & Faculties
            </Link>

            <Link
              href="/admin/departments"
              className="ds-admin-link"
            >
              Departments
            </Link>

            <Link
              href="/admin/programmes"
              className="ds-admin-link active"
            >
              Programmes
            </Link>

            <Link
              href="/admin/academic-years"
              className="ds-admin-link"
            >
              Academic Years
            </Link>

            <Link
              href="/admin/semesters"
              className="ds-admin-link"
            >
              Semesters
            </Link>

            <Link
              href="/admin/units"
              className="ds-admin-link"
            >
              Units
            </Link>
          </div>

          <div className="ds-admin-group">
            <span className="ds-admin-label">
              Learning
            </span>

            <Link
              href="/admin/resources"
              className="ds-admin-link"
            >
              Resources
            </Link>

            <Link
              href="/admin/assessments"
              className="ds-admin-link"
            >
              Assessments
            </Link>
          </div>

          <div className="ds-admin-group">
            <span className="ds-admin-label">
              People
            </span>

            <Link
              href="/admin/students"
              className="ds-admin-link"
            >
              Students
            </Link>

            <Link
              href="/admin/lecturers"
              className="ds-admin-link"
            >
              Lecturers
            </Link>
          </div>
        </nav>

        <div className="ds-admin-footer">
          <Link href="/dashboard">
            ← Return to DataSphere
          </Link>
        </div>
      </aside>

      <main className="ds-admin-main">
        <div className="ds-admin-mobile">
          <Link href="/dashboard">DataSphere</Link>
          <Link href="/admin">Admin</Link>
        </div>

        <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8">
          {/* HEADER */}
          <header className="mb-8 border-b border-[#e5e1d8] pb-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#8B5CF6]">
                  Academic structure
                </p>

                <h1 className="text-4xl font-black tracking-[-0.04em] text-[#171A21] md:text-5xl">
                  Programmes
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6a72]">
                  Create and manage the degree and diploma
                  programmes available within DataSphere.
                </p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black text-[#171A21]">
                  {programmes.length}
                </div>

                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8b858d]">
                  Programmes
                </div>
              </div>
            </div>
          </header>

          {/* MESSAGES */}
          {error && (
            <div className="mb-6 border-l-4 border-[#FF6B6B] bg-[#fff0ef] px-5 py-4 text-sm text-[#8f3028]">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 border-l-4 border-[#B8FF3D] bg-[#f4ffd9] px-5 py-4 text-sm text-[#315000]">
              {message}
            </div>
          )}

          {/* FORM */}
          <section className="mb-10 border border-[#ded9d0] bg-white">
            <div className="border-b border-[#e8e3dc] px-5 py-5 md:px-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#20aaa7]">
                    {editingId
                      ? "Edit programme"
                      : "New programme"}
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[#171A21]">
                    {editingId
                      ? "Update programme"
                      : "Add a programme"}
                  </h2>
                </div>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-bold text-[#6f6a72] underline underline-offset-4 hover:text-[#171A21]"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </div>

            <form
              onSubmit={saveProgramme}
              className="grid gap-5 p-5 md:grid-cols-2 md:p-7"
            >
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6f6a72]">
                  University
                </span>

                <select
                  value={selectedUniversityId ?? ""}
                  onChange={(event) =>
                    handleUniversityChange(event.target.value)
                  }
                  className="h-11 border border-[#cbc5bc] bg-white px-3 text-sm text-[#171A21] outline-none focus:border-[#20D6D2]"
                >
                  <option value="">
                    Select university
                  </option>

                  {universities.map((university) => (
                    <option
                      key={university.id}
                      value={university.id}
                    >
                      {university.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6f6a72]">
                  School / Faculty
                </span>

                <select
                  value={selectedSchoolId ?? ""}
                  onChange={(event) =>
                    handleSchoolChange(event.target.value)
                  }
                  disabled={!selectedUniversityId}
                  className="h-11 border border-[#cbc5bc] bg-white px-3 text-sm text-[#171A21] outline-none focus:border-[#20D6D2] disabled:bg-[#f5f3ef]"
                >
                  <option value="">
                    Select school
                  </option>

                  {visibleSchools.map((school) => (
                    <option
                      key={school.id}
                      value={school.id}
                    >
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6f6a72]">
                  Department
                </span>

                <select
                  value={selectedDepartmentId ?? ""}
                  onChange={(event) =>
                    handleDepartmentChange(event.target.value)
                  }
                  disabled={!selectedSchoolId}
                  className="h-11 border border-[#cbc5bc] bg-white px-3 text-sm text-[#171A21] outline-none focus:border-[#20D6D2] disabled:bg-[#f5f3ef]"
                >
                  <option value="">
                    Select department
                  </option>

                  {visibleDepartments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6f6a72]">
                  Programme name
                </span>

                <input
                  value={programmeName}
                  onChange={(event) =>
                    setProgrammeName(event.target.value)
                  }
                  placeholder="e.g. Bachelor of Science in Data Science"
                  className="h-11 border border-[#cbc5bc] bg-white px-3 text-sm text-[#171A21] outline-none placeholder:text-[#aaa4ab] focus:border-[#20D6D2]"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#6f6a72]">
                  Award
                </span>

                <input
                  value={award}
                  onChange={(event) =>
                    setAward(event.target.value)
                  }
                  placeholder="e.g. BSc, LLB, Diploma"
                  className="h-11 border border-[#cbc5bc] bg-white px-3 text-sm text-[#171A21] outline-none placeholder:text-[#aaa4ab] focus:border-[#20D6D2]"
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 border border-[#171A21] bg-[#171A21] px-6 text-xs font-black uppercase tracking-[0.08em] text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Programme"
                    : "Add Programme"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 border border-[#cbc5bc] bg-white px-6 text-xs font-black uppercase tracking-[0.08em] text-[#171A21] hover:border-[#171A21]"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          {/* DIRECTORY */}
          <section>
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#FF6B6B]">
                  Programme directory
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#171A21]">
                  Existing programmes
                </h2>
              </div>

              <div className="flex gap-3">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search programmes..."
                  className="h-10 w-full min-w-0 border border-[#cbc5bc] bg-white px-3 text-xs outline-none focus:border-[#20D6D2] md:w-72"
                />

                <button
                  type="button"
                  onClick={loadData}
                  className="h-10 border border-[#cbc5bc] bg-white px-4 text-xs font-black text-[#171A21] hover:border-[#171A21]"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="border border-[#ded9d0] bg-white px-6 py-10 text-sm text-[#777178]">
                Loading programmes...
              </div>
            ) : visibleProgrammes.length === 0 ? (
              <div className="border border-dashed border-[#cbc5bc] bg-[#faf9f6] px-6 py-12 text-center">
                <p className="text-sm font-bold text-[#171A21]">
                  No programmes found.
                </p>

                <p className="mt-2 text-xs text-[#777178]">
                  Add your first programme using the form above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#ded9d0] bg-white">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#ded9d0] bg-[#faf9f6] text-left">
                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#777178]">
                        Programme
                      </th>

                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#777178]">
                        Award
                      </th>

                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#777178]">
                        Department
                      </th>

                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#777178]">
                        School
                      </th>

                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#777178]">
                        University
                      </th>

                      <th className="px-5 py-4 text-right text-[9px] font-black uppercase tracking-[0.12em] text-[#777178]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleProgrammes.map((programme) => (
                      <tr
                        key={programme.id}
                        className="border-b border-[#eeeae4] transition-colors hover:bg-[#fffafd]"
                      >
                        <td className="px-5 py-5">
                          <div className="font-bold text-[#171A21]">
                            {programme.name}
                          </div>

                          <div className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#aaa4ab]">
                            ID #{programme.id}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span className="inline-block bg-[#f0ffcb] px-2 py-1 text-[10px] font-black text-[#466600]">
                            {programme.award || "Not specified"}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-xs text-[#4f4950]">
                          {getDepartmentName(
                            programme.department_id
                          )}
                        </td>

                        <td className="px-5 py-5 text-xs text-[#4f4950]">
                          {getSchoolName(
                            programme.department_id
                          )}
                        </td>

                        <td className="px-5 py-5 text-xs text-[#4f4950]">
                          {getUniversityName(
                            programme.department_id
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(programme)
                              }
                              className="border border-[#cbc5bc] px-3 py-2 text-[10px] font-black uppercase tracking-[0.06em] text-[#171A21] hover:border-[#20D6D2]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteProgramme(programme.id)
                              }
                              className="border border-[#ffc5c1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.06em] text-[#c83e35] hover:bg-[#fff0ef]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* CURRENT PATH */}
          <section className="mt-10 border-l-4 border-[#20D6D2] bg-[#eaffff] px-5 py-5">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#168c89]">
              Current academic path
            </p>

            <p className="mt-2 text-sm font-bold text-[#171A21]">
              {selectedUniversity?.name ?? "University"}
              {" → "}
              {selectedSchool?.name ?? "School"}
              {" → "}
              {selectedDepartment?.name ?? "Department"}
              {" → "}
              {programmeName || "Programme"}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}