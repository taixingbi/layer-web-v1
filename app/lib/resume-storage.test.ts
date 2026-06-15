import { afterEach, describe, expect, it } from "vitest";

import {
  isPdfBuffer,
  resumePdfMaxBytes,
  resumePdfStoragePath,
} from "./resume-storage";

describe("resume-storage", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("isPdfBuffer accepts PDF magic bytes", () => {
    expect(isPdfBuffer(Buffer.from("%PDF-1.4"))).toBe(true);
    expect(isPdfBuffer(Buffer.from("not-a-pdf"))).toBe(false);
  });

  it("resumePdfMaxBytes defaults to 5 MiB", () => {
    delete process.env.RESUME_PDF_MAX_BYTES;
    expect(resumePdfMaxBytes()).toBe(5 * 1024 * 1024);
  });

  it("resumePdfStoragePath resolves under public/resume by default", () => {
    delete process.env.RESUME_PDF_STORAGE_PATH;
    delete process.env.RESUME_PDF_STORAGE_DIR;
    expect(resumePdfStoragePath()).toMatch(/public[\\/]resume[\\/]Taixing_Bi_Resume\.pdf$/);
  });

  it("resumePdfStoragePath honors RESUME_PDF_STORAGE_PATH", () => {
    process.env.RESUME_PDF_STORAGE_PATH = "/data/resume/custom.pdf";
    expect(resumePdfStoragePath()).toBe("/data/resume/custom.pdf");
  });
});
