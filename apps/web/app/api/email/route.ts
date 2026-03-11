import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getServerEnv } from "../../../lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  to: z.array(z.string().email()).min(1),
  recording_id: z.string().min(1),
  pdf_url: z.string().url()
});

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
    const env = getServerEnv();

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY or FROM_EMAIL" },
        { status: 500 }
      );
    }

    const pdfRes = await fetch(body.pdf_url);
    if (!pdfRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF (${pdfRes.status})` },
        { status: 400 }
      );
    }
    const pdfArrayBuffer = await pdfRes.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    const { data: notesRow } = await supabase
      .from("meeting_notes")
      .select("notes_json,summary")
      .eq("recording_id", body.recording_id)
      .maybeSingle();

    const notesJson = (notesRow?.notes_json ?? {}) as Record<string, unknown>;
    const title = String(notesJson.title ?? "Meeting Notes");
    const date = String(notesJson.date ?? "");

    const resend = new Resend(env.RESEND_API_KEY);
    const subject = `Meeting Notes: ${title}${date ? ` — ${date}` : ""}`;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
        <p style="margin: 0 0 12px; color: #334155;">
          Your SpeckyAI meeting notes PDF is attached.
        </p>
        <p style="margin: 0 0 16px;">
          <a href="${body.pdf_url}" style="color: #5b47d6;">Download PDF</a>
        </p>
      </div>
    `;

    const send = await resend.emails.send({
      from: env.FROM_EMAIL,
      to: body.to,
      subject,
      html,
      attachments: [
        {
          filename: "SpeckyAI-Meeting-Notes.pdf",
          content: pdfBuffer
        }
      ]
    });

    if (send.error) {
      return NextResponse.json({ error: send.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, to: body.to, id: send.data?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

