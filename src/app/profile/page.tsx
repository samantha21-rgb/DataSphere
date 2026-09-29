
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  code: string;
  name: string;
};

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");

  // Database data
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Selected IDs
  const [universityId, setUniversityId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function initialisePage() {
      await loadAcademicData();
      await loadProfile();
      setPageLoading(false);
    }

    initialisePage();
  }, []);

  async function loadAcademicData() {
    const [
      universitiesResult,
      schoolsResult,
      departmentsResult,
      programmesResult,
      yearsResult,
      semestersResult,
      unitsResult,
    ] = await Promise.all([
      supabase.from("universities").select("id, name").order("name"),

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

      supabase
        .from("academic_years")
        .select("id, programme_id, year_number")
        .order("year_number"),

      supabase
        .from("semesters")
        .select("id, academic_year_id, semester_number")
        .order("semester_number"),

      supabase
        .from("units")
        .select("id, semester_id, code, name")
        .order("code")

        
    ]);

    if (universitiesResult.error) {
      console.error(
        "Universities:",
        universitiesResult.error.message
      );
    }

    if (schoolsResult.error) {
      console.error("Schools:", schoolsResult.error.message);
    }

    if (departmentsResult.error) {
      console.error(
        "Departments:",
        departmentsResult.error.message
      );
    }

    if (programmesResult.error) {
      console.error(
        "Programmes:",
        programmesResult.error.message
      );
    }

    if (yearsResult.error) {
      console.error(
        "Academic years:",
        yearsResult.error.message
      );
    }

    if (semestersResult.error) {
      console.error(
        "Semesters:",
        semestersResult.error.message
      );

    if (unitsResult.error) {
      console.error("Units:", unitsResult.error.message);
    }
    }

    setUniversities(universitiesResult.data ?? []);
    setSchools(schoolsResult.data ?? []);
    setDepartments(departmentsResult.data ?? []);
    setProgrammes(programmesResult.data ?? []);
    setAcademicYears(yearsResult.data ?? []);
    setSemesters(semestersResult.data ?? []);
    setUnits(unitsResult.data ?? []);
  }

  async function loadProfile() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError.message);
      return;
    }

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        full_name,
        university_id,
        school_id,
        department_id,
        programme_id,
        academic_year_id,
        semester_id
        `
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile:", error.message);
      return;
    }

    if (!data) return;

    setFullName(data.full_name ?? "");

    setUniversityId(
      data.university_id ? String(data.university_id) : ""
    );

    setSchoolId(
      data.school_id ? String(data.school_id) : ""
    );

    setDepartmentId(
      data.department_id ? String(data.department_id) : ""
    );

    setProgrammeId(
      data.programme_id ? String(data.programme_id) : ""
    );

    setAcademicYearId(
      data.academic_year_id
        ? String(data.academic_year_id)
        : ""
    );

    setSemesterId(
      data.semester_id ? String(data.semester_id) : ""
    );
  }

  // -------------------------------
  // FILTERED DROPDOWN DATA
  // -------------------------------

  const availableSchools = schools.filter(
    (school) =>
      school.university_id === Number(universityId)
  );

  const availableDepartments = departments.filter(
    (department) =>
      department.school_id === Number(schoolId)
  );

  const availableProgrammes = programmes.filter(
    (programme) =>
      programme.department_id === Number(departmentId)
  );

  const availableYears = academicYears.filter(
    (year) =>
      year.programme_id === Number(programmeId)
  );

  const availableSemesters = semesters.filter(
    (semester) =>
      semester.academic_year_id === Number(academicYearId)
  );

  const availableUnits = units.filter(
    (units) => units.semester_id == Number(semesterId)
  )



  // -------------------------------
  // DROPDOWN CHANGES
  // -------------------------------

  function handleUniversityChange(value: string) {
    setUniversityId(value);

    setSchoolId("");
    setDepartmentId("");
    setProgrammeId("");
    setAcademicYearId("");
    setSemesterId("");
  }

  function handleSchoolChange(value: string) {
    setSchoolId(value);

    setDepartmentId("");
    setProgrammeId("");
    setAcademicYearId("");
    setSemesterId("");
  }

  function handleDepartmentChange(value: string) {
    setDepartmentId(value);

    setProgrammeId("");
    setAcademicYearId("");
    setSemesterId("");
  }

  function handleProgrammeChange(value: string) {
    setProgrammeId(value);

    setAcademicYearId("");
    setSemesterId("");
  }

  function handleYearChange(value: string) {
    setAcademicYearId(value);

    setSemesterId("");
  }

  // -------------------------------
  // SAVE PROFILE
  // -------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (
      !universityId ||
      !schoolId ||
      !departmentId ||
      !programmeId ||
      !academicYearId ||
      !semesterId
    ) {
      alert("Please complete all academic information.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const selectedUniversity = universities.find(
      (item) => item.id === Number(universityId)
    );

    const selectedSchool = schools.find(
      (item) => item.id === Number(schoolId)
    );

    const selectedProgramme = programmes.find(
      (item) => item.id === Number(programmeId)
    );

    const selectedYear = academicYears.find(
      (item) => item.id === Number(academicYearId)
    );

    const selectedSemester = semesters.find(
      (item) => item.id === Number(semesterId)
    );

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,

          full_name: fullName.trim(),

          // New relational columns
          university_id: Number(universityId),
          school_id: Number(schoolId),
          department_id: Number(departmentId),
          programme_id: Number(programmeId),
          academic_year_id: Number(academicYearId),
          semester_id: Number(semesterId),

          // Keep old columns updated temporarily
          university: selectedUniversity?.name ?? "",
          school: selectedSchool?.name ?? "",
          course: selectedProgramme?.name ?? "",
          year_of_study: selectedYear
            ? `Year ${selectedYear.year_number}`
            : "",
          semester: selectedSemester
            ? `Semester ${selectedSemester.semester_number}`
            : "",
        },
        {
          onConflict: "id",
        }
      );

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile saved successfully!");
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-lg text-gray-300">
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-5 rounded-xl bg-slate-900 p-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            Student Profile
          </h1>

          <p className="mt-2 text-gray-400">
            Select your academic information.
          </p>
        </div>

        {/* FULL NAME */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Full Name
          </label>

          <input
            type="text"
            placeholder="Full Name"
            className="w-full rounded bg-slate-800 p-3 text-white"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* UNIVERSITY */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            University
          </label>

          <select
            className="w-full rounded bg-slate-800 p-3 text-white"
            value={universityId}
            onChange={(e) =>
              handleUniversityChange(e.target.value)
            }
          >
            <option value="">Select University</option>

            {universities.map((university) => (
              <option
                key={university.id}
                value={university.id}
              >
                {university.name}
              </option>
            ))}
          </select>
        </div>

        {/* SCHOOL */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            School / Faculty
          </label>

          <select
            className="w-full rounded bg-slate-800 p-3 text-white disabled:opacity-50"
            value={schoolId}
            onChange={(e) =>
              handleSchoolChange(e.target.value)
            }
            disabled={!universityId}
          >
            <option value="">Select School</option>

            {availableSchools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>

        {/* DEPARTMENT */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Department
          </label>

          <select
            className="w-full rounded bg-slate-800 p-3 text-white disabled:opacity-50"
            value={departmentId}
            onChange={(e) =>
              handleDepartmentChange(e.target.value)
            }
            disabled={!schoolId}
          >
            <option value="">Select Department</option>

            {availableDepartments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </div>

        {/* PROGRAMME */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Programme
          </label>

          <select
            className="w-full rounded bg-slate-800 p-3 text-white disabled:opacity-50"
            value={programmeId}
            onChange={(e) =>
              handleProgrammeChange(e.target.value)
            }
            disabled={!departmentId}
          >
            <option value="">Select Programme</option>

            {availableProgrammes.map((programme) => (
              <option
                key={programme.id}
                value={programme.id}
              >
                {programme.award} in {programme.name}
              </option>
            ))}
          </select>
        </div>

        {/* YEAR */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Year of Study
          </label>

          <select
            className="w-full rounded bg-slate-800 p-3 text-white disabled:opacity-50"
            value={academicYearId}
            onChange={(e) =>
              handleYearChange(e.target.value)
            }
            disabled={!programmeId}
          >
            <option value="">Select Year</option>

            {availableYears.map((year) => (
              <option key={year.id} value={year.id}>
                Year {year.year_number}
              </option>
            ))}
          </select>
        </div>

        {/* SEMESTER */}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Semester
          </label>

          <select
            className="w-full rounded bg-slate-800 p-3 text-white disabled:opacity-50"
            value={semesterId}
            onChange={(e) =>
              setSemesterId(e.target.value)
            }
            disabled={!academicYearId}
          >
            <option value="">Select Semester</option>

            {availableSemesters.map((semester) => (
              <option
                key={semester.id}
                value={semester.id}
              >
                Semester {semester.semester_number}
              </option>
            ))}
          </select>
        </div>

        {/* UNITS */}

        {semesterId && (
          <div>
            <label className="mb-3 block text-sm text-gray-300">
              Units for this Semester
            </label>

            {availableUnits.length === 0 ? (
              <div className="rounded-lg bg-slate-800 p-4 text-sm text-gray-400">
                No units have been added for this semester yet.
              </div>
            ) : (
              <div className="space-y-3">
                {availableUnits.map((unit) => (
                  <Link
                    key={unit.id}
                    href={`/units/${unit.id}`}
                    className="block rounded-lg border border-slate-700 bg-slate-800 p-4 transition hover:border-cyan-400 hover:bg-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-400">
                          {unit.code}
                        </span>

                        <span className="text-white">
                          {unit.name}
                        </span>
                      </div>

                      <span className="text-cyan-400">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAVE */}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-500 p-3 font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile"}

          
        </button>
      </form>
    </div>
  );
}