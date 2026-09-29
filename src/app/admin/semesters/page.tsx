
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Programme = {
  id: number;
  name: string;
  award: string;
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

export default function SemestersPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [semesterNumber, setSemesterNumber] = useState("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function loadProgrammes() {
    const { data, error } = await supabase
      .from("programmes")
      .select("id, name, award")
      .order("name");

    if (error) {
      console.error("Error loading programmes:", error.message);
      return;
    }

    if (data) {
      setProgrammes(data);
    }
  }

  async function loadAcademicYears() {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, programme_id, year_number")
      .order("year_number");

    if (error) {
      console.error("Error loading academic years:", error.message);
      return;
    }

    if (data) {
      setAcademicYears(data);
    }
  }

  async function loadSemesters() {
    const { data, error } = await supabase
      .from("semesters")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error loading semesters:", error.message);
      return;
    }

    if (data) {
      setSemesters(data);
    }
  }

  async function saveSemester() {
    if (!academicYearId || !semesterNumber) {
      alert("Please select an academic year and semester.");
      return;
    }

    const semester = Number(semesterNumber);

    if (semester !== 1 && semester !== 2) {
      alert("Semester must be 1 or 2.");
      return;
    }

    if (isEditing && editingId !== null) {
      const { error } = await supabase
        .from("semesters")
        .update({
          academic_year_id: Number(academicYearId),
          semester_number: semester,
        })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("semesters")
        .insert({
          academic_year_id: Number(academicYearId),
          semester_number: semester,
        });

      if (error) {
        alert(error.message);
        return;
      }
    }

    clearForm();
    await loadSemesters();
  }

  function editSemester(semester: Semester) {
    setEditingId(semester.id);
    setIsEditing(true);

    setAcademicYearId(String(semester.academic_year_id));
    setSemesterNumber(String(semester.semester_number));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function clearForm() {
    setEditingId(null);
    setIsEditing(false);
    setAcademicYearId("");
    setSemesterNumber("");
  }

  async function deleteSemester(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this semester?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("semesters")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) {
      clearForm();
    }

    await loadSemesters();
  }

  useEffect(() => {
    loadProgrammes();
    loadAcademicYears();
    loadSemesters();
  }, []);

  function getProgramme(academicYear: AcademicYear | undefined) {
    if (!academicYear) return undefined;

    return programmes.find(
      (programme) => programme.id === academicYear.programme_id
    );
  }

  const filteredSemesters = semesters.filter((semester) => {
    const academicYear = academicYears.find(
      (year) => year.id === semester.academic_year_id
    );

    const programme = getProgramme(academicYear);

    const text = search.toLowerCase();

    return (
      `semester ${semester.semester_number}`.includes(text) ||
      `year ${academicYear?.year_number ?? ""}`.includes(text) ||
      programme?.name.toLowerCase().includes(text) ||
      programme?.award.toLowerCase().includes(text)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 p-10 text-white">
      <h1 className="mb-8 text-4xl font-bold text-cyan-400">
        Semesters Management
      </h1>

      <div className="mb-8 space-y-4 rounded-xl bg-slate-900 p-6">
        <h2 className="text-2xl font-bold">
          {isEditing ? "Edit Semester" : "Add Semester"}
        </h2>

        <select
          className="w-full rounded bg-slate-800 p-3"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
        >
          <option value="">Select Academic Year</option>

          {academicYears.map((year) => {
            const programme = programmes.find(
              (item) => item.id === year.programme_id
            );

            return (
              <option key={year.id} value={year.id}>
                {programme
                  ? `${programme.award} in ${programme.name}`
                  : "Unknown Programme"}{" "}
                - Year {year.year_number}
              </option>
            );
          })}
        </select>

        <select
          className="w-full rounded bg-slate-800 p-3"
          value={semesterNumber}
          onChange={(e) => setSemesterNumber(e.target.value)}
        >
          <option value="">Select Semester</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>

        <div className="flex gap-3">
          <button
            onClick={saveSemester}
            className="rounded-lg bg-cyan-500 px-6 py-3 hover:bg-cyan-600"
          >
            {isEditing ? "Update Semester" : "Add Semester"}
          </button>

          {isEditing && (
            <button
              onClick={clearForm}
              className="rounded-lg bg-gray-600 px-6 py-3 hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <input
        className="mb-6 w-full rounded bg-slate-800 p-3"
        placeholder="Search programme, year or semester..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-4">
        {filteredSemesters.map((semester) => {
          const academicYear = academicYears.find(
            (year) => year.id === semester.academic_year_id
          );

          const programme = getProgramme(academicYear);

          return (
            <div
              key={semester.id}
              className="rounded-xl bg-slate-900 p-5"
            >
              <h2 className="text-2xl font-bold text-cyan-400">
                Semester {semester.semester_number}
              </h2>

              <p className="mt-2 text-gray-300">
                Year {academicYear?.year_number ?? "Unknown"}
              </p>

              <p className="mt-1 text-gray-400">
                {programme
                  ? `${programme.award} in ${programme.name}`
                  : "Unknown Programme"}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => editSemester(semester)}
                  className="rounded bg-yellow-500 px-4 py-2 hover:bg-yellow-600"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteSemester(semester.id)}
                  className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredSemesters.length === 0 && (
          <div className="rounded-xl bg-slate-900 p-6 text-gray-400">
            No semesters found.
          </div>
        )}
      </div>
    </div>
  );
}