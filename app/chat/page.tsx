"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { buildHistory, truncateBeforeMessageId } from "@/lib/chat-history";

type Citation = Record<string, unknown>;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  rewrite?: string;
  run_id?: string;
  request_id?: string;
  citations?: Citation[];
  follow_up_questions?: string[];
};
type Status = "thinking" | "searching_sql" | "cached" | "error" | null;

const FEEDBACK_REASONS = [
  { id: "not_factually_correct", label: "Not factually correct" },
  { id: "didnt_follow_instructions", label: "Didn't follow instructions" },
  { id: "offensive_unsafe", label: "Offensive / Unsafe" },
  { id: "wrong_language", label: "Wrong language" },
  { id: "other", label: "Other" },
] as const;

function nextId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function StreamingCursor() {
  return (
    <span className="chat-stream-cursor" aria-hidden>
      ▋
    </span>
  );
}

function citationTitle(c: Citation, index: number): string {
  if (typeof c.title === "string" && c.title.trim()) return c.title;
  if (typeof c.source === "string" && c.source.trim()) return c.source;
  if (typeof c.cite_id === "number") return `Source [${c.cite_id}]`;
  return `Source ${index + 1}`;
}

function citationHref(c: Citation): string | null {
  if (typeof c.url === "string" && c.url.trim()) return c.url;
  if (typeof c.source_url === "string" && c.source_url.trim()) return c.source_url;
  return null;
}

function citationExcerpt(c: Citation): string | null {
  if (typeof c.text === "string" && c.text.trim()) {
    const t = c.text.trim();
    return t.length > 280 ? `${t.slice(0, 280)}…` : t;
  }
  return null;
}

