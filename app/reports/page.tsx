"use client";

import React, { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import {
  Send,
  Copy,
  Download,
  Sparkles,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";

export default function Reports() {
  const [messages, setMessages] = useState<
    {
      id: number;
      sender: "user" | "ai";
      message: string;
      url?: string | null;
    }[]
  >([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async (id: number) => {
      try {
        const res = await fetch(`/api/chat/history/${id}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setMessages(data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setFetchingHistory(false);
      }
    };

    const fetchSessionAndHistory = async () => {
      try {
        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.user && authData.user.id) {
            setUserId(authData.user.id);
            await fetchHistory(authData.user.id);
            return;
          }
        }
        setFetchingHistory(false);
      } catch (error) {
        console.error("Error fetching session:", error);
        setFetchingHistory(false);
      }
    };

    fetchSessionAndHistory();
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !userId) return;

    const userMessage = input;
    setInput("");

    // Optimistic update
    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: "user",
        message: userMessage,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, message: userMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setMessages((prev) => [...prev, data.data]);
        }
      } else {
        // Fallback error message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "ai",
            message: "Sorry, I encountered an error processing your request.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "ai",
          message:
            "Sorry, I encountered an error communicating with the server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleClearHistory = async () => {
    if (!userId || messages.length === 0) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to clear the chat history? This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6b7cff",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, clear it!",
    });

    if (result.isConfirmed) {
      setFetchingHistory(true);
      try {
        const response = await fetch(`/api/chat/history/${userId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setMessages([]);
          Swal.fire({
            title: "Cleared!",
            text: "Your chat history has been cleared.",
            icon: "success",
            confirmButtonColor: "#6b7cff",
          });
        }
      } catch (error) {
        console.error("Error clearing history:", error);
      } finally {
        setFetchingHistory(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-xl border border-[#ececec] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#ececec] bg-white shrink-0">
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 text-[#6b7cff] mr-2" />
          <h1 className="text-[#222] font-semibold text-[15px]">
            AI Summary & Insights
          </h1>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
        {fetchingHistory ? (
          <div className="flex justify-center items-center h-full text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-3 text-sm">Loading history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-gray-400">
            <Sparkles className="w-12 h-12 text-[#6b7cff] mb-4 opacity-50" />
            <p className="text-sm font-medium text-gray-500">
              How can I help you today?
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "user" ? (
                <div className="bg-[#f3f3f3] border border-[#e7e7e7] text-[#3c3c3c] px-5 py-3 rounded-xl text-sm shadow-sm max-w-xl">
                  {msg.message}
                </div>
              ) : (
                <div className="w-full max-w-5xl">
                  {/* AI Text */}
                  <div className="text-[14px] leading-[1.6] text-[#4b4b4b] space-y-2">
                    {msg.message.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>

                  {/* Document Attachment */}
                  {msg.url && (
                    <div className="mt-4 flex items-center p-4 border border-[#ececec] bg-white rounded-lg inline-flex shadow-sm">
                      <FileText className="w-8 h-8 text-[#5870ff] mr-4" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Generated Report
                        </p>
                        <a
                          href={msg.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#6b7cff] hover:underline flex items-center mt-1"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-5 text-[#8d8d8d]">
                    <button
                      onClick={() => copyToClipboard(msg.message)}
                      className="hover:text-[#444] transition"
                      title="Copy response"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {msg.url && (
                      <a
                        href={msg.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#444] transition"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="w-full max-w-5xl">
              <div className="text-[14px] leading-[1.6] text-[#8d8d8d] flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-[#ececec] bg-white shrink-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask Anything"
            disabled={loading}
            className="
              w-full
              rounded-2xl
              border
              border-[#dcdcdc]
              bg-white
              py-4
              pl-5
              pr-14
              text-sm
              text-[#333]
              outline-none
              transition
              focus:border-[#7c8cff]
              focus:ring-4
              focus:ring-[#eef1ff]
              disabled:opacity-50
            "
          />

          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              text-[#6b7cff]
              hover:text-[#4f63ff]
              transition
              disabled:opacity-50
            "
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
