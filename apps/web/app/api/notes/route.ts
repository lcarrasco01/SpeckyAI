import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getServerEnv } from "../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  recording_id: z.string().min(1)
});

const meetingNotesSchema = z.object({
  title: z.string(),
  date: z.string(),
  duration: z.string(),
  summary: z.string(),
  key_topics: z.array(z.string()),
  action_items: z.array(
    z.object({
      task: z.string(),
      owner: z.string(),
      due: z.string().nullable()
    })
  ),
  decisions: z.array(
    z.object({
      decision: z.string(),
      context: z.string()
    })
  ),
  open_questions: z.array(z.string()),
  attendees_mentioned: z.array(z.string())
});

const SYSTEM_PROMPT = `You are an expert meeting scribe. Given a raw meeting transcript, extract and return ONLY valid JSON with this exact structure:

{
  "title": "string — inferred meeting topic",
  "date": "string — today's date",
  "duration": "string — estimated from transcript length",
  "summary": "string — 3-5 sentence executive summary",
  "key_topics": ["topic1", "topic2", ...],
  "action_items": [
    { "task": "string", "owner": "string or 'Unassigned'", "due": "string or null" }
  ],
  "decisions": [
    { "decision": "string", "context": "string" }
  ],
  "open_questions": ["question1", "question2"],
  "attendees_mentioned": ["name1", "name2"]
}

Be specific and concise. Infer owners from context. Do not add any text outside the JSON.`;

async function generateNotesJson(openai: OpenAI, transcript: string, retry: boolean) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: retry
          ? `Return ONLY JSON. No markdown. No explanations. Transcript:\n\n${transcript}`
          : `Transcript:\n\n${transcript}`
      }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(content);
  return meetingNotesSchema.parse(parsed);
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());

    const { data: chunks, error: chunksError } = await supabase
      .from("transcript_chunks")
      .select("chunk_index,text")
      .eq("recording_id", body.recording_id)
      .order("chunk_index", { ascending: true });

    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    const transcript = (chunks ?? [])
      .map((c) => String(c.text ?? ""))
      .filter(Boolean)
      .join("\n");

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript chunks found for recording." },
        { status: 400 }
      );
    }

    const env = getServerEnv();
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    let notesJson: z.infer<typeof meetingNotesSchema>;
    try {
      notesJson = await generateNotesJson(openai, transcript, false);
    } catch {
      notesJson = await generateNotesJson(openai, transcript, true);
    }

    const { error: upsertError } = await supabase.from("meeting_notes").upsert(
      {
        recording_id: body.recording_id,
        summary: notesJson.summary,
        action_items: notesJson.action_items,
        decisions: notesJson.decisions,
        notes_json: notesJson
      },
      { onConflict: "recording_id" }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ recording_id: body.recording_id, notes: notesJson });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