/** UUID for correlation; fallback when globalThis.crypto.randomUUID is missing (non-secure HTTP). */
function correlationUuid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      /* continue */
    }
  }
  if (c && typeof c.getRandomValues === "function") {
    try {
      const b = new Uint8Array(16);
      c.getRandomValues(b);
      b[6] = (b[6]! & 0x0f) | 0x40;
      b[8] = (b[8]! & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    } catch {
      /* fall through */
    }
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Optional access token for gateway JWT mode; dev: `sessionStorage.setItem("layer_bearer_token", "<jwt>")`. */
function optionalLayerBearerHeaders(): Record<string, string> {
  try {
    const t = sessionStorage.getItem("layer_bearer_token")?.trim();
    if (t) return { Authorization: `Bearer ${t}` };
  } catch {
    /* storage blocked */
  }
  return {};
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [thumbsUp, setThumbsUp] = useState<Set<string>>(new Set());
  const [thumbsDown, setThumbsDown] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<{ messageId: string; runId?: string; question?: string } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editOriginalRef = useRef("");

  useEffect(() => {
    if (loading && editingMessageId) {
      setEditingMessageId(null);
      setEditDraft("");
      editOriginalRef.current = "";
    }
  }, [loading, editingMessageId]);

  const lastAssistantId = useMemo(
    () => (messages.length > 0 ? [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null : null),
    [messages]
  );

  const handleThumbsUp = useCallback(async (message: Message) => {
    if (!message.run_id) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...optionalLayerBearerHeaders() },
        body: JSON.stringify({
          run_id: message.run_id,
          request_id: message.request_id,
          feedback_type: "thumbs_up",
        }),
      });
      setThumbsUp((prev) => new Set(prev).add(message.id));
      setThumbsDown((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  const handleThumbsDown = useCallback((message: Message) => {
    const idx = messages.findIndex((m) => m.id === message.id);
    const question = idx > 0 && messages[idx - 1]?.role === "user" ? messages[idx - 1].content : undefined;
    setFeedbackComment("");
    setFeedbackModal({ messageId: message.id, runId: message.run_id, question });
  }, [messages]);

  const handleFeedbackReason = useCallback(
    async (reason: string) => {
      if (!feedbackModal?.runId) return;
      const comment = feedbackComment.trim() || undefined;
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...optionalLayerBearerHeaders() },
          body: JSON.stringify({
            run_id: feedbackModal.runId,
            request_id: messages.find((m) => m.id === feedbackModal.messageId)?.request_id,
            feedback_type: "thumbs_down",
            reason,
            question: feedbackModal.question,
            ...(comment && { comment }),
          }),
        });
        setThumbsDown((prev) => new Set(prev).add(feedbackModal.messageId));
        setThumbsUp((prev) => {
          const next = new Set(prev);
          next.delete(feedbackModal.messageId);
          return next;
        });
      } catch {
        // ignore
      } finally {
        setFeedbackModal(null);
        setFeedbackComment("");
      }
    },
    [feedbackModal, feedbackComment, messages]
  );

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const beginStreamingAssistant = useCallback(() => {
    const id = nextId();
    streamingAssistantIdRef.current = id;
    setStreamingAssistantId(id);
    setMessages((prev) => [...prev, { id, role: "assistant", content: "" }]);
    return id;
  }, []);

  const clearStreamingAssistant = useCallback(() => {
    streamingAssistantIdRef.current = null;
    setStreamingAssistantId(null);
  }, []);

  const handleSSEEvent = useCallback((event: string, data: unknown) => {
    if (event === "status") {
      setStatus(data as Status);
      return;
    }
    if (event === "rewrite") {
      const obj = typeof data === "object" && data !== null ? (data as { text?: string }) : {};
      const text = typeof obj.text === "string" ? obj.text.trim() : "";
      if (!text) return;
      const targetId = streamingAssistantIdRef.current;
      if (!targetId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, rewrite: text } : m))
      );
      return;
    }
    if (event === "result_chunk") {
      const obj = typeof data === "object" && data !== null ? (data as { delta?: string }) : {};
      const delta = typeof obj.delta === "string" ? obj.delta : "";
      if (!delta) return;
      const targetId = streamingAssistantIdRef.current;
      if (!targetId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, content: m.content + delta } : m))
      );
      return;
    }
    if (event === "result") {
      const obj =
        typeof data === "object" && data !== null
          ? (data as {
              rewrite?: string;
              response?: unknown;
              run_id?: string;
              request_id?: string;
              citations?: Citation[];
              follow_up_questions?: string[];
            })
          : { response: data };
      const answer = typeof obj.response === "string" ? obj.response : JSON.stringify(obj.response ?? data);
      const rewrite = typeof obj.rewrite === "string" ? obj.rewrite.trim() : undefined;
      const followUps = Array.isArray(obj.follow_up_questions)
        ? obj.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        : undefined;
      const targetId = streamingAssistantIdRef.current ?? beginStreamingAssistant();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId
            ? {
                ...m,
                content: answer,
                ...(rewrite ? { rewrite } : {}),
                run_id: obj.run_id,
                request_id: obj.request_id,
                citations: Array.isArray(obj.citations) ? obj.citations : undefined,
                follow_up_questions: followUps && followUps.length > 0 ? followUps : undefined,
              }
            : m
        )
      );
      clearStreamingAssistant();
      setStatus(null);
      setLoading(false);
      return;
    }
    if (event === "stream_end") {
      const obj =
        typeof data === "object" && data !== null
          ? (data as {
              response?: string;
              rewrite?: string;
              run_id?: string;
              request_id?: string;
              trace_id?: string;
              citations?: Citation[];
              follow_up_questions?: string[];
            })
          : {};
      const answer = typeof obj.response === "string" ? obj.response : "";
      const rewrite = typeof obj.rewrite === "string" ? obj.rewrite.trim() : undefined;
      const cites = Array.isArray(obj.citations) ? obj.citations : undefined;
      const followUps = Array.isArray(obj.follow_up_questions)
        ? obj.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        : undefined;
      const targetId = streamingAssistantIdRef.current;
      if (targetId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  content: answer || m.content,
                  rewrite: rewrite ?? m.rewrite,
                  run_id: obj.run_id || obj.trace_id || m.run_id,
                  request_id: obj.request_id || m.request_id,
                  citations: cites && cites.length > 0 ? cites : m.citations,
                  follow_up_questions:
                    followUps && followUps.length > 0 ? followUps : m.follow_up_questions,
                }
              : m
          )
        );
      } else if (answer || rewrite) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: answer,
            ...(rewrite ? { rewrite } : {}),
            run_id: obj.run_id || obj.trace_id,
            request_id: obj.request_id,
            citations: cites,
            follow_up_questions: followUps && followUps.length > 0 ? followUps : undefined,
          },
        ]);
      }
      clearStreamingAssistant();
      setStatus(null);
      setLoading(false);
      return;
    }
    if (event === "error") {
      const errText = typeof data === "string" ? data : JSON.stringify(data);
      const targetId = streamingAssistantIdRef.current;
      if (targetId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId ? { ...m, content: `Error: ${errText}` } : m
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: `Error: ${errText}` },
        ]);
      }
      clearStreamingAssistant();
      setStatus(null);
      setLoading(false);
    }
  }, [beginStreamingAssistant, clearStreamingAssistant]);

  const sendUserMessage = useCallback(async (
    userMessage: string,
    options?: { priorMessages?: Message[]; skipAppend?: boolean }
  ) => {
    const text = userMessage.trim();
    if (!text || loading) return;
    const historySource = options?.priorMessages ?? messages;
    if (!options?.skipAppend) {
      setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text }]);
    }
    setLoading(true);
    setStatus(null);
    clearStreamingAssistant();

    const history = buildHistory(historySource);

    try {
      const doFetch = () => {
        let sessionId: string | null = null;
        try {
          sessionId = sessionStorage.getItem("layer_chat_session_id");
          if (!sessionId || sessionId.length < 3) {
            sessionId = correlationUuid();
            sessionStorage.setItem("layer_chat_session_id", sessionId);
          }
        } catch {
          sessionId = correlationUuid();
        }
        const clientRequestId = correlationUuid();
        const clientTraceId = correlationUuid();
        return fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...optionalLayerBearerHeaders(),
            ...(sessionId ? { "X-Session-Id": sessionId } : {}),
            "X-Request-Id": clientRequestId,
            "X-Trace-Id": clientTraceId,
          },
          body: JSON.stringify({
            message: text,
            ...(history.length > 0 ? { history } : {}),
          }),
        });
      };

      let res: Response;
      try {
        res = await doFetch();
      } catch (fetchErr) {
        const isFailedFetch =
          fetchErr instanceof TypeError && (fetchErr as Error).message === "Failed to fetch";
        if (isFailedFetch) {
          try {
            res = await doFetch();
          } catch {
            throw new Error("Network error. Check the server is running and try again.");
          }
        } else {
          throw fetchErr;
        }
      }

      if (!res.ok) {
        const ct = res.headers.get("Content-Type") ?? "";
        let msg = `Request failed (${res.status})`;
        if (ct.includes("application/json")) {
          try {
            const j = (await res.json()) as {
              error?: { message?: string; code?: string };
              detail?: string | unknown;
              message?: string;
            };
            if (j.error && typeof j.error.message === "string") msg = j.error.message;
            else if (typeof j.detail === "string") msg = j.detail;
            else if (typeof j.message === "string") msg = j.message;
          } catch {
            /* keep generic */
          }
        }
        if (res.status === 401) {
          msg =
            "Not authorized. Set GATEWAY_BEARER_TOKEN on the server, or send Authorization with a valid JWT (e.g. sessionStorage.setItem(\"layer_bearer_token\", token)).";
        }
        if (res.status === 503) {
          msg = "Service busy (503). Please try again shortly.";
        }
        throw new Error(msg);
      }

      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as {
          response?: string;
          citations?: Citation[];
          follow_up_questions?: string[];
          request_id?: string;
          trace_id?: string;
        };
        const followUps = Array.isArray(json.follow_up_questions)
          ? json.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          : undefined;
        if (json.response != null) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: json.response!,
              run_id: json.trace_id,
              request_id: json.request_id,
              citations: json.citations,
              follow_up_questions: followUps && followUps.length > 0 ? followUps : undefined,
            },
          ]);
        }
        setLoading(false);
        setStatus(null);
        return;
      }

      if (!res.body) throw new Error("Request failed");

      beginStreamingAssistant();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const block of parts) {
          const eventMatch = block.match(/^event: (\w+)/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          try {
            handleSSEEvent(eventMatch[1], JSON.parse(dataMatch[1]));
          } catch {
            // skip parse errors
          }
        }
      }

      if (buffer) {
        const eventMatch = buffer.match(/^event: (\w+)/m);
        const dataMatch = buffer.match(/^data: (.+)$/m);
        if (eventMatch && dataMatch) {
          try {
            handleSSEEvent(eventMatch[1], JSON.parse(dataMatch[1]));
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err);
      const targetId = streamingAssistantIdRef.current;
      if (targetId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === targetId ? { ...m, content: `Error: ${errText}` } : m))
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: `Error: ${errText}` },
        ]);
      }
    } finally {
      clearStreamingAssistant();
      setLoading(false);
      setStatus(null);
    }
  }, [loading, handleSSEEvent, messages, beginStreamingAssistant, clearStreamingAssistant]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditDraft("");
    editOriginalRef.current = "";
  }, []);

  const startEdit = useCallback(
    (msg: Message) => {
      if (msg.role !== "user" || loading || !msg.content.trim()) return;
      setEditingMessageId(msg.id);
      setEditDraft(msg.content);
      editOriginalRef.current = msg.content;
    },
    [loading]
  );

  const submitEdit = useCallback(() => {
    if (!editingMessageId || loading) return;
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    const prior = truncateBeforeMessageId(messages, editingMessageId);
    cancelEdit();
    setMessages(prior);
    void sendUserMessage(trimmed, { priorMessages: prior });
  }, [editingMessageId, editDraft, loading, messages, cancelEdit, sendUserMessage]);

  const handleRegenerate = useCallback(
    (msg: Message) => {
      if (msg.id !== lastAssistantId) return;
      const idx = messages.findIndex((m) => m.id === msg.id);
      const prevUser = messages[idx - 1];
      if (idx > 0 && prevUser?.role === "user") {
        cancelEdit();
        setMessages((prev) => prev.slice(0, idx));
        void sendUserMessage(prevUser.content, {
          priorMessages: messages.slice(0, idx - 1),
          skipAppend: true,
        });
      }
    },
    [messages, lastAssistantId, sendUserMessage, cancelEdit]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      setInput("");
      await sendUserMessage(text);
    },
    [input, sendUserMessage]
  );

  const handleFollowUpClick = useCallback(
    (question: string) => {
      void sendUserMessage(question);
    },
    [sendUserMessage]
  );

  const statusLabel =
    status === "thinking" ? "Thinking…" :
    status === "searching_sql" ? "Searching SQL…" :
    status === "cached" ? "From cache…" :
    status === "error" ? "Error" :
    typeof status === "string" ? status : "…";

  const showStandaloneLoading =
    loading && (messages.length === 0 || messages[messages.length - 1]?.role !== "assistant");

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      <header className="shrink-0 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 py-3">
        <h1 className="text-base font-semibold">huntAI</h1>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0" role="log" aria-live="polite" aria-relevant="additions text">
        <div className="chat-container px-4 py-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center pt-16 text-center">
              <p className="text-2xl font-medium text-gray-400 dark:text-gray-500 mb-2">
                How can I help you today?
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Ask about jobs, salaries, or anything else.
              </p>
            </div>
          )}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex w-full justify-end group">
                <div className="flex flex-col items-end max-w-[min(85%,32rem)] w-full">
                  {editingMessageId === msg.id ? (
                    <div className="chat-user-edit-wrap w-full">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEdit();
                          }
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            submitEdit();
                          }
                        }}
                        rows={Math.min(12, Math.max(2, editDraft.split("\n").length))}
                        className="chat-user-edit-textarea"
                        autoFocus
                        aria-label="Edit message"
                      />
                      <div className="chat-user-edit-actions">
                        <button type="button" onClick={cancelEdit} className="chat-user-edit-cancel">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={submitEdit}
                          disabled={
                            !editDraft.trim() ||
                            editDraft.trim() === editOriginalRef.current.trim()
                          }
                          className="chat-user-edit-send"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="chat-user-bubble rounded-3xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                      {!loading && msg.content.trim() ? (
                        <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEdit(msg)}
                            className="chat-action-btn p-1.5 rounded-lg transition-colors"
                            aria-label="Edit message"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ) : (
            <div key={msg.id} className="flex w-full justify-start">
              <div className="chat-assistant-block w-full text-[15px] leading-relaxed">
                <div className="whitespace-pre-wrap break-words">
                  {msg.rewrite && (
                    <p className="chat-rewrite-meta">
                      <span className="chat-rewrite-meta-label">Rewrite: </span>
                      <span className="chat-rewrite-meta-query">&ldquo;{msg.rewrite}&rdquo;</span>
                      {streamingAssistantId === msg.id && !msg.content.trim() ? <StreamingCursor /> : null}
                    </p>
                  )}
                  {!msg.content.trim() && streamingAssistantId === msg.id ? (
                    !msg.rewrite ? (
                      <div className="flex items-center gap-2 py-1 text-gray-500 dark:text-gray-400">
                        <span className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:300ms]" />
                        </span>
                        <span>{statusLabel}</span>
                      </div>
                    ) : null
                  ) : (
                    <p>
                      {msg.content}
                      {streamingAssistantId === msg.id ? <StreamingCursor /> : null}
                    </p>
                  )}
                </div>
                {msg.citations &&
                  msg.citations.length > 0 &&
                  streamingAssistantId !== msg.id && (
                    <details className="mt-2.5 text-sm group">
                      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 select-none list-none flex items-center gap-1">
                        <span className="text-[10px] transition-transform group-open:rotate-90">▶</span>
                        Sources ({msg.citations.length})
                      </summary>
                      <ul className="mt-1.5 space-y-2 pl-1 border-l border-gray-200 dark:border-gray-700">
                        {msg.citations.map((c, i) => {
                          const title = citationTitle(c, i);
                          const href = citationHref(c);
                          const excerpt = citationExcerpt(c);
                          return (
                            <li key={i} className="pl-3 text-gray-600 dark:text-gray-300">
                              <div className="font-medium text-gray-800 dark:text-gray-200">
                                {href ? (
                                  <a href={href} className="underline hover:text-[#10a37f]" target="_blank" rel="noreferrer">
                                    {title}
                                  </a>
                                ) : (
                                  title
                                )}
                              </div>
                              {excerpt && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{excerpt}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                {msg.follow_up_questions &&
                  msg.follow_up_questions.length > 0 &&
                  streamingAssistantId !== msg.id && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Follow-up questions</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.follow_up_questions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            disabled={loading}
                            onClick={() => handleFollowUpClick(q)}
                            className="chat-follow-up-chip text-left text-sm rounded-xl px-3 py-1.5 disabled:opacity-50 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                {streamingAssistantId !== msg.id && msg.content.trim() && (
                  <div className="flex items-center gap-0.5 mt-3 -ml-1">
                      <button
                        type="button"
                        onClick={() => handleThumbsUp(msg)}
                        className={`chat-action-btn p-2 rounded-lg transition-colors ${
                          thumbsUp.has(msg.id) ? "text-[#10a37f]" : ""
                        }`}
                        aria-label="Good response"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={thumbsUp.has(msg.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThumbsDown(msg)}
                        className={`chat-action-btn p-2 rounded-lg transition-colors ${
                          thumbsDown.has(msg.id) ? "text-gray-600" : ""
                        }`}
                        aria-label="Bad response"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={thumbsDown.has(msg.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                        </svg>
                      </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content)}
                      className="chat-action-btn p-2 rounded-lg transition-colors"
                      aria-label="Copy"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    {msg.id === lastAssistantId && (
                      <button
                        type="button"
                        onClick={() => handleRegenerate(msg)}
                        className="chat-action-btn p-2 rounded-lg transition-colors"
                        aria-label="Regenerate"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M1 4v6h6" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            )
          )}
          {showStandaloneLoading && (
            <div className="flex justify-start w-full">
              <div className="flex items-center gap-2 py-1 text-[15px] text-gray-500 dark:text-gray-400">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:300ms]" />
                </span>
                <span>{statusLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 p-4 bg-white dark:bg-[#0d0d0d]">
        <div className="chat-container">
          <div className="chat-input-wrap rounded-2xl flex gap-2 px-4 py-3 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message…"
              disabled={loading}
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 p-2 rounded-lg text-[#10a37f] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
        </div>
      </form>

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setFeedbackModal(null); setFeedbackComment(""); }}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">What went wrong?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your feedback helps make things better for everyone.</p>
              </div>
              <button
                type="button"
                onClick={() => { setFeedbackModal(null); setFeedbackComment(""); }}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {FEEDBACK_REASONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleFeedbackReason(id)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {label}
                </button>
              ))}
              <label className="block">
                <span className="text-sm text-gray-500 dark:text-gray-400">Additional details (optional)</span>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="e.g. Only returned 3 titles"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-sm resize-none"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
