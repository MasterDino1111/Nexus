
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageSquare } from "lucide-react";

export default function LiveChat({ streamId, className = "" }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!streamId) return;
    let active = true;
    setLoading(true);
    base44.entities.LiveChatMessage
      .filter({ stream_id: streamId }, { sort: "-created_date", limit: 100 })
      .then((page) => {
        if (!active) return;
        setMessages([...page.items].reverse());
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const unsubscribe = base44.entities.LiveChatMessage.subscribe((event) => {
      const message = event.data;
      if (!message || event.type !== "create" || message.stream_id !== streamId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [streamId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user) return;
    setText("");
    await base44.entities.LiveChatMessage.create({
      stream_id: streamId,
      user_id: user.id,
      user_name: user.full_name || "Anonym",
      content,
    });
  };

  return (
    <div className={`flex flex-col bg-card overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessageSquare size={15} className="text-primary" />
        <p className="text-sm font-semibold">Live-Chat</p>
        <span className="ml-auto text-[10px] text-muted-foreground">{messages.length} Nachrichten</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Noch keine Nachrichten – schreib etwas in den Chat.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.user_id === user?.id;
            return (
              <div key={message.id} className="flex gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                  }`}
                >
                  {(message.user_name || "A")[0]}
                </div>
                <div className="min-w-0">
                  <span className={`text-[11px] font-semibold ${mine ? "text-primary" : "text-muted-foreground"}`}>
                    {mine ? "Du" : message.user_name}
                  </span>
                  <p className="text-sm break-words">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nachricht schreiben..."
          className="flex-1 px-3 py-2 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 transition-opacity"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}


