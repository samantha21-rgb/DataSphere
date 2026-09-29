
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;

  university: string | null;
  school: string | null;
  course: string | null;
  year_of_study: string | null;
  semester: string | null;

  university_id: number | null;
  school_id: number | null;
  department_id: number | null;
  programme_id: number | null;
  academic_year_id: number | null;
  semester_id: number | null;

  role: string | null;
};

type University = {
  id: number;
  name: string;
};

type School = {
  id: number;
  name: string;
};

type Department = {
  id: number;
  name: string;
};

type Programme = {
  id: number;
  name: string;
  award: string;
};

type AcademicYear = {
  id: number;
  year_number: number;
};

type Semester = {
  id: number;
  semester_number: number;
};

export default function ProfileCard() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [universityName, setUniversityName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [academicYearName, setAcademicYearName] = useState("");
  const [semesterName, setSemesterName] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error loading user:", userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const profileData = data as Profile;

      setProfile(profileData);

      // UNIVERSITY
      if (profileData.university_id) {
        const { data: university } = await supabase
          .from("universities")
          .select("id, name")
          .eq("id", profileData.university_id)
          .single<University>();

        if (university) {
          setUniversityName(university.name);
        }
      }

      // SCHOOL
      if (profileData.school_id) {
        const { data: school } = await supabase
          .from("schools")
          .select("id, name")
          .eq("id", profileData.school_id)
          .single<School>();

        if (school) {
          setSchoolName(school.name);
        }
      }

      // DEPARTMENT
      if (profileData.department_id) {
        const { data: department } = await supabase
          .from("departments")
          .select("id, name")
          .eq("id", profileData.department_id)
          .single<Department>();

        if (department) {
          setDepartmentName(department.name);
        }
      }

      // PROGRAMME
      if (profileData.programme_id) {
        const { data: programme } = await supabase
          .from("programmes")
          .select("id, name, award")
          .eq("id", profileData.programme_id)
          .single<Programme>();

        if (programme) {
          setProgrammeName(
            `${programme.award} in ${programme.name}`
          );
        }
      }

      // ACADEMIC YEAR
      if (profileData.academic_year_id) {
        const { data: academicYear } = await supabase
          .from("academic_years")
          .select("id, year_number")
          .eq("id", profileData.academic_year_id)
          .single<AcademicYear>();

        if (academicYear) {
          setAcademicYearName(
            `Year ${academicYear.year_number}`
          );
        }
      }

      // SEMESTER
      if (profileData.semester_id) {
        const { data: semester } = await supabase
          .from("semesters")
          .select("id, semester_number")
          .eq("id", profileData.semester_id)
          .single<Semester>();

        if (semester) {
          setSemesterName(
            `Semester ${semester.semester_number}`
          );
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="mt-8 rounded-xl bg-slate-900 p-6 text-white">
        <p className="text-gray-400">
          Loading student profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mt-8 rounded-xl bg-slate-900 p-6 text-white">
        <h2 className="text-2xl font-bold">
          Student Profile
        </h2>

        <p className="mt-4 text-gray-400">
          No profile information found.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl bg-slate-900 p-6 text-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">
          Student Profile
        </h2>

        <p className="mt-1 text-gray-400">
          Your academic information
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Full Name */}
        <div>
          <p className="text-sm text-gray-400">
            Full Name
          </p>

          <p className="mt-1 font-medium">
            {profile.full_name || "-"}
          </p>
        </div>

        {/* Role */}
        <div>
          <p className="text-sm text-gray-400">
            Role
          </p>

          <p className="mt-1 font-medium capitalize">
            {profile.role || "student"}
          </p>
        </div>

        {/* University */}
        <div>
          <p className="text-sm text-gray-400">
            University
          </p>

          <p className="mt-1 font-medium">
            {universityName ||
              profile.university ||
              "-"}
          </p>
        </div>

        {/* School */}
        <div>
          <p className="text-sm text-gray-400">
            School
          </p>

          <p className="mt-1 font-medium">
            {schoolName ||
              profile.school ||
              "-"}
          </p>
        </div>

        {/* Department */}
        <div>
          <p className="text-sm text-gray-400">
            Department
          </p>

          <p className="mt-1 font-medium">
            {departmentName || "-"}
          </p>
        </div>

        {/* Programme */}
        <div>
          <p className="text-sm text-gray-400">
            Programme
          </p>

          <p className="mt-1 font-medium">
            {programmeName ||
              profile.course ||
              "-"}
          </p>
        </div>

        {/* Academic Year */}
        <div>
          <p className="text-sm text-gray-400">
            Year of Study
          </p>

          <p className="mt-1 font-medium">
            {academicYearName ||
              profile.year_of_study ||
              "-"}
          </p>
        </div>

        {/* Semester */}
        <div>
          <p className="text-sm text-gray-400">
            Semester
          </p>

          <p className="mt-1 font-medium">
            {semesterName ||
              profile.semester ||
              "-"}
          </p>
        </div>
      </div>
    </div>
  );
}