"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type AcademicEvent = {
  id: number;
  title: string;
  description: string | null;
  event_type:
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
  start_at: string;
  end_at: string | null;
  location: string | null;
  unit_id: number | null;
  semester_id: number | null;
  is_all_day: boolean;
  created_at: string;
};

type Unit = {
  id: number;
  name: string;
};

type FilterType = "all" | AcademicEvent["event_type"];

const EVENT_TYPES: {
  value: FilterType;
  label: string;
}[] = [
  { value: "all", label: "All Events" },
  { value: "semester", label: "Semester" },
  { value: "lecture", label: "Lectures" },
  { value: "cat", label: "CATs" },
  { value: "assignment", label: "Assignments" },
  { value: "exam", label: "Exams" },
  { value: "deadline", label: "Deadlines" },
  { value: "registration", label: "Registration" },
  { value: "holiday", label: "Holidays" },
  { value: "announcement", label: "Announcements" },
  { value: "general", label: "General" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function eventTypeLabel(type: AcademicEvent["event_type"]) {
  return EVENT_TYPES.find((item) => item.value === type)?.label || "Event";
}

function eventTypeClasses(type: AcademicEvent["event_type"]) {
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

function eventDotClass(type: AcademicEvent["event_type"]) {
  switch (type) {
    case "exam":
      return "bg-red-500";

    case "cat":
      return "bg-orange-500";

    case "assignment":
    case "deadline":
      return "bg-amber-500";

    case "lecture":
      return "bg-blue-500";

    case "semester":
      return "bg-purple-500";

    case "registration":
      return "bg-green-500";

    case "holiday":
      return "bg-pink-500";

    case "announcement":
      return "bg-indigo-500";

    default:
      return "bg-gray-500";
  }
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const previousMonthDays = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;

    if (dayOffset < 1) {
      return {
        date: new Date(year, month - 1, previousMonthDays + dayOffset),
        currentMonth: false,
      };
    }

    if (dayOffset > daysInMonth) {
      return {
        date: new Date(year, month + 1, dayOffset - daysInMonth),
        currentMonth: false,
      };
    }

    return {
      date: new Date(year, month, dayOffset),
      currentMonth: true,
    };
  });
}

export default function CalendarPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<FilterType>("all");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadCalendar();
  }, []);

  async function loadCalendar() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: eventData, error: eventError } = await supabase
        .from("academic_events")
        .select(
          `
            id,
            title,
            description,
            event_type,
            start_at,
            end_at,
            location,
            unit_id,
            semester_id,
            is_all_day,
            created_at
          `
        )
        .order("start_at", { ascending: true });

      if (eventError) {
        throw eventError;
      }

      const loadedEvents = (eventData || []) as AcademicEvent[];

      setEvents(loadedEvents);

      const unitIds = Array.from(
        new Set(
          loadedEvents
            .map((event) => event.unit_id)
            .filter((id): id is number => id !== null)
        )
      );

      if (unitIds.length > 0) {
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select("id, name")
          .in("id", unitIds);

        if (unitError) {
          throw unitError;
        }

        setUnits(unitData || []);
      } else {
        setUnits([]);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the academic calendar."
      );
    } finally {
      setLoading(false);
    }
  }

  const unitMap = useMemo(() => {
    const map = new Map<number, string>();

    units.forEach((unit) => {
      map.set(unit.id, unit.name);
    });

    return map;
  }, [units]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") {
      return events;
    }

    return events.filter((event) => event.event_type === filter);
  }, [events, filter]);

  const monthDays = useMemo(() => {
    return getMonthDays(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
  }, [currentMonth]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const date = new Date(event.start_at);

      return (
        date.getFullYear() === currentMonth.getFullYear() &&
        date.getMonth() === currentMonth.getMonth()
      );
    });
  }, [filteredEvents, currentMonth]);

  const today = new Date();

  const upcomingEvents = useMemo(() => {
    const now = new Date();

    return filteredEvents
      .filter((event) => new Date(event.start_at) >= now)
      .slice(0, 8);
  }, [filteredEvents]);

  const todayEvents = useMemo(() => {
    return filteredEvents.filter((event) =>
      sameDay(new Date(event.start_at), today)
    );
  }, [filteredEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return filteredEvents
      .filter((event) =>
        sameDay(new Date(event.start_at), selectedDate)
      )
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime()
      );
  }, [filteredEvents, selectedDate]);

  function goToPreviousMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  }

  function goToNextMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  }

  function goToToday() {
    const now = new Date();

    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  function eventsForDate(date: Date) {
    return filteredEvents.filter((event) =>
      sameDay(new Date(event.start_at), date)
    );
  }

  function countdownText(event: AcademicEvent) {
    const now = new Date();
    const target = new Date(event.start_at);

    const difference = target.getTime() - now.getTime();

    if (difference < 0) {
      return "Past";
    }

    const minutes = Math.floor(difference / 60000);

    if (minutes < 60) {
      return `In ${Math.max(minutes, 1)} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `In ${hours} hr`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) {
      return "Tomorrow";
    }

    return `In ${days} days`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">
              Loading academic calendar...
            </p>
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
                    Keep track of important academic dates and events.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Today
              </button>

              <Link
                href="/timetable"
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                View Timetable
              </Link>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
            <span>{error}</span>

            <button
              type="button"
              onClick={loadCalendar}
              className="rounded-lg bg-white px-3 py-2 font-semibold text-red-700 shadow-sm hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total Events
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {filteredEvents.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Today
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {todayEvents.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              This Month
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {monthEvents.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Upcoming
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {upcomingEvents.length}
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            {EVENT_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  filter === item.value
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* CALENDAR */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* CALENDAR HEADER */}
            <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {MONTHS[currentMonth.getMonth()]}{" "}
                  {currentMonth.getFullYear()}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {monthEvents.length} event
                  {monthEvents.length === 1 ? "" : "s"} this month
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  aria-label="Previous month"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>

            {/* DAY HEADERS */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="border-r border-gray-200 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7">
              {monthDays.map(({ date, currentMonth: isCurrentMonth }, index) => {
                const dayEvents = eventsForDate(date);

                const isToday = sameDay(date, today);

                const isSelected =
                  selectedDate !== null &&
                  sameDay(date, selectedDate);

                return (
                  <button
                    key={`${date.toISOString()}-${index}`}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`relative min-h-[115px] border-b border-r border-gray-200 p-2 text-left transition last:border-r-0 hover:bg-gray-50 md:min-h-[140px] ${
                      !isCurrentMonth ? "bg-gray-50/70" : "bg-white"
                    } ${
                      isSelected
                        ? "ring-2 ring-inset ring-gray-900"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                          isToday
                            ? "bg-gray-900 text-white"
                            : isCurrentMonth
                            ? "text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-semibold text-gray-400">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-1.5 overflow-hidden"
                        >
                          <span
                            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${eventDotClass(
                              event.event_type
                            )}`}
                          />

                          <span className="truncate text-[11px] font-medium text-gray-600">
                            {event.title}
                          </span>
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <div className="text-[10px] font-medium text-gray-400">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-6">
            {/* SELECTED DAY */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedDate
                    ? new Intl.DateTimeFormat("en-KE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(selectedDate)
                    : "Select a date"}
                </h2>

                {!selectedDate && (
                  <p className="mt-1 text-sm text-gray-500">
                    Select a day on the calendar to see its events.
                  </p>
                )}
              </div>

              {selectedDate && selectedDayEvents.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center">
                  <div className="text-2xl">✓</div>

                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    No events scheduled
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    You have no calendar events for this day.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {selectedDayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    unitName={
                      event.unit_id
                        ? unitMap.get(event.unit_id) || null
                        : null
                    }
                    countdown={countdownText(event)}
                  />
                ))}
              </div>
            </section>

            {/* UPCOMING */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Upcoming
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Your next academic events
                  </p>
                </div>

                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {upcomingEvents.length}
                </span>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center">
                  <div className="text-2xl">📭</div>

                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    No upcoming events
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Your calendar is clear for now.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      unitName={
                        event.unit_id
                          ? unitMap.get(event.unit_id) || null
                          : null
                      }
                      countdown={countdownText(event)}
                    />
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function EventCard({
  event,
  unitName,
  countdown,
}: {
  event: AcademicEvent;
  unitName: string | null;
  countdown: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 transition hover:border-gray-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${eventTypeClasses(
                event.event_type
              )}`}
            >
              {eventTypeLabel(event.event_type)}
            </span>

            <span className="text-xs font-semibold text-gray-400">
              {countdown}
            </span>
          </div>

          <h3 className="text-sm font-bold text-gray-900">
            {event.title}
          </h3>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-gray-500">
        <div className="flex items-start gap-2">
          <span>📅</span>

          <span>
            {formatDate(event.start_at)}
            {!event.is_all_day && ` • ${formatTime(event.start_at)}`}
          </span>
        </div>

        {event.end_at && !event.is_all_day && (
          <div className="flex items-start gap-2">
            <span>⏱️</span>

            <span>
              Ends at {formatTime(event.end_at)}
            </span>
          </div>
        )}

        {event.location && (
          <div className="flex items-start gap-2">
            <span>📍</span>

            <span>{event.location}</span>
          </div>
        )}

        {unitName && (
          <div className="flex items-start gap-2">
            <span>📚</span>

            <span>{unitName}</span>
          </div>
        )}
      </div>

      {event.description && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-600">
          {event.description}
        </p>
      )}

      {event.unit_id && (
        <Link
          href={`/units/${event.unit_id}`}
          className="mt-3 inline-flex rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
        >
          Open Unit
        </Link>
      )}
    </div>
  );
}