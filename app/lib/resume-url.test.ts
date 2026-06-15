import { afterEach, describe, expect, it } from "vitest";

import { RESUME_PDF_FILENAME, resumePdfAbsoluteUrl, resumePdfPath } from "./resume-url";

describe("resume-url", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("resumePdfPath returns bundled public path", () => {
    expect(resumePdfPath()).toBe("/resume/Taixing_Bi_Resume.pdf");
    expect(RESUME_PDF_FILENAME).toBe("Taixing_Bi_Resume.pdf");
  });

  it("resumePdfAbsoluteUrl prefers canonical env", () => {
    process.env.NEXT_PUBLIC_RESUME_CANONICAL_URL =
      "https://taixingai.com/resume/Taixing_Bi_Resume.pdf";
    process.env.APP_URL = "https://dev.taixingai.com";
    expect(resumePdfAbsoluteUrl()).toBe("https://taixingai.com/resume/Taixing_Bi_Resume.pdf");
  });

  it("resumePdfAbsoluteUrl falls back to APP_URL", () => {
    delete process.env.NEXT_PUBLIC_RESUME_CANONICAL_URL;
    process.env.APP_URL = "https://dev.taixingai.com";
    expect(resumePdfAbsoluteUrl()).toBe("https://dev.taixingai.com/resume/Taixing_Bi_Resume.pdf");
  });

  it("resumePdfAbsoluteUrl returns relative path when no origin configured", () => {
    delete process.env.NEXT_PUBLIC_RESUME_CANONICAL_URL;
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(resumePdfAbsoluteUrl()).toBe("/resume/Taixing_Bi_Resume.pdf");
  });
});
