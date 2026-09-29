import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  createPartFromUri,
} from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

function getModeInstructions(mode) {
  switch (mode) {
    case "explain":
      return `
The student wants an explanation.

Explain the concept clearly from the foundations upward.
Use simple language first, then introduce technical terminology.
Use examples and analogies where useful.
Break complicated ideas into manageable parts.
`;

    case "solve":
      return `
The student wants help solving a problem.

Work through the reasoning step by step.
Clearly identify what is being asked, the information given,
the method or formula required, each important step, and the final answer.
For mathematics and statistics, show calculations clearly.
For programming, explain the logic before presenting code.
`;

    case "socratic":
      return `
Use Socratic tutoring.

Do not immediately give the complete answer.
Ask useful guiding questions and provide hints progressively.
Help the student discover the answer themselves.
`;

    case "quiz":
      return `
Act as an interactive academic quiz master.

Ask one question at a time.
Wait for the student's answer before evaluating it.
After an answer, state whether it is correct, partially correct,
or incorrect, explain why, and give the next question.
`;

    case "revision":
      return `
Focus on revision.

Identify the key concepts the student should know.
Organize information into concise revision sections.
Highlight definitions, formulas, relationships, common mistakes and examples.
`;

    case "exam":
      return `
Focus on examination preparation.

Create realistic practice questions based on the available academic material.
Include different difficulty levels.
Prioritize understanding over memorization.
`;

    case "study-plan":
      return `
Create a practical academic study plan.

Break the requested material into manageable sessions.
Prioritize difficult or important concepts.
Include active recall, practice and revision.
`;

    case "flashcards":
      return `
Create useful academic flashcards.

Each card should contain a FRONT question or prompt
and a BACK answer or explanation.
Prioritize important concepts.
`;

    case "code":
      return `
Act as an academic programming tutor.

Explain programming concepts rather than merely copying code.
When code is supplied, identify the problem, explain why it occurs,
show the corrected approach and explain the correction.
`;

    case "summarize":
      return `
Summarize the supplied academic material.

Preserve the important academic meaning.
Organize the summary using headings, bullet points,
definitions, key concepts, examples and formulas.
Do not invent information not present in the material.
`;

    case "tutor":
    default:
      return `
Act as a knowledgeable university academic tutor.

Answer the student's question directly while helping them actually
understand the subject.

Explain difficult ideas clearly.
Use examples when useful.
Show reasoning for calculations and problem solving.
Correct misconceptions respectfully.
`;
  }
}

