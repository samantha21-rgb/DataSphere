"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

type DepartmentWithContext = Department & {
  schoolName: string;
  universityName: string;
};

export default function DepartmentsPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] =
    useState<number | null>(null);

  const [selectedSchoolId, setSelectedSchoolId] =
    useState<number | null>(null);

  const [departmentName, setDepartmentName] = useState("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    ]);

    const firstError =
      universitiesResult.error ||
      schoolsResult.error ||
      departmentsResult.error;

    if (firstError) {
      setError(firstError.message);
    }

    setUniversities(universitiesResult.data ?? []);
    setSchools(schoolsResult.data ?? []);
    setDepartments(departmentsResult.data ?? []);

    setLoading(false);
  }

  const selectedUniversity =
    universities.find(
      (university) =>
        university.id === selectedUniversityId
    ) ?? null;

  const selectedSchool =
    schools.find(
      (school) =>
        school.id === selectedSchoolId
    ) ?? null;

  const availableSchools = useMemo(() => {
    if (!selectedUniversityId) {
      return [];
    }

    return schools.filter(
      (school) =>
        school.university_id === selectedUniversityId
    );
  }, [schools, selectedUniversityId]);

  const departmentDirectory = useMemo(() => {
    return departments.map((department) => {
      const school = schools.find(
        (item) => item.id === department.school_id
      );

      const university = school
        ? universities.find(
            (item) =>
              item.id === school.university_id
          )
        : undefined;

      return {
        ...department,
        schoolName:
          school?.name ?? "Unknown school",
        universityName:
          university?.name ?? "Unknown university",
      };
    });
  }, [departments, schools, universities]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return departmentDirectory;
    }

    return departmentDirectory.filter(
      (department) =>
        department.name.toLowerCase().includes(query) ||
        department.schoolName
          .toLowerCase()
          .includes(query) ||
        department.universityName
          .toLowerCase()
          .includes(query)
    );
  }, [departmentDirectory, search]);

  const selectedSchoolDepartments =
    selectedSchoolId
      ? departments.filter(
          (department) =>
            department.school_id === selectedSchoolId
        )
      : [];

  function handleUniversityChange(
    universityId: number
  ) {
    setSelectedUniversityId(universityId);
    setSelectedSchoolId(null);
    setDepartmentName("");
    setMessage("");
    setError("");
  }

  function handleSchoolChange(
    schoolId: number
  ) {
    setSelectedSchoolId(schoolId);
    setDepartmentName("");
    setMessage("");
    setError("");
  }

  async function addDepartment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = departmentName.trim();

    if (!selectedUniversityId) {
      setError("Please select a university first.");
      return;
    }

    if (!selectedSchoolId) {
      setError("Please select a school or faculty first.");
      return;
    }

    if (!name) {
      setError("Enter a department name.");
      return;
    }

    const duplicate = departments.some(
      (department) =>
        department.school_id === selectedSchoolId &&
        department.name.trim().toLowerCase() ===
          name.toLowerCase()
    );

    if (duplicate) {
      setError(
        "This department already exists under the selected school."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: insertError } =
      await supabase
        .from("departments")
        .insert({
          school_id: selectedSchoolId,
          name,
        });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setDepartmentName("");
    setMessage("Department added successfully.");

    await loadData();

    setSaving(false);
  }

  function startEditing(
    department: Department
  ) {
    setEditingId(department.id);
    setEditingName(department.name);
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(
    departmentId: number
  ) {
    const name = editingName.trim();

    if (!name) {
      setError("Department name cannot be empty.");
      return;
    }

    const currentDepartment =
      departments.find(
        (department) =>
          department.id === departmentId
      );

    if (!currentDepartment) {
      return;
    }

    const duplicate = departments.some(
      (department) =>
        department.id !== departmentId &&
        department.school_id ===
          currentDepartment.school_id &&
        department.name.trim().toLowerCase() ===
          name.toLowerCase()
    );

    if (duplicate) {
      setError(
        "Another department with this name already exists under the school."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: updateError } =
      await supabase
        .from("departments")
        .update({
          name,
        })
        .eq("id", departmentId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setEditingId(null);
    setEditingName("");
    setMessage("Department updated successfully.");

    await loadData();

    setSaving(false);
  }

  async function deleteDepartment(
    department: Department
  ) {
    const confirmed = window.confirm(
      `Delete "${department.name}"?\n\nThis should only be done if no programmes depend on this department.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(department.id);
    setError("");
    setMessage("");

    /*
     * Check whether programmes are attached.
     */
    const { count, error: programmeCheckError } =
      await supabase
        .from("programmes")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "department_id",
          department.id
        );

    if (programmeCheckError) {
      setError(
        programmeCheckError.message
      );
      setDeletingId(null);
      return;
    }

    if ((count ?? 0) > 0) {
      setError(
        "This department cannot be deleted because programmes are attached to it."
      );
      setDeletingId(null);
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("departments")
        .delete()
        .eq("id", department.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setMessage("Department deleted successfully.");

    if (
      selectedSchoolId ===
      department.school_id
    ) {
      setSelectedSchoolId(
        department.school_id
      );
    }

    await loadData();

    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-white text-[#171A21]">
      <main className="min-w-0">
        <div className="mx-auto w-full max-w-[1500px] px-5 pb-16 pt-8 sm:px-8 lg:px-10">

          {/* =====================================================
              HEADER
          ====================================================== */}

          <header className="border-b border-[#dedbe0] pb-7">
            <div className="flex flex-wrap items-start justify-between gap-5">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8B5CF6]">
                  Academic structure
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  Departments
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#625d67]">
                  Create and maintain the departments that
                  belong to each academic school or faculty in
                  DataSphere.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/schools"
                  className="border border-[#dedbe0] bg-white px-4 py-2.5 text-xs font-bold transition hover:border-[#20D6D2] hover:bg-[#f4ffff]"
                >
                  ← Schools
                </Link>

                <button
                  type="button"
                  onClick={loadData}
                  className="border border-[#171A21] bg-[#171A21] px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5"
                >
                  Refresh data
                </button>
              </div>

            </div>
          </header>


          {/* =====================================================
              STATUS
          ====================================================== */}

          {message && (
            <div className="mt-5 border-l-4 border-[#B8FF3D] bg-[#f4ffd9] px-5 py-4">
              <p className="text-xs font-bold text-[#385000]">
                {message}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-5 border-l-4 border-[#FF6B6B] bg-[#fff1f0] px-5 py-4">
              <p className="text-xs font-bold text-[#9b3028]">
                {error}
              </p>
            </div>
          )}


          {/* =====================================================
              SUMMARY
          ====================================================== */}

          <section className="mt-7 grid border-y border-[#dedbe0] sm:grid-cols-3">

            <div className="border-b border-[#dedbe0] px-5 py-5 sm:border-b-0 sm:border-r">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#89828d]">
                Universities
              </p>

              <p className="mt-1 text-3xl font-black">
                {universities.length}
              </p>
            </div>

            <div className="border-b border-[#dedbe0] px-5 py-5 sm:border-b-0 sm:border-r">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#89828d]">
                Schools / Faculties
              </p>

              <p className="mt-1 text-3xl font-black">
                {schools.length}
              </p>
            </div>

            <div className="px-5 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#89828d]">
                Departments
              </p>

              <p className="mt-1 text-3xl font-black">
                {departments.length}
              </p>
            </div>

          </section>


          {/* =====================================================
              CREATION WORKFLOW
          ====================================================== */}

          <section className="mt-8 grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">

            {/* LEFT */}
            <div className="border border-[#dedbe0] bg-[#fbfafc]">

              <div className="border-b border-[#dedbe0] px-6 py-5">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#20aaa7]">
                  Step 01
                </p>

                <h2 className="mt-1 text-xl font-black tracking-tight">
                  Choose university
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#776f79]">
                  Select the institution where the department
                  belongs.
                </p>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                  <div className="px-6 py-8 text-sm text-[#89828d]">
                    Loading universities...
                  </div>
                ) : universities.length === 0 ? (
                  <div className="px-6 py-8 text-sm text-[#89828d]">
                    No universities have been added yet.
                  </div>
                ) : (
                  universities.map(
                    (university) => {
                      const schoolCount =
                        schools.filter(
                          (school) =>
                            school.university_id ===
                            university.id
                        ).length;

                      const isSelected =
                        selectedUniversityId ===
                        university.id;

                      return (
                        <button
                          key={university.id}
                          type="button"
                          onClick={() =>
                            handleUniversityChange(
                              university.id
                            )
                          }
                          className={`flex w-full items-center gap-4 border-b border-[#ebe8ec] px-6 py-4 text-left transition ${
                            isSelected
                              ? "bg-[#eaffff]"
                              : "bg-white hover:bg-[#fafafa]"
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center text-xs font-black ${
                              isSelected
                                ? "bg-[#20D6D2]"
                                : "bg-[#f0eef2]"
                            }`}
                          >
                            {university.name.charAt(
                              0
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">
                              {university.name}
                            </span>

                            <span className="mt-1 block text-[11px] text-[#89828d]">
                              {schoolCount}{" "}
                              {schoolCount === 1
                                ? "school"
                                : "schools"}
                            </span>
                          </span>

                          <span className="text-[#89828d]">
                            →
                          </span>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>


            {/* RIGHT */}
            <div className="border border-[#dedbe0]">

              <div className="border-b border-[#dedbe0] px-6 py-5">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8B5CF6]">
                  Step 02
                </p>

                <h2 className="mt-1 text-xl font-black tracking-tight">
                  Choose school / faculty
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#776f79]">
                  {selectedUniversity
                    ? `Choose a school under ${selectedUniversity.name}.`
                    : "Select a university first."}
                </p>
              </div>

              {!selectedUniversity ? (
                <div className="px-6 py-10 text-sm text-[#89828d]">
                  Select a university from the left.
                </div>
              ) : availableSchools.length === 0 ? (
                <div className="px-6 py-10">
                  <p className="text-sm font-bold">
                    No schools have been added.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#89828d]">
                    Add a school first before creating its
                    departments.
                  </p>

                  <Link
                    href="/admin/schools"
                    className="mt-5 inline-block border border-[#171A21] bg-[#171A21] px-4 py-2.5 text-xs font-bold text-white"
                  >
                    Go to Schools
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2">
                  {availableSchools.map(
                    (school) => {
                      const isSelected =
                        selectedSchoolId ===
                        school.id;

                      const count =
                        departments.filter(
                          (department) =>
                            department.school_id ===
                            school.id
                        ).length;

                      return (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() =>
                            handleSchoolChange(
                              school.id
                            )
                          }
                          className={`border-b border-r border-[#ebe8ec] px-6 py-5 text-left transition ${
                            isSelected
                              ? "bg-[#fff2f8]"
                              : "bg-white hover:bg-[#fafafa]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block text-sm font-bold">
                                {school.name}
                              </span>

                              <span className="mt-1 block text-[11px] text-[#89828d]">
                                {count}{" "}
                                {count === 1
                                  ? "department"
                                  : "departments"}
                              </span>
                            </span>

                            {isSelected && (
                              <span className="text-[#FF6B6B]">
                                ●
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}

            </div>

          </section>


          {/* =====================================================
              ADD DEPARTMENT
          ====================================================== */}

          <section className="mt-7 border border-[#dedbe0] bg-white">

            <div className="border-b border-[#dedbe0] px-6 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#B85C3B]">
                Step 03
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight">
                Add department
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#776f79]">
                {selectedSchool
                  ? `Adding a department to ${selectedSchool.name}.`
                  : "Select a school or faculty first."}
              </p>
            </div>

            <form
              onSubmit={addDepartment}
              className="flex flex-col gap-3 px-6 py-6 sm:flex-row"
            >
              <input
                type="text"
                value={departmentName}
                onChange={(event) =>
                  setDepartmentName(
                    event.target.value
                  )
                }
                disabled={
                  !selectedSchoolId ||
                  saving
                }
                placeholder="e.g. Department of Data Science"
                className="h-12 min-w-0 flex-1 border border-[#cfc9d2] bg-white px-4 text-sm outline-none transition focus:border-[#8B5CF6] disabled:bg-[#f5f3f5]"
              />

              <button
                type="submit"
                disabled={
                  !selectedSchoolId ||
                  saving
                }
                className="h-12 shrink-0 bg-[#B8FF3D] px-7 text-xs font-black uppercase tracking-[0.08em] text-[#171A21] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Saving..."
                  : "Add department"}
              </button>
            </form>

          </section>


          {/* =====================================================
              SELECTED SCHOOL DIRECTORY
          ====================================================== */}

          {selectedSchool && (
            <section className="mt-8">

              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dedbe0] pb-4">

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#89828d]">
                    Selected school
                  </p>

                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    {selectedSchool.name}
                  </h2>

                  <p className="mt-1 text-xs text-[#89828d]">
                    {selectedSchoolDepartments.length}{" "}
                    {selectedSchoolDepartments.length ===
                    1
                      ? "department"
                      : "departments"}
                  </p>
                </div>

              </div>

              {selectedSchoolDepartments.length ===
              0 ? (
                <div className="mt-5 border border-dashed border-[#cfc9d2] px-6 py-10">
                  <p className="text-sm font-bold">
                    No departments yet.
                  </p>

                  <p className="mt-2 text-xs text-[#89828d]">
                    Add the first department using the form
                    above.
                  </p>
                </div>
              ) : (
                <div className="mt-5 border-y border-[#dedbe0]">

                  {selectedSchoolDepartments.map(
                    (
                      department,
                      index
                    ) => {
                      const isEditing =
                        editingId ===
                        department.id;

                      return (
                        <div
                          key={department.id}
                          className="flex flex-col gap-4 border-b border-[#ebe8ec] px-5 py-5 last:border-b-0 sm:flex-row sm:items-center"
                        >

                          <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#f0eef2] text-[10px] font-black">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <div className="min-w-0 flex-1">

                            {isEditing ? (
                              <input
                                value={
                                  editingName
                                }
                                onChange={(
                                  event
                                ) =>
                                  setEditingName(
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="h-10 w-full max-w-xl border border-[#8B5CF6] px-3 text-sm outline-none"
                                autoFocus
                              />
                            ) : (
                              <>
                                <p className="text-sm font-bold">
                                  {
                                    department.name
                                  }
                                </p>

                                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#89828d]">
                                  Department
                                </p>
                              </>
                            )}

                          </div>

                          <div className="flex shrink-0 gap-2">

                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    saveEdit(
                                      department.id
                                    )
                                  }
                                  className="border border-[#171A21] bg-[#171A21] px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
                                >
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    cancelEditing
                                  }
                                  className="border border-[#dedbe0] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em]"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditing(
                                      department
                                    )
                                  }
                                  className="border border-[#dedbe0] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] transition hover:border-[#8B5CF6]"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    deletingId ===
                                    department.id
                                  }
                                  onClick={() =>
                                    deleteDepartment(
                                      department
                                    )
                                  }
                                  className="border border-[#f1c4c0] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#c74d42] transition hover:bg-[#fff1f0] disabled:opacity-50"
                                >
                                  {deletingId ===
                                  department.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </section>
          )}


          {/* =====================================================
              ALL DEPARTMENTS
          ====================================================== */}

          <section className="mt-12">

            <div className="flex flex-col gap-4 border-b border-[#dedbe0] pb-5 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#20aaa7]">
                  Complete directory
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  All departments
                </h2>

                <p className="mt-1 text-xs text-[#89828d]">
                  {filteredDepartments.length}{" "}
                  departments shown
                </p>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search departments..."
                className="h-11 w-full border border-[#cfc9d2] bg-white px-4 text-sm outline-none focus:border-[#20D6D2] sm:w-80"
              />

            </div>


            {loading ? (
              <div className="py-10 text-sm text-[#89828d]">
                Loading departments...
              </div>
            ) : filteredDepartments.length ===
              0 ? (
              <div className="border-b border-[#dedbe0] py-10">
                <p className="text-sm font-bold">
                  No departments found.
                </p>

                <p className="mt-2 text-xs text-[#89828d]">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <div className="mt-1 border-b border-[#dedbe0]">

                {filteredDepartments.map(
                  (
                    department,
                    index
                  ) => (
                    <div
                      key={department.id}
                      className="grid gap-3 border-b border-[#ebe8ec] px-2 py-5 last:border-b-0 sm:grid-cols-[60px_1.4fr_1fr_1fr] sm:items-center"
                    >

                      <span className="text-[10px] font-black text-[#89828d]">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <div>
                        <p className="text-sm font-bold">
                          {
                            department.name
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#89828d]">
                          School / Faculty
                        </p>

                        <p className="mt-1 text-xs font-semibold">
                          {
                            department.schoolName
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#89828d]">
                          University
                        </p>

                        <p className="mt-1 text-xs font-semibold">
                          {
                            department.universityName
                          }
                        </p>
                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </section>


          {/* =====================================================
              NEXT STEP
          ====================================================== */}

          <div className="mt-10 flex flex-col gap-3 border-t border-[#dedbe0] pt-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-bold">
                Departments are the next level of the academic
                hierarchy.
              </p>

              <p className="mt-1 text-[11px] text-[#89828d]">
                University → School → Department → Programme
              </p>
            </div>

            <Link
              href="/admin/programmes"
              className="inline-flex items-center justify-center bg-[#8B5CF6] px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
            >
              Continue to Programmes →
            </Link>

          </div>

        </div>
      </main>
    </div>
  );
}