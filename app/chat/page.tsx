/**
 * Main chat UI: streaming gateway responses, citations, feedback, edit/regenerate.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { ChatBrand } from "@/components/ChatBrand";
import { ChatEmptyState } from "@/components/ChatEmptyState";
import { ChatPrompt } from "@/components/ChatPrompt";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatUserMenu } from "@/components/ChatUserMenu";
import { authFetch } from "@/lib/auth-fetch";
import { buildHistory, truncateBeforeMessageId } from "@/lib/chat-history";
import {
  type ConversationListResponse,
  type ConversationMessagesResponse,
  type ConversationSummary,
  dbMessageIdFromClientId,
  getActiveConversationId,
  setActiveConversationId as persistActiveConversationId,
  storedMessagesToChatTurns,
} from "@/lib/conversations";

type Citation = Record<string, unknown>;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  rewrite?: string;
  run_id?: string;
  request_id?: string;
  db_message_id?: string;
  model?: string;
  route?: string;
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

/** Authenticated chat page; proxies messages through ``POST /api/chat``. */
export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [authUi, setAuthUi] = useState<{
    loading: boolean;
    hasCookie: boolean;
    hasStorage: boolean;
  }>({ loading: true, hasCookie: false, hasStorage: false });
  const [status, setStatus] = useState<Status>(null);
  const [thumbsUp, setThumbsUp] = useState<Set<string>>(new Set());
  const [thumbsDown, setThumbsDown] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<{ messageId: string; runId?: string; question?: string } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editOriginalRef = useRef("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (loading && editingMessageId) {
      setEditingMessageId(null);
      setEditDraft("");
      editOriginalRef.current = "";
    }
  }, [loading, editingMessageId]);

  useEffect(() => {
    let alive = true;
    let hasStorage = false;
    try {
      hasStorage = Boolean(sessionStorage.getItem("layer_bearer_token")?.trim());
    } catch {
      /* storage blocked */
    }
    void authFetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ signedIn?: boolean }>)
      .then((j) => {
        if (!alive) return;
        setAuthUi({ loading: false, hasCookie: Boolean(j.signedIn), hasStorage });
      })
      .catch(() => {
        if (!alive) return;
        setAuthUi({ loading: false, hasCookie: false, hasStorage });
      });
    return () => {
      alive = false;
    };
  }, []);

  const isAuthenticated = authUi.hasCookie || authUi.hasStorage;

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setConversationsLoading(true);
    try {
      const res = await authFetch("/api/conversations", {
        headers: { ...optionalLayerBearerHeaders() },
      });
      if (!res.ok) return;
      const data = (await res.json()) as ConversationListResponse;
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      /* ignore */
    } finally {
      setConversationsLoading(false);
    }
  }, [isAuthenticated]);

  const applyConversationId = useCallback(
    (id: string | undefined) => {
      if (!id?.trim()) return;
      const cid = id.trim();
      setActiveConversationId(cid);
      persistActiveConversationId(cid);
      void refreshConversations();
    },
    [refreshConversations],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      if (loading) return;
      setThreadLoading(true);
      setActiveConversationId(id);
      persistActiveConversationId(id);
      setSidebarOpen(false);
      try {
        const res = await authFetch(
          `/api/conversations/${encodeURIComponent(id)}/messages`,
          { headers: { ...optionalLayerBearerHeaders() } },
        );
        if (!res.ok) {
          if (res.status === 404) {
            setActiveConversationId(null);
            persistActiveConversationId(null);
            setMessages([]);
          }
          return;
        }
        const data = (await res.json()) as ConversationMessagesResponse;
        setMessages(storedMessagesToChatTurns(data.messages ?? []));
      } catch {
        /* ignore */
      } finally {
        setThreadLoading(false);
      }
    },
    [loading],
  );

  const startNewChat = useCallback(() => {
    if (loading) return;
    setActiveConversationId(null);
    persistActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
    setEditingMessageId(null);
    setEditDraft("");
    editOriginalRef.current = "";
  }, [loading]);

  useEffect(() => {
    if (authUi.loading || !isAuthenticated) return;
    void refreshConversations();
  }, [authUi.loading, isAuthenticated, refreshConversations]);

  useEffect(() => {
    if (authUi.loading || !isAuthenticated) return;
    const stored = getActiveConversationId();
    if (stored) void loadConversation(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore thread once after sign-in
  }, [authUi.loading, isAuthenticated]);

  useEffect(() => {
    if (authUi.loading || isAuthenticated) return;
    router.replace("/login?next=/chat");
  }, [authUi.loading, isAuthenticated, router]);

  const handleSignOut = useCallback(async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem("layer_bearer_token");
    } catch {
      /* ignore */
    }
    setAuthUi({ loading: false, hasCookie: false, hasStorage: false });
  }, []);

  const lastAssistantId = useMemo(
    () => (messages.length > 0 ? [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null : null),
    [messages]
  );

  const applyDbMessageIdToAssistant = useCallback((dbId: string, preferMessageId?: string) => {
    setMessages((prev) => {
      let targetIdx = -1;
      if (preferMessageId) {
        targetIdx = prev.findIndex((m) => m.id === preferMessageId);
      }
      if (targetIdx < 0) {
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          if (prev[i]?.role === "assistant") {
            targetIdx = i;
            break;
          }
        }
      }
      if (targetIdx < 0) return prev;
      return prev.map((m, i) =>
        i === targetIdx ? { ...m, db_message_id: dbId, id: `db-${dbId}` } : m,
      );
    });
  }, []);

  const submitMessageFeedback = useCallback(
    async (
      message: Message,
      opts: {
        rating: "thumbs_up" | "thumbs_down";
        reason?: string;
        comment?: string;
        question?: string;
      },
    ) => {
      const conversationId =
        activeConversationIdRef.current ?? getActiveConversationId();
      const messageId = message.db_message_id ?? dbMessageIdFromClientId(message.id);
      if (!conversationId || !messageId) {
        throw new Error("Feedback unavailable until this reply is saved to your conversation.");
      }
      const res = await authFetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...optionalLayerBearerHeaders(),
          "X-Conversation-Id": conversationId,
        },
        body: JSON.stringify({
          message_id: messageId,
          conversation_id: conversationId,
          rating: opts.rating,
          run_id: message.run_id,
          request_id: message.request_id,
          ...(opts.reason ? { reason: opts.reason } : {}),
          ...(opts.comment ? { comment: opts.comment } : {}),
          ...(opts.question ? { question: opts.question } : {}),
          ...(message.model ? { model: message.model } : {}),
          ...(message.route ? { route: message.route } : {}),
        }),
      });
      if (!res.ok) {
        let detail = `Feedback failed (${res.status})`;
        try {
          const j = (await res.json()) as { error?: string; detail?: string };
          detail = typeof j.detail === "string" ? j.detail : typeof j.error === "string" ? j.error : detail;
        } catch {
          /* keep generic */
        }
        throw new Error(detail);
      }
      return true;
    },
    [],
  );

  const feedbackReady = useCallback((message: Message) => {
    const conversationId =
      activeConversationIdRef.current ?? getActiveConversationId();
    const messageId = message.db_message_id ?? dbMessageIdFromClientId(message.id);
    return Boolean(conversationId && messageId);
  }, []);

  const handleThumbsUp = useCallback(async (message: Message) => {
    if (!feedbackReady(message)) return;
    try {
      await submitMessageFeedback(message, { rating: "thumbs_up" });
      setFeedbackError(null);
      setThumbsUp((prev) => new Set(prev).add(message.id));
      setThumbsDown((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feedback failed";
      setFeedbackError(msg);
    }
  }, [feedbackReady, submitMessageFeedback]);

  const handleThumbsDown = useCallback((message: Message) => {
    const idx = messages.findIndex((m) => m.id === message.id);
    const question = idx > 0 && messages[idx - 1]?.role === "user" ? messages[idx - 1].content : undefined;
    setFeedbackComment("");
    setFeedbackModal({ messageId: message.id, runId: message.run_id, question });
  }, [messages]);

  const handleFeedbackReason = useCallback(
    async (reason: string) => {
      const modal = feedbackModal;
      if (!modal) return;
      const target = messages.find((m) => m.id === modal.messageId);
      if (!target) return;
      const comment = feedbackComment.trim() || undefined;
      try {
        await submitMessageFeedback(target, {
          rating: "thumbs_down",
          reason,
          comment,
          question: modal.question,
        });
        setFeedbackError(null);
        setThumbsDown((prev) => new Set(prev).add(modal.messageId));
        setThumbsUp((prev) => {
          const next = new Set(prev);
          next.delete(modal.messageId);
          return next;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Feedback failed";
        setFeedbackError(msg);
      } finally {
        setFeedbackModal(null);
        setFeedbackComment("");
      }
    },
    [feedbackModal, feedbackComment, messages, submitMessageFeedback]
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

  const stopGenerating = useCallback(() => {
    const targetId = streamingAssistantIdRef.current;
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    clearStreamingAssistant();
    setLoading(false);
    setStatus(null);
    if (targetId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId
            ? {
                ...m,
                content: m.content.trim()
                  ? `${m.content.trim()}\n\n— Stopped`
                  : "— Stopped",
              }
            : m,
        ),
      );
    }
  }, [clearStreamingAssistant]);

  const handleSSEEvent = useCallback((event: string, data: unknown) => {
    if (event === "assistant_message_id" || event === "conversation_id") {
      const obj =
        typeof data === "object" && data !== null
          ? (data as { assistant_message_id?: string; conversation_id?: string })
          : {};
      if (typeof obj.conversation_id === "string" && obj.conversation_id.trim()) {
        applyConversationId(obj.conversation_id);
      }
      const dbId =
        typeof obj.assistant_message_id === "string" ? obj.assistant_message_id.trim() : "";
      if (dbId) {
        applyDbMessageIdToAssistant(dbId, streamingAssistantIdRef.current ?? undefined);
      }
      if (event === "conversation_id") return;
      if (dbId) return;
    }
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
              conversation_id?: string;
              assistant_message_id?: string;
              citations?: Citation[];
              follow_up_questions?: string[];
            })
          : {};
      if (typeof obj.conversation_id === "string") {
        applyConversationId(obj.conversation_id);
      }
      const streamDbId =
        typeof obj.assistant_message_id === "string"
          ? obj.assistant_message_id.trim()
          : "";
      if (streamDbId) {
        applyDbMessageIdToAssistant(streamDbId, streamingAssistantIdRef.current ?? undefined);
      }
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
            id: streamDbId ? `db-${streamDbId}` : nextId(),
            role: "assistant",
            content: answer,
            ...(rewrite ? { rewrite } : {}),
            run_id: obj.run_id || obj.trace_id,
            request_id: obj.request_id,
            ...(streamDbId ? { db_message_id: streamDbId } : {}),
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
  }, [applyDbMessageIdToAssistant, beginStreamingAssistant, clearStreamingAssistant, applyConversationId]);

  const sendUserMessage = useCallback(async (
    userMessage: string,
    options?: { priorMessages?: Message[]; skipAppend?: boolean }
  ) => {
    const text = userMessage.trim();
    if (!text || loading) return;
    if (!authUi.hasCookie && !authUi.hasStorage) {
      router.push("/login?next=/chat");
      return;
    }
    const historySource = options?.priorMessages ?? messages;
    if (!options?.skipAppend) {
      setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text }]);
    }
    setLoading(true);
    setStatus(null);
    clearStreamingAssistant();

    const history = buildHistory(historySource);

    try {
      chatAbortRef.current?.abort();
      chatAbortRef.current = new AbortController();
      const signal = chatAbortRef.current.signal;

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
        const convId = activeConversationIdRef.current;
        return authFetch("/api/chat", {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            ...optionalLayerBearerHeaders(),
            ...(sessionId ? { "X-Session-Id": sessionId } : {}),
            ...(convId ? { "X-Conversation-Id": convId } : {}),
            "X-Request-Id": clientRequestId,
            "X-Trace-Id": clientTraceId,
          },
          body: JSON.stringify({
            message: text,
            ...(convId ? { conversation_id: convId } : {}),
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
            "Not authorized. Sign in at /login, or set sessionStorage.layer_bearer_token for manual API testing.";
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
          conversation_id?: string;
          assistant_message_id?: string;
          citations?: Citation[];
          follow_up_questions?: string[];
          request_id?: string;
          trace_id?: string;
        };
        if (typeof json.conversation_id === "string") {
          applyConversationId(json.conversation_id);
        }
        const jsonAssistantId =
          typeof json.assistant_message_id === "string" ? json.assistant_message_id.trim() : "";
        const followUps = Array.isArray(json.follow_up_questions)
          ? json.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          : undefined;
        if (json.response != null) {
          const assistantId = jsonAssistantId ? `db-${jsonAssistantId}` : nextId();
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: json.response!,
              run_id: json.trace_id,
              request_id: json.request_id,
              ...(jsonAssistantId ? { db_message_id: jsonAssistantId } : {}),
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
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
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
      chatAbortRef.current = null;
      clearStreamingAssistant();
      setLoading(false);
      setStatus(null);
    }
  }, [
    loading,
    handleSSEEvent,
    messages,
    beginStreamingAssistant,
    clearStreamingAssistant,
    authUi.hasCookie,
    authUi.hasStorage,
    router,
    applyConversationId,
  ]);

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

  const submitInput = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendUserMessage(text);
  }, [input, sendUserMessage]);

  const handleStarterPick = useCallback(
    (text: string) => {
      void sendUserMessage(text);
    },
    [sendUserMessage],
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

  const hasThread = messages.length > 0;
  const showHero = !hasThread && !threadLoading;

  if (!authUi.loading && !isAuthenticated) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white dark:bg-[#0d0d0d] text-gray-500">
        <p>Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0d0d0d] text-[#0d0d0d] dark:text-[#ececec]">
      {sidebarOpen ? (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        loadingList={conversationsLoading}
        loadingThread={threadLoading || loading}
        onNewChat={startNewChat}
        onSelect={(id) => void loadConversation(id)}
        className={`${sidebarOpen ? "flex fixed inset-y-0 left-0 z-40" : "hidden"} md:flex md:relative md:z-0`}
      />
      <div className="chat-main flex flex-col flex-1 min-w-0 h-full">
      <header className="chat-header shrink-0 py-2.5 px-3 sm:px-4">
        <div className="flex items-center justify-between gap-3 w-full max-w-[52rem] mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="md:hidden p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Open chat history"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
            <ChatBrand />
          </div>
          {!authUi.loading && isAuthenticated ? (
            <ChatUserMenu onSignOut={handleSignOut} />
          ) : null}
        </div>
      </header>

      {showHero ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 pb-6 overflow-y-auto">
          <ChatEmptyState onPick={handleStarterPick} disabled={loading} />
          <ChatPrompt
            mode="hero"
            value={input}
            onChange={setInput}
            onSubmit={() => void submitInput()}
            loading={loading}
            onStop={loading ? stopGenerating : undefined}
          />
        </div>
      ) : (
        <>
      <div className="flex-1 overflow-y-auto min-h-0" role="log" aria-live="polite" aria-relevant="additions text">
        <div className="chat-thread chat-container px-4 py-6 space-y-6">
          {threadLoading && messages.length === 0 ? (
            <div className="flex justify-center pt-16 text-sm text-gray-500 dark:text-gray-400">
              Loading conversation…
            </div>
          ) : null}
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
                        disabled={!feedbackReady(msg)}
                        onClick={() => handleThumbsUp(msg)}
                        className={`chat-action-btn p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          thumbsUp.has(msg.id) ? "text-[#10a37f]" : ""
                        }`}
                        aria-label="Good response"
                        title={
                          feedbackReady(msg)
                            ? "Good response"
                            : "Feedback is available after this reply is saved"
                        }
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={thumbsUp.has(msg.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={!feedbackReady(msg)}
                        onClick={() => handleThumbsDown(msg)}
                        className={`chat-action-btn p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          thumbsDown.has(msg.id) ? "text-gray-600" : ""
                        }`}
                        aria-label="Bad response"
                        title={
                          feedbackReady(msg)
                            ? "Bad response"
                            : "Feedback is available after this reply is saved"
                        }
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

      {feedbackError && (
        <p className="px-4 pb-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {feedbackError}
        </p>
      )}
      <ChatPrompt
        mode="sticky"
        value={input}
        onChange={setInput}
        onSubmit={() => void submitInput()}
        loading={loading}
        onStop={loading ? stopGenerating : undefined}
      />
        </>
      )}

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
    </div>
  );
}
