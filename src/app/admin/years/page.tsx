
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Programme = {
  id: number;
  name: string;
  award: string;
  duration_years: number;
};

type AcademicYear = {
  id: number;
  programme_id: number;
  year_number: number;
};

export default function AcademicYearsPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [programmeId, setProgrammeId] = useState("");
  const [yearNumber, setYearNumber] = useState("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function loadProgrammes() {
    const { data, error } = await supabase
      .from("programmes")
      .select("id, name, award, duration_years")
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
      .select("*")
      .order("id");

    if (error) {
      console.error("Error loading academic years:", error.message);
      return;
    }

    if (data) {
      setAcademicYears(data);
    }
  }

  async function saveAcademicYear() {
    if (!programmeId || !yearNumber) {
      alert("Please select a programme and year.");
      return;
    }

    const year = Number(yearNumber);

    if (!Number.isInteger(year) || year < 1) {
      alert("Please enter a valid year number.");
      return;
    }

    const selectedProgramme = programmes.find(
      (programme) => programme.id === Number(programmeId)
    );

    if (
      selectedProgramme &&
      year > selectedProgramme.duration_years
    ) {
      alert(
        `This programme only lasts ${selectedProgramme.duration_years} year(s).`
      );
      return;
    }

    if (isEditing && editingId !== null) {
      const { error } = await supabase
        .from("academic_years")
        .update({
          programme_id: Number(programmeId),
          year_number: year,
        })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("academic_years")
        .insert({
          programme_id: Number(programmeId),
          year_number: year,
        });

      if (error) {
        alert(error.message);
        return;
      }
    }

    clearForm();
    await loadAcademicYears();
  }

  function editAcademicYear(academicYear: AcademicYear) {
    setEditingId(academicYear.id);
    setIsEditing(true);

    setProgrammeId(String(academicYear.programme_id));
    setYearNumber(String(academicYear.year_number));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function clearForm() {
    setEditingId(null);
    setIsEditing(false);
    setProgrammeId("");
    setYearNumber("");
  }

  async function deleteAcademicYear(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this academic year?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("academic_years")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) {
      clearForm();
    }

    await loadAcademicYears();
  }

  useEffect(() => {
    loadProgrammes();
    loadAcademicYears();
  }, []);

  const filteredYears = academicYears.filter((academicYear) => {
    const programme = programmes.find(
      (item) => item.id === academicYear.programme_id
    );

    const text = search.toLowerCase();

    return (
      programme?.name.toLowerCase().includes(text) ||
      programme?.award.toLowerCase().includes(text) ||
      `year ${academicYear.year_number}`.includes(text)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 p-10 text-white">
      <h1 className="mb-8 text-4xl font-bold text-cyan-400">
        Academic Years Management
      </h1>

      <div className="mb-8 space-y-4 rounded-xl bg-slate-900 p-6">
        <h2 className="text-2xl font-bold">
          {isEditing ? "Edit Academic Year" : "Add Academic Year"}
        </h2>

        <select
          className="w-full rounded bg-slate-800 p-3"
          value={programmeId}
          onChange={(e) => setProgrammeId(e.target.value)}
        >
          <option value="">Select Programme</option>

          {programmes.map((programme) => (
            <option key={programme.id} value={programme.id}>
              {programme.award} in {programme.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          className="w-full rounded bg-slate-800 p-3"
          placeholder="Year Number e.g. 1"
          value={yearNumber}
          onChange={(e) => setYearNumber(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={saveAcademicYear}
            className="rounded-lg bg-cyan-500 px-6 py-3 hover:bg-cyan-600"
          >
            {isEditing ? "Update Academic Year" : "Add Academic Year"}
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
        placeholder="Search programme or year..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-4">
        {filteredYears.map((academicYear) => {
          const programme = programmes.find(
            (item) => item.id === academicYear.programme_id
          );

          return (
            <div
              key={academicYear.id}
              className="rounded-xl bg-slate-900 p-5"
            >
              <h2 className="text-2xl font-bold text-cyan-400">
                Year {academicYear.year_number}
              </h2>

              <p className="mt-2 text-gray-300">
                {programme
                  ? `${programme.award} in ${programme.name}`
                  : "Unknown Programme"}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => editAcademicYear(academicYear)}
                  className="rounded bg-yellow-500 px-4 py-2 hover:bg-yellow-600"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteAcademicYear(academicYear.id)}
                  className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredYears.length === 0 && (
          <div className="rounded-xl bg-slate-900 p-6 text-gray-400">
            No academic years found.
          </div>
        )}
      </div>
    </div>
  );
}