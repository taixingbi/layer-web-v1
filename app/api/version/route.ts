import { versionPayload } from "@/lib/build-info";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(versionPayload());
}
