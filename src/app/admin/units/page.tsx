
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

type Unit = {
  id: number;
  semester_id: number;
  name: string;
  code: string;
  description: string | null;
};

export default function UnitsPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [programmeId, setProgrammeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  async function loadProgrammes() {
    const { data, error } = await supabase
      .from("programmes")
      .select("id, name, award")
      .order("name");

    if (error) {
      console.error(error.message);
      return;
    }

    setProgrammes(data ?? []);
  }

  async function loadAcademicYears() {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, programme_id, year_number")
      .order("year_number");

    if (error) {
      console.error(error.message);
      return;
    }

    setAcademicYears(data ?? []);
  }

  async function loadSemesters() {
    const { data, error } = await supabase
      .from("semesters")
      .select("id, academic_year_id, semester_number")
      .order("semester_number");

    if (error) {
      console.error(error.message);
      return;
    }

    setSemesters(data ?? []);
  }

  async function loadUnits() {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("name");

    if (error) {
      console.error(error.message);
      return;
    }

    setUnits(data ?? []);
  }

  useEffect(() => {
    loadProgrammes();
    loadAcademicYears();
    loadSemesters();
    loadUnits();
  }, []);

  const availableYears = academicYears.filter(
    (year) => year.programme_id === Number(programmeId)
  );

  const availableSemesters = semesters.filter(
    (semester) =>
      semester.academic_year_id === Number(academicYearId)
  );

  function handleProgrammeChange(value: string) {
    setProgrammeId(value);
    setAcademicYearId("");
    setSemesterId("");
  }

  function handleYearChange(value: string) {
    setAcademicYearId(value);
    setSemesterId("");
  }

  async function saveUnit() {
    if (!programmeId || !academicYearId || !semesterId) {
      alert("Please select the programme, academic year and semester.");
      return;
    }

    if (!name.trim() || !code.trim()) {
      alert("Please enter the unit name and code.");
      return;
    }

    const unitData = {
      semester_id: Number(semesterId),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
    };

    if (isEditing && editingId !== null) {
      const { error } = await supabase
        .from("units")
        .update(unitData)
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("units")
        .insert(unitData);

      if (error) {
        alert(error.message);
        return;
      }
    }

    clearForm();
    await loadUnits();
  }

  function editUnit(unit: Unit) {
    const semester = semesters.find(
      (item) => item.id === unit.semester_id
    );

    if (!semester) {
      alert("The semester for this unit could not be found.");
      return;
    }

    const academicYear = academicYears.find(
      (year) => year.id === semester.academic_year_id
    );

    if (!academicYear) {
      alert("The academic year for this unit could not be found.");
      return;
    }

    setEditingId(unit.id);
    setIsEditing(true);

    setProgrammeId(String(academicYear.programme_id));
    setAcademicYearId(String(academicYear.id));
    setSemesterId(String(semester.id));

    setName(unit.name);
    setCode(unit.code);
    setDescription(unit.description ?? "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function clearForm() {
    setEditingId(null);
    setIsEditing(false);

    setProgrammeId("");
    setAcademicYearId("");
    setSemesterId("");

    setName("");
    setCode("");
    setDescription("");
  }

  async function deleteUnit(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this unit?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("units")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === id) {
      clearForm();
    }

    await loadUnits();
  }

  const filteredUnits = units.filter((unit) => {
    const text = search.toLowerCase();

    return (
      unit.name.toLowerCase().includes(text) ||
      unit.code.toLowerCase().includes(text) ||
      (unit.description ?? "").toLowerCase().includes(text)
    );
  });

  function getUnitLocation(unit: Unit) {
    const semester = semesters.find(
      (item) => item.id === unit.semester_id
    );

    const academicYear = academicYears.find(
      (year) => year.id === semester?.academic_year_id
    );

    const programme = programmes.find(
      (item) => item.id === academicYear?.programme_id
    );

    return {
      programme,
      academicYear,
      semester,
    };
  }

  return (
    <div className="min-h-screen bg-slate-950 p-10 text-white">
      <h1 className="mb-8 text-4xl font-bold text-cyan-400">
        Units Management
      </h1>

      {/* Add / Edit Form */}
      <div className="mb-8 space-y-4 rounded-xl bg-slate-900 p-6">
        <h2 className="text-2xl font-bold">
          {isEditing ? "Edit Unit" : "Add New Unit"}
        </h2>

        {/* Programme */}
        <select
          className="w-full rounded bg-slate-800 p-3"
          value={programmeId}
          onChange={(e) =>
            handleProgrammeChange(e.target.value)
          }
        >
          <option value="">Select Programme</option>

          {programmes.map((programme) => (
            <option key={programme.id} value={programme.id}>
              {programme.award} in {programme.name}
            </option>
          ))}
        </select>

        {/* Academic Year */}
        <select
          className="w-full rounded bg-slate-800 p-3"
          value={academicYearId}
          onChange={(e) => handleYearChange(e.target.value)}
          disabled={!programmeId}
        >
          <option value="">Select Academic Year</option>

          {availableYears.map((year) => (
            <option key={year.id} value={year.id}>
              Year {year.year_number}
            </option>
          ))}
        </select>

        {/* Semester */}
        <select
          className="w-full rounded bg-slate-800 p-3"
          value={semesterId}
          onChange={(e) => setSemesterId(e.target.value)}
          disabled={!academicYearId}
        >
          <option value="">Select Semester</option>

          {availableSemesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              Semester {semester.semester_number}
            </option>
          ))}
        </select>

        {/* Unit Name */}
        <input
          className="w-full rounded bg-slate-800 p-3"
          placeholder="Unit Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Unit Code */}
        <input
          className="w-full rounded bg-slate-800 p-3"
          placeholder="Unit Code e.g. DS101"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        {/* Description */}
        <textarea
          className="min-h-28 w-full rounded bg-slate-800 p-3"
          placeholder="Unit Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={saveUnit}
            className="rounded-lg bg-cyan-500 px-6 py-3 hover:bg-cyan-600"
          >
            {isEditing ? "Update Unit" : "Add Unit"}
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

      {/* Search */}
      <input
        className="mb-6 w-full rounded bg-slate-800 p-3"
        placeholder="Search units by name, code or description..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Units List */}
      <div className="space-y-4">
        {filteredUnits.map((unit) => {
          const location = getUnitLocation(unit);

          return (
            <div
              key={unit.id}
              className="rounded-xl bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-cyan-400">
                    {unit.name}
                  </h2>

                  <p className="mt-1 font-semibold">
                    {unit.code}
                  </p>
                </div>
              </div>

              {unit.description && (
                <p className="mt-3 text-gray-300">
                  {unit.description}
                </p>
              )}

              <div className="mt-4 text-sm text-gray-400">
                <p>
                  Programme:{" "}
                  {location.programme
                    ? `${location.programme.award} in ${location.programme.name}`
                    : "Unknown Programme"}
                </p>

                <p>
                  Academic Year:{" "}
                  {location.academicYear
                    ? `Year ${location.academicYear.year_number}`
                    : "Unknown"}
                </p>

                <p>
                  Semester:{" "}
                  {location.semester
                    ? `Semester ${location.semester.semester_number}`
                    : "Unknown"}
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => editUnit(unit)}
                  className="rounded bg-yellow-500 px-4 py-2 hover:bg-yellow-600"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteUnit(unit.id)}
                  className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredUnits.length === 0 && (
          <div className="rounded-xl bg-slate-900 p-6 text-gray-400">
            No units found.
          </div>
        )}
      </div>
    </div>
  );
}