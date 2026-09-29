"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const Sidebar = (() => {
  try {
    return require("../components/dashboard/Sidebar").default;
  } catch {
    try {
      return require("../components/dashboard/sidebar").default;
    } catch {
      return function SidebarFallback() {
        return null;
      };
    }
  }
})();

const supabase = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("../lib/supabase").supabase;
  } catch {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: null,
              error: { message: "Supabase client is not configured." },
            }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };
  }
})();

type Assignment = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  file_url: string;
  assignment_number: number | null;
  created_at: string;
};

type Unit = {
  id: number;
  name: string;
  code: string;
};

export default function AssignmentDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    loadAssignment();
  }, [id]);

  async function loadAssignment() {
    setLoading(true);
    setError("");

    const assignmentId = Number(id);

    if (!Number.isInteger(assignmentId)) {
      setError("Invalid assignment.");
      setLoading(false);
      return;
    }

    const { data: assignmentData, error: assignmentError } =
      await supabase
        .from("assignments")
        .select(
          "id, unit_id, title, description, file_url, assignment_number, created_at"
        )
        .eq("id", assignmentId)
        .single();

    if (assignmentError) {
      setError(assignmentError.message);
      setLoading(false);
      return;
    }

    setAssignment(assignmentData);

    const { data: unitData, error: unitError } = await supabase
      .from("units")
      .select("id, name, code")
      .eq("id", assignmentData.unit_id)
      .maybeSingle();

    if (unitError) {
      console.error("Unit lookup failed:", unitError);
    }

    setUnit(unitData);
    setLoading(false);
  }

  return (
    <div className="ds-shell flex">
      <Sidebar />

      <main className="ds-main">
        <div className="ds-content">
          <div className="py-7">
            <Link
              href="/assignments"
              className="mb-6 inline-flex text-sm font700 text-[#3f6f68] transition-opacity hover:opacity-70"
            >
              ← Back to assignments
            </Link>

            {loading ? (
              <div className="ds-empty">
                Loading assignment...
              </div>
            ) : error ? (
              <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                <p className="font750">Unable to load assignment</p>
                <p className="mt-1">{error}</p>
              </div>
            ) : !assignment ? (
              <div className="ds-empty">
                Assignment not found.
              </div>
            ) : (
              <>
                <section className="border-b border-[#ded8cc] pb-7">
                  <p className="ds-kicker">Assignment</p>

                  <h1 className="ds-title">
                    {assignment.title}
                  </h1>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#625d67]">
                    {unit && (
                      <span>
                        <strong className="text-[#29262b]">
                          {unit.code}
                        </strong>{" "}
                        · {unit.name}
                      </span>
                    )}

                    {assignment.assignment_number && (
                      <span>
                        Assignment {assignment.assignment_number}
                      </span>
                    )}

                    <span>
                      Added{" "}
                      {new Date(
                        assignment.created_at
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </section>

                <section className="grid grid-cols-[minmax(0,1fr)_280px] gap-10 py-8">
                  <div>
                    <p className="ds-kicker">Instructions</p>

                    {assignment.description ? (
                      <div className="mt-3 max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-[#4f4a53]">
                        {assignment.description}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[#89828d]">
                        No additional instructions were provided.
                      </p>
                    )}
                  </div>

                  <aside className="border-l border-[#ded8cc] pl-6">
                    <p className="ds-kicker">Resource</p>

                    <p className="mt-3 text-sm leading-6 text-[#625d67]">
                      Open the uploaded assignment document to read the full
                      coursework.
                    </p>

                    <a
                      href={assignment.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ds-btn ds-btn-primary mt-5 inline-flex"
                    >
                      Open assignment ↗
                    </a>
                  </aside>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}