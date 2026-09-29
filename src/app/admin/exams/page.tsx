'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Unit = {
  id: number;
  name: string;
};

type Exam = {
  id: number;
  unit_id: number;
  title: string;
  exam_type: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  instructions: string | null;
  created_at: string;
  units?: {
    name: string;
  } | null;
};

const emptyForm = {
  unit_id: '',
  title: '',
  exam_type: 'Final Exam',
  exam_date: '',
  start_time: '',
  end_time: '',
  venue: '',
  instructions: '',
};

export default function AdminExamsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    const { data: unitData, error: unitError } = await supabase
      .from('units')
      .select('id, name')
      .order('name', { ascending: true });

    if (unitError) {
      setError(unitError.message);
      setLoading(false);
      return;
    }

    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`
        id,
        unit_id,
        title,
        exam_type,
        exam_date,
        start_time,
        end_time,
        venue,
        instructions,
        created_at,
        units (
          name
        )
      `)
      .order('exam_date', { ascending: true, nullsFirst: false })
      .order('start_time', { ascending: true, nullsFirst: false });

    if (examError) {
      setError(examError.message);
    } else {
      setExams(
        (examData || []).map((exam) => ({
          ...exam,
          units: Array.isArray(exam.units)
            ? exam.units[0] || null
            : exam.units,
        }))
      );
    }

    setUnits(unitData || []);
    setLoading(false);
  }

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!form.unit_id) {
      setError('Please select a unit.');
      return;
    }

    if (!form.title.trim()) {
      setError('Please enter an exam title.');
      return;
    }

    setSaving(true);

    const payload = {
      unit_id: Number(form.unit_id),
      title: form.title.trim(),
      exam_type: form.exam_type,
      exam_date: form.exam_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      venue: form.venue.trim() || null,
      instructions: form.instructions.trim() || null,
    };

    if (editingId !== null) {
      const { error: updateError } = await supabase
        .from('exams')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage('Exam updated successfully.');
        resetForm();
        await loadData();
      }
    } else {
      const { error: insertError } = await supabase
        .from('exams')
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
      } else {
        setMessage('Exam published successfully.');
        resetForm();
        await loadData();
      }
    }

    setSaving(false);
  }

  function startEditing(exam: Exam) {
    setEditingId(exam.id);

    setForm({
      unit_id: String(exam.unit_id),
      title: exam.title,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date || '',
      start_time: exam.start_time
        ? exam.start_time.slice(0, 5)
        : '',
      end_time: exam.end_time
        ? exam.end_time.slice(0, 5)
        : '',
      venue: exam.venue || '',
      instructions: exam.instructions || '',
    });

    setMessage('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function deleteExam(id: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this exam? This action cannot be undone.'
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage('Exam deleted successfully.');

    if (editingId === id) {
      resetForm();
    }

    await loadData();
  }

  function formatDate(date: string | null) {
    if (!date) return 'Date not set';

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      'en-KE',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  }

  function formatTime(time: string | null) {
    if (!time) return '';

    const [hours, minutes] = time.split(':').map(Number);

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-KE', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">
            ADMIN PORTAL
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Exam Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Publish and manage examination schedules for students.
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Exam Form */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingId !== null
                  ? 'Edit Exam'
                  : 'Publish New Exam'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the examination details students should see.
              </p>
            </div>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel Editing
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Unit + Exam Type */}
            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label
                  htmlFor="unit"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Unit
                </label>

                <select
                  id="unit"
                  value={form.unit_id}
                  onChange={(e) =>
                    updateField('unit_id', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">
                    Select a unit
                  </option>

                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="exam-type"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Exam Type
                </label>

                <select
                  id="exam-type"
                  value={form.exam_type}
                  onChange={(e) =>
                    updateField('exam_type', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Final Exam">
                    Final Exam
                  </option>
                  <option value="Mid-Semester Exam">
                    Mid-Semester Exam
                  </option>
                  <option value="CAT">
                    CAT
                  </option>
                  <option value="Special Exam">
                    Special Exam
                  </option>
                  <option value="Supplementary Exam">
                    Supplementary Exam
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Exam Title
              </label>

              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) =>
                  updateField('title', e.target.value)
                }
                placeholder="e.g. Data Structures and Algorithms Final Exam"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            {/* Date and time */}
            <div className="grid gap-5 sm:grid-cols-3">

              <div>
                <label
                  htmlFor="date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Exam Date
                </label>

                <input
                  id="date"
                  type="date"
                  value={form.exam_date}
                  onChange={(e) =>
                    updateField('exam_date', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="start-time"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Start Time
                </label>

                <input
                  id="start-time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    updateField('start_time', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="end-time"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  End Time
                </label>

                <input
                  id="end-time"
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    updateField('end_time', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label
                htmlFor="venue"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Venue
              </label>

              <input
                id="venue"
                type="text"
                value={form.venue}
                onChange={(e) =>
                  updateField('venue', e.target.value)
                }
                placeholder="e.g. Main Campus Hall 2"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Instructions */}
            <div>
              <label
                htmlFor="instructions"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Instructions
              </label>

              <textarea
                id="instructions"
                value={form.instructions}
                onChange={(e) =>
                  updateField('instructions', e.target.value)
                }
                rows={4}
                placeholder="Enter any instructions students should know..."
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving
                  ? 'Saving...'
                  : editingId !== null
                    ? 'Update Exam'
                    : 'Publish Exam'}
              </button>
            </div>
          </form>
        </section>

        {/* Published Exams */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Published Exams
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Exams currently available in the DataSphere system.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading exams...
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="font-semibold text-slate-900">
                No exams published yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Use the form above to publish the first examination.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam) => (
                <article
                  key={exam.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {exam.exam_type}
                        </span>

                        {exam.exam_date && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {formatDate(exam.exam_date)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {exam.title}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {exam.units?.name || 'Unit unavailable'}
                      </p>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">

                        {(exam.start_time || exam.end_time) && (
                          <div>
                            <span className="font-semibold text-slate-800">
                              Time:
                            </span>{' '}
                            {formatTime(exam.start_time)}
                            {exam.start_time &&
                              exam.end_time &&
                              ' – '}
                            {formatTime(exam.end_time)}
                          </div>
                        )}

                        {exam.venue && (
                          <div>
                            <span className="font-semibold text-slate-800">
                              Venue:
                            </span>{' '}
                            {exam.venue}
                          </div>
                        )}
                      </div>

                      {exam.instructions && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Instructions
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {exam.instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full gap-2 lg:w-auto lg:flex-col">
                      <button
                        type="button"
                        onClick={() => startEditing(exam)}
                        className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:flex-none"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteExam(exam.id)}
                        className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 lg:flex-none"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}