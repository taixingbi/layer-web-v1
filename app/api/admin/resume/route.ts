/**
 * Admin-only resume PDF upload (multipart form field `file`).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { resumePdfPath } from "@/lib/resume-url";
import { ResumeStorageError, writeResumePdf } from "@/lib/resume-storage";
import { logWebEvent } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — replace bundled resume PDF (admin only). */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const started = Date.now();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const entry = form.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const name = entry.name.toLowerCase();
  if (!name.endsWith(".pdf") && entry.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const bytes = Buffer.from(await entry.arrayBuffer());

  try {
    const written = await writeResumePdf(bytes);
    logWebEvent("admin_resume_upload_ok", "INFO", {
      phase: "admin",
      path: "/api/admin/resume",
      method: "POST",
      auth_mode: auth.mode,
      latency_ms: Date.now() - started,
      bytes: written.bytes,
    });
    return NextResponse.json({
      ok: true,
      filename: entry.name,
      bytes: written.bytes,
      downloadUrl: resumePdfPath(),
    });
  } catch (err) {
    if (err instanceof ResumeStorageError) {
      logWebEvent("admin_resume_upload_rejected", "WARN", {
        phase: "admin",
        path: "/api/admin/resume",
        method: "POST",
        auth_mode: auth.mode,
        latency_ms: Date.now() - started,
        error: err.message,
      });
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    logWebEvent("admin_resume_upload_error", "ERROR", {
      phase: "admin",
      path: "/api/admin/resume",
      method: "POST",
      auth_mode: auth.mode,
      latency_ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to save resume PDF" }, { status: 500 });
  }
}
