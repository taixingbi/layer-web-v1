import { redirect } from "next/navigation";

/** Legacy path — Observability renamed from Logs. */
export default function LogsRedirectPage() {
  redirect("/admin/observability");
}
