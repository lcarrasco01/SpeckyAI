import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getServerEnv } from "../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WHISPER_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const recordingId = String(formData.get("recording_id") ?? "");
    const chunkIndexRaw = String(formData.get("chunk_index") ?? "");
    const startTimeSecondsRaw = String(formData.get("start_time_seconds") ?? "");
    const audioFile = formData.get("file");

    if (!recordingId || !chunkIndexRaw || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "Missing recording_id, chunk_index, or file" },
        { status: 400 }
      );
    }

    const chunkIndex = Number(chunkIndexRaw);
    const startTimeSeconds = startTimeSecondsRaw ? Number(startTimeSecondsRaw) : chunkIndex * 60;

    if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: "Invalid chunk_index" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const bytes = arrayBuffer.byteLength;
    if (bytes > MAX_WHISPER_BYTES) {
      return NextResponse.json(
        { error: `Audio chunk too large (${bytes} bytes). Max is ${MAX_WHISPER_BYTES}.` },
        { status: 413 }
      );
    }

    const env = getServerEnv();
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const whisperFile = await toFile(Buffer.from(arrayBuffer), audioFile.name || "chunk.webm", {
      type: audioFile.type || "application/octet-stream"
    });

    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
      model: "whisper-1"
    });

    const transcriptText = (transcription.text ?? "").trim();

    const { error: insertError } = await supabase.from("transcript_chunks").upsert(
      {
        recording_id: recordingId,
        chunk_index: chunkIndex,
        text: transcriptText
      },
      { onConflict: "recording_id,chunk_index" }
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      chunk_index: chunkIndex,
      transcript_text: transcriptText,
      start_time_seconds: startTimeSeconds
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

