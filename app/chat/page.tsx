/**
 * Main chat UI: streaming gateway responses, citations, feedback, edit/regenerate.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { ChatAssistantMessage } from "@/components/chat/ChatAssistantMessage";
import { ChatFeedbackModal } from "@/components/chat/ChatFeedbackModal";
import { ChatLoadingDots } from "@/components/chat/ChatLoadingDots";
import { ChatUserMessage } from "@/components/chat/ChatUserMessage";
import { ChatBrand } from "@/components/ChatBrand";
import { ChatEmptyState } from "@/components/ChatEmptyState";
import { ChatPrompt } from "@/components/ChatPrompt";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatUserMenu } from "@/components/ChatUserMenu";
import { errorMessageFromJsonBody } from "@/lib/api-error";
import { authFetch } from "@/lib/auth-fetch";
import { buildHistory, truncateBeforeMessageId } from "@/lib/chat-history";
import {
  correlationUuid,
  nextChatMessageId,
  optionalLayerBearerHeaders,
} from "@/lib/chat-client";
import { mergeBffLatencyWithClient } from "@/lib/chat-latency";
import { patchStreamingMessage } from "@/lib/chat-stream-patch";
import { eventFromSseBlock, splitSseBuffer } from "@/lib/chat-sse-client";
import type { ChatMessage, ChatStreamStatus } from "@/lib/chat-types";
import {
  type ConversationListResponse,
  type ConversationMessagesResponse,
  type ConversationSummary,
  dbMessageIdFromClientId,
  getActiveConversationId,
  setActiveConversationId as persistActiveConversationId,
  storedMessagesToChatTurns,
} from "@/lib/conversations";
import { webApiPaths } from "@/lib/web-api-paths";

/** Authenticated chat page; proxies messages through ``POST /api/v1/chat``. */
export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [authUi, setAuthUi] = useState<{
    loading: boolean;
    hasCookie: boolean;
    hasStorage: boolean;
  }>({ loading: true, hasCookie: false, hasStorage: false });
  const [status, setStatus] = useState<ChatStreamStatus>(null);
  const [thumbsUp, setThumbsUp] = useState<Set<string>>(new Set());
  const [thumbsDown, setThumbsDown] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<{ messageId: string; runId?: string; question?: string } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  /** DB assistant id from early SSE meta; applied with citations on ``stream_end``. */
  const pendingAssistantDbIdRef = useRef<string | null>(null);
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
  /** Browser fetch start for ``mergeClientLatency`` on stream_end / JSON. */
  const clientChatT0Ref = useRef<number | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    void authFetch(webApiPaths.auth.me)
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
      const res = await authFetch(webApiPaths.conversations, {
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
        const res = await authFetch(webApiPaths.conversationMessages(id),
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
      await authFetch(webApiPaths.auth.logout, { method: "POST" });
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

  const submitMessageFeedback = useCallback(
    async (
      message: ChatMessage,
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
      const res = await authFetch(webApiPaths.feedback, {
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

  const feedbackReady = useCallback((message: ChatMessage) => {
    const conversationId =
      activeConversationIdRef.current ?? getActiveConversationId();
    const messageId = message.db_message_id ?? dbMessageIdFromClientId(message.id);
    return Boolean(conversationId && messageId);
  }, []);

  const handleThumbsUp = useCallback(async (message: ChatMessage) => {
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

  const handleThumbsDown = useCallback((message: ChatMessage) => {
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
    pendingAssistantDbIdRef.current = null;
    const id = nextChatMessageId();
    streamingAssistantIdRef.current = id;
    setStreamingAssistantId(id);
    setMessages((prev) => [...prev, { id, role: "assistant", content: "" }]);
    return id;
  }, []);

  const clearStreamingAssistant = useCallback(() => {
    streamingAssistantIdRef.current = null;
    pendingAssistantDbIdRef.current = null;
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

  const ensureStreamingAssistant = useCallback(() => {
    if (!streamingAssistantIdRef.current) {
      beginStreamingAssistant();
    }
    return streamingAssistantIdRef.current;
  }, [beginStreamingAssistant]);

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
        pendingAssistantDbIdRef.current = dbId;
      }
      return;
    }
    if (event === "status") {
      ensureStreamingAssistant();
      setStatus(data as ChatStreamStatus);
      return;
    }
    if (event === "rewrite") {
      const obj = typeof data === "object" && data !== null ? (data as { text?: string }) : {};
      const text = typeof obj.text === "string" ? obj.text.trim() : "";
      if (!text) return;
      const targetId = ensureStreamingAssistant();
      if (!targetId) return;
      setMessages((prev) =>
        patchStreamingMessage(prev, targetId, { rewrite: text })
      );
      return;
    }
    if (event === "result_chunk") {
      const obj = typeof data === "object" && data !== null ? (data as { delta?: string }) : {};
      const delta = typeof obj.delta === "string" ? obj.delta : "";
      if (!delta) return;
      const targetId = ensureStreamingAssistant();
      if (!targetId) return;
      setMessages((prev) =>
        patchStreamingMessage(prev, targetId, { content: (prev.find((m) => m.id === targetId)?.content ?? "") + delta })
      );
      return;
    }
    if (event === "citations") {
      const obj =
        typeof data === "object" && data !== null
          ? (data as { citations?: ChatMessage["citations"] })
          : {};
      const cites = Array.isArray(obj.citations) ? obj.citations : [];
      if (cites.length === 0) return;
      const targetId = ensureStreamingAssistant();
      if (!targetId) return;
      setMessages((prev) => patchStreamingMessage(prev, targetId, { citations: cites }));
      return;
    }
    if (event === "follow_up_questions") {
      const obj =
        typeof data === "object" && data !== null
          ? (data as { follow_up_questions?: string[] })
          : {};
      const followUps = Array.isArray(obj.follow_up_questions)
        ? obj.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        : [];
      if (followUps.length === 0) return;
      const targetId = ensureStreamingAssistant();
      if (!targetId) return;
      setMessages((prev) =>
        patchStreamingMessage(prev, targetId, { follow_up_questions: followUps })
      );
      return;
    }
    if (event === "latency_ms") {
      const obj =
        typeof data === "object" && data !== null
          ? (data as { latency_ms?: Record<string, unknown> })
          : {};
      const latency_ms = mergeBffLatencyWithClient(obj.latency_ms, clientChatT0Ref.current);
      if (!latency_ms) return;
      const targetId = ensureStreamingAssistant();
      if (!targetId) return;
      setMessages((prev) => patchStreamingMessage(prev, targetId, { latency_ms }));
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
              citations?: ChatMessage["citations"];
              follow_up_questions?: string[];
              latency_ms?: Record<string, unknown>;
            })
          : { response: data };
      const answer = typeof obj.response === "string" ? obj.response : JSON.stringify(obj.response ?? data);
      const rewrite = typeof obj.rewrite === "string" ? obj.rewrite.trim() : undefined;
      const followUps = Array.isArray(obj.follow_up_questions)
        ? obj.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        : undefined;
      const latency_ms = mergeBffLatencyWithClient(obj.latency_ms, clientChatT0Ref.current);
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
                ...(latency_ms ? { latency_ms } : {}),
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
              model?: string;
              route?: string;
              citations?: ChatMessage["citations"];
              follow_up_questions?: string[];
              latency_ms?: Record<string, unknown>;
            })
          : {};
      if (typeof obj.conversation_id === "string") {
        applyConversationId(obj.conversation_id);
      }
      const streamDbId =
        (typeof obj.assistant_message_id === "string" ? obj.assistant_message_id.trim() : "") ||
        pendingAssistantDbIdRef.current ||
        "";
      const rewrite = typeof obj.rewrite === "string" ? obj.rewrite.trim() : undefined;
      const latencyFromEvent = mergeBffLatencyWithClient(obj.latency_ms, clientChatT0Ref.current);
      const cites = Array.isArray(obj.citations) ? obj.citations : undefined;
      const followUps = Array.isArray(obj.follow_up_questions)
        ? obj.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        : undefined;
      const targetId = streamingAssistantIdRef.current;
      if (targetId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== targetId) return m;
            const latency_ms = latencyFromEvent ?? m.latency_ms;
            return {
              ...m,
              ...(streamDbId ? { db_message_id: streamDbId, id: `db-${streamDbId}` } : {}),
              rewrite: rewrite ?? m.rewrite,
              run_id: obj.run_id || obj.trace_id || m.run_id,
              request_id: obj.request_id || m.request_id,
              ...(typeof obj.model === "string" && obj.model.trim()
                ? { model: obj.model.trim() }
                : {}),
              ...(typeof obj.route === "string" && obj.route.trim()
                ? { route: obj.route.trim() }
                : {}),
              ...(cites && cites.length > 0 ? { citations: cites } : {}),
              ...(followUps && followUps.length > 0
                ? { follow_up_questions: followUps }
                : {}),
              ...(latency_ms ? { latency_ms } : {}),
            };
          })
        );
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
          { id: nextChatMessageId(), role: "assistant", content: `Error: ${errText}` },
        ]);
      }
      clearStreamingAssistant();
      setStatus(null);
      setLoading(false);
    }
  }, [beginStreamingAssistant, clearStreamingAssistant, applyConversationId, ensureStreamingAssistant]);

  const sendUserMessage = useCallback(async (
    userMessage: string,
    options?: { priorMessages?: ChatMessage[]; skipAppend?: boolean }
  ) => {
    const text = userMessage.trim();
    if (!text || loading) return;
    if (!authUi.hasCookie && !authUi.hasStorage) {
      router.push("/login?next=/chat");
      return;
    }
    const historySource = options?.priorMessages ?? messagesRef.current;
    if (!options?.skipAppend) {
      setMessages((prev) => [...prev, { id: nextChatMessageId(), role: "user", content: text }]);
    }
    setLoading(true);
    setStatus(null);
    clearStreamingAssistant();

    const history = buildHistory(historySource);

    try {
      chatAbortRef.current?.abort();
      chatAbortRef.current = new AbortController();
      const signal = chatAbortRef.current.signal;
      clientChatT0Ref.current = performance.now();

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
        return authFetch(webApiPaths.chat, {
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
            msg = errorMessageFromJsonBody(j, msg);
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
          citations?: ChatMessage["citations"];
          follow_up_questions?: string[];
          request_id?: string;
          trace_id?: string;
          latency_ms?: Record<string, unknown>;
        };
        if (typeof json.conversation_id === "string") {
          applyConversationId(json.conversation_id);
        }
        const jsonAssistantId =
          typeof json.assistant_message_id === "string" ? json.assistant_message_id.trim() : "";
        const followUps = Array.isArray(json.follow_up_questions)
          ? json.follow_up_questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          : undefined;
        const latency_ms = mergeBffLatencyWithClient(json.latency_ms, clientChatT0Ref.current);
        if (json.response != null) {
          const assistantId = jsonAssistantId ? `db-${jsonAssistantId}` : nextChatMessageId();
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
              ...(latency_ms ? { latency_ms } : {}),
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
        const split = splitSseBuffer(buffer);
        buffer = split.remainder;

        for (const block of split.blocks) {
          const ev = eventFromSseBlock(block);
          if (ev) handleSSEEvent(ev.event, ev.data);
        }
      }

      if (buffer.trim()) {
        const ev = eventFromSseBlock(buffer);
        if (ev) handleSSEEvent(ev.event, ev.data);
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
          { id: nextChatMessageId(), role: "assistant", content: `Error: ${errText}` },
        ]);
      }
    } finally {
      clientChatT0Ref.current = null;
      chatAbortRef.current = null;
      if (streamingAssistantIdRef.current) {
        clearStreamingAssistant();
        setLoading(false);
        setStatus(null);
      }
    }
  }, [
    loading,
    handleSSEEvent,
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
    (msg: ChatMessage) => {
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
    (msg: ChatMessage) => {
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
        <div className="chat-thread chat-container px-4 py-6 space-y-4">
          {threadLoading && messages.length === 0 ? (
            <div className="flex justify-center pt-16 text-sm text-gray-500 dark:text-gray-400">
              Loading conversation…
            </div>
          ) : null}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <ChatUserMessage
                key={msg.id}
                msg={msg}
                loading={loading}
                isEditing={editingMessageId === msg.id}
                editDraft={editDraft}
                editOriginal={editOriginalRef.current}
                onEditDraftChange={setEditDraft}
                onCancelEdit={cancelEdit}
                onSubmitEdit={submitEdit}
                onStartEdit={() => startEdit(msg)}
              />
            ) : (
              <ChatAssistantMessage
                key={msg.id}
                msg={msg}
                isStreaming={streamingAssistantId === msg.id}
                statusLabel={statusLabel}
                loading={loading}
                thumbsUp={thumbsUp.has(msg.id)}
                thumbsDown={thumbsDown.has(msg.id)}
                feedbackReady={feedbackReady(msg)}
                isLastAssistant={msg.id === lastAssistantId}
                onFollowUp={handleFollowUpClick}
                onThumbsUp={() => void handleThumbsUp(msg)}
                onThumbsDown={() => handleThumbsDown(msg)}
                onCopy={() => void handleCopy(msg.content)}
                onRegenerate={() => handleRegenerate(msg)}
              />
            ),
          )}
          {showStandaloneLoading ? (
            <div className="flex justify-start w-full text-[15px]">
              <ChatLoadingDots label={statusLabel} />
            </div>
          ) : null}
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

      {feedbackModal ? (
        <ChatFeedbackModal
          comment={feedbackComment}
          onCommentChange={setFeedbackComment}
          onClose={() => {
            setFeedbackModal(null);
            setFeedbackComment("");
          }}
          onReason={(id) => void handleFeedbackReason(id)}
        />
      ) : null}
      </div>
    </div>
  );
}
