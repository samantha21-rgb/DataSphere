
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type University = {
  id: number;
  name: string;
  abbreviation: string;
  country: string;
};

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
 const [isEditing, setIsEditing] = useState(false); 

  async function loadUniversities() {
    const { data, error } = await supabase
      .from("universities")
      .select("*")
      .order("id");

    if (!error && data) {
      setUniversities(data);
    }
  }

  async function addUniversity() {
  if (!name || !abbreviation || !country) {
    alert("Please fill in all fields.");
    return;
  }

  if (isEditing && editingId !== null) {
    const { error } = await supabase
      .from("universities")
      .update({
        name,
        abbreviation,
        country,
      })
      .eq("id", editingId);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditing(false);
    setEditingId(null);
  } else {
    const { error } = await supabase
      .from("universities")
      .insert({
        name,
        abbreviation,
        country,
      });

    if (error) {
      alert(error.message);
      return;
    }
  }

  setName("");
  setAbbreviation("");
  setCountry("");

  loadUniversities();
}

  async function deleteUniversity(id: number) {
    const { error } = await supabase
      .from("universities")
      .delete()
      .eq("id", id);

    if (!error) {
      loadUniversities();
    } else {
      alert(error.message);
    }
  }

  function editUniversity(uni: University) {
  setEditingId(uni.id);
  setIsEditing(true);

  setName(uni.name);
  setAbbreviation(uni.abbreviation);
  setCountry(uni.country);
}

  useEffect(() => {
    loadUniversities();
  }, []);

  const filteredUniversities = universities.filter((uni) =>
    uni.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-4xl font-bold text-cyan-400 mb-8">
        Universities Management
      </h1>

      <div className="bg-slate-900 p-6 rounded-xl mb-8 space-y-4">
        <input
          className="w-full p-3 rounded bg-slate-800"
          placeholder="University Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-slate-800"
          placeholder="Abbreviation"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-slate-800"
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />

        <button
          onClick={addUniversity}
          className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-lg"
        >
          {isEditing ? "Update University" : "Add University"}
        </button>
      </div>

      <input
        className="w-full p-3 mb-6 rounded bg-slate-800"
        placeholder="Search university..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-4">
        {filteredUniversities.map((uni) => (
          <div
            key={uni.id}
            className="bg-slate-900 rounded-xl p-5"
          >
            <h2 className="text-2xl font-bold text-cyan-400">
              {uni.name}
            </h2>

            <p>{uni.abbreviation}</p>

            <p className="text-gray-400">
              {uni.country}
            </p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => editUniversity(uni)}
                className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded"
              >
                Edit
              </button>

              <button
                onClick={() => deleteUniversity(uni.id)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredUniversities.length === 0 && (
          <p className="text-gray-400">
            No universities found.
          </p>
        )}
      </div>
    </div>
  );
}