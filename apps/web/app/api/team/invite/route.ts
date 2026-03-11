import { NextResponse } from "next/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { Resend } from "resend";

import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { getServerEnv, getPublicEnv } from "../../../../lib/env";
import { rateLimit } from "../../../../lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  workspace_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member", "viewer"]).default("member")
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limited = rateLimit({ key: `team-invite:${ip}`, max: 10, windowMs: 60_000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());
    const env = getServerEnv();
    const publicEnv = getPublicEnv();

    if (!env.INVITE_JWT_SECRET) {
      return NextResponse.json(
        { error: "Missing INVITE_JWT_SECRET" },
        { status: 500 }
      );
    }

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY or FROM_EMAIL" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        workspace_id: body.workspace_id,
        email: body.email,
        role: body.role,
        invited_by: user.id
      },
      env.INVITE_JWT_SECRET,
      { expiresIn: "7d", issuer: "speckyai", subject: body.email }
    );

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const admin = createSupabaseAdminClient();
    const { error: insertError } = await admin.from("workspace_invites").insert({
      workspace_id: body.workspace_id,
      email: body.email,
      role: body.role,
      invited_by: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      workspace_id: body.workspace_id,
      actor_user_id: user.id,
      action: "team.invite",
      target: { email: body.email, role: body.role }
    });

    const joinUrl = `${publicEnv.NEXT_PUBLIC_APP_URL ?? ""}/join?token=${encodeURIComponent(
      token
    )}`;

    const resend = new Resend(env.RESEND_API_KEY);
    const emailRes = await resend.emails.send({
      from: env.FROM_EMAIL,
      to: [body.email],
      subject: "You’ve been invited to SpeckyAI",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">SpeckyAI workspace invitation</h2>
          <p style="margin: 0 0 12px; color: #334155;">
            You were invited to join a SpeckyAI workspace as <strong>${body.role}</strong>.
          </p>
          <p style="margin: 0 0 16px;">
            <a href="${joinUrl}" style="color: #5b47d6;">Accept invite</a>
          </p>
          <p style="margin: 0; color: #64748b; font-size: 12px;">
            This link expires in 7 days.
          </p>
        </div>
      `
    });

    if (emailRes.error) {
      return NextResponse.json({ error: emailRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

