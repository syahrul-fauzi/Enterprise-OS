"use client";

import React, { useState, useRef, useEffect } from "react";

const CHAT_API_PATH = "/api/chat/prepare-release";

interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly structured?: Readonly<Record<string, unknown>> | undefined;
  readonly procedureId?: string | undefined;
}

interface ReleaseReadinessChatProps {
  readonly defaultMessage?: string;
  readonly onOpenWorkspace?: (releaseId: string) => void;
}

const SUGGESTIONS = [
  "Prepare release EOS-003",
  "Check release 12.3 readiness",
  "Assess build R-2026",
  "EOS-001",
];

function extractReleaseIdFromStructured(message: ChatMessage): string | null {
  const structured = message.structured;
  if (!structured) return null;
  const rid = structured["releaseId"];
  return typeof rid === "string" ? rid : null;
}

function MarkdownLite({ text }: { readonly text: string }) {
  const lines = text.split(/\r?\n/);
  const rendered: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === "") {
      rendered.push(<div key={i} className="h-2" />);
      continue;
    }
    const content = line
      .replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-gray-900">$1</span>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono text-gray-700">$1</code>')
      .replace(/^•\s+/, "• ");
    rendered.push(
      <p
        key={i}
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />,
    );
  }
  return <div className="space-y-0.5">{rendered}</div>;
}

export function ReleaseReadinessChat({
  defaultMessage = "",
  onOpenWorkspace,
}: ReleaseReadinessChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi! I'm the EOS Governed Release Readiness assistant.\n\n" +
        "Tell me about a release you want to prepare, for example:\n" +
        "• **Prepare release EOS-003**\n" +
        "• **Check release 12.3 readiness**\n\n" +
        "I'll run the `prepare_release` procedure and share the posture with you.",
    },
  ]);
  const [input, setInput] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const send = async (contentOverride?: string) => {
    const content = (contentOverride ?? input).trim();
    if (!content || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(CHAT_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      const data = (await response.json()) as
        | { message: ChatMessage; releaseId: string | null }
        | { error: string; detail?: string };

      if (!response.ok || "error" in data) {
        const detail = "detail" in data ? data.detail : undefined;
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `❌ Sorry, something went wrong: ${detail ?? ("error" in data ? String(data.error) : "Request failed")}.`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const incoming = data.message;
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: incoming.role,
          content: incoming.content,
          structured: incoming.structured,
          procedureId: incoming.procedureId,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "❌ Network error while calling the chat procedure endpoint. " +
          "Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Governed Release Readiness · Chat
              </h1>
              <p className="text-gray-600">
                Ask EOS to prepare a release. The <code className="bg-gray-100 px-1 rounded text-sm">prepare_release</code>{" "}
                procedure is executed — same procedure, same execution path as the Workspace surface.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 max-w-[220px]">
              <div className="font-semibold mb-1">🔁 Shared Procedure</div>
              Workspace ←→ Chat both call <code>prepare_release</code>
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col overflow-hidden">
          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownLite text={msg.content} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Structured result actions */}
                  {msg.role === "assistant" && msg.structured && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div className="text-xs text-gray-500 font-mono">
                        procedure: {msg.procedureId ?? "prepare_release"} · shared execution path
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {extractReleaseIdFromStructured(msg) && (
                          <button
                            type="button"
                            onClick={() => {
                              const rid = extractReleaseIdFromStructured(msg);
                              if (rid) {
                                if (onOpenWorkspace) {
                                  onOpenWorkspace(rid);
                                } else {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set("releaseId", rid);
                                  url.searchParams.set("surface", "workspace");
                                  window.open(url.toString(), "_blank", "noopener");
                                }
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                          >
                            📂 Inspect in Workspace
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="bg-gray-100 text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    Running procedure via shared API…
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Suggestions */}
          {!isSending && messages.length <= 2 && (
            <div className="px-4 pb-2 pt-1 flex flex-wrap gap-2 border-t border-gray-50 bg-gray-50/50">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={'"Prepare release EOS-003" or just enter a release ID'}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSending}
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={isSending || !input.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors h-full min-h-[40px]"
              >
                {isSending ? "…" : "Send"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Press <kbd className="px-1 bg-gray-100 rounded border border-gray-200">Enter</kbd> to send ·{" "}
              <kbd className="px-1 bg-gray-100 rounded border border-gray-200">Shift + Enter</kbd> for newline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReleaseReadinessChat;
