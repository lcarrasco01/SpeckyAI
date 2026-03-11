import { NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  recording_id: z.string().min(1),
  notes: z.record(z.any())
});

async function buildPdfBytes(notes: Record<string, unknown>) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 760;
  const marginX = 48;

  const title = String(notes.title ?? "SpeckyAI Meeting Notes");
  page.drawText(title, { x: marginX, y, size: 18, font: fontBold, color: rgb(0.06, 0.07, 0.14) });
  y -= 22;

  const meta = `${String(notes.date ?? "")}  •  ${String(notes.duration ?? "")}`.trim();
  if (meta) {
    page.drawText(meta, { x: marginX, y, size: 10, font, color: rgb(0.35, 0.4, 0.5) });
    y -= 18;
  }

  const summary = String(notes.summary ?? "").trim();
  if (summary) {
    page.drawText("Executive Summary", { x: marginX, y, size: 12, font: fontBold });
    y -= 16;
    page.drawText(summary.slice(0, 900), {
      x: marginX,
      y,
      size: 10,
      font,
      color: rgb(0.06, 0.07, 0.14),
      maxWidth: 520,
      lineHeight: 14
    });
    y -= 120;
  }

  const keyTopics = Array.isArray(notes.key_topics) ? (notes.key_topics as string[]) : [];
  if (keyTopics.length > 0) {
    page.drawText("Key Topics", { x: marginX, y, size: 12, font: fontBold });
    y -= 14;
    keyTopics.forEach((topic) => {
      if (y < 80) {
        y = 760;
        doc.addPage();
      }
      page.drawText(`• ${topic}`, { x: marginX, y, size: 10, font, color: rgb(0.06, 0.07, 0.14) });
      y -= 12;
    });
    y -= 10;
  }

  const actionItems = Array.isArray(notes.action_items)
    ? (notes.action_items as { task?: string; owner?: string; due?: string | null }[])
    : [];
  if (actionItems.length > 0) {
    page.drawText("Action Items", { x: marginX, y, size: 12, font: fontBold });
    y -= 14;
    actionItems.forEach((item, index) => {
      if (y < 80) {
        y = 760;
        doc.addPage();
      }
      const task = String(item.task ?? "");
      const owner = String(item.owner ?? "Unassigned");
      const due = item.due ? ` • Due: ${item.due}` : "";
      const line = `${index + 1}. [ ] ${owner} — ${task}${due}`;
      page.drawText(line, { x: marginX, y, size: 10, font, color: rgb(0.06, 0.07, 0.14) });
      y -= 12;
    });
    y -= 10;
  }

  const decisions = Array.isArray(notes.decisions)
    ? (notes.decisions as { decision?: string; context?: string }[])
    : [];
  if (decisions.length > 0) {
    page.drawText("Decisions", { x: marginX, y, size: 12, font: fontBold });
    y -= 14;
    decisions.forEach((d, index) => {
      if (y < 80) {
        y = 760;
        doc.addPage();
      }
      const line = `${index + 1}. ${String(d.decision ?? "")}`;
      page.drawText(line, { x: marginX, y, size: 10, font, color: rgb(0.06, 0.07, 0.14) });
      y -= 12;
      const context = String(d.context ?? "").trim();
      if (context) {
        page.drawText(`   ${context}`, {
          x: marginX,
          y,
          size: 9,
          font,
          color: rgb(0.35, 0.4, 0.5)
        });
        y -= 12;
      }
    });
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
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
    const pdfBytes = await buildPdfBytes(body.notes);

    const admin = createSupabaseAdminClient();
    const bucket = "meeting-pdfs";
    const objectPath = `${user.id}/${body.recording_id}.pdf`;

    const upload = await admin.storage.from(bucket).upload(objectPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true
    });

    if (upload.error) {
      return NextResponse.json(
        {
          error: upload.error.message,
          hint:
            "Ensure a Supabase Storage bucket named 'meeting-pdfs' exists and has appropriate policies."
        },
        { status: 500 }
      );
    }

    const signed = await admin.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
    if (signed.error) {
      return NextResponse.json({ error: signed.error.message }, { status: 500 });
    }

    return NextResponse.json({
      recording_id: body.recording_id,
      pdf_path: objectPath,
      signed_url: signed.data.signedUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

