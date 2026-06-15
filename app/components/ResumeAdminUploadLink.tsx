"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/auth-fetch";
import { webApiPaths } from "@/lib/web-api-paths";

const linkClass =
  "px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10";

type UploadStatus = "idle" | "uploading" | "ok" | "error";

/** Admin header control: click opens PDF picker and uploads to BFF. */
export function ResumeAdminUploadLink({ className = linkClass }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ok" && status !== "error") return;
    const timer = window.setTimeout(() => {
      setStatus("idle");
      setMessage(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const openPicker = useCallback(() => {
    if (status === "uploading") return;
    inputRef.current?.click();
  }, [status]);

  const onFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && file.type !== "application/pdf") {
      setStatus("error");
      setMessage("Choose a PDF file.");
      return;
    }

    setStatus("uploading");
    setMessage(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const res = await authFetch(webApiPaths.admin.resume, { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? `Upload failed (${res.status})`);
        return;
      }
      setStatus("ok");
      setMessage("Resume updated");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }, []);

  const label =
    status === "uploading"
      ? "Uploading…"
      : status === "ok"
        ? "Uploaded ✓"
        : "Upload resume";

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={openPicker}
        disabled={status === "uploading"}
        title="Upload resume (PDF)"
        aria-live="polite"
      >
        {label}
      </button>
      {message ? (
        <span className="sr-only" role="status">
          {message}
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onFileChange}
      />
    </>
  );
}
