import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { rateLimit } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  action: z.string().min(1),
  workspace_id: z.string().optional(),
  target: z.record(z.any()).optional()
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limited = rateLimit({ key: `audit:${ip}`, max: 10, windowMs: 60_000 });
    if (!limited.ok) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());

    const admin = createSupabaseAdminClient();
    await admin.from("audit_logs").insert({
      workspace_id: body.workspace_id ?? null,
      actor_user_id: user.id,
      action: body.action,
      target: body.target ?? {},
      ip: ip === "unknown" ? null : ip,
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