function getMimeType(url) {
  const cleanUrl = url.split("?")[0].toLowerCase();

  if (cleanUrl.endsWith(".pdf")) return "application/pdf";
  if (cleanUrl.endsWith(".txt")) return "text/plain";
  if (cleanUrl.endsWith(".csv")) return "text/csv";
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".gif")) return "image/gif";

  if (cleanUrl.endsWith(".doc")) {
    return "application/msword";
  }

  if (cleanUrl.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (cleanUrl.endsWith(".ppt")) {
    return "application/vnd.ms-powerpoint";
  }

  if (cleanUrl.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  if (cleanUrl.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }

  if (cleanUrl.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/pdf";
}

export async function POST(request) {
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

    /*
     * ---------------------------------------------------------
     * AUTHENTICATE USER
     * ---------------------------------------------------------
     */

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "You must be logged in to use the AI Tutor.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Your login session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    /*
     * ---------------------------------------------------------
     * REQUEST DATA
     * ---------------------------------------------------------
     */

    const body = await request.json();

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const unitId =
      typeof body?.unitId === "number"
        ? body.unitId
        : null;

    const unitName =
      typeof body?.unitName === "string"
        ? body.unitName.trim()
        : "";

    const mode =
      typeof body?.mode === "string"
        ? body.mode
        : "tutor";

    const history = Array.isArray(body?.history)
      ? body.history
          .filter(
            (item) =>
              item &&
              typeof item.content === "string" &&
              (item.role === "user" ||
                item.role === "assistant")
          )
          .slice(-10)
      : [];

    const manualFiles = Array.isArray(body?.files)
      ? body.files
          .filter(
            (file) =>
              file &&
              typeof file.geminiFileUri === "string"
          )
          .slice(-5)
      : [];

    if (!message) {
      return NextResponse.json(
        {
          error: "Please provide a message.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * LOAD DATASPHERE ACADEMIC RESOURCES
     * ---------------------------------------------------------
     */

    let resources = [];

    if (unitId) {
      const [
        notesResult,
        catsResult,
        assignmentsResult,
        pastPapersResult,
      ] = await Promise.all([
        supabase
          .from("notes")
          .select("id, title, description, file_url")
          .eq("unit_id", unitId),

        supabase
          .from("cats")
          .select("id, title, description, file_url")
          .eq("unit_id", unitId),

        supabase
          .from("assignments")
          .select("id, title, description, file_url")
          .eq("unit_id", unitId),

        supabase
          .from("past_papers")
          .select("id, title, description, file_url")
          .eq("unit_id", unitId),
      ]);

      if (notesResult.error) {
        console.error("Notes RAG error:", notesResult.error);
      }

      if (catsResult.error) {
        console.error("CAT RAG error:", catsResult.error);
      }

      if (assignmentsResult.error) {
        console.error(
          "Assignments RAG error:",
          assignmentsResult.error
        );
      }

      if (pastPapersResult.error) {
        console.error(
          "Past papers RAG error:",
          pastPapersResult.error
        );
      }

      resources = [
        ...(notesResult.data || []).map((item) => ({
          id: item.id,
          type: "Lecture Note",
          title: item.title,
          description: item.description,
          file_url: item.file_url,
          mime_type: getMimeType(item.file_url),
        })),

        ...(catsResult.data || []).map((item) => ({
          id: item.id,
          type: "CAT",
          title: item.title,
          description: item.description,
          file_url: item.file_url,
          mime_type: getMimeType(item.file_url),
        })),

        ...(assignmentsResult.data || []).map((item) => ({
          id: item.id,
          type: "Assignment",
          title: item.title,
          description: item.description,
          file_url: item.file_url,
          mime_type: getMimeType(item.file_url),
        })),

        ...(pastPapersResult.data || []).map((item) => ({
          id: item.id,
          type: "Past Paper",
          title: item.title,
          description: item.description,
          file_url: item.file_url,
          mime_type: getMimeType(item.file_url),
        })),
      ].slice(0, 8);
    }

    /*
     * ---------------------------------------------------------
     * BUILD RESOURCE CONTEXT
     * ---------------------------------------------------------
     */

    const resourceInstructions =
      resources.length > 0
        ? `
The student is studying:

${unitName || "the selected university unit"}

DataSphere has academic resources for this unit.

You MUST treat these resources as the primary academic source
when the question relates to the unit material.

Available resources:

${resources
  .map(
    (resource, index) =>
      `${index + 1}. ${resource.type}: ${resource.title}${
        resource.description
          ? ` — ${resource.description}`
          : ""
      }`
  )
  .join("\n")}

Use the supplied resource files when answering questions about
the unit.

Do not claim something came from the DataSphere resources unless
you actually used the supplied material.

If the supplied material does not contain the answer, say so,
then use general academic knowledge only when appropriate.
`
        : unitId
          ? `
The student selected the unit:

${unitName || "the selected university unit"}

No uploaded DataSphere learning resources are currently available
for this unit.

Answer using general academic knowledge.
`
          : `
No specific university unit has been selected.
Answer using general academic knowledge.
`;

    /*
     * ---------------------------------------------------------
     * CONVERSATION HISTORY
     * ---------------------------------------------------------
     */

    const conversationHistory =
      history.length > 0
        ? `
Previous conversation:

${history
  .map(
    (item) =>
      `${
        item.role === "user"
          ? "Student"
          : "DataSphere AI Tutor"
      }: ${item.content}`
  )
  .join("\n\n")}
`
        : "";

    /*
     * ---------------------------------------------------------
     * PROMPT
     * ---------------------------------------------------------
     */

    const prompt = `
You are DataSphere AI Tutor, an academic learning assistant
inside the DataSphere university learning platform.

${resourceInstructions}

${getModeInstructions(mode)}

Important rules:

- Be academically accurate.
- Never fabricate university policies or course content.
- Never invent information from a file.
- Keep explanations structured and readable.
- Adapt explanations to the student's apparent level.
- Encourage understanding rather than blind copying.
- For assessed work, guide the student's reasoning.
- If supplied academic material conflicts with your general
  knowledge, clearly identify the conflict rather than silently
  changing the source.

${conversationHistory}

Student's current question:

${message}
`;

    /*
     * ---------------------------------------------------------
     * GEMINI CONTENT
     * ---------------------------------------------------------
     */

    const parts = [
      {
        text: prompt,
      },
    ];

    /*
     * Add DataSphere academic resources.
     *
     * Gemini supports publicly accessible HTTPS URLs.
     */

    for (const resource of resources) {
      if (resource.file_url) {
        parts.push(
          createPartFromUri(
            resource.file_url,
            resource.mime_type
          )
        );
      }
    }

    /*
     * Add manually uploaded files.
     */

    for (const file of manualFiles) {
      if (
        file.geminiFileUri &&
        file.mimeType
      ) {
        parts.push(
          createPartFromUri(
            file.geminiFileUri,
            file.mimeType
          )
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * STREAM GEMINI RESPONSE
     * ---------------------------------------------------------
     */

    const responseStream =
      await ai.models.generateContentStream({
        model: "gemini-3.7-flash",
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text || "";

            if (text) {
              controller.enqueue(
                encoder.encode(text)
              );
            }
          }

          controller.close();
        } catch (error) {
          console.error(
            "Gemini streaming error:",
            error
          );

          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control":
          "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error(
      "AI Tutor error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while contacting the AI Tutor.",
      },
      { status: 500 }
    );
  }
}