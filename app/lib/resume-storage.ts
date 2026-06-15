/**
 * Server-side resume PDF storage (admin upload writes here; guests download from /resume/).
 */

import fs from "fs/promises";
import path from "path";

import { RESUME_PDF_FILENAME } from "@/lib/resume-url";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export class ResumeStorageError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ResumeStorageError";
  }
}

export function resumePdfMaxBytes(): number {
  const raw = process.env.RESUME_PDF_MAX_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

/** Absolute filesystem path for the stored resume PDF. */
export function resumePdfStoragePath(): string {
  const override = process.env.RESUME_PDF_STORAGE_PATH?.trim();
  if (override) return path.resolve(override);

  const dir = process.env.RESUME_PDF_STORAGE_DIR?.trim() || path.join("public", "resume");
  return path.resolve(process.cwd(), dir, RESUME_PDF_FILENAME);
}

export function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
}

export async function writeResumePdf(buffer: Buffer): Promise<{ path: string; bytes: number }> {
  if (!isPdfBuffer(buffer)) {
    throw new ResumeStorageError("File must be a PDF", 400);
  }

  const max = resumePdfMaxBytes();
  if (buffer.length > max) {
    throw new ResumeStorageError(`PDF must be at most ${max} bytes`, 413);
  }

  const filePath = resumePdfStoragePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return { path: filePath, bytes: buffer.length };
}
