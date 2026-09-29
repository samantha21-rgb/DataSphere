import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");

    if (!unitId) {
      return NextResponse.json(
        { error: "unitId is required" },
        { status: 400 }
      );
    }

    const { data: resources, error } = await supabase
      .from("ai_resource_files")
      .select(`
        id,
        resource_type,
        resource_id,
        unit_id,
        title,
        description,
        file_url,
        gemini_file_name,
        gemini_file_uri,
        status,
        created_at
      `)
      .eq("unit_id", Number(unitId))
      .eq("status", "ready")
      .order("resource_type", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Resource query error:", error);

      return NextResponse.json(
        { error: "Failed to load resources" },
        { status: 500 }
      );
    }

    const grouped = {
      notes: resources?.filter(
        (resource) => resource.resource_type === "note"
      ) ?? [],

      cats: resources?.filter(
        (resource) => resource.resource_type === "cat"
      ) ?? [],

      assignments: resources?.filter(
        (resource) => resource.resource_type === "assignment"
      ) ?? [],

      pastPapers: resources?.filter(
        (resource) => resource.resource_type === "past_paper"
      ) ?? [],
    };

    return NextResponse.json({
      unitId: Number(unitId),
      total: resources?.length ?? 0,
      resources: grouped,
    });
  } catch (error) {
    console.error("AI resources API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}