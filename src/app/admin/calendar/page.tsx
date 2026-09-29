"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type EventType =
  | "semester"
  | "lecture"
  | "cat"
  | "assignment"
  | "exam"
  | "deadline"
  | "registration"
  | "holiday"
  | "announcement"
  | "general";

type AcademicEvent = {
  id: number;
  title: string;
  description: string | null;
  event_type: EventType;
  start_at: string;
  end_at: string | null;
  location: string | null;
  unit_id: number | null;
  semester_id: number | null;
  is_all_day: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Unit = {
  id: number;
  semester_id: number;
  name: string;
};

type Semester = {
  id: number;
  academic_year_id: number;
  semester_number: number;
};

type AcademicYear = {
  id: number;
  programme_id: number;
  year_number: number;
};

type Programme = {
  id: number;
  department_id: number;
  name: string;
  award: string;
};

type Department = {
  id: number;
  school_id: number;
  name: string;
};

type School = {
  id: number;
  university_id: number;
  name: string;
};

type University = {
  id: number;
  name: string;
};

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "semester", label: "Semester" },
  { value: "lecture", label: "Lecture" },
  { value: "cat", label: "CAT" },
  { value: "assignment", label: "Assignment" },
  { value: "exam", label: "Exam" },
  { value: "deadline", label: "Deadline" },
  { value: "registration", label: "Registration" },
  { value: "holiday", label: "Holiday" },
  { value: "announcement", label: "Announcement" },
  { value: "general", label: "General" },
];

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateForInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeForInput(value: string | null) {
  if (!value) return "08:00";

  const date = new Date(value);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function eventClasses(type: EventType) {
  switch (type) {
    case "exam":
      return "border-red-200 bg-red-50 text-red-700";

    case "cat":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "assignment":
    case "deadline":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "lecture":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "semester":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "registration":
      return "border-green-200 bg-green-50 text-green-700";

    case "holiday":
      return "border-pink-200 bg-pink-50 text-pink-700";

    case "announcement":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default function AdminCalendarPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | EventType>(
    "all"
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEventType, setFormEventType] =
    useState<EventType>("general");

  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("09:00");

  const [formLocation, setFormLocation] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formSemesterId, setFormSemesterId] = useState("");

  const [formAllDay, setFormAllDay] = useState(false);

  const [selectedUniversityId, setSelectedUniversityId] =
    useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] =
    useState("");
  const [selectedYearId, setSelectedYearId] = useState("");

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

      const { data: profile, error: profileError } =
        await supabase
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
    }
  }

  async function loadAllData() {
    setLoading(true);
    setError("");

    try {
      const [
        eventsResult,
        unitsResult,
        semestersResult,
        yearsResult,
        programmesResult,
        departmentsResult,
        schoolsResult,
        universitiesResult,
      ] = await Promise.all([
        supabase
          .from("academic_events")
          .select("*")
          .order("start_at", { ascending: true }),

        supabase
          .from("units")
          .select("id, semester_id, name")
          .order("name", { ascending: true }),

        supabase
          .from("semesters")
          .select("id, academic_year_id, semester_number")
          .order("semester_number", { ascending: true }),

        supabase
          .from("academic_years")
          .select("id, programme_id, year_number")
          .order("year_number", { ascending: true }),

        supabase
          .from("programmes")
          .select("id, department_id, name, award")
          .order("name", { ascending: true }),

        supabase
          .from("departments")
          .select("id, school_id, name")
          .order("name", { ascending: true }),

        supabase
          .from("schools")
          .select("id, university_id, name")
          .order("name", { ascending: true }),

        supabase
          .from("universities")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      const firstError =
        eventsResult.error ||
        unitsResult.error ||
        semestersResult.error ||
        yearsResult.error ||
        programmesResult.error ||
        departmentsResult.error ||
        schoolsResult.error ||
        universitiesResult.error;

      if (firstError) throw firstError;

      setEvents((eventsResult.data || []) as AcademicEvent[]);
      setUnits((unitsResult.data || []) as Unit[]);
      setSemesters((semestersResult.data || []) as Semester[]);
      setAcademicYears(
        (yearsResult.data || []) as AcademicYear[]
      );
      setProgrammes(
        (programmesResult.data || []) as Programme[]
      );
      setDepartments(
        (departmentsResult.data || []) as Department[]
      );
      setSchools((schoolsResult.data || []) as School[]);
      setUniversities(
        (universitiesResult.data || []) as University[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load academic calendar data."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormEventType("general");

    setFormDate("");
    setFormStartTime("08:00");
    setFormEndTime("09:00");

    setFormLocation("");
    setFormUnitId("");
    setFormSemesterId("");

    setFormAllDay(false);

    setSelectedUniversityId("");
    setSelectedSchoolId("");
    setSelectedDepartmentId("");
    setSelectedProgrammeId("");
    setSelectedYearId("");
  }

  function openCreateModal() {
    clearMessages();
    resetForm();

    setModalMode("create");
    setEditingId(null);
    setModalOpen(true);
  }

  function openEditModal(event: AcademicEvent) {
    clearMessages();

    const unit = event.unit_id
      ? units.find((item) => item.id === event.unit_id)
      : null;

    const semester = event.semester_id
      ? semesters.find((item) => item.id === event.semester_id)
      : unit
      ? semesters.find((item) => item.id === unit.semester_id)
      : null;

    const year = semester
      ? academicYears.find(
          (item) => item.id === semester.academic_year_id
        )
      : null;

    const programme = year
      ? programmes.find(
          (item) => item.id === year.programme_id
        )
      : null;

    const department = programme
      ? departments.find(
          (item) => item.id === programme.department_id
        )
      : null;

    const school = department
      ? schools.find((item) => item.id === department.school_id)
      : null;

    const university = school
      ? universities.find(
          (item) => item.id === school.university_id
        )
      : null;

    setModalMode("edit");
    setEditingId(event.id);

    setFormTitle(event.title);
    setFormDescription(event.description || "");
    setFormEventType(event.event_type);

    setFormDate(formatDateForInput(event.start_at));
    setFormStartTime(formatTimeForInput(event.start_at));
    setFormEndTime(formatTimeForInput(event.end_at));

    setFormLocation(event.location || "");
    setFormUnitId(event.unit_id ? String(event.unit_id) : "");
    setFormSemesterId(
      event.semester_id ? String(event.semester_id) : ""
    );

    setFormAllDay(event.is_all_day);

    setSelectedUniversityId(
      university ? String(university.id) : ""
    );
    setSelectedSchoolId(school ? String(school.id) : "");
    setSelectedDepartmentId(
      department ? String(department.id) : ""
    );
    setSelectedProgrammeId(
      programme ? String(programme.id) : ""
    );
    setSelectedYearId(year ? String(year.id) : "");

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    resetForm();
  }

  async function saveEvent() {
    clearMessages();

    if (!formTitle.trim()) {
      setError("Event title is required.");
      return;
    }

    if (!formDate) {
      setError("Please select an event date.");
      return;
    }

    if (!formAllDay && !formStartTime) {
      setError("Please select a start time.");
      return;
    }

    let startDateTime = `${formDate}T${
      formAllDay ? "00:00" : formStartTime
    }:00`;

    let endDateTime: string | null = null;

    if (!formAllDay && formEndTime) {
      endDateTime = `${formDate}T${formEndTime}:00`;

      if (
        new Date(endDateTime).getTime() <
        new Date(startDateTime).getTime()
      ) {
        setError("End time cannot be before the start time.");
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        event_type: formEventType,
        start_at: new Date(startDateTime).toISOString(),
        end_at: endDateTime
          ? new Date(endDateTime).toISOString()
          : null,
        location: formLocation.trim() || null,
        unit_id: formUnitId ? Number(formUnitId) : null,
        semester_id: formSemesterId
          ? Number(formSemesterId)
          : null,
        is_all_day: formAllDay,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (modalMode === "create") {
        const { error: insertError } = await supabase
          .from("academic_events")
          .insert(payload);

        if (insertError) throw insertError;

        setSuccess("Academic event created successfully.");
      } else {
        if (!editingId) {
          throw new Error("No event selected for editing.");
        }

        const { error: updateError } = await supabase
          .from("academic_events")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        setSuccess("Academic event updated successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      resetForm();

      await loadAllData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save academic event."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(event: AcademicEvent) {
    clearMessages();

    const confirmed = window.confirm(
      `Delete "${event.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from("academic_events")
        .delete()
        .eq("id", event.id);

      if (deleteError) throw deleteError;

      setSuccess("Academic event deleted successfully.");

      await loadAllData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete academic event."
      );
    }
  }

  const filteredSchools = useMemo(() => {
    if (!selectedUniversityId) return [];

    return schools.filter(
      (school) =>
        school.university_id === Number(selectedUniversityId)
    );
  }, [schools, selectedUniversityId]);

  const filteredDepartments = useMemo(() => {
    if (!selectedSchoolId) return [];

    return departments.filter(
      (department) =>
        department.school_id === Number(selectedSchoolId)
    );
  }, [departments, selectedSchoolId]);

  const filteredProgrammes = useMemo(() => {
    if (!selectedDepartmentId) return [];

    return programmes.filter(
      (programme) =>
        programme.department_id === Number(selectedDepartmentId)
    );
  }, [programmes, selectedDepartmentId]);

  const filteredYears = useMemo(() => {
    if (!selectedProgrammeId) return [];

    return academicYears.filter(
      (year) =>
        year.programme_id === Number(selectedProgrammeId)
    );
  }, [academicYears, selectedProgrammeId]);

  const filteredSemesters = useMemo(() => {
    if (!selectedYearId) return [];

    return semesters.filter(
      (semester) =>
        semester.academic_year_id === Number(selectedYearId)
    );
  }, [semesters, selectedYearId]);

  const filteredUnits = useMemo(() => {
    if (!formSemesterId) return [];

    return units.filter(
      (unit) => unit.semester_id === Number(formSemesterId)
    );
  }, [units, formSemesterId]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesType =
        filterType === "all" || event.event_type === filterType;

      if (!matchesType) return false;

      if (!query) return true;

      const unitName = event.unit_id
        ? units.find((unit) => unit.id === event.unit_id)?.name || ""
        : "";

      return (
        event.title.toLowerCase().includes(query) ||
        (event.description || "").toLowerCase().includes(query) ||
        (event.location || "").toLowerCase().includes(query) ||
        unitName.toLowerCase().includes(query)
      );
    });
  }, [events, filterType, search, units]);

  function handleUniversityChange(value: string) {
    setSelectedUniversityId(value);
    setSelectedSchoolId("");
    setSelectedDepartmentId("");
    setSelectedProgrammeId("");
    setSelectedYearId("");
    setFormSemesterId("");
    setFormUnitId("");
  }

  function handleSchoolChange(value: string) {
    setSelectedSchoolId(value);
    setSelectedDepartmentId("");
    setSelectedProgrammeId("");
    setSelectedYearId("");
    setFormSemesterId("");
    setFormUnitId("");
  }

  function handleDepartmentChange(value: string) {
    setSelectedDepartmentId(value);
    setSelectedProgrammeId("");
    setSelectedYearId("");
    setFormSemesterId("");
    setFormUnitId("");
  }

  function handleProgrammeChange(value: string) {
    setSelectedProgrammeId(value);
    setSelectedYearId("");
    setFormSemesterId("");
    setFormUnitId("");
  }

  function handleYearChange(value: string) {
    setSelectedYearId(value);
    setFormSemesterId("");
    setFormUnitId("");
  }

  function handleSemesterChange(value: string) {
    setFormSemesterId(value);
    setFormUnitId("");
  }

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">
              Verifying administrator access...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🔒</div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Administrator Access Required
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              You do not have permission to manage academic
              calendar events.
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

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
                  📅
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                    Academic Calendar
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    Create and manage important academic events.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              + Add Event
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Total Events"
            value={events.length}
          />

          <Stat
            label="Exams"
            value={
              events.filter(
                (event) => event.event_type === "exam"
              ).length
            }
          />

          <Stat
            label="CATs"
            value={
              events.filter(
                (event) => event.event_type === "cat"
              ).length
            }
          />

          <Stat
            label="Assignments"
            value={
              events.filter(
                (event) => event.event_type === "assignment"
              ).length
            }
          />
        </div>

        {/* FILTERS */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-1">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                    filterType === "all"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  All
                </button>

                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFilterType(type.value)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                      filterType === type.value
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events..."
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 md:w-72"
            />
          </div>
        </section>

        {/* EVENTS */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Calendar Events
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredEvents.length} event
              {filteredEvents.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

              <p className="mt-4 text-sm text-gray-500">
                Loading events...
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">📅</div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No events found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {search || filterType !== "all"
                  ? "Try changing your search or filter."
                  : "Create your first academic calendar event."}
              </p>

              {!search && filterType === "all" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  + Add Event
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredEvents.map((event) => {
                const unitName = event.unit_id
                  ? units.find(
                      (unit) => unit.id === event.unit_id
                    )?.name
                  : null;

                return (
                  <div
                    key={event.id}
                    className="p-5 transition hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${eventClasses(
                              event.event_type
                            )}`}
                          >
                            {EVENT_TYPES.find(
                              (type) =>
                                type.value === event.event_type
                            )?.label || event.event_type}
                          </span>

                          {event.is_all_day && (
                            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                              All Day
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-gray-900">
                          {event.title}
                        </h3>

                        <div className="mt-3 grid gap-2 text-sm text-gray-500 md:grid-cols-2">
                          <div>
                            <span className="font-semibold text-gray-700">
                              Date:
                            </span>{" "}
                            {formatDateTime(event.start_at)}
                          </div>

                          {event.end_at && (
                            <div>
                              <span className="font-semibold text-gray-700">
                                Ends:
                              </span>{" "}
                              {formatDateTime(event.end_at)}
                            </div>
                          )}

                          {event.location && (
                            <div>
                              <span className="font-semibold text-gray-700">
                                Location:
                              </span>{" "}
                              {event.location}
                            </div>
                          )}

                          {unitName && (
                            <div>
                              <span className="font-semibold text-gray-700">
                                Unit:
                              </span>{" "}
                              {unitName}
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(event)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteEvent(event)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CREATE / EDIT MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {modalMode === "create"
                      ? "Create Academic Event"
                      : "Edit Academic Event"}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Add the event details below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6 p-5">
                {/* BASIC INFORMATION */}
                <section>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                    Event Information
                  </h3>

                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Event Title *
                      </label>

                      <input
                        value={formTitle}
                        onChange={(event) =>
                          setFormTitle(event.target.value)
                        }
                        placeholder="e.g. CAT 1 — Probability and Statistics"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Event Type *
                        </label>

                        <select
                          value={formEventType}
                          onChange={(event) =>
                            setFormEventType(
                              event.target.value as EventType
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                        >
                          {EVENT_TYPES.map((type) => (
                            <option
                              key={type.value}
                              value={type.value}
                            >
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Location
                        </label>

                        <input
                          value={formLocation}
                          onChange={(event) =>
                            setFormLocation(event.target.value)
                          }
                          placeholder="e.g. Lecture Hall 3"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Description
                      </label>

                      <textarea
                        value={formDescription}
                        onChange={(event) =>
                          setFormDescription(event.target.value)
                        }
                        rows={4}
                        placeholder="Additional information about the event..."
                        className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* DATE AND TIME */}
                <section>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                    Date & Time
                  </h3>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Date *
                      </label>

                      <input
                        type="date"
                        value={formDate}
                        onChange={(event) =>
                          setFormDate(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Start Time
                      </label>

                      <input
                        type="time"
                        value={formStartTime}
                        disabled={formAllDay}
                        onChange={(event) =>
                          setFormStartTime(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        End Time
                      </label>

                      <input
                        type="time"
                        value={formEndTime}
                        disabled={formAllDay}
                        onChange={(event) =>
                          setFormEndTime(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      />
                    </div>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <input
                      type="checkbox"
                      checked={formAllDay}
                      onChange={(event) =>
                        setFormAllDay(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-gray-800">
                        All-day event
                      </span>

                      <span className="block text-xs text-gray-500">
                        Use this for holidays, registration periods,
                        semester dates, and similar events.
                      </span>
                    </span>
                  </label>
                </section>

                {/* ACADEMIC ASSOCIATION */}
                <section>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                    Academic Association
                  </h3>

                  <p className="mb-4 text-xs leading-5 text-gray-500">
                    Optionally associate this event with a specific
                    academic hierarchy and unit. Leave these fields
                    empty for institution-wide events.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* UNIVERSITY */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        University
                      </label>

                      <select
                        value={selectedUniversityId}
                        onChange={(event) =>
                          handleUniversityChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">All Universities</option>

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
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        School
                      </label>

                      <select
                        value={selectedSchoolId}
                        disabled={!selectedUniversityId}
                        onChange={(event) =>
                          handleSchoolChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">All Schools</option>

                        {filteredSchools.map((school) => (
                          <option
                            key={school.id}
                            value={school.id}
                          >
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* DEPARTMENT */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Department
                      </label>

                      <select
                        value={selectedDepartmentId}
                        disabled={!selectedSchoolId}
                        onChange={(event) =>
                          handleDepartmentChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">All Departments</option>

                        {filteredDepartments.map((department) => (
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
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Programme
                      </label>

                      <select
                        value={selectedProgrammeId}
                        disabled={!selectedDepartmentId}
                        onChange={(event) =>
                          handleProgrammeChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">All Programmes</option>

                        {filteredProgrammes.map((programme) => (
                          <option
                            key={programme.id}
                            value={programme.id}
                          >
                            {programme.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* YEAR */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Academic Year
                      </label>

                      <select
                        value={selectedYearId}
                        disabled={!selectedProgrammeId}
                        onChange={(event) =>
                          handleYearChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">All Years</option>

                        {filteredYears.map((year) => (
                          <option
                            key={year.id}
                            value={year.id}
                          >
                            Year {year.year_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SEMESTER */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Semester
                      </label>

                      <select
                        value={formSemesterId}
                        disabled={!selectedYearId}
                        onChange={(event) =>
                          handleSemesterChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">All Semesters</option>

                        {filteredSemesters.map((semester) => (
                          <option
                            key={semester.id}
                            value={semester.id}
                          >
                            Semester {semester.semester_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* UNIT */}
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Unit
                      </label>

                      <select
                        value={formUnitId}
                        disabled={!formSemesterId}
                        onChange={(event) =>
                          setFormUnitId(event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none disabled:bg-gray-100 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                      >
                        <option value="">
                          No specific unit
                        </option>

                        {filteredUnits.map((unit) => (
                          <option
                            key={unit.id}
                            value={unit.id}
                          >
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* ACTIONS */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveEvent}
                    disabled={saving}
                    className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : modalMode === "create"
                      ? "Create Event"
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
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
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}