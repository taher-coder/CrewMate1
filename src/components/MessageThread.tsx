"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

type Message = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

export function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");

    // Optimistic local echo — the realtime INSERT event will arrive and is
    // de-duped by id, but showing it immediately avoids a visible stall.
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      body: text,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: text });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setBody(text);
    }
    setSending(false);
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "bg-forest text-white" : "bg-warm-white text-charcoal"
                }`}
              >
                {m.body}
                <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                  {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-black/5 bg-warm-white px-4 py-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-forest text-white disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}
