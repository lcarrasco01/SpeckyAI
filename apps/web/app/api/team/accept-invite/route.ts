import { NextResponse } from "next/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";

import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { getServerEnv } from "../../../../lib/env";
import { rateLimit } from "../../../../lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  token: z.string().min(1)
});

const tokenSchema = z.object({
  workspace_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member", "viewer"])
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limited = rateLimit({ key: `team-accept:${ip}`, max: 10, windowMs: 60_000 });
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

    if (!env.INVITE_JWT_SECRET) {
      return NextResponse.json(
        { error: "Missing INVITE_JWT_SECRET" },
        { status: 500 }
      );
    }

    const decoded = jwt.verify(body.token, env.INVITE_JWT_SECRET, {
      issuer: "speckyai"
    });

    const payload = tokenSchema.parse(decoded);
    const tokenHash = createHash("sha256").update(body.token).digest("hex");

    if (user.email && user.email.toLowerCase() !== payload.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Invite email does not match signed-in user." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { error: insertError } = await admin.from("workspace_members").upsert(
      {
        workspace_id: payload.workspace_id,
        user_id: user.id,
        role: payload.role
      },
      { onConflict: "workspace_id,user_id" }
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await admin.from("workspace_invites").delete().eq("token_hash", tokenHash);
    await admin.from("audit_logs").insert({
      workspace_id: payload.workspace_id,
      actor_user_id: user.id,
      action: "team.accept_invite",
      target: { role: payload.role, email: payload.email }
    });

    return NextResponse.json({ ok: true, workspace_id: payload.workspace_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

