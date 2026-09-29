import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    if (!ai) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Check your .env.local file.",
        },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error:
            "Supabase environment variables are not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * Get the user's Supabase access token from the browser.
     */
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    /*
     * Create a server-side Supabase client using the
     * authenticated student's token.
     */
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Your login session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const conversationIdValue = formData.get("conversationId");
    const unitIdValue = formData.get("unitId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "No file was provided.",
        },
        { status: 400 }
      );
    }

    /*
     * Check file size.
     */
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File is too large. Maximum size is 50 MB.",
        },
        { status: 400 }
      );
    }

    /*
     * Check supported file type.
     */
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "This file type is not currently supported. Please upload a PDF, document, spreadsheet, presentation, text file, or image.",
        },
        { status: 400 }
      );
    }

    const conversationId =
      conversationIdValue &&
      !Number.isNaN(Number(conversationIdValue))
        ? Number(conversationIdValue)
        : null;

    const unitId =
      unitIdValue &&
      !Number.isNaN(Number(unitIdValue))
        ? Number(unitIdValue)
        : null;

    /*
     * Verify that the conversation belongs to the
     * authenticated student.
     */
    if (conversationId) {
      const { data: conversation, error: conversationError } =
        await supabase
          .from("ai_conversations")
          .select("id")
          .eq("id", conversationId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (conversationError) {
        throw conversationError;
      }

      if (!conversation) {
        return NextResponse.json(
          {
            error: "Conversation not found.",
          },
          { status: 404 }
        );
      }
    }

    /*
     * Create a safe storage filename.
     */
    const originalName = file.name || "uploaded-file";

    const safeName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");

    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const storagePath = `${user.id}/${uniqueName}`;

    /*
     * Convert File to Buffer.
     */
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    /*
     * Save the original file in private Supabase Storage.
     */
    const { error: uploadError } = await supabase.storage
      .from("ai-files")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    let geminiFile;

    try {
      /*
       * Send the file to Gemini.
       */
      geminiFile = await ai.files.upload({
        file: new Blob([fileBuffer], {
          type: file.type,
        }),
        config: {
          displayName: originalName,
          mimeType: file.type,
        },
      });
    } catch (geminiError) {
      /*
       * If Gemini upload fails, remove the Supabase file
       * so we don't leave an orphaned upload.
       */
      await supabase.storage
        .from("ai-files")
        .remove([storagePath]);

      throw geminiError;
    }

    /*
     * Save file metadata and Gemini information.
     */
    const { data: aiFile, error: databaseError } = await supabase
      .from("ai_files")
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        unit_id: unitId,
        file_name: originalName,
        file_url: storagePath,
        mime_type: file.type,
        file_size: file.size,
        gemini_file_name: geminiFile.name ?? null,
        gemini_file_uri: geminiFile.uri ?? null,
        status: "ready",
      })
      .select(
        "id, file_name, file_url, mime_type, file_size, gemini_file_name, gemini_file_uri, status, created_at"
      )
      .single();

    if (databaseError) {
      await supabase.storage
        .from("ai-files")
        .remove([storagePath]);

      throw databaseError;
    }

    return NextResponse.json({
      success: true,
      file: aiFile,
    });
  } catch (error) {
    console.error("AI Tutor file upload error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload the file.",
      },
      { status: 500 }
    );
  }
}