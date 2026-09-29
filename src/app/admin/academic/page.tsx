"use client";

import { useEffect, useMemo, useState } from "react";
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
  credit_hours: number | null;
};

type Tab =
  | "universities"
  | "schools"
  | "departments"
  | "programmes"
  | "years"
  | "semesters"
  | "units";

type ModalMode = "create" | "edit";

const tabs: { key: Tab; label: string }[] = [
  { key: "universities", label: "Universities" },
  { key: "schools", label: "Schools" },
  { key: "departments", label: "Departments" },
  { key: "programmes", label: "Programmes" },
  { key: "years", label: "Academic Years" },
  { key: "semesters", label: "Semesters" },
  { key: "units", label: "Units" },
];

export default function AcademicManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("universities");

  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formAward, setFormAward] = useState("");
  const [formUniversityId, setFormUniversityId] = useState("");
  const [formSchoolId, setFormSchoolId] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formProgrammeId, setFormProgrammeId] = useState("");
  const [formAcademicYearId, setFormAcademicYearId] = useState("");
  const [formYearNumber, setFormYearNumber] = useState("1");
  const [formSemesterNumber, setFormSemesterNumber] = useState("1");
  const [formCreditHours, setFormCreditHours] = useState("3");

  useEffect(() => {
    initialise();
  }, []);

  async function initialise() {
    setCheckingAdmin(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);
      await loadAllData();
    } catch (err) {
      console.error(err);
      setIsAdmin(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify administrator access."
      );
    } finally {
      setCheckingAdmin(false);
      setLoading(false);
    }
  }

  async function loadAllData() {
    setLoading(true);
    setError("");

    const [
      universitiesResult,
      schoolsResult,
      departmentsResult,
      programmesResult,
      yearsResult,
      semestersResult,
      unitsResult,
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

      supabase
        .from("academic_years")
        .select("id, programme_id, year_number")
        .order("year_number", { ascending: true }),

      supabase
        .from("semesters")
        .select("id, academic_year_id, semester_number")
        .order("semester_number", { ascending: true }),

      supabase
        .from("units")
        .select("id, semester_id, name, credit_hours")
        .order("name", { ascending: true }),
    ]);

    const firstError =
      universitiesResult.error ||
      schoolsResult.error ||
      departmentsResult.error ||
      programmesResult.error ||
      yearsResult.error ||
      semestersResult.error ||
      unitsResult.error;

    if (firstError) {
      setLoading(false);
      throw firstError;
    }

    setUniversities(universitiesResult.data || []);
    setSchools(schoolsResult.data || []);
    setDepartments(departmentsResult.data || []);
    setProgrammes(programmesResult.data || []);
    setAcademicYears(yearsResult.data || []);
    setSemesters(semestersResult.data || []);
    setUnits(unitsResult.data || []);

    setLoading(false);
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openCreateModal() {
    clearMessages();

    setModalMode("create");
    setEditingId(null);

    setFormName("");
    setFormAward("");
    setFormUniversityId("");
    setFormSchoolId("");
    setFormDepartmentId("");
    setFormProgrammeId("");
    setFormAcademicYearId("");
    setFormYearNumber("1");
    setFormSemesterNumber("1");
    setFormCreditHours("3");

    setModalOpen(true);
  }

  function openEditModal(id: number) {
    clearMessages();

    setModalMode("edit");
    setEditingId(id);

    if (activeTab === "universities") {
      const item = universities.find((x) => x.id === id);
      if (!item) return;

      setFormName(item.name);
    }

    if (activeTab === "schools") {
      const item = schools.find((x) => x.id === id);
      if (!item) return;

      setFormName(item.name);
      setFormUniversityId(String(item.university_id));
    }

    if (activeTab === "departments") {
      const item = departments.find((x) => x.id === id);
      if (!item) return;

      const school = schools.find((x) => x.id === item.school_id);

      setFormName(item.name);
      setFormUniversityId(
        school ? String(school.university_id) : ""
      );
      setFormSchoolId(String(item.school_id));
    }

    if (activeTab === "programmes") {
      const item = programmes.find((x) => x.id === id);
      if (!item) return;

      const department = departments.find(
        (x) => x.id === item.department_id
      );

      const school = department
        ? schools.find((x) => x.id === department.school_id)
        : null;

      setFormName(item.name);
      setFormAward(item.award || "");
      setFormUniversityId(
        school ? String(school.university_id) : ""
      );
      setFormSchoolId(
        school ? String(school.id) : ""
      );
      setFormDepartmentId(String(item.department_id));
    }

    if (activeTab === "years") {
      const item = academicYears.find((x) => x.id === id);
      if (!item) return;

      setFormProgrammeId(String(item.programme_id));
      setFormYearNumber(String(item.year_number));
    }

    if (activeTab === "semesters") {
      const item = semesters.find((x) => x.id === id);
      if (!item) return;

      const year = academicYears.find(
        (x) => x.id === item.academic_year_id
      );

      setFormProgrammeId(
        year ? String(year.programme_id) : ""
      );
      setFormAcademicYearId(
        year ? String(year.id) : ""
      );
      setFormSemesterNumber(
        String(item.semester_number)
      );
    }

    if (activeTab === "units") {
      const item = units.find((x) => x.id === id);
      if (!item) return;

      const semester = semesters.find(
        (x) => x.id === item.semester_id
      );

      const year = semester
        ? academicYears.find(
            (x) => x.id === semester.academic_year_id
          )
        : null;

      setFormName(item.name);

      setFormProgrammeId(
        year ? String(year.programme_id) : ""
      );

      setFormAcademicYearId(
        year ? String(year.id) : ""
      );

      setFormSemesterNumber(
        semester
          ? String(semester.semester_number)
          : "1"
      );

      setFormCreditHours(
        item.credit_hours !== null &&
          item.credit_hours !== undefined
          ? String(item.credit_hours)
          : "3"
      );
    }

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
  }

  async function saveRecord() {
    clearMessages();

    if (
      activeTab !== "years" &&
      activeTab !== "semesters" &&
      !formName.trim()
    ) {
      setError("Please enter a name.");
      return;
    }

    setSaving(true);

    try {
      let result: { error: any } = { error: null };

      if (activeTab === "universities") {
        const payload = {
          name: formName.trim(),
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("universities")
                .insert(payload)
            : await supabase
                .from("universities")
                .update(payload)
                .eq("id", editingId);
      }

      if (activeTab === "schools") {
        if (!formUniversityId) {
          throw new Error("Please select a university.");
        }

        const payload = {
          name: formName.trim(),
          university_id: Number(formUniversityId),
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("schools")
                .insert(payload)
            : await supabase
                .from("schools")
                .update(payload)
                .eq("id", editingId);
      }

      if (activeTab === "departments") {
        if (!formSchoolId) {
          throw new Error("Please select a school.");
        }

        const payload = {
          name: formName.trim(),
          school_id: Number(formSchoolId),
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("departments")
                .insert(payload)
            : await supabase
                .from("departments")
                .update(payload)
                .eq("id", editingId);
      }

      if (activeTab === "programmes") {
        if (!formDepartmentId) {
          throw new Error("Please select a department.");
        }

        if (!formAward.trim()) {
          throw new Error("Please enter the award.");
        }

        const payload = {
          name: formName.trim(),
          award: formAward.trim(),
          department_id: Number(formDepartmentId),
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("programmes")
                .insert(payload)
            : await supabase
                .from("programmes")
                .update(payload)
                .eq("id", editingId);
      }

      if (activeTab === "years") {
        if (!formProgrammeId) {
          throw new Error("Please select a programme.");
        }

        const yearNumber = Number(formYearNumber);

        if (
          !Number.isInteger(yearNumber) ||
          yearNumber < 1 ||
          yearNumber > 10
        ) {
          throw new Error(
            "Year must be between 1 and 10."
          );
        }

        const payload = {
          programme_id: Number(formProgrammeId),
          year_number: yearNumber,
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("academic_years")
                .insert(payload)
            : await supabase
                .from("academic_years")
                .update(payload)
                .eq("id", editingId);
      }

      if (activeTab === "semesters") {
        if (!formAcademicYearId) {
          throw new Error(
            "Please select an academic year."
          );
        }

        const semesterNumber =
          Number(formSemesterNumber);

        if (![1, 2].includes(semesterNumber)) {
          throw new Error(
            "Semester must be either 1 or 2."
          );
        }

        const payload = {
          academic_year_id:
            Number(formAcademicYearId),
          semester_number: semesterNumber,
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("semesters")
                .insert(payload)
            : await supabase
                .from("semesters")
                .update(payload)
                .eq("id", editingId);
      }

      if (activeTab === "units") {
        if (!formAcademicYearId) {
          throw new Error(
            "Please select an academic year."
          );
        }

        const creditHours =
          Number(formCreditHours);

        if (
          !Number.isFinite(creditHours) ||
          creditHours <= 0 ||
          creditHours > 30
        ) {
          throw new Error(
            "Credit hours must be greater than 0 and no more than 30."
          );
        }

        const semesterNumber =
          Number(formSemesterNumber);

        const semester = semesters.find(
          (item) =>
            item.academic_year_id ===
              Number(formAcademicYearId) &&
            item.semester_number ===
              semesterNumber
        );

        if (!semester) {
          throw new Error(
            "The selected semester does not exist. Create it first."
          );
        }

        const payload = {
          name: formName.trim(),
          semester_id: semester.id,
          credit_hours: creditHours,
        };

        result =
          modalMode === "create"
            ? await supabase
                .from("units")
                .insert(payload)
            : await supabase
                .from("units")
                .update(payload)
                .eq("id", editingId);
      }

      if (result.error) {
        throw result.error;
      }

      setSuccess(
        modalMode === "create"
          ? `${getCurrentLabel()} created successfully.`
          : `${getCurrentLabel()} updated successfully.`
      );

      setModalOpen(false);
      setEditingId(null);

      await loadAllData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: number) {
    clearMessages();

    const label = getCurrentLabel();

    if (
      !window.confirm(
        `Delete this ${label.toLowerCase()}?\n\nThis may also remove related records if cascading deletes are configured.`
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      let result: { error: any } = {
        error: null,
      };

      const tableMap: Record<Tab, string> = {
        universities: "universities",
        schools: "schools",
        departments: "departments",
        programmes: "programmes",
        years: "academic_years",
        semesters: "semesters",
        units: "units",
      };

      result = await supabase
        .from(tableMap[activeTab])
        .delete()
        .eq("id", id);

      if (result.error) {
        throw result.error;
      }

      setSuccess(
        `${label} deleted successfully.`
      );

      await loadAllData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Unable to delete ${label.toLowerCase()}.`
      );
    } finally {
      setSaving(false);
    }
  }

  function getCurrentLabel() {
    return (
      tabs.find(
        (tab) => tab.key === activeTab
      )?.label || "Record"
    );
  }

  const availableSchools = useMemo(
    () =>
      schools.filter(
        (school) =>
          !formUniversityId ||
          school.university_id ===
            Number(formUniversityId)
      ),
    [schools, formUniversityId]
  );

  const availableDepartments = useMemo(
    () =>
      departments.filter(
        (department) =>
          !formSchoolId ||
          department.school_id ===
            Number(formSchoolId)
      ),
    [departments, formSchoolId]
  );

  const availableAcademicYears = useMemo(
    () =>
      academicYears.filter(
        (year) =>
          !formProgrammeId ||
          year.programme_id ===
            Number(formProgrammeId)
      ),
    [academicYears, formProgrammeId]
  );

  const filteredRows = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (activeTab === "universities") {
      return universities.filter((item) =>
        item.name.toLowerCase().includes(term)
      );
    }

    if (activeTab === "schools") {
      return schools.filter((item) => {
        const university =
          universities.find(
            (x) => x.id === item.university_id
          );

        return (
          item.name
            .toLowerCase()
            .includes(term) ||
          university?.name
            .toLowerCase()
            .includes(term)
        );
      });
    }

    if (activeTab === "departments") {
      return departments.filter((item) => {
        const school =
          schools.find(
            (x) => x.id === item.school_id
          );

        return (
          item.name
            .toLowerCase()
            .includes(term) ||
          school?.name
            .toLowerCase()
            .includes(term)
        );
      });
    }

    if (activeTab === "programmes") {
      return programmes.filter((item) => {
        const department =
          departments.find(
            (x) =>
              x.id === item.department_id
          );

        return (
          item.name
            .toLowerCase()
            .includes(term) ||
          item.award
            ?.toLowerCase()
            .includes(term) ||
          department?.name
            .toLowerCase()
            .includes(term)
        );
      });
    }

    if (activeTab === "years") {
      return academicYears.filter((item) =>
        `year ${item.year_number}`.includes(term)
      );
    }

    if (activeTab === "semesters") {
      return semesters.filter((item) =>
        `semester ${item.semester_number}`.includes(
          term
        )
      );
    }

    return units.filter((item) =>
      item.name.toLowerCase().includes(term)
    );
  }, [
    activeTab,
    search,
    universities,
    schools,
    departments,
    programmes,
    academicYears,
    semesters,
    units,
  ]);

  function getRowTitle(item: any) {
    if (activeTab === "universities") {
      return (
        <div className="font-medium text-gray-900">
          {item.name}
        </div>
      );
    }

    if (activeTab === "schools") {
      const university =
        universities.find(
          (x) => x.id === item.university_id
        );

      return (
        <div>
          <div className="font-medium text-gray-900">
            {item.name}
          </div>
          <div className="text-xs text-gray-500">
            {university?.name ||
              "University not found"}
          </div>
        </div>
      );
    }

    if (activeTab === "departments") {
      const school =
        schools.find(
          (x) => x.id === item.school_id
        );

      return (
        <div>
          <div className="font-medium text-gray-900">
            {item.name}
          </div>
          <div className="text-xs text-gray-500">
            {school?.name ||
              "School not found"}
          </div>
        </div>
      );
    }

    if (activeTab === "programmes") {
      const department =
        departments.find(
          (x) =>
            x.id === item.department_id
        );

      return (
        <div>
          <div className="font-medium text-gray-900">
            {item.name}
          </div>
          <div className="text-xs text-gray-500">
            {item.award}
            {department
              ? ` • ${department.name}`
              : ""}
          </div>
        </div>
      );
    }

    if (activeTab === "years") {
      const programme =
        programmes.find(
          (x) =>
            x.id === item.programme_id
        );

      return (
        <div>
          <div className="font-medium text-gray-900">
            Year {item.year_number}
          </div>
          <div className="text-xs text-gray-500">
            {programme?.name ||
              "Programme not found"}
          </div>
        </div>
      );
    }

    if (activeTab === "semesters") {
      const year =
        academicYears.find(
          (x) =>
            x.id === item.academic_year_id
        );

      const programme = year
        ? programmes.find(
            (x) =>
              x.id === year.programme_id
          )
        : null;

      return (
        <div>
          <div className="font-medium text-gray-900">
            Semester {item.semester_number}
          </div>
          <div className="text-xs text-gray-500">
            Year {year?.year_number ?? "?"}
            {programme
              ? ` • ${programme.name}`
              : ""}
          </div>
        </div>
      );
    }

    const semester =
      semesters.find(
        (x) => x.id === item.semester_id
      );

    const year = semester
      ? academicYears.find(
          (x) =>
            x.id ===
            semester.academic_year_id
        )
      : null;

    const programme = year
      ? programmes.find(
          (x) =>
            x.id === year.programme_id
        )
      : null;

    return (
      <div>
        <div className="font-medium text-gray-900">
          {item.name}
        </div>

        <div className="text-xs text-gray-500">
          {programme?.name ||
            "Programme not found"}

          {year
            ? ` • Year ${year.year_number}`
            : ""}

          {semester
            ? ` • Semester ${semester.semester_number}`
            : ""}
        </div>

        <div className="mt-1 text-xs font-semibold text-gray-600">
          {item.credit_hours !== null &&
          item.credit_hours !== undefined
            ? `${item.credit_hours} credit hour${
                item.credit_hours === 1
                  ? ""
                  : "s"
              }`
            : "Credit hours not set"}
        </div>
      </div>
    );
  }

  function renderForm() {
    if (activeTab === "universities") {
      return (
        <Field label="University Name">
          <input
            value={formName}
            onChange={(e) =>
              setFormName(e.target.value)
            }
            placeholder="e.g. JKUAT"
            className={inputClass}
            autoFocus
          />
        </Field>
      );
    }

    if (activeTab === "schools") {
      return (
        <>
          <Field label="University">
            <select
              value={formUniversityId}
              onChange={(e) => {
                setFormUniversityId(
                  e.target.value
                );
                setFormSchoolId("");
              }}
              className={inputClass}
            >
              <option value="">
                Select university
              </option>

              {universities.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="School Name">
            <input
              value={formName}
              onChange={(e) =>
                setFormName(e.target.value)
              }
              placeholder="e.g. School of Computing"
              className={inputClass}
              autoFocus
            />
          </Field>
        </>
      );
    }

    if (activeTab === "departments") {
      return (
        <>
          <Field label="University">
            <select
              value={formUniversityId}
              onChange={(e) => {
                setFormUniversityId(
                  e.target.value
                );
                setFormSchoolId("");
              }}
              className={inputClass}
            >
              <option value="">
                Select university
              </option>

              {universities.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="School">
            <select
              value={formSchoolId}
              onChange={(e) =>
                setFormSchoolId(
                  e.target.value
                )
              }
              className={inputClass}
              disabled={!formUniversityId}
            >
              <option value="">
                Select school
              </option>

              {availableSchools.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Department Name">
            <input
              value={formName}
              onChange={(e) =>
                setFormName(e.target.value)
              }
              placeholder="e.g. Data Science"
              className={inputClass}
              autoFocus
            />
          </Field>
        </>
      );
    }

    if (activeTab === "programmes") {
      return (
        <>
          <Field label="University">
            <select
              value={formUniversityId}
              onChange={(e) => {
                setFormUniversityId(
                  e.target.value
                );
                setFormSchoolId("");
                setFormDepartmentId("");
              }}
              className={inputClass}
            >
              <option value="">
                Select university
              </option>

              {universities.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="School">
            <select
              value={formSchoolId}
              onChange={(e) => {
                setFormSchoolId(
                  e.target.value
                );
                setFormDepartmentId("");
              }}
              className={inputClass}
              disabled={!formUniversityId}
            >
              <option value="">
                Select school
              </option>

              {availableSchools.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Department">
            <select
              value={formDepartmentId}
              onChange={(e) =>
                setFormDepartmentId(
                  e.target.value
                )
              }
              className={inputClass}
              disabled={!formSchoolId}
            >
              <option value="">
                Select department
              </option>

              {departments
                .filter(
                  (item) =>
                    !formSchoolId ||
                    item.school_id ===
                      Number(
                        formSchoolId
                      )
                )
                .map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Programme Name">
            <input
              value={formName}
              onChange={(e) =>
                setFormName(e.target.value)
              }
              placeholder="e.g. Bachelor of Science in Data Science"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Award">
            <input
              value={formAward}
              onChange={(e) =>
                setFormAward(e.target.value)
              }
              placeholder="e.g. Bachelor of Science"
              className={inputClass}
            />
          </Field>
        </>
      );
    }

    if (activeTab === "years") {
      return (
        <>
          <Field label="Programme">
            <select
              value={formProgrammeId}
              onChange={(e) =>
                setFormProgrammeId(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                Select programme
              </option>

              {programmes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year">
            <select
              value={formYearNumber}
              onChange={(e) =>
                setFormYearNumber(
                  e.target.value
                )
              }
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6].map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    Year {year}
                  </option>
                )
              )}
            </select>
          </Field>
        </>
      );
    }

    if (activeTab === "semesters") {
      return (
        <>
          <Field label="Programme">
            <select
              value={formProgrammeId}
              onChange={(e) => {
                setFormProgrammeId(
                  e.target.value
                );
                setFormAcademicYearId("");
              }}
              className={inputClass}
            >
              <option value="">
                Select programme
              </option>

              {programmes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Academic Year">
            <select
              value={formAcademicYearId}
              onChange={(e) =>
                setFormAcademicYearId(
                  e.target.value
                )
              }
              className={inputClass}
              disabled={!formProgrammeId}
            >
              <option value="">
                Select academic year
              </option>

              {availableAcademicYears.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    Year {item.year_number}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="Semester">
            <select
              value={formSemesterNumber}
              onChange={(e) =>
                setFormSemesterNumber(
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="1">
                Semester 1
              </option>
              <option value="2">
                Semester 2
              </option>
            </select>
          </Field>
        </>
      );
    }

    return (
      <>
        <Field label="Programme">
          <select
            value={formProgrammeId}
            onChange={(e) => {
              setFormProgrammeId(
                e.target.value
              );
              setFormAcademicYearId("");
            }}
            className={inputClass}
          >
            <option value="">
              Select programme
            </option>

            {programmes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Academic Year">
          <select
            value={formAcademicYearId}
            onChange={(e) =>
              setFormAcademicYearId(
                e.target.value
              )
            }
            className={inputClass}
            disabled={!formProgrammeId}
          >
            <option value="">
              Select academic year
            </option>

            {availableAcademicYears.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  Year {item.year_number}
                </option>
              )
            )}
          </select>
        </Field>

        <Field label="Semester">
          <select
            value={formSemesterNumber}
            onChange={(e) =>
              setFormSemesterNumber(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="1">
              Semester 1
            </option>
            <option value="2">
              Semester 2
            </option>
          </select>
        </Field>

        <Field label="Unit Name">
          <input
            value={formName}
            onChange={(e) =>
              setFormName(e.target.value)
            }
            placeholder="e.g. Machine Learning I"
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="Credit Hours">
          <input
            type="number"
            min="0.5"
            max="30"
            step="0.5"
            value={formCreditHours}
            onChange={(e) =>
              setFormCreditHours(
                e.target.value
              )
            }
            placeholder="e.g. 3"
            className={inputClass}
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter the official credit hours
            assigned to this unit.
          </p>
        </Field>
      </>
    );
  }

  if (checkingAdmin || loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">
              Loading academic management...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
              🔒
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              You must have administrator
              privileges to manage DataSphere
              academic records.
            </p>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  const missingCreditHours =
    units.filter(
      (unit) =>
        unit.credit_hours === null ||
        unit.credit_hours === undefined
    ).length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
                🎓
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                  Academic Management
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Manage the DataSphere academic hierarchy.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            + Add{" "}
            {getCurrentLabel().replace(
              "Academic ",
              ""
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Stat
            label="Universities"
            value={universities.length}
          />

          <Stat
            label="Schools"
            value={schools.length}
          />

          <Stat
            label="Departments"
            value={departments.length}
          />

          <Stat
            label="Programmes"
            value={programmes.length}
          />

          <Stat
            label="Academic Years"
            value={academicYears.length}
          />

          <Stat
            label="Semesters"
            value={semesters.length}
          />

          <Stat
            label="Units"
            value={units.length}
          />

          <Stat
            label="Missing Credit Hours"
            value={missingCreditHours}
          />
        </div>

        <div className="mb-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearch("");
                  clearMessages();
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getCurrentLabel()}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredRows.length} record
                {filteredRows.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder={`Search ${getCurrentLabel().toLowerCase()}...`}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 md:w-80"
            />
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">
                📚
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No{" "}
                {getCurrentLabel().toLowerCase()}{" "}
                found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? "Try a different search term."
                  : "Add your first record to get started."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  + Add{" "}
                  {getCurrentLabel().replace(
                    "Academic ",
                    ""
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredRows.map(
                (item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 px-5 py-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      {getRowTitle(item)}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            item.id
                          )
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteRecord(
                            item.id
                          )
                        }
                        disabled={saving}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {modalMode === "create"
                    ? "Add"
                    : "Edit"}{" "}
                  {getCurrentLabel()}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Update the academic structure carefully.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              {renderForm()}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveRecord}
                disabled={saving}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : modalMode === "create"
                    ? "Create"
                    : "Save Changes"}
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-100 disabled:text-gray-400";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-gray-500">
        {label}
      </div>
    </div>
  );
}