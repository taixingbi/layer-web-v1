import { NextResponse } from "next/server";

/** Public flags for the login / signup UI (no secrets). */
export async function GET() {
  const demo =
    Boolean(process.env.AUTH_DEMO_EMAIL?.trim()) &&
    Boolean(process.env.AUTH_DEMO_PASSWORD?.trim()) &&
    Boolean(process.env.AUTH_DEMO_ACCESS_TOKEN?.trim());
  const signupUrl = process.env.AUTH_SIGNUP_URL?.trim() || null;
  const validateRaw = process.env.AUTH_VALIDATE_TOKEN_ON_LOGIN?.trim().toLowerCase();
  const validateTokenOnLogin = !(validateRaw === "false" || validateRaw === "0" || validateRaw === "no");
  return NextResponse.json({ demoLogin: demo, signupUrl, validateTokenOnLogin });
}
