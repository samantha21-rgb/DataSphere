"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Unit = {
  id: number;
  name: string;
  code?: string | null;
};

type Discussion = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  published: boolean;
  pinned: boolean;
  locked: boolean;
  allow_replies: boolean;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
};

type UnitMap = Record<number, Unit>;

export default function DiscussionsPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [units, setUnits] = useState<UnitMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadDiscussions();
  }, []);

  async function loadDiscussions() {
    setLoading(true);
    setError("");

    const discussionResult = await supabase
      .from("discussions")
      .select("*")
      .eq("published", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (discussionResult.error) {
      setError(discussionResult.error.message);
      setLoading(false);
      return;
    }

    const loaded =
      (discussionResult.data || []) as Discussion[];

    setDiscussions(loaded);

    const unitIds = Array.from(
      new Set(loaded.map((discussion) => discussion.unit_id))
    );

    if (unitIds.length > 0) {
      const unitResult = await supabase
        .from("units")
        .select("id, name, code")
        .in("id", unitIds);

      if (!unitResult.error) {
        const map: UnitMap = {};

        for (const unit of unitResult.data || []) {
          map[unit.id] = unit as Unit;
        }

        setUnits(map);
      }
    }

    setLoading(false);
  }

  const filtered = discussions.filter((discussion) => {
    const unit = units[discussion.unit_id];

    const text = [
      discussion.title,
      discussion.description || "",
      unit?.name || "",
      unit?.code || "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Discussions
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Ask questions, share ideas, and collaborate with
            other students.
          </p>
        </div>

        <div className="mb-6">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search discussions..."
            className="w-full rounded-xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
            Loading discussions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <div className="text-lg font-semibold">
              No discussions found
            </div>

            <p className="mt-1 text-sm text-slate-500">
              There are no published discussions matching
              your search.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((discussion) => {
              const unit = units[discussion.unit_id];

              return (
                <Link
                  key={discussion.id}
                  href={`/discussions/${discussion.id}`}
                  className="block rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {discussion.pinned && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Pinned
                          </span>
                        )}

                        {discussion.locked && (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                            Locked
                          </span>
                        )}

                        {unit && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {unit.code || unit.name}
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold">
                        {discussion.title}
                      </h2>

                      {discussion.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {discussion.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-sm text-slate-500">
                      {new Date(
                        discussion.created_at
                      ).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}