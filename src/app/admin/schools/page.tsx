"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type University = {
  id: number;
  name: string;
};

type School = {
  id: number;
  name: string;
  abbreviation: string | null;
  university_id: number;
};

export default function SchoolsPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [universityId, setUniversityId] = useState("");

  const [search, setSearch] = useState("");
  const [selectedUniversityId, setSelectedUniversityId] =
    useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

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

    const [universitiesResult, schoolsResult] =
      await Promise.all([
        supabase
          .from("universities")
          .select("id, name")
          .order("name"),

        supabase
          .from("schools")
          .select("id, name, abbreviation, university_id")
          .order("name"),
      ]);

    if (universitiesResult.error) {
      setError(universitiesResult.error.message);
      setLoading(false);
      return;
    }

    if (schoolsResult.error) {
      setError(schoolsResult.error.message);
      setLoading(false);
      return;
    }

    const loadedUniversities = universitiesResult.data ?? [];
    const loadedSchools = schoolsResult.data ?? [];

    setUniversities(loadedUniversities);
    setSchools(loadedSchools);

    if (
      selectedUniversityId === null &&
      loadedUniversities.length > 0
    ) {
      setSelectedUniversityId(loadedUniversities[0].id);
      setUniversityId(String(loadedUniversities[0].id));
    }

    setLoading(false);
  }

  function resetForm() {
    setName("");
    setAbbreviation("");

    if (selectedUniversityId !== null) {
      setUniversityId(String(selectedUniversityId));
    } else {
      setUniversityId("");
    }

    setEditingId(null);
  }

  function selectUniversity(id: number) {
    setSelectedUniversityId(id);
    setUniversityId(String(id));
    setEditingId(null);
    setName("");
    setAbbreviation("");
    setMessage("");
    setError("");
  }

  async function saveSchool() {
    setMessage("");
    setError("");

    const cleanName = name.trim();
    const cleanAbbreviation = abbreviation.trim();

    if (!cleanName) {
      setError("Please enter the school name.");
      return;
    }

    if (!universityId) {
      setError("Please select a university.");
      return;
    }

    const numericUniversityId = Number(universityId);

    if (!Number.isFinite(numericUniversityId)) {
      setError("Invalid university selected.");
      return;
    }

    setSaving(true);

    if (editingId !== null) {
      const { error: updateError } = await supabase
        .from("schools")
        .update({
          name: cleanName,
          abbreviation: cleanAbbreviation || null,
          university_id: numericUniversityId,
        })
        .eq("id", editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setMessage("School updated successfully.");
    } else {
      const { error: insertError } = await supabase
        .from("schools")
        .insert({
          name: cleanName,
          abbreviation: cleanAbbreviation || null,
          university_id: numericUniversityId,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setMessage("School added successfully.");
    }

    setSaving(false);

    resetForm();
    await loadData();
  }

  function startEdit(school: School) {
    setEditingId(school.id);
    setName(school.name);
    setAbbreviation(school.abbreviation ?? "");
    setUniversityId(String(school.university_id));

    setSelectedUniversityId(school.university_id);

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    resetForm();
    setMessage("");
    setError("");
  }

  async function deleteSchool(school: School) {
    const confirmed = window.confirm(
      `Delete "${school.name}"?\n\nThis should only be done if the school has no academic data attached to it.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(school.id);
    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("schools")
      .delete()
      .eq("id", school.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    if (editingId === school.id) {
      resetForm();
    }

    setMessage("School deleted successfully.");
    setDeletingId(null);

    await loadData();
  }

  const selectedUniversity = universities.find(
    (university) => university.id === selectedUniversityId
  );

  const selectedSchools = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schools.filter((school) => {
      if (
        selectedUniversityId !== null &&
        school.university_id !== selectedUniversityId
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        school.name.toLowerCase().includes(query) ||
        (school.abbreviation ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [schools, search, selectedUniversityId]);

  const totalSchools = schools.length;

  return (
    <div className="min-h-screen bg-[#fcfaf6]">
      <div className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-7 lg:px-10">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="border-b border-[#ded3c5] pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <p className="text-[10px] font900 uppercase tracking-[0.2em] text-[#8b5cf6]">
                Academic structure
              </p>

              <h1 className="mt-2 text-4xl font900 tracking-[-0.045em] text-[#171A21] sm:text-5xl">
                Schools & Faculties
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#776e68]">
                Manage the academic schools and faculties connected
                to each university in the DataSphere network.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="border border-[#171A21] bg-white px-5 py-3 text-xs font800 uppercase tracking-[0.08em] text-[#171A21] transition hover:-translate-y-0.5 hover:bg-[#171A21] hover:text-white"
            >
              Refresh data
            </button>

          </div>
        </header>

        {/* =====================================================
            STATUS
        ====================================================== */}

        {message && (
          <div className="mt-5 border-l-4 border-[#B8FF3D] bg-[#f1ffd8] px-5 py-4 text-sm font700 text-[#263400]">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 border-l-4 border-[#FF6B6B] bg-[#fff0ee] px-5 py-4 text-sm font650 text-[#7b3028]">
            <p className="font800">Something went wrong</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* =====================================================
            SUMMARY
        ====================================================== */}

        <section className="mt-7 grid border border-[#ded3c5] bg-white sm:grid-cols-3">

          <div className="border-b border-[#ded3c5] p-6 sm:border-b-0 sm:border-r">
            <p className="text-[9px] font900 uppercase tracking-[0.18em] text-[#776e68]">
              Universities
            </p>

            <p className="mt-2 text-4xl font900 tracking-[-0.04em] text-[#171A21]">
              {universities.length}
            </p>
          </div>

          <div className="border-b border-[#ded3c5] p-6 sm:border-b-0 sm:border-r">
            <p className="text-[9px] font900 uppercase tracking-[0.18em] text-[#776e68]">
              Schools / Faculties
            </p>

            <p className="mt-2 text-4xl font900 tracking-[-0.04em] text-[#171A21]">
              {totalSchools}
            </p>
          </div>

          <div className="p-6">
            <p className="text-[9px] font900 uppercase tracking-[0.18em] text-[#776e68]">
              Selected University
            </p>

            <p className="mt-3 truncate text-lg font850 text-[#171A21]">
              {selectedUniversity?.name ?? "None selected"}
            </p>
          </div>

        </section>

        {/* =====================================================
            MAIN WORKSPACE
        ====================================================== */}

        <section className="mt-7 grid gap-7 xl:grid-cols-[360px_minmax(0,1fr)]">

          {/* ===================================================
              UNIVERSITY SELECTOR
          ==================================================== */}

          <aside className="border border-[#ded3c5] bg-white">

            <div className="border-b border-[#ded3c5] px-6 py-5">
              <p className="text-[9px] font900 uppercase tracking-[0.18em] text-[#20a9a6]">
                Step 01
              </p>

              <h2 className="mt-2 text-xl font900 tracking-tight text-[#171A21]">
                Select university
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#776e68]">
                Choose the institution where the school belongs.
              </p>
            </div>

            <div className="max-h-[620px] overflow-y-auto">

              {loading ? (
                <div className="px-6 py-8 text-sm text-[#776e68]">
                  Loading universities...
                </div>
              ) : universities.length === 0 ? (
                <div className="px-6 py-8 text-sm text-[#776e68]">
                  No universities found.
                </div>
              ) : (
                universities.map((university) => {

                  const count = schools.filter(
                    (school) =>
                      school.university_id === university.id
                  ).length;

                  const active =
                    selectedUniversityId === university.id;

                  return (
                    <button
                      key={university.id}
                      type="button"
                      onClick={() =>
                        selectUniversity(university.id)
                      }
                      className={`group flex w-full items-center gap-4 border-b border-[#eee6dc] px-6 py-5 text-left transition ${
                        active
                          ? "bg-[#e9ffff]"
                          : "bg-white hover:bg-[#fff8fb]"
                      }`}
                    >

                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center text-xs font900 ${
                          active
                            ? "bg-[#20D6D2] text-[#102526]"
                            : "bg-[#f3eee8] text-[#776e68]"
                        }`}
                      >
                        {university.name.charAt(0)}
                      </span>

                      <span className="min-w-0 flex-1">

                        <span
                          className={`block truncate text-sm font800 ${
                            active
                              ? "text-[#171A21]"
                              : "text-[#332b27]"
                          }`}
                        >
                          {university.name}
                        </span>

                        <span className="mt-1 block text-[10px] text-[#89828d]">
                          {count}{" "}
                          {count === 1
                            ? "school"
                            : "schools"}
                        </span>

                      </span>

                      <span
                        className={`text-lg transition-transform ${
                          active
                            ? "translate-x-1 text-[#20a9a6]"
                            : "text-[#b3aaa1] group-hover:translate-x-1"
                        }`}
                      >
                        →
                      </span>

                    </button>
                  );
                })
              )}

            </div>
          </aside>

          {/* ===================================================
              RIGHT WORKSPACE
          ==================================================== */}

          <div className="min-w-0">

            {/* =================================================
                ADD / EDIT
            ================================================== */}

            <div className="border border-[#ded3c5] bg-white">

              <div className="border-b border-[#ded3c5] px-6 py-5 sm:px-7">

                <p className="text-[9px] font900 uppercase tracking-[0.18em] text-[#B8D900]">
                  Step 02
                </p>

                <h2 className="mt-2 text-2xl font900 tracking-[-0.025em] text-[#171A21]">
                  {editingId !== null
                    ? "Edit academic school"
                    : "Add academic school"}
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#776e68]">
                  {selectedUniversity
                    ? editingId !== null
                      ? `Editing a school under ${selectedUniversity.name}.`
                      : `Adding to ${selectedUniversity.name}.`
                    : "Select a university first."}
                </p>

              </div>

              <div className="p-6 sm:p-7">

                <div className="grid gap-5 lg:grid-cols-[1fr_220px]">

                  <label className="block">

                    <span className="mb-2 block text-[10px] font850 uppercase tracking-[0.1em] text-[#776e68]">
                      School / Faculty name
                    </span>

                    <input
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      placeholder="e.g. School of Computing"
                      className="h-12 w-full border border-[#cfc4b8] bg-white px-4 text-sm text-[#171A21] outline-none transition placeholder:text-[#aaa19a] focus:border-[#20D6D2] focus:ring-2 focus:ring-[#20D6D2]/20"
                    />

                  </label>

                  <label className="block">

                    <span className="mb-2 block text-[10px] font850 uppercase tracking-[0.1em] text-[#776e68]">
                      Abbreviation
                    </span>

                    <input
                      type="text"
                      value={abbreviation}
                      onChange={(event) =>
                        setAbbreviation(
                          event.target.value
                        )
                      }
                      placeholder="e.g. SOC"
                      className="h-12 w-full border border-[#cfc4b8] bg-white px-4 text-sm uppercase text-[#171A21] outline-none transition placeholder:text-[#aaa19a] focus:border-[#20D6D2] focus:ring-2 focus:ring-[#20D6D2]/20"
                    />

                  </label>

                </div>

                <div className="mt-5">

                  <label className="block">

                    <span className="mb-2 block text-[10px] font850 uppercase tracking-[0.1em] text-[#776e68]">
                      University
                    </span>

                    <select
                      value={universityId}
                      onChange={(event) => {
                        setUniversityId(
                          event.target.value
                        );

                        setSelectedUniversityId(
                          Number(event.target.value)
                        );
                      }}
                      className="h-12 w-full border border-[#cfc4b8] bg-white px-4 text-sm text-[#171A21] outline-none transition focus:border-[#20D6D2] focus:ring-2 focus:ring-[#20D6D2]/20"
                    >
                      <option value="">
                        Select university
                      </option>

                      {universities.map(
                        (university) => (
                          <option
                            key={university.id}
                            value={university.id}
                          >
                            {university.name}
                          </option>
                        )
                      )}

                    </select>

                  </label>

                </div>

                <div className="mt-6 flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={saveSchool}
                    disabled={saving}
                    className="border border-[#171A21] bg-[#B8FF3D] px-7 py-3 text-xs font900 uppercase tracking-[0.08em] text-[#171A21] transition hover:-translate-y-0.5 hover:bg-[#caff70] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId !== null
                      ? "Update school"
                      : "Add school"}
                  </button>

                  {editingId !== null && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="border border-[#cfc4b8] bg-white px-7 py-3 text-xs font800 uppercase tracking-[0.08em] text-[#776e68] transition hover:border-[#171A21] hover:text-[#171A21]"
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </div>
            </div>

            {/* =================================================
                DIRECTORY
            ================================================== */}

            <div className="mt-7 border border-[#ded3c5] bg-white">

              <div className="flex flex-col gap-5 border-b border-[#ded3c5] px-6 py-5 sm:px-7 lg:flex-row lg:items-end lg:justify-between">

                <div>

                  <p className="text-[9px] font900 uppercase tracking-[0.18em] text-[#FF6B6B]">
                    Step 03
                  </p>

                  <h2 className="mt-2 text-2xl font900 tracking-[-0.025em] text-[#171A21]">
                    Academic directory
                  </h2>

                  <p className="mt-2 text-xs text-[#776e68]">
                    {selectedSchools.length}{" "}
                    {selectedSchools.length === 1
                      ? "school"
                      : "schools"}{" "}
                    under{" "}
                    {selectedUniversity?.name ??
                      "selected university"}
                  </p>

                </div>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search schools..."
                  className="h-11 w-full border border-[#cfc4b8] bg-white px-4 text-sm text-[#171A21] outline-none transition placeholder:text-[#aaa19a] focus:border-[#20D6D2] focus:ring-2 focus:ring-[#20D6D2]/20 lg:w-72"
                />

              </div>

              {loading ? (
                <div className="px-6 py-10 text-sm text-[#776e68]">
                  Loading schools...
                </div>
              ) : selectedSchools.length === 0 ? (
                <div className="px-6 py-12 sm:px-7">

                  <div className="border-l-4 border-[#FFD84D] bg-[#fffbe8] px-5 py-5">

                    <p className="text-sm font800 text-[#171A21]">
                      No schools found.
                    </p>

                    <p className="mt-2 max-w-xl text-xs leading-5 text-[#776e68]">
                      Add a school for this university using
                      the form above.
                    </p>

                  </div>

                </div>
              ) : (
                <div>

                  {selectedSchools.map(
                    (school, index) => (
                      <div
                        key={school.id}
                        className="group flex flex-col gap-5 border-b border-[#eee6dc] px-6 py-6 transition last:border-b-0 hover:bg-[#fffafb] sm:flex-row sm:items-center sm:px-7"
                      >

                        <div className="flex min-w-0 flex-1 items-center gap-4">

                          <div className="grid h-11 w-11 shrink-0 place-items-center bg-[#20D6D2] text-xs font900 text-[#102526]">
                            {String(index + 1).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate text-base font850 text-[#171A21]">
                              {school.name}
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-[#89828d]">

                              {school.abbreviation && (
                                <>
                                  <span>
                                    {
                                      school.abbreviation
                                    }
                                  </span>

                                  <span>·</span>
                                </>
                              )}

                              <span>
                                School / Faculty
                              </span>

                            </div>

                          </div>

                        </div>

                        <div className="flex shrink-0 gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              startEdit(school)
                            }
                            className="border border-[#cfc4b8] bg-white px-5 py-2.5 text-[10px] font850 uppercase tracking-[0.08em] text-[#332b27] transition hover:border-[#171A21] hover:bg-[#171A21] hover:text-white"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSchool(school)
                            }
                            disabled={
                              deletingId === school.id
                            }
                            className="border border-[#f0c5bf] bg-white px-5 py-2.5 text-[10px] font850 uppercase tracking-[0.08em] text-[#c95745] transition hover:border-[#FF6B6B] hover:bg-[#fff0ee] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === school.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </div>
        </section>

      </div>
    </div>
  );
}